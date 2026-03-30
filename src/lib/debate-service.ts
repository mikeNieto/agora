import "server-only";

import { randomUUID } from "node:crypto";
import type {
  AgentDefinition,
  BrainstormRound,
  BrainstormTurn,
  DebateContextEntry,
  DebateContextSnapshot,
  DebateDocument,
  DebateState,
  DocumentComment,
  DocumentRound,
  DocumentTurn,
  ForumActivityEntry,
  ForumRecord,
} from "@/lib/domain";
import {
  extractJsonObject,
  generateAgentText,
  generateParticipantText,
} from "@/lib/ai-runtime";
import {
  buildModeratorContextState,
  compactModeratorContext,
  type ModeratorContextEntry,
  type ModeratorContextState,
} from "@/lib/moderator-context";
import type { ProviderSecrets } from "@/lib/provider-settings";

type DebatePersistenceAdapter = {
  loadForum: () => Promise<ForumRecord | null>;
  persistForum: (forum: ForumRecord) => Promise<void>;
};

type BrainstormModeratorDecision = {
  summaryMarkdown: string;
  unresolvedTopics: string[];
  continueBrainstorming: boolean;
  consensusReached: boolean;
  forcedClosure: boolean;
};

type DocumentOrderingDecision = {
  documents: string[];
};

type DocumentAgentResponse = {
  summary: string;
  documentMarkdown: string;
  comments: Array<{
    anchor?: string;
    text?: string;
  }>;
};

type DocumentModeratorDecision = {
  summaryMarkdown: string;
  unresolvedTopics: string[];
  closeDocument: boolean;
  forcedClosure: boolean;
};

const BRAINSTORM_MAX_ROUNDS = 5;
const DOCUMENT_MAX_ROUNDS = 5;
const RUN_STATE_ERROR = "Forum debate is not in a running state.";
const jobRegistry = getJobRegistry();

export async function startDebateOrchestration(
  forum: ForumRecord,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
): Promise<ForumRecord> {
  const now = new Date().toISOString();
  const debate = buildInitialDebateState(forum, now);
  const nextForum: ForumRecord = {
    ...forum,
    status: "debating",
    debate,
    updatedAt: now,
    activity: [
      ...forum.activity,
      buildActivityEntry(
        "debate-started",
        "Automatic debate orchestration started from the reviewed understanding draft.",
        now,
      ),
    ],
  };

  await persistence.persistForum(nextForum);
  void ensureDebateRun(nextForum.id, providerSecrets, persistence);
  return nextForum;
}

export async function resumeDebateOrchestration(
  forum: ForumRecord,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
): Promise<ForumRecord> {
  if (!forum.debate) {
    return startDebateOrchestration(forum, providerSecrets, persistence);
  }

  const resumedAt = new Date().toISOString();
  const nextForum: ForumRecord = {
    ...forum,
    status: "debating",
    updatedAt: resumedAt,
    debate: {
      ...forum.debate,
      currentStage:
        forum.debate.currentStage === "stopped"
          ? "documentation"
          : forum.debate.currentStage,
      lastUpdatedAt: resumedAt,
      stopRequestedAt: undefined,
    },
    activity: [
      ...forum.activity,
      buildActivityEntry(
        "resumed",
        "Automatic debate orchestration resumed.",
        resumedAt,
      ),
    ],
  };

  await persistence.persistForum(nextForum);
  void ensureDebateRun(nextForum.id, providerSecrets, persistence);
  return nextForum;
}

export async function ensureDebateRun(
  forumId: string,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
) {
  if (jobRegistry.has(forumId)) {
    return;
  }

  const runningJob = runDebateLoop(forumId, providerSecrets, persistence)
    .catch(async (error) => {
      if (error instanceof Error && error.message === RUN_STATE_ERROR) {
        return;
      }

      const forum = await persistence.loadForum();

      if (!forum) {
        return;
      }

      const now = new Date().toISOString();
      await persistence.persistForum({
        ...forum,
        status: forum.status === "completed" ? forum.status : "paused",
        updatedAt: now,
        activity: [
          ...forum.activity,
          buildActivityEntry(
            "debate-progress",
            error instanceof Error
              ? `Debate orchestration paused because of an error: ${error.message}`
              : "Debate orchestration paused because of an unexpected error.",
            now,
          ),
        ],
      });
    })
    .finally(() => {
      jobRegistry.delete(forumId);
    });

  jobRegistry.set(forumId, runningJob);
}

function buildInitialDebateState(
  forum: ForumRecord,
  createdAt: string,
): DebateState {
  const systemPrompt = buildSharedAgentSystemPrompt(forum);
  const contextState = buildModeratorContextState(forum.moderator, [
    {
      id: "debate-system-prompt",
      phase: "understanding",
      role: "system",
      content: systemPrompt,
      pinned: true,
    },
    {
      id: "understanding-document",
      phase: "understanding",
      role: "document",
      content: forum.understandingDraft,
      pinned: true,
    },
  ]);

  return {
    systemPrompt,
    currentStage: "brainstorming",
    brainstormMaxRounds: BRAINSTORM_MAX_ROUNDS,
    documentMaxRounds: DOCUMENT_MAX_ROUNDS,
    currentBrainstormRound: 0,
    brainstormSummary: "",
    brainstormRounds: [],
    currentDocumentIndex: 0,
    documents: forum.requestedDocuments.map((title, index) => ({
      id: `document-${index + 1}`,
      title,
      order: index + 1,
      status: index === 0 ? "active" : "pending",
      currentRound: 0,
      maxRounds: DOCUMENT_MAX_ROUNDS,
      assignedAgentIds: [],
      rounds: [],
      latestMarkdown: `# ${title}\n\nPending drafting.\n`,
      finalMarkdown: "",
      comments: [],
      moderatorSummary: "",
      unresolvedTopics: [],
    })),
    moderatorContext: snapshotContextState(contextState, 0, false),
    lastUpdatedAt: createdAt,
  };
}

function buildSharedAgentSystemPrompt(forum: ForumRecord) {
  return [
    "Role and identity: You are one of the debating AI agents inside Agora. Use a precise, collaborative, technically rigorous tone.",
    "Main task: Help the group converge on the best solution and co-author the requested Markdown deliverables.",
    "Context and rules: Base every turn on the shared understanding draft, the moderator instructions, prior visible turns, and the current document state.",
    "Restrictions: Do not act as the moderator, do not claim hidden context, do not output anything except Markdown unless JSON is explicitly requested, and do not make the final closure decision yourself.",
    "Output format: Markdown by default.",
    "Workflow: 1) read the current debate state, 2) advance the work with concrete changes, 3) mention disagreements clearly, 4) push toward closure.",
    "Exception handling: If critical information is missing, state the exact assumption you are making and continue with a bounded answer.",
    "All working documents must stay in English Markdown.",
    `Forum title: ${forum.title}`,
  ].join("\n");
}

async function runDebateLoop(
  forumId: string,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
) {
  while (true) {
    const forum = await persistence.loadForum();

    if (!forum || !forum.debate) {
      return;
    }

    if (forum.status !== "debating") {
      return;
    }

    if (forum.debate.currentStage === "brainstorming") {
      await runBrainstormRound(forumId, providerSecrets, persistence);
      continue;
    }

    if (forum.debate.currentStage === "documentation") {
      await runDocumentationStep(forumId, providerSecrets, persistence);
      continue;
    }

    return;
  }
}

async function runBrainstormRound(
  forumId: string,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
) {
  const forum = await requireRunningForum(forumId, persistence);
  const debate = forum.debate!;
  const roundNumber = debate.currentBrainstormRound + 1;
  const orderedAgents = shuffleArray(forum.agents);
  let workingForum = forum;
  const turns: BrainstormTurn[] = [];
  let workingContext = restoreContextState(workingForum.debate!.moderatorContext, forum);

  workingForum = await updateLatestForum(persistence, (latestForum) => ({
    ...latestForum,
    updatedAt: new Date().toISOString(),
    debate: latestForum.debate
      ? {
          ...latestForum.debate,
          currentBrainstormRound: roundNumber,
          lastUpdatedAt: new Date().toISOString(),
        }
      : latestForum.debate,
    activity: [
      ...latestForum.activity,
      buildActivityEntry(
        "debate-progress",
        `Brainstorm round ${roundNumber} started with randomized order ${orderedAgents
          .map((agent) => agent.name)
          .join(", ")}.`,
      ),
    ],
  }));

  for (const [index, agent] of orderedAgents.entries()) {
    const latestForum = await requireRunningForum(forumId, persistence);
    const latestDebate = latestForum.debate!;
    workingContext = restoreContextState(latestDebate.moderatorContext, latestForum);
    const priorTurns = turns.map((turn) => turn.markdown).join("\n\n---\n\n");
    const response = await generateAgentText(
      agent,
      providerSecrets,
      latestDebate.systemPrompt,
      buildBrainstormAgentPrompt({
        forum: latestForum,
        roundNumber,
        agent,
        priorTurns,
        brainstormSummary: latestDebate.brainstormSummary,
      }),
    );
    const createdAt = new Date().toISOString();
    const turn: BrainstormTurn = {
      id: randomUUID(),
      agentId: agent.id,
      agentName: agent.name,
      summary: summarizeMarkdown(response),
      markdown: response.trim(),
      createdAt,
      order: index + 1,
    };
    turns.push(turn);
    const appendedTurnContext = appendToContext(workingContext, {
      id: turn.id,
      phase: "brainstorming",
      role: "agent",
      content: `# Brainstorm turn ${roundNumber}.${index + 1}\n\n## ${agent.name}\n\n${turn.markdown}`,
    });
    workingContext = appendedTurnContext.state;

    await updateLatestForum(persistence, (latestForum) => {
      const latestDebate = latestForum.debate;

      if (!latestDebate) {
        return latestForum;
      }

      const rounds = upsertBrainstormRound(latestDebate.brainstormRounds, {
        round: roundNumber,
        turnOrder: orderedAgents.map((entry) => entry.id),
        turns,
        moderatorSummary: latestDebate.brainstormSummary,
        unresolvedTopics: [],
        consensusReached: false,
        forcedClosure: false,
        createdAt,
      });

      return {
        ...latestForum,
        updatedAt: createdAt,
        debate: {
          ...latestDebate,
          brainstormRounds: rounds,
          moderatorContext: snapshotContextState(
            workingContext,
            latestDebate.moderatorContext.compactionEvents +
              Number(appendedTurnContext.triggered),
            appendedTurnContext.handledBySdk,
          ),
          lastUpdatedAt: createdAt,
        },
        activity: [
          ...latestForum.activity,
          buildActivityEntry(
            "debate-progress",
            `Brainstorm round ${roundNumber}, turn ${index + 1}: ${agent.name} contributed new proposals and critiques.`,
            createdAt,
          ),
        ],
      };
    });
  }

  const reviewedForum = await requireRunningForum(forumId, persistence);
  const decision = await reviewBrainstormRound(
    reviewedForum,
    providerSecrets,
    roundNumber,
    turns,
  );
  const decisionTimestamp = new Date().toISOString();
  const summarizedContext = appendToContext(
    restoreContextState(reviewedForum.debate!.moderatorContext, reviewedForum),
    {
      id: randomUUID(),
      phase: "brainstorming",
      role: "moderator",
      content: decision.summaryMarkdown,
    },
  );
  const brainstormClosed =
    !decision.continueBrainstorming ||
    roundNumber >= reviewedForum.debate!.brainstormMaxRounds;
  const orderedDocuments = brainstormClosed
    ? await orderDebateDocuments(
        reviewedForum,
        reviewedForum.debate!.documents,
        providerSecrets,
      )
    : reviewedForum.debate!.documents;

  await updateLatestForum(persistence, (latestForum) => {
    const latestDebate = latestForum.debate;

    if (!latestDebate) {
      return latestForum;
    }

    const nextRounds = upsertBrainstormRound(latestDebate.brainstormRounds, {
      round: roundNumber,
      turnOrder: orderedAgents.map((entry) => entry.id),
      turns,
      moderatorSummary: decision.summaryMarkdown,
      unresolvedTopics: decision.unresolvedTopics,
      consensusReached: decision.consensusReached,
      forcedClosure: decision.forcedClosure,
      createdAt: decisionTimestamp,
    });

    return {
      ...latestForum,
      updatedAt: decisionTimestamp,
      debate: {
        ...latestDebate,
        currentStage: brainstormClosed ? "documentation" : "brainstorming",
        brainstormSummary: decision.summaryMarkdown,
        brainstormRounds: nextRounds,
        currentDocumentIndex: brainstormClosed ? 0 : latestDebate.currentDocumentIndex,
        documents: orderedDocuments,
        moderatorContext: snapshotContextState(
          summarizedContext.state,
          latestDebate.moderatorContext.compactionEvents +
            Number(summarizedContext.triggered),
          summarizedContext.handledBySdk,
        ),
        lastUpdatedAt: decisionTimestamp,
      },
      activity: [
        ...latestForum.activity,
        buildActivityEntry(
          "debate-progress",
          brainstormClosed
            ? `Brainstorming closed after round ${roundNumber}. The moderator moved the forum into collaborative document drafting.`
            : `Brainstorm round ${roundNumber} closed. Remaining topics: ${decision.unresolvedTopics.join("; ") || "none"}.`,
          decisionTimestamp,
        ),
      ],
    };
  });
}

async function runDocumentationStep(
  forumId: string,
  providerSecrets: ProviderSecrets,
  persistence: DebatePersistenceAdapter,
) {
  const forum = await requireRunningForum(forumId, persistence);
  const debate = forum.debate!;
  const currentDocument = debate.documents[debate.currentDocumentIndex];

  if (!currentDocument) {
    await markForumCompleted(persistence, forum, "All requested Markdown documents were drafted and closed.");
    return;
  }

  const roundNumber = currentDocument.currentRound + 1;
  const baseOrder = shuffleArray(forum.agents);
  const critic = baseOrder[0];
  const turnOrder = [...baseOrder, critic];
  const turns: DocumentTurn[] = [];

  await updateLatestForum(persistence, (latestForum) => ({
    ...latestForum,
    updatedAt: new Date().toISOString(),
    debate: latestForum.debate
      ? {
          ...latestForum.debate,
          documents: latestForum.debate.documents.map((document, index) =>
            index === latestForum.debate!.currentDocumentIndex
              ? {
                  ...document,
                  status: "active",
                  currentRound: roundNumber,
                  assignedAgentIds: turnOrder.map((agent) => agent.id),
                }
              : document,
          ),
          lastUpdatedAt: new Date().toISOString(),
        }
      : latestForum.debate,
    activity: [
      ...latestForum.activity,
      buildActivityEntry(
        "debate-progress",
        `Document round ${roundNumber} started for ${currentDocument.title}.`,
      ),
    ],
  }));

  let workingMarkdown = currentDocument.latestMarkdown;
  let accumulatedComments = currentDocument.comments.slice();
  let workingContext = restoreContextState(forum.debate!.moderatorContext, forum);

  for (const [index, agent] of turnOrder.entries()) {
    const latestForum = await requireRunningForum(forumId, persistence);
    const latestDocument =
      latestForum.debate!.documents[latestForum.debate!.currentDocumentIndex];
    const role: DocumentTurn["role"] =
      index === 0 ? "author" : index === turnOrder.length - 1 ? "critic" : "editor";
    const prompt = buildDocumentAgentPrompt({
      forum: latestForum,
      document: latestDocument,
      roundNumber,
      agent,
      role,
      currentMarkdown: workingMarkdown,
      brainstormSummary: latestForum.debate!.brainstormSummary,
      existingComments: accumulatedComments,
    });
    const responseText = await generateAgentText(
      agent,
      providerSecrets,
      latestForum.debate!.systemPrompt,
      prompt,
    );
    const response = parseDocumentAgentResponse(responseText, workingMarkdown);
    const createdAt = new Date().toISOString();
    const comments = normalizeDocumentComments(response.comments, agent, roundNumber, createdAt);
    accumulatedComments = [...accumulatedComments, ...comments];
    workingMarkdown = response.documentMarkdown.trim() || workingMarkdown;
    const turn: DocumentTurn = {
      id: randomUUID(),
      round: roundNumber,
      agentId: agent.id,
      agentName: agent.name,
      role,
      summary: response.summary.trim() || summarizeMarkdown(workingMarkdown),
      markdown: workingMarkdown,
      comments,
      createdAt,
      order: index + 1,
    };
    turns.push(turn);
    const appendedTurnContext = appendToContext(workingContext, {
      id: turn.id,
      phase: "documentation",
      role: "agent",
      content: `# ${currentDocument.title} · round ${roundNumber} · ${agent.name}\n\n${turn.summary}\n\n${workingMarkdown}`,
    });
    workingContext = appendedTurnContext.state;

    await updateLatestForum(persistence, (latestForum) => {
      const latestDebate = latestForum.debate;

      if (!latestDebate) {
        return latestForum;
      }

      const nextDocuments = latestDebate.documents.map((document, documentIndex) => {
        if (documentIndex !== latestDebate.currentDocumentIndex) {
          return document;
        }

        return {
          ...document,
          latestMarkdown: workingMarkdown,
          comments: accumulatedComments,
          rounds: upsertDocumentRound(document.rounds, {
            round: roundNumber,
            turnOrder: turnOrder.map((entry) => entry.id),
            turns,
            moderatorSummary: document.moderatorSummary,
            unresolvedTopics: document.unresolvedTopics,
            closed: false,
            forcedClosure: false,
            createdAt,
          }),
        };
      });

      return {
        ...latestForum,
        updatedAt: createdAt,
        debate: {
          ...latestDebate,
          documents: nextDocuments,
          moderatorContext: snapshotContextState(
            workingContext,
            latestDebate.moderatorContext.compactionEvents +
              Number(appendedTurnContext.triggered),
            appendedTurnContext.handledBySdk,
          ),
          lastUpdatedAt: createdAt,
        },
        activity: [
          ...latestForum.activity,
          buildActivityEntry(
            "debate-progress",
            `${currentDocument.title}: ${agent.name} completed ${role} turn ${index + 1} in round ${roundNumber}.`,
            createdAt,
          ),
        ],
      };
    });
  }

  const latestForum = await requireRunningForum(forumId, persistence);
  const latestDocument = latestForum.debate!.documents[latestForum.debate!.currentDocumentIndex];
  const decision = await reviewDocumentRound(
    latestForum,
    latestDocument,
    providerSecrets,
    roundNumber,
    turns,
    workingMarkdown,
  );
  const decidedAt = new Date().toISOString();
  const summarizedContext = appendToContext(
    restoreContextState(latestForum.debate!.moderatorContext, latestForum),
    {
      id: randomUUID(),
      phase: "documentation",
      role: "moderator",
      content: decision.summaryMarkdown,
    },
  );

  const closeDocument = decision.closeDocument || roundNumber >= latestDocument.maxRounds;
  const forcedClosure = decision.forcedClosure || roundNumber >= latestDocument.maxRounds;

  const updatedForum = await updateLatestForum(persistence, (freshForum) => {
    const latestDebate = freshForum.debate;

    if (!latestDebate) {
      return freshForum;
    }

    const nextDocuments: DebateDocument[] = latestDebate.documents.map((document, index) => {
      if (index !== latestDebate.currentDocumentIndex) {
        return document;
      }

      return {
        ...document,
        status: closeDocument ? "closed" : "active",
        latestMarkdown: workingMarkdown,
        finalMarkdown: closeDocument ? workingMarkdown : document.finalMarkdown,
        comments: accumulatedComments,
        moderatorSummary: decision.summaryMarkdown,
        unresolvedTopics: decision.unresolvedTopics,
        closedAt: closeDocument ? decidedAt : document.closedAt,
        rounds: upsertDocumentRound(document.rounds, {
          round: roundNumber,
          turnOrder: turnOrder.map((entry) => entry.id),
          turns,
          moderatorSummary: decision.summaryMarkdown,
          unresolvedTopics: decision.unresolvedTopics,
          closed: closeDocument,
          forcedClosure,
          createdAt: decidedAt,
        }),
      };
    });
    const currentDocumentIndex = closeDocument
      ? findNextOpenDocumentIndex(nextDocuments, latestDebate.currentDocumentIndex + 1)
      : latestDebate.currentDocumentIndex;
    const stageCompleted = currentDocumentIndex >= nextDocuments.length;

    return {
      ...freshForum,
      status: stageCompleted ? "completed" : freshForum.status,
      updatedAt: decidedAt,
      debate: {
        ...latestDebate,
        currentStage: stageCompleted ? "completed" : "documentation",
        currentDocumentIndex,
        documents: nextDocuments.map((document, index) => ({
          ...document,
          status:
            document.status === "closed"
              ? document.status
              : index === currentDocumentIndex
                ? "active"
                : "pending",
        })),
        moderatorContext: snapshotContextState(
          summarizedContext.state,
          latestDebate.moderatorContext.compactionEvents +
            Number(summarizedContext.triggered),
          summarizedContext.handledBySdk,
        ),
        lastUpdatedAt: decidedAt,
      },
      activity: [
        ...freshForum.activity,
        buildActivityEntry(
          stageCompleted ? "completed" : "debate-progress",
          stageCompleted
            ? "Debate finished after the moderator closed the last requested Markdown document."
            : closeDocument
              ? `${latestDocument.title} closed after document round ${roundNumber}.`
              : `${latestDocument.title} needs another drafting round. Remaining topics: ${decision.unresolvedTopics.join("; ") || "none"}.`,
          decidedAt,
        ),
      ],
    };
  });

  if (updatedForum.status === "completed") {
    return;
  }
}

async function reviewBrainstormRound(
  forum: ForumRecord,
  providerSecrets: ProviderSecrets,
  roundNumber: number,
  turns: BrainstormTurn[],
): Promise<BrainstormModeratorDecision> {
  const prompt = [
    "Review this Agora brainstorming round as the moderator.",
    "You must facilitate closure, summarize the agreements, and identify only the unresolved topics that truly block progress.",
    "Do not decide the solution yourself and do not invent new solution directions that agents did not discuss.",
    "Return raw JSON only with this shape:",
    '{"summaryMarkdown":"string","unresolvedTopics":["string"],"continueBrainstorming":true,"consensusReached":false,"forcedClosure":false}',
    `Round number: ${roundNumber}`,
    `Maximum rounds: ${forum.debate?.brainstormMaxRounds ?? BRAINSTORM_MAX_ROUNDS}`,
    "Understanding draft:",
    forum.understandingDraft,
    "Brainstorm turns:",
    turns.map((turn) => `## ${turn.agentName}\n${turn.markdown}`).join("\n\n"),
  ].join("\n\n");
  const response = await generateParticipantText(
    forum.moderator,
    providerSecrets,
    buildBrainstormModeratorSystemPrompt(),
    prompt,
  );

  try {
    const parsed = JSON.parse(extractJsonObject(response)) as Partial<BrainstormModeratorDecision>;

    return {
      summaryMarkdown:
        parsed.summaryMarkdown?.trim() || buildBrainstormFallbackSummary(roundNumber, turns),
      unresolvedTopics: normalizeStringArray(parsed.unresolvedTopics),
      continueBrainstorming:
        Boolean(parsed.continueBrainstorming) &&
        roundNumber < (forum.debate?.brainstormMaxRounds ?? BRAINSTORM_MAX_ROUNDS),
      consensusReached: Boolean(parsed.consensusReached),
      forcedClosure: Boolean(parsed.forcedClosure),
    };
  } catch {
    return {
      summaryMarkdown: buildBrainstormFallbackSummary(roundNumber, turns),
      unresolvedTopics: [],
      continueBrainstorming: roundNumber < (forum.debate?.brainstormMaxRounds ?? BRAINSTORM_MAX_ROUNDS),
      consensusReached: roundNumber >= 2,
      forcedClosure: roundNumber >= (forum.debate?.brainstormMaxRounds ?? BRAINSTORM_MAX_ROUNDS),
    };
  }
}

async function orderDebateDocuments(
  forum: ForumRecord,
  documents: DebateDocument[],
  providerSecrets: ProviderSecrets,
): Promise<DebateDocument[]> {
  const prompt = [
    "Order the requested Markdown deliverables by execution priority for collaborative drafting.",
    "Return raw JSON only with this shape:",
    '{"documents":["Document title 1","Document title 2"]}',
    "Requested documents:",
    documents.map((document) => `- ${document.title}`).join("\n"),
    "Use only the provided titles.",
    "Brainstorm summary:",
    forum.debate?.brainstormSummary ?? "",
  ].join("\n\n");

  try {
    const response = await generateParticipantText(
      forum.moderator,
      providerSecrets,
      buildBrainstormModeratorSystemPrompt(),
      prompt,
    );
    const parsed = JSON.parse(extractJsonObject(response)) as Partial<DocumentOrderingDecision>;
    const requestedTitles = documents.map((document) => document.title);
    const orderedTitles = normalizeStringArray(parsed.documents).filter((title) =>
      requestedTitles.includes(title),
    );
    const uniqueOrderedTitles = Array.from(new Set([...orderedTitles, ...requestedTitles]));

    return uniqueOrderedTitles.map((title, index) => {
      const existing = documents.find((document) => document.title === title)!;

      return {
        ...existing,
        order: index + 1,
        status: index === 0 ? "active" : "pending",
      };
    });
  } catch {
    return documents.map((document, index) => ({
      ...document,
      order: index + 1,
      status: index === 0 ? "active" : "pending",
    }));
  }
}

async function reviewDocumentRound(
  forum: ForumRecord,
  document: DebateDocument,
  providerSecrets: ProviderSecrets,
  roundNumber: number,
  turns: DocumentTurn[],
  currentMarkdown: string,
): Promise<DocumentModeratorDecision> {
  const prompt = [
    "Review this collaborative document drafting round as the moderator.",
    "Your role is to close or continue the round, summarize what changed, and list only the unresolved issues that need another pass.",
    "Return raw JSON only with this shape:",
    '{"summaryMarkdown":"string","unresolvedTopics":["string"],"closeDocument":false,"forcedClosure":false}',
    `Document title: ${document.title}`,
    `Round number: ${roundNumber}`,
    `Maximum rounds: ${document.maxRounds}`,
    "Brainstorm summary:",
    forum.debate?.brainstormSummary ?? "",
    "Current document markdown:",
    currentMarkdown,
    "Turn summaries:",
    turns.map((turn) => `## ${turn.agentName} (${turn.role})\n${turn.summary}`).join("\n\n"),
  ].join("\n\n");
  const response = await generateParticipantText(
    forum.moderator,
    providerSecrets,
    buildBrainstormModeratorSystemPrompt(),
    prompt,
  );

  try {
    const parsed = JSON.parse(extractJsonObject(response)) as Partial<DocumentModeratorDecision>;

    return {
      summaryMarkdown:
        parsed.summaryMarkdown?.trim() || buildDocumentFallbackSummary(document.title, turns),
      unresolvedTopics: normalizeStringArray(parsed.unresolvedTopics),
      closeDocument: Boolean(parsed.closeDocument),
      forcedClosure: Boolean(parsed.forcedClosure),
    };
  } catch {
    return {
      summaryMarkdown: buildDocumentFallbackSummary(document.title, turns),
      unresolvedTopics: [],
      closeDocument: roundNumber >= 2,
      forcedClosure: roundNumber >= document.maxRounds,
    };
  }
}

function buildBrainstormAgentPrompt({
  forum,
  roundNumber,
  agent,
  priorTurns,
  brainstormSummary,
}: {
  forum: ForumRecord;
  roundNumber: number;
  agent: AgentDefinition;
  priorTurns: string;
  brainstormSummary: string;
}) {
  return [
    `You are ${agent.name}, one of the debating agents in Agora.`,
    `Current brainstorm round: ${roundNumber}.`,
    "Produce a Markdown contribution with these sections exactly:",
    "## Proposal",
    "## Critique",
    "## Deliverable guidance",
    "Keep the answer concrete and help the group converge.",
    "Understanding draft:",
    forum.understandingDraft,
    brainstormSummary ? "Prior moderator brainstorm summary:" : "",
    brainstormSummary,
    priorTurns ? "Earlier turns in this round:" : "",
    priorTurns,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildDocumentAgentPrompt({
  forum,
  document,
  roundNumber,
  agent,
  role,
  currentMarkdown,
  brainstormSummary,
  existingComments,
}: {
  forum: ForumRecord;
  document: DebateDocument;
  roundNumber: number;
  agent: AgentDefinition;
  role: DocumentTurn["role"];
  currentMarkdown: string;
  brainstormSummary: string;
  existingComments: DocumentComment[];
}) {
  return [
    `You are ${agent.name} and your role for this turn is ${role}.`,
    "Return raw JSON only with this shape:",
    '{"summary":"string","documentMarkdown":"markdown string","comments":[{"anchor":"section or paragraph label","text":"comment text"}]}',
    "Rules:",
    "- documentMarkdown must always contain the full updated Markdown document.",
    "- comments must be anchored to a section, heading, or paragraph label.",
    "- summary must explain what changed in this turn.",
    "- Keep everything in English.",
    `Document title: ${document.title}`,
    `Document round: ${roundNumber}`,
    "Understanding draft:",
    forum.understandingDraft,
    "Brainstorm summary:",
    brainstormSummary,
    "Current document markdown:",
    currentMarkdown,
    existingComments.length > 0 ? "Existing comments:" : "",
    existingComments
      .map((comment) => `- ${comment.anchor}: ${comment.text}`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildBrainstormModeratorSystemPrompt() {
  return [
    "You are the Agora moderator during debate execution.",
    "You facilitate closure, track unresolved topics, and move the forum through brainstorming and document drafting.",
    "You are not allowed to decide the solution or rewrite the user's goals on behalf of the agents.",
    "When rounds exceed limits, force closure with explicit unresolved assumptions instead of stalling.",
    "Return raw JSON only whenever the user prompt asks for JSON.",
  ].join("\n");
}

function parseDocumentAgentResponse(
  responseText: string,
  fallbackMarkdown: string,
): DocumentAgentResponse {
  try {
    const parsed = JSON.parse(extractJsonObject(responseText)) as Partial<DocumentAgentResponse>;

    return {
      summary: parsed.summary?.trim() || summarizeMarkdown(fallbackMarkdown),
      documentMarkdown: parsed.documentMarkdown?.trim() || fallbackMarkdown,
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    return {
      summary: summarizeMarkdown(responseText),
      documentMarkdown: responseText.trim() || fallbackMarkdown,
      comments: [],
    };
  }
}

function normalizeDocumentComments(
  comments: Array<{ anchor?: string; text?: string }>,
  agent: AgentDefinition,
  roundNumber: number,
  createdAt: string,
) {
  return comments
    .map((comment) => ({
      id: randomUUID(),
      agentId: agent.id,
      agentName: agent.name,
      anchor: comment.anchor?.trim() || "General",
      text: comment.text?.trim() || "",
      createdAt,
      round: roundNumber,
    }))
    .filter((comment) => comment.text.length > 0);
}

function summarizeMarkdown(markdown: string) {
  const line = markdown.replace(/\s+/gu, " ").trim();
  return line.length <= 180 ? line : `${line.slice(0, 177)}...`;
}

function buildBrainstormFallbackSummary(
  roundNumber: number,
  turns: BrainstormTurn[],
) {
  return [
    `# Brainstorm round ${roundNumber} summary`,
    "",
    ...turns.map((turn) => `- ${turn.agentName}: ${turn.summary}`),
  ].join("\n");
}

function buildDocumentFallbackSummary(
  title: string,
  turns: DocumentTurn[],
) {
  return [
    `# ${title} review summary`,
    "",
    ...turns.map((turn) => `- ${turn.agentName} (${turn.role}): ${turn.summary}`),
  ].join("\n");
}

function normalizeStringArray(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function upsertBrainstormRound(
  rounds: BrainstormRound[],
  nextRound: BrainstormRound,
) {
  const previous = rounds.filter((round) => round.round !== nextRound.round);
  return [...previous, nextRound].sort((left, right) => left.round - right.round);
}

function upsertDocumentRound(
  rounds: DocumentRound[],
  nextRound: DocumentRound,
) {
  const previous = rounds.filter((round) => round.round !== nextRound.round);
  return [...previous, nextRound].sort((left, right) => left.round - right.round);
}

function appendToContext(
  state: ModeratorContextState,
  entry: DebateContextEntry,
) {
  const result = compactModeratorContext(
    buildModeratorContextState(
      {
        provider: state.policy.provider,
        modelId: state.policy.modelId,
      },
      [
      ...state.entries,
      entry as ModeratorContextEntry,
      ],
    ),
  );

  return result;
}

function snapshotContextState(
  state: ModeratorContextState,
  compactionEvents: number,
  handledBySdk: boolean,
): DebateContextSnapshot {
  return {
    entries: state.entries as DebateContextEntry[],
    usageTokens: state.usageTokens,
    usageRatio: state.usageRatio,
    warningRatio: state.policy.warningRatio,
    contextWindowLabel: state.policy.contextWindowLabel,
    compactionMode: state.policy.compactionMode,
    compactionEvents,
    handledBySdk,
  };
}

function restoreContextState(
  snapshot: DebateContextSnapshot,
  forum: ForumRecord,
) {
  return buildModeratorContextState(
    forum.moderator,
    snapshot.entries as ModeratorContextEntry[],
  );
}

async function requireRunningForum(
  forumId: string,
  persistence: DebatePersistenceAdapter,
) {
  const forum = await persistence.loadForum();

  if (!forum || forum.id !== forumId || forum.status !== "debating" || !forum.debate) {
    throw new Error(RUN_STATE_ERROR);
  }

  return forum;
}

async function updateLatestForum(
  persistence: DebatePersistenceAdapter,
  updater: (forum: ForumRecord) => ForumRecord,
) {
  const latestForum = await persistence.loadForum();

  if (!latestForum) {
    throw new Error("Forum not found.");
  }

  const nextForum = updater(latestForum);
  await persistence.persistForum(nextForum);
  return nextForum;
}

async function markForumCompleted(
  persistence: DebatePersistenceAdapter,
  forum: ForumRecord,
  message: string,
) {
  const now = new Date().toISOString();
  await persistence.persistForum({
    ...forum,
    status: "completed",
    updatedAt: now,
    debate: forum.debate
      ? {
          ...forum.debate,
          currentStage: "completed",
          lastUpdatedAt: now,
        }
      : forum.debate,
    activity: [
      ...forum.activity,
      buildActivityEntry("completed", message, now),
    ],
  });
}

function findNextOpenDocumentIndex(
  documents: DebateDocument[],
  startIndex: number,
) {
  const nextIndex = documents.findIndex(
    (document, index) => index >= startIndex && document.status !== "closed",
  );

  return nextIndex === -1 ? documents.length : nextIndex;
}

function shuffleArray<T>(items: T[]) {
  const next = items.slice();

  for (let index = next.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = current;
  }

  return next;
}

function buildActivityEntry(
  kind: ForumActivityEntry["kind"],
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

function getJobRegistry() {
  const globalRegistry = globalThis as typeof globalThis & {
    __agoraDebateJobs?: Map<string, Promise<void>>;
  };

  if (!globalRegistry.__agoraDebateJobs) {
    globalRegistry.__agoraDebateJobs = new Map<string, Promise<void>>();
  }

  return globalRegistry.__agoraDebateJobs;
}