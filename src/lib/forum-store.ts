import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ClarificationAnswer,
  CreateForumDraft,
  ForumActivityEntry,
  ForumActivityKind,
  ForumRecord,
  ForumStatus,
  ForumSummary,
} from "@/lib/domain";
import {
  ensureDebateRun,
  resumeDebateOrchestration,
  startDebateOrchestration,
} from "@/lib/debate-service";
import {
  analyzeInitialForum,
  reviewClarificationAnswers,
} from "@/lib/moderator-service";
import type { ProviderSecrets } from "@/lib/provider-settings";

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
  | { type: "stop-debate" }
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

export async function deleteForumById(id: string): Promise<void> {
  const forum = await getForumById(id);

  if (!forum) {
    throw new Error("Forum not found.");
  }

  await rm(getForumDir(id), { recursive: true, force: false });
}

export async function createForum(
  draft: CreateForumDraft,
  providerSecrets: ProviderSecrets,
): Promise<ForumRecord> {
  const normalizedDraft = normalizeDraft(draft);
  const id = buildForumId(normalizedDraft.title);
  const createdAt = new Date().toISOString();
  const initialAnalysis = await analyzeInitialForum(
    normalizedDraft,
    providerSecrets,
  );
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
        `Clarification round 1 opened with ${initialAnalysis.questions.length} moderator-generated questions.`,
        createdAt,
      ),
    );
  } else {
    activity.push(
      buildActivityEntry(
        "review-ready",
        initialAnalysis.assessment,
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
    debate: null,
  };

  await persistForum(forum);
  return forum;
}

export async function applyForumAction(
  forumId: string,
  action: ForumAction,
  providerSecrets: ProviderSecrets = {},
): Promise<ForumRecord> {
  const forum = await getForumById(forumId);

  if (!forum) {
    throw new Error("Forum not found.");
  }

  if (action.type === "submit-clarification") {
    return submitClarificationAnswers(forum, action.answers, providerSecrets);
  }

  if (action.type === "start-debate") {
    ensureStatus(forum.status, ["review"], "Only review forums can start debate.");
    return startDebateOrchestration(
      forum,
      providerSecrets,
      createDebatePersistenceAdapter(forumId),
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

  if (action.type === "stop-debate") {
    ensureStatus(
      forum.status,
      ["debating", "paused"],
      "Only an active or paused debate can be stopped.",
    );
    const stoppedAt = new Date().toISOString();
    const nextForum: ForumRecord = {
      ...forum,
      status: "stopped",
      updatedAt: stoppedAt,
      debate: forum.debate
        ? {
            ...forum.debate,
            currentStage: "stopped",
            stopRequestedAt: stoppedAt,
            lastUpdatedAt: stoppedAt,
          }
        : forum.debate,
      activity: [
        ...forum.activity,
        buildActivityEntry(
          "stopped",
          "Debate stop requested. The automation will not schedule additional turns.",
          stoppedAt,
        ),
      ],
    };

    await persistForum(nextForum);
    return nextForum;
  }

  if (action.type === "resume-debate") {
    ensureStatus(forum.status, ["paused"], "Only a paused forum can resume debate.");
    return resumeDebateOrchestration(
      forum,
      providerSecrets,
      createDebatePersistenceAdapter(forumId),
    );
  }

  ensureStatus(
    forum.status,
    ["debating", "paused", "review", "stopped"],
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
  providerSecrets: ProviderSecrets,
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
  const moderationResult = await reviewClarificationAnswers(
    {
      ...forum,
      clarificationHistory: nextHistory,
    },
    normalizedAnswers.map((answer) => ({
      questionId: answer.questionId,
      answer: answer.answer,
    })),
    providerSecrets,
  );
  const nextStatus: ForumStatus = moderationResult.status;
  const nextClarificationRound =
    nextStatus === "clarification" ? forum.clarificationRound + 1 : 0;
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
        `Clarification round ${nextClarificationRound} opened because the moderator still needs more information before debate.`,
        submittedAt,
      ),
    );
  } else {
    nextActivity.push(
      buildActivityEntry(
        "review-ready",
        moderationResult.assessment,
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
    clarificationQuestions: moderationResult.questions,
    clarificationHistory: nextHistory,
    understandingDraft: moderationResult.understandingDraft,
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
    debate: forum.debate
      ? {
          ...forum.debate,
          currentStage: status === "completed" ? "completed" : forum.debate.currentStage,
          lastUpdatedAt: activityEntry.createdAt,
        }
      : forum.debate,
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
  if (forum.debate?.brainstormSummary.trim()) {
    await writeFile(
      path.join(documentsDir, "brainstorming-summary.md"),
      `${forum.debate.brainstormSummary.trim()}\n`,
      "utf8",
    );
  }
  if (forum.debate) {
    await Promise.all(
      forum.debate.documents.map(async (document) => {
        const prefix = String(document.order).padStart(2, "0");
        const slug = sanitizeFileSegment(document.title);
        const documentName = `${prefix}-${slug}.md`;
        const commentsName = `${prefix}-${slug}.comments.md`;
        const markdown = (document.finalMarkdown || document.latestMarkdown).trim();

        await writeFile(
          path.join(documentsDir, documentName),
          `${markdown || `# ${document.title}\n\nPending drafting.\n`}`,
          "utf8",
        );
        await writeFile(
          path.join(documentsDir, commentsName),
          renderDocumentComments(document.title, document.comments),
          "utf8",
        );
      }),
    );
  }
  await writeFile(path.join(logsDir, "activity.md"), renderActivityLog(forum), "utf8");
  await writeFile(path.join(logsDir, "moderator-context.md"), renderModeratorContextLog(forum), "utf8");
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


function buildForumSummary(idea: string) {
  const normalized = idea.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

export async function ensureForumDebateIsRunning(
  id: string,
  providerSecrets: ProviderSecrets,
) {
  const forum = await getForumById(id);

  if (!forum || forum.status !== "debating" || !forum.debate) {
    return forum;
  }

  if (forum.debate.currentStage === "completed" || forum.debate.currentStage === "stopped") {
    return forum;
  }

  await ensureDebateRun(id, providerSecrets, createDebatePersistenceAdapter(id));
  return getForumById(id);
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

function renderModeratorContextLog(forum: ForumRecord) {
  if (!forum.debate) {
    return [
      `# Moderator context: ${forum.title}`,
      "",
      "No debate context captured yet.",
      "",
    ].join("\n");
  }

  return [
    `# Moderator context: ${forum.title}`,
    "",
    `- Stage: ${forum.debate.currentStage}`,
    `- Usage tokens: ${forum.debate.moderatorContext.usageTokens}`,
    `- Usage ratio: ${forum.debate.moderatorContext.usageRatio.toFixed(3)}`,
    `- Warning ratio: ${forum.debate.moderatorContext.warningRatio}`,
    `- Compaction mode: ${forum.debate.moderatorContext.compactionMode}`,
    `- Compaction events: ${forum.debate.moderatorContext.compactionEvents}`,
    "",
    ...forum.debate.moderatorContext.entries.map(
      (entry) => `## ${entry.phase} · ${entry.role}\n\n${entry.content}`,
    ),
    "",
  ].join("\n");
}

function renderDocumentComments(title: string, comments: ForumRecord["debate"] extends null ? never : NonNullable<ForumRecord["debate"]>["documents"][number]["comments"]) {
  return [
    `# Comments: ${title}`,
    "",
    ...(comments.length > 0
      ? comments.map(
          (comment) =>
            `- ${comment.createdAt} · ${comment.agentName} · ${comment.anchor} · ${comment.text}`,
        )
      : ["No comments recorded." as const]),
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

function sanitizeFileSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48);

  return normalized || "document";
}

function createDebatePersistenceAdapter(forumId: string) {
  return {
    loadForum: () => getForumById(forumId),
    persistForum,
  };
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
