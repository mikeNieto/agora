export type ThemeMode = "light" | "dark";
export type AppLanguage = "en" | "es";

export type ProviderKind = "copilot" | "openrouter" | "deepseek";
export type ForumStatus =
  | "draft"
  | "clarification"
  | "review"
  | "debating"
  | "completed"
  | "paused";
export type AgentColor =
  | "coral"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "rose";

export type PricingUnit = {
  input: string;
  output: string;
  note?: string;
};

export type ModelCatalogEntry = {
  id: string;
  provider: ProviderKind;
  label: string;
  contextWindow: string;
  maxOutput: string;
  relativeCost?: string;
  pricing?: PricingUnit;
  capabilities: string[];
  createdAt?: number;
  providerRank?: number;
};

export type ProviderCatalogState = {
  models: ModelCatalogEntry[];
  error?: string;
};

export type ProviderCatalogMap = Record<ProviderKind, ProviderCatalogState>;
export type OpenRouterSortMode = "popular" | "newest";

export type AgentDefinition = {
  id: string;
  slot: number;
  name: string;
  initial: string;
  color: AgentColor;
  provider: ProviderKind;
  modelId: string;
};

export type ModeratorDefinition = {
  provider: ProviderKind;
  modelId: string;
};

export type ModeratorContextCompactionMode = "sdk-managed" | "app-managed";

export type ForumSummary = {
  id: string;
  title: string;
  summary: string;
  status: ForumStatus;
  updatedAt: string;
  documentsRequested: number;
  roundsCompleted: number;
  agentCount: number;
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type CreateForumDraft = {
  title: string;
  idea: string;
  requestedDocuments: string;
  moderator: ModeratorDefinition;
  agentCount: number;
  agents: AgentDefinition[];
};

export type ClarificationQuestion = {
  id: string;
  prompt: string;
  rationale: string;
  suggestedAnswers: string[];
};

export type ClarificationAnswer = {
  questionId: string;
  answer: string;
};

export type ClarificationRoundAnswer = ClarificationAnswer & {
  prompt: string;
};

export type ClarificationRound = {
  round: number;
  answers: ClarificationRoundAnswer[];
  submittedAt: string;
};

export type ForumActivityKind =
  | "created"
  | "clarification-requested"
  | "clarification-submitted"
  | "review-ready"
  | "debate-started"
  | "paused"
  | "resumed"
  | "completed";

export type ForumActivityEntry = {
  id: string;
  kind: ForumActivityKind;
  message: string;
  createdAt: string;
};

export type ForumRecord = {
  id: string;
  title: string;
  summary: string;
  idea: string;
  requestedDocuments: string[];
  moderator: ModeratorDefinition;
  agentCount: number;
  agents: AgentDefinition[];
  status: ForumStatus;
  createdAt: string;
  updatedAt: string;
  documentsRequested: number;
  roundsCompleted: number;
  clarificationRound: number;
  maxClarificationRounds: number;
  clarificationQuestions: ClarificationQuestion[];
  clarificationHistory: ClarificationRound[];
  understandingDraft: string;
  activity: ForumActivityEntry[];
};
