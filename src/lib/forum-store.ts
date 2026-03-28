import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  CreateForumDraft,
  ForumActivityEntry,
  ForumActivityKind,
  ForumRecord,
  ForumStatus,
  ForumSummary,
} from "@/lib/domain";

const STORAGE_DIR = process.env.AGORA_STORAGE_DIR?.trim()
  ? path.resolve(process.env.AGORA_STORAGE_DIR)
  : path.join(process.cwd(), ".agora");
const FORUMS_DIR = path.join(STORAGE_DIR, "forums");

type ForumAction =
  | {
      type: "submit-clarification";
      answers: ClarificationAnswer[];
    }
  | { type: "start-debate" }
  | { type: "pause-debate" }
  | { type: "resume-debate" }
  | { type: "complete-forum" };

export async function listForumSummaries(): Promise<ForumSummary[]> {
  const forums = await listForums();

  return forums.map((forum) => ({
    id: forum.id,
    title: forum.title,
    summary: forum.summary,
    status: forum.status,
    updatedAt: forum.updatedAt,
    documentsRequested: forum.documentsRequested,
    roundsCompleted: forum.roundsCompleted,
    agentCount: forum.agentCount,
  }));
}

export async function listForums(): Promise<ForumRecord[]> {
  try {
    const entries = await readdir(FORUMS_DIR, { withFileTypes: true });
    const forums = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readForumRecord(entry.name)),
    );

    return forums.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  } catch {
    return [];
  }
}

export async function getForumById(id: string): Promise<ForumRecord | null> {
  try {
    return await readForumRecord(id);
  } catch {
    return null;
  }
}

export async function createForum(draft: CreateForumDraft): Promise<ForumRecord> {
  const normalizedDraft = normalizeDraft(draft);
  const id = buildForumId(normalizedDraft.title);
  const createdAt = new Date().toISOString();
  const initialAnalysis = buildInitialWorkflow(normalizedDraft);
  const activity: ForumActivityEntry[] = [
    buildActivityEntry(
      "created",
      `Forum created with ${normalizedDraft.agentCount} agents and ${normalizedDraft.requestedDocuments.length} requested Markdown deliverables.`,
      createdAt,
    ),
  ];

  if (initialAnalysis.status === "clarification") {
    activity.push(
      buildActivityEntry(
        "clarification-requested",
        `Clarification round 1 opened with ${initialAnalysis.questions.length} moderator questions.`,
        createdAt,
      ),
    );
  } else {
    activity.push(
      buildActivityEntry(
        "review-ready",
        "The moderator found the brief clear enough to generate an understanding draft without clarification questions.",
        createdAt,
      ),
    );
  }

  const forum: ForumRecord = {
    id,
    title: normalizedDraft.title,
    summary: buildForumSummary(normalizedDraft.idea),
    idea: normalizedDraft.idea,
    requestedDocuments: normalizedDraft.requestedDocuments,
    moderator: normalizedDraft.moderator,
    agentCount: normalizedDraft.agentCount,
    agents: normalizedDraft.agents.slice(0, normalizedDraft.agentCount),
    status: initialAnalysis.status,
    createdAt,
    updatedAt: createdAt,
    documentsRequested: normalizedDraft.requestedDocuments.length,
    roundsCompleted: 0,
    clarificationRound: initialAnalysis.status === "clarification" ? 1 : 0,
    maxClarificationRounds: 3,
    clarificationQuestions: initialAnalysis.questions,
    clarificationHistory: [],
    understandingDraft: initialAnalysis.understandingDraft,
    activity,
  };

  await persistForum(forum);
  return forum;
}

export async function applyForumAction(
  forumId: string,
  action: ForumAction,
): Promise<ForumRecord> {
  const forum = await getForumById(forumId);

  if (!forum) {
    throw new Error("Forum not found.");
  }

  if (action.type === "submit-clarification") {
    return submitClarificationAnswers(forum, action.answers);
  }

  if (action.type === "start-debate") {
    ensureStatus(forum.status, ["review"], "Only review forums can start debate.");
    return updateForumLifecycle(
      forum,
      "debating",
      buildActivityEntry(
        "debate-started",
        "Debate started from the reviewed understanding draft.",
      ),
    );
  }

  if (action.type === "pause-debate") {
    ensureStatus(forum.status, ["debating"], "Only an active debate can be paused.");
    return updateForumLifecycle(
      forum,
      "paused",
      buildActivityEntry(
        "paused",
        "The debate is paused. No more turns should be scheduled until it is resumed.",
      ),
    );
  }

  if (action.type === "resume-debate") {
    ensureStatus(forum.status, ["paused"], "Only a paused forum can resume debate.");
    return updateForumLifecycle(
      forum,
      "debating",
      buildActivityEntry(
        "resumed",
        "The debate resumed from the previously paused state.",
      ),
    );
  }

  ensureStatus(
    forum.status,
    ["debating", "paused", "review"],
    "This forum cannot be completed from its current state.",
  );
  return updateForumLifecycle(
    forum,
    "completed",
    buildActivityEntry(
      "completed",
      "The forum is marked completed and its understanding draft is treated as the final agreed brief for this implementation slice.",
    ),
  );
}

async function submitClarificationAnswers(
  forum: ForumRecord,
  answers: ClarificationAnswer[],
): Promise<ForumRecord> {
  ensureStatus(
    forum.status,
    ["clarification"],
    "Clarification answers can only be submitted while clarification is open.",
  );

  const normalizedAnswers = forum.clarificationQuestions.map((question) => {
    const matchingAnswer = answers.find(
      (answer) => answer.questionId === question.id,
    );
    const normalizedAnswer = matchingAnswer?.answer.trim();

    if (!normalizedAnswer) {
      throw new Error("Every clarification question requires an answer.");
    }

    return {
      questionId: question.id,
      prompt: question.prompt,
      answer: normalizedAnswer,
    };
  });

  const submittedAt = new Date().toISOString();
  const nextHistory = [
    ...forum.clarificationHistory,
    {
      round: forum.clarificationRound,
      answers: normalizedAnswers,
      submittedAt,
    },
  ];
  const followUpQuestions =
    forum.clarificationRound < forum.maxClarificationRounds
      ? buildFollowUpQuestions(forum.clarificationQuestions, normalizedAnswers)
      : [];
  const nextStatus: ForumStatus =
    followUpQuestions.length > 0 ? "clarification" : "review";
  const nextClarificationRound =
    nextStatus === "clarification" ? forum.clarificationRound + 1 : 0;
  const nextUnderstandingDraft = buildUnderstandingDraft({
    ...forum,
    clarificationHistory: nextHistory,
    clarificationQuestions: followUpQuestions,
    status: nextStatus,
  });
  const nextActivity = [
    ...forum.activity,
    buildActivityEntry(
      "clarification-submitted",
      `Clarification round ${forum.clarificationRound} submitted with ${normalizedAnswers.length} answers.`,
      submittedAt,
    ),
  ];

  if (nextStatus === "clarification") {
    nextActivity.push(
      buildActivityEntry(
        "clarification-requested",
        `Clarification round ${nextClarificationRound} opened because at least one prior answer was still too brief or ambiguous.`,
        submittedAt,
      ),
    );
  } else {
    nextActivity.push(
      buildActivityEntry(
        "review-ready",
        forum.clarificationRound >= forum.maxClarificationRounds
          ? "Maximum clarification rounds reached. The moderator promoted the current understanding draft to review."
          : "Clarification is now complete and the moderator promoted the updated understanding draft to review.",
        submittedAt,
      ),
    );
  }

  const nextForum: ForumRecord = {
    ...forum,
    status: nextStatus,
    updatedAt: submittedAt,
    roundsCompleted: forum.roundsCompleted + 1,
    clarificationRound: nextClarificationRound,
    clarificationQuestions: followUpQuestions,
    clarificationHistory: nextHistory,
    understandingDraft: nextUnderstandingDraft,
    activity: nextActivity,
  };

  await persistForum(nextForum);
  return nextForum;
}

async function updateForumLifecycle(
  forum: ForumRecord,
  status: ForumStatus,
  activityEntry: ForumActivityEntry,
): Promise<ForumRecord> {
  const nextForum: ForumRecord = {
    ...forum,
    status,
    updatedAt: activityEntry.createdAt,
    activity: [...forum.activity, activityEntry],
  };

  await persistForum(nextForum);
  return nextForum;
}

async function persistForum(forum: ForumRecord): Promise<void> {
  const forumDir = getForumDir(forum.id);
  const documentsDir = path.join(forumDir, "documents");
  const logsDir = path.join(forumDir, "logs");

  await mkdir(documentsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });
  await writeFile(
    path.join(forumDir, "forum.json"),
    `${JSON.stringify(forum, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(documentsDir, "understanding.md"),
    `${forum.understandingDraft.trim()}\n`,
    "utf8",
  );
  await writeFile(path.join(logsDir, "activity.md"), renderActivityLog(forum), "utf8");
}

async function readForumRecord(id: string): Promise<ForumRecord> {
  const raw = await readFile(path.join(getForumDir(id), "forum.json"), "utf8");
  return JSON.parse(raw) as ForumRecord;
}

function getForumDir(id: string) {
  return path.join(FORUMS_DIR, id);
}

function buildForumId(title: string) {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48);

  return `${baseSlug || "forum"}-${randomUUID().slice(0, 8)}`;
}

function normalizeDraft(draft: CreateForumDraft) {
  const title = draft.title.trim();
  const idea = draft.idea.trim();
  const requestedDocuments = draft.requestedDocuments
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/u, "").trim())
    .filter(Boolean);

  if (title.length < 3) {
    throw new Error("Forum title must be at least 3 characters long.");
  }

  if (idea.length < 20) {
    throw new Error("Forum idea must be at least 20 characters long.");
  }

  if (requestedDocuments.length === 0) {
    throw new Error("At least one Markdown deliverable is required.");
  }

  return {
    ...draft,
    title,
    idea,
    requestedDocuments,
    agents: draft.agents
      .slice(0, draft.agentCount)
      .map((agent) => ({ ...agent, name: agent.name.trim() })),
  };
}

function buildInitialWorkflow(draft: ReturnType<typeof normalizeDraft>) {
  const questions = buildInitialQuestions(draft);
  const status: ForumStatus = questions.length > 0 ? "clarification" : "review";

  return {
    status,
    questions,
    understandingDraft: buildUnderstandingDraft({
      id: "pending",
      title: draft.title,
      summary: buildForumSummary(draft.idea),
      idea: draft.idea,
      requestedDocuments: draft.requestedDocuments,
      moderator: draft.moderator,
      agentCount: draft.agentCount,
      agents: draft.agents,
      status,
      createdAt: "",
      updatedAt: "",
      documentsRequested: draft.requestedDocuments.length,
      roundsCompleted: 0,
      clarificationRound: status === "clarification" ? 1 : 0,
      maxClarificationRounds: 3,
      clarificationQuestions: questions,
      clarificationHistory: [],
      understandingDraft: "",
      activity: [],
    }),
  };
}

function buildInitialQuestions(
  draft: ReturnType<typeof normalizeDraft>,
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  const ideaWordCount = countWords(draft.idea);
  const hasTechnicalConstraints = /next|docker|tailwind|sqlite|api|markdown|copilot|openrouter|deepseek/iu.test(
    draft.idea,
  );

  if (draft.title.length < 10) {
    questions.push({
      id: "scope-title",
      prompt: "What is the clearest working title or scope label for this forum?",
      rationale:
        "The current title is short enough that later steps could interpret the scope too broadly.",
      suggestedAnswers: [
        "Use a more specific product or subsystem name.",
        "Name the concrete workflow being designed.",
        "Include the target outcome in the forum title.",
      ],
    });
  }

  if (ideaWordCount < 45) {
    questions.push({
      id: "success-outcome",
      prompt: "What should success look like once this debate finishes?",
      rationale:
        "The current brief is too compact to infer a clear target outcome for the moderator and agents.",
      suggestedAnswers: [
        "A production-ready implementation plan.",
        "A reviewed architecture plus execution checklist.",
        "A clarified brief and a first accepted understanding draft.",
      ],
    });
  }

  if (draft.requestedDocuments.length < 2) {
    questions.push({
      id: "deliverables",
      prompt: "Which Markdown deliverables are mandatory before the forum can be considered complete?",
      rationale:
        "The list of requested documents is still too small to anchor later document rounds confidently.",
      suggestedAnswers: [
        "Architecture overview, data model, and deployment guide.",
        "Product brief, implementation plan, and risk register.",
        "One final deliverable plus a validation checklist.",
      ],
    });
  }

  if (!hasTechnicalConstraints) {
    questions.push({
      id: "constraints",
      prompt: "Are there any technical, product, or operational constraints that the moderator must preserve?",
      rationale:
        "The brief does not yet expose hard constraints, so the generated understanding draft may miss guardrails.",
      suggestedAnswers: [
        "Keep the current stack and stay self-hosted.",
        "Preserve the existing UX and file layout.",
        "Prefer minimal, incremental changes over broad rewrites.",
      ],
    });
  }

  return questions.slice(0, 3);
}

function buildFollowUpQuestions(
  previousQuestions: ClarificationQuestion[],
  answers: ClarificationAnswer[],
): ClarificationQuestion[] {
  return previousQuestions
    .flatMap((question) => {
      const answer = answers.find((entry) => entry.questionId === question.id);

      if (!answer || !isWeakAnswer(answer.answer)) {
        return [];
      }

      return [
        {
          id: `${question.id}-follow-up`,
          prompt: `Please expand this clarification: ${question.prompt}`,
          rationale:
            "The previous answer was too brief or ambiguous to remove uncertainty from the moderator brief.",
          suggestedAnswers: question.suggestedAnswers,
        },
      ];
    })
    .slice(0, 2);
}

function isWeakAnswer(answer: string) {
  const normalized = answer.trim();
  return (
    countWords(normalized) < 4 ||
    /^(n\/a|na|none|no se|idk|skip)$/iu.test(normalized)
  );
}

function buildUnderstandingDraft(forum: ForumRecord) {
  const clarificationLines =
    forum.clarificationHistory.length > 0
      ? forum.clarificationHistory.flatMap((round) => [
          `### Round ${round.round}`,
          ...round.answers.map((answer) => {
            return `- **${answer.prompt}** ${answer.answer}`;
          }),
        ])
      : ["- No clarification answers have been submitted yet."];

  const moderationAssessment =
    forum.status === "clarification"
      ? `The moderator still needs clarification round ${forum.clarificationRound} before moving this forum to review.`
      : forum.status === "review"
        ? "The moderator considers the brief sufficiently clear and ready for review before debate."
        : forum.status === "debating"
          ? "The reviewed understanding draft is now being used as the active debate brief."
          : forum.status === "paused"
            ? "The debate brief is ready, but debate is currently paused."
            : "The forum is complete for the currently implemented workflow slice.";

  return [
    `# Understanding draft: ${forum.title}`,
    "",
    "## Problem statement",
    forum.idea,
    "",
    "## Requested Markdown deliverables",
    ...forum.requestedDocuments.map((document) => `- ${document}`),
    "",
    "## Moderator configuration",
    `- Provider: ${forum.moderator.provider}`,
    `- Model: ${forum.moderator.modelId}`,
    `- Agent count: ${forum.agentCount}`,
    "",
    "## Participating agents",
    ...forum.agents.map(
      (agent) =>
        `- Agent ${agent.slot}: ${agent.name} (${agent.provider} / ${agent.modelId})`,
    ),
    "",
    "## Clarification history",
    ...clarificationLines,
    "",
    "## Moderation assessment",
    moderationAssessment,
    "",
    "## Current assumptions",
    `- Deliverables stay Markdown-only.`,
    `- The forum should preserve the configured providers and models.`,
    `- The current implementation slice stores forum state, understanding drafts, and activity logs on the Agora server.`,
  ].join("\n");
}

function buildForumSummary(idea: string) {
  const normalized = idea.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

function renderActivityLog(forum: ForumRecord) {
  return [
    `# Activity log: ${forum.title}`,
    "",
    ...forum.activity.map(
      (entry) => `- ${entry.createdAt} · ${entry.kind} · ${entry.message}`,
    ),
    "",
  ].join("\n");
}

function buildActivityEntry(
  kind: ForumActivityKind,
  message: string,
  createdAt = new Date().toISOString(),
): ForumActivityEntry {
  return {
    id: randomUUID(),
    kind,
    message,
    createdAt,
  };
}

function countWords(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function ensureStatus(
  status: ForumStatus,
  allowed: ForumStatus[],
  message: string,
) {
  if (!allowed.includes(status)) {
    throw new Error(message);
  }
}
