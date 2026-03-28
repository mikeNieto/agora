import type {
  AgentColor,
  AgentDefinition,
  CreateForumDraft,
  ForumSummary,
  ModeratorDefinition,
  PricingUnit,
  ProviderKind,
} from "@/lib/domain";

export const agentColors: AgentColor[] = [
  "coral",
  "sky",
  "emerald",
  "amber",
  "violet",
  "rose",
];

export const providerLabels: Record<ProviderKind, string> = {
  copilot: "Copilot SDK",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
};

type DeepSeekModelMetadata = {
  label: string;
  contextWindow: string;
  maxOutput: string;
  pricing: PricingUnit;
  capabilities: string[];
};

export const deepSeekModelMetadata: Record<string, DeepSeekModelMetadata> = {
  "deepseek-chat": {
    label: "DeepSeek Chat",
    contextWindow: "128k",
    maxOutput: "8k",
    pricing: {
      input: "$0.28 / 1M miss",
      output: "$0.42 / 1M",
      note: "$0.028 / 1M cache hit",
    },
    capabilities: ["markdown", "json", "tools", "streaming"],
  },
  "deepseek-reasoner": {
    label: "DeepSeek Reasoner",
    contextWindow: "128k",
    maxOutput: "64k",
    pricing: {
      input: "$0.55 / 1M miss",
      output: "$2.19 / 1M",
      note: "$0.14 / 1M cache hit",
    },
    capabilities: ["reasoning", "markdown", "tools", "streaming"],
  },
};

const baseAgents: AgentDefinition[] = [
  {
    id: "agent-1",
    slot: 1,
    name: "Architect",
    initial: "A",
    color: "coral",
    provider: "copilot",
    modelId: "gpt-4.1",
  },
  {
    id: "agent-2",
    slot: 2,
    name: "Reviewer",
    initial: "R",
    color: "sky",
    provider: "openrouter",
    modelId: "anthropic/claude-sonnet-4.5",
  },
  {
    id: "agent-3",
    slot: 3,
    name: "Security",
    initial: "S",
    color: "emerald",
    provider: "deepseek",
    modelId: "deepseek-reasoner",
  },
  {
    id: "agent-4",
    slot: 4,
    name: "Planner",
    initial: "P",
    color: "amber",
    provider: "copilot",
    modelId: "o4-mini",
  },
  {
    id: "agent-5",
    slot: 5,
    name: "Operator",
    initial: "O",
    color: "violet",
    provider: "openrouter",
    modelId: "google/gemini-2.0-flash",
  },
];

export function getDefaultAgents(count: number): AgentDefinition[] {
  return baseAgents.slice(0, count);
}

export const defaultModerator: ModeratorDefinition = {
  provider: "copilot",
  modelId: "gpt-4.1",
};

export const forumSummaries: ForumSummary[] = [];

export const defaultForumDraft: CreateForumDraft = {
  title: "Agora implementation plan",
  idea:
    "Design the first production architecture for Agora: a self-hosted system that lets a moderator and multiple AI agents clarify requirements, debate solutions, and co-author Markdown deliverables with anchored comments and export packaging.",
  requestedDocuments:
    "- Product architecture overview\n- Backend workflow design\n- Data model and persistence plan\n- Deployment guide for Docker Compose\n- Risks and mitigation register",
  moderator: defaultModerator,
  agentCount: 3,
  agents: getDefaultAgents(3),
};
