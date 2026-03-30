import "server-only";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  CreateForumDraft,
  ForumRecord,
  ForumStatus,
  ModeratorDefinition,
} from "@/lib/domain";
import {
  extractJsonObject,
  generateParticipantText,
} from "@/lib/ai-runtime";
import type { ProviderSecrets } from "@/lib/provider-settings";

type ModeratorWorkflowInput = {
  title: string;
  idea: string;
  requestedDocuments: string[];
  moderator: ModeratorDefinition;
  agentCount: number;
  agents: CreateForumDraft["agents"];
  clarificationRound: number;
  maxClarificationRounds: number;
  clarificationHistory: Array<{
    round: number;
    answers: Array<{
      prompt: string;
      answer: string;
    }>;
    submittedAt?: string;
  }>;
  pendingAnswers?: ClarificationAnswer[];
  previousQuestions?: ClarificationQuestion[];
};

type ModeratorWorkflowPlan = {
  status: Extract<ForumStatus, "clarification" | "review">;
  assessment: string;
  questions: ClarificationQuestion[];
  understandingDraft: string;
};

type RawModeratorWorkflowPlan = {
  status?: string;
  assessment?: string;
  questions?: RawClarificationQuestion[];
  understandingDraft?: string;
};

type RawClarificationQuestion = {
  prompt?: string;
  rationale?: string;
  suggestedAnswers?: string[];
  preferredAnswer?: string;
};

const PROJECT_BRIEF_PATH = path.join(
  process.cwd(),
  "product_definition",
  "project_brief.md",
);

let projectBriefPromise: Promise<string> | undefined;

export async function analyzeInitialForum(
  draft: {
    title: string;
    idea: string;
    requestedDocuments: string[];
    moderator: ModeratorDefinition;
    agentCount: number;
    agents: CreateForumDraft["agents"];
  },
  providerSecrets: ProviderSecrets,
): Promise<ModeratorWorkflowPlan> {
  return runModeratorWorkflow(
    {
      ...draft,
      clarificationRound: 1,
      maxClarificationRounds: 3,
      clarificationHistory: [],
      previousQuestions: [],
    },
    providerSecrets,
  );
}

export async function reviewClarificationAnswers(
  forum: ForumRecord,
  answers: ClarificationAnswer[],
  providerSecrets: ProviderSecrets,
): Promise<ModeratorWorkflowPlan> {
  return runModeratorWorkflow(
    {
      title: forum.title,
      idea: forum.idea,
      requestedDocuments: forum.requestedDocuments,
      moderator: forum.moderator,
      agentCount: forum.agentCount,
      agents: forum.agents,
      clarificationRound: forum.clarificationRound,
      maxClarificationRounds: forum.maxClarificationRounds,
      clarificationHistory: forum.clarificationHistory,
      pendingAnswers: answers,
      previousQuestions: forum.clarificationQuestions,
    },
    providerSecrets,
  );
}

async function runModeratorWorkflow(
  input: ModeratorWorkflowInput,
  providerSecrets: ProviderSecrets,
): Promise<ModeratorWorkflowPlan> {
  const brief = await loadProjectBrief();
  const prompt = buildWorkflowPrompt(input, brief);
  const responseText = await generateModeratorResponse(
    input.moderator,
    providerSecrets,
    prompt,
  );
  const parsed = parseWorkflowResponse(responseText);

  return normalizeWorkflowPlan(parsed, input);
}

async function generateModeratorResponse(
  moderator: ModeratorDefinition,
  providerSecrets: ProviderSecrets,
  prompt: string,
): Promise<string> {
  return generateParticipantText(
    moderator,
    providerSecrets,
    buildModeratorSystemPrompt(),
    prompt,
  );
}

function buildModeratorSystemPrompt() {
  return [
    "You are the moderator of an Agora multi-agent forum.",
    "Your job is to clarify the user's request and prepare the shared understanding document for the debate.",
    "You are not allowed to debate the solution, choose the architecture, or decide the final document structure on behalf of the agents.",
    "Ask only the clarification questions that are genuinely required to remove ambiguity.",
    "Each clarification question must include suggestedAnswers and exactly one preferredAnswer chosen from those suggestions.",
    "When the brief is clear enough, stop asking questions and produce a strong understandingDraft in Markdown.",
    "If the clarification round limit has been reached, you must stop asking questions and move to review, carrying unresolved uncertainty as explicit assumptions in the understanding draft.",
    "Respond in the same language as the user's forum content unless the user explicitly asks for another language.",
    "Return raw JSON only, with no markdown fences and no explanatory text outside the JSON object.",
  ].join("\n");
}

function buildWorkflowPrompt(input: ModeratorWorkflowInput, projectBrief: string) {
  const roundLimitReached = input.clarificationRound >= input.maxClarificationRounds;
  const previousQuestions = (input.previousQuestions ?? []).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    rationale: question.rationale,
    suggestedAnswers: question.suggestedAnswers,
    preferredAnswer: question.preferredAnswer,
  }));
  const pendingAnswers =
    input.pendingAnswers && previousQuestions.length > 0
      ? previousQuestions.map((question) => ({
          question: question.prompt,
          answer:
            input.pendingAnswers?.find((entry) => entry.questionId === question.id)?.answer ?? "",
        }))
      : [];

  return [
    "Use the following project brief as the product contract for the moderator workflow:",
    projectBrief,
    "",
    "Return a JSON object with this exact shape:",
    '{"status":"clarification|review","assessment":"string","questions":[{"prompt":"string","rationale":"string","suggestedAnswers":["string"],"preferredAnswer":"string"}],"understandingDraft":"markdown string"}',
    "",
    "Rules:",
    "- status must be 'clarification' only when more user clarification is required right now.",
    "- status must be 'review' when the brief is clear enough or the round limit has been reached.",
    "- If status is 'review', questions must be an empty array.",
    "- If status is 'clarification', questions must contain every question needed for the next round.",
    "- suggestedAnswers must be concrete, useful, and suitable for button-like selection in a UI.",
    "- preferredAnswer must match one of the suggestedAnswers exactly.",
    "- understandingDraft must always be present and written in Markdown.",
    "- understandingDraft must summarize the problem, desired outcome, requested Markdown deliverables, constraints, moderator scope, participating agents, and current assumptions.",
    "- If round limit reached, carry unresolved ambiguity into explicit assumptions instead of asking more questions.",
    "",
    "Forum input:",
    JSON.stringify(
      {
        title: input.title,
        idea: input.idea,
        requestedDocuments: input.requestedDocuments,
        moderator: input.moderator,
        agentCount: input.agentCount,
        agents: input.agents.map((agent) => ({
          slot: agent.slot,
          name: agent.name,
          provider: agent.provider,
          modelId: agent.modelId,
        })),
        clarificationRound: input.clarificationRound,
        maxClarificationRounds: input.maxClarificationRounds,
        roundLimitReached,
        previousQuestions,
        pendingAnswers,
        clarificationHistory: input.clarificationHistory,
      },
      null,
      2,
    ),
  ].join("\n");
}

function parseWorkflowResponse(content: string): RawModeratorWorkflowPlan {
  return JSON.parse(extractJsonObject(content)) as RawModeratorWorkflowPlan;
}

function normalizeWorkflowPlan(
  plan: RawModeratorWorkflowPlan,
  input: ModeratorWorkflowInput,
): ModeratorWorkflowPlan {
  const normalizedQuestions = (plan.questions ?? [])
    .map((question) => normalizeQuestion(question))
    .filter((question): question is ClarificationQuestion => question !== null);
  const status: Extract<ForumStatus, "clarification" | "review"> =
    plan.status === "clarification" &&
    normalizedQuestions.length > 0 &&
    input.clarificationRound < input.maxClarificationRounds
      ? "clarification"
      : "review";
  const assessment = plan.assessment?.trim() || defaultAssessment(status, input);
  const understandingDraft =
    plan.understandingDraft?.trim() || buildFallbackUnderstandingDraft(input, assessment);

  return {
    status,
    assessment,
    questions: status === "clarification" ? normalizedQuestions : [],
    understandingDraft,
  };
}

function normalizeQuestion(
  question: RawClarificationQuestion,
): ClarificationQuestion | null {
  const prompt = question?.prompt?.trim();
  const rationale = question?.rationale?.trim();
  const suggestions = Array.from(
    new Set(
      (question?.suggestedAnswers ?? [])
        .map((entry: string) => entry.trim())
        .filter(Boolean),
    ),
  );
  const preferredAnswer = question?.preferredAnswer?.trim();

  if (!prompt || !rationale) {
    return null;
  }

  const nextSuggestions = [...suggestions];

  if (preferredAnswer && !nextSuggestions.includes(preferredAnswer)) {
    nextSuggestions.unshift(preferredAnswer);
  }

  if (nextSuggestions.length === 0) {
    return null;
  }

  return {
    id: randomUUID(),
    prompt,
    rationale,
    suggestedAnswers: nextSuggestions,
    preferredAnswer:
      preferredAnswer && nextSuggestions.includes(preferredAnswer)
        ? preferredAnswer
        : nextSuggestions[0],
  };
}

function defaultAssessment(
  status: Extract<ForumStatus, "clarification" | "review">,
  input: ModeratorWorkflowInput,
) {
  if (status === "clarification") {
    return `Clarification round ${input.clarificationRound} is still required before debate can start.`;
  }

  if (input.clarificationRound >= input.maxClarificationRounds) {
    return "The clarification round limit was reached, so the moderator promoted the brief to review with explicit assumptions.";
  }

  return "The moderator considers the brief clear enough to move into review.";
}

function buildFallbackUnderstandingDraft(
  input: ModeratorWorkflowInput,
  assessment: string,
) {
  return [
    `# Understanding draft: ${input.title}`,
    "",
    "## Problem statement",
    input.idea,
    "",
    "## Requested Markdown deliverables",
    ...input.requestedDocuments.map((document) => `- ${document}`),
    "",
    "## Moderator configuration",
    `- Provider: ${input.moderator.provider}`,
    `- Model: ${input.moderator.modelId}`,
    `- Agent count: ${input.agentCount}`,
    "",
    "## Participating agents",
    ...input.agents.map(
      (agent) =>
        `- Agent ${agent.slot}: ${agent.name} (${agent.provider} / ${agent.modelId})`,
    ),
    "",
    "## Moderation assessment",
    assessment,
    "",
    "## Current assumptions",
    "- Deliverables remain Markdown-only.",
    "- The moderator coordinates clarification and debate flow without deciding the solution itself.",
  ].join("\n");
}

async function loadProjectBrief() {
  if (!projectBriefPromise) {
    projectBriefPromise = readFile(PROJECT_BRIEF_PATH, "utf8").catch(() => "");
  }

  const brief = await projectBriefPromise;

  if (brief.trim()) {
    return brief;
  }

  return [
    "The moderator must dynamically decide whether clarification is needed.",
    "Questions must be derived from the actual brief, not from hardcoded heuristics.",
    "Each question must include suggested answers and one preferred answer.",
    "After clarification, the moderator must generate the understanding draft in Markdown.",
    "Clarification is limited to three rounds.",
  ].join("\n");
}