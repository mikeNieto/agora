export type ThemeMode = "light" | "dark";
export type AppLanguage = "en" | "es";

export type ProviderKind = "copilot" | "openrouter" | "deepseek";
export type ForumStatus =
  | "draft"
  | "clarification"
  | "review"
  | "debating"
  | "completed"
  | "paused"
  | "stopped";
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
  preferredAnswer: string;
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

export type DebateStage =
  | "idle"
  | "brainstorming"
  | "documentation"
  | "completed"
  | "stopped";

export type DebateDocumentStatus = "pending" | "active" | "closed";

export type DebateContextPhase =
  | "understanding"
  | "brainstorming"
  | "documentation";

export type DebateContextRole =
  | "system"
  | "moderator"
  | "agent"
  | "document"
  | "summary";

export type DebateContextEntry = {
  id: string;
  phase: DebateContextPhase;
  role: DebateContextRole;
  content: string;
  estimatedTokens?: number;
  pinned?: boolean;
};

export type DebateContextSnapshot = {
  entries: DebateContextEntry[];
  usageTokens: number;
  usageRatio: number;
  warningRatio: number;
  contextWindowLabel: string;
  compactionMode: ModeratorContextCompactionMode;
  compactionEvents: number;
  handledBySdk: boolean;
};

export type BrainstormTurn = {
  id: string;
  agentId: string;
  agentName: string;
  summary: string;
  markdown: string;
  createdAt: string;
  order: number;
};

export type BrainstormRound = {
  round: number;
  turnOrder: string[];
  turns: BrainstormTurn[];
  moderatorSummary: string;
  unresolvedTopics: string[];
  consensusReached: boolean;
  forcedClosure: boolean;
  createdAt: string;
};

export type DocumentComment = {
  id: string;
  agentId: string;
  agentName: string;
  anchor: string;
  text: string;
  createdAt: string;
  round: number;
};

export type DocumentTurn = {
  id: string;
  round: number;
  agentId: string;
  agentName: string;
  role: "author" | "editor" | "critic";
  summary: string;
  markdown: string;
  comments: DocumentComment[];
  createdAt: string;
  order: number;
};

export type DocumentRound = {
  round: number;
  turnOrder: string[];
  turns: DocumentTurn[];
  moderatorSummary: string;
  unresolvedTopics: string[];
  closed: boolean;
  forcedClosure: boolean;
  createdAt: string;
};

export type DebateDocument = {
  id: string;
  title: string;
  order: number;
  status: DebateDocumentStatus;
  currentRound: number;
  maxRounds: number;
  assignedAgentIds: string[];
  rounds: DocumentRound[];
  latestMarkdown: string;
  finalMarkdown: string;
  comments: DocumentComment[];
  moderatorSummary: string;
  unresolvedTopics: string[];
  closedAt?: string;
};

export type DebateState = {
  systemPrompt: string;
  currentStage: DebateStage;
  brainstormMaxRounds: number;
  documentMaxRounds: number;
  currentBrainstormRound: number;
  brainstormSummary: string;
  brainstormRounds: BrainstormRound[];
  currentDocumentIndex: number;
  documents: DebateDocument[];
  moderatorContext: DebateContextSnapshot;
  lastUpdatedAt: string;
  stopRequestedAt?: string;
};

export type ForumActivityKind =
  | "created"
  | "clarification-requested"
  | "clarification-submitted"
  | "review-ready"
  | "debate-started"
  | "debate-progress"
  | "paused"
  | "resumed"
  | "stopped"
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
  debate: DebateState | null;
};
