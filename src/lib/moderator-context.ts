import type {
  ModelCatalogEntry,
  ModeratorContextCompactionMode,
  ModeratorDefinition,
  ProviderCatalogMap,
  ProviderKind,
} from "@/lib/domain";

export const MODERATOR_CONTEXT_WARNING_RATIO = 0.6;
const COPILOT_BUFFER_EXHAUSTION_RATIO = 0.6;
const APP_MANAGED_RECENT_ENTRY_COUNT = 6;

export type ModeratorContextPhase =
  | "clarification"
  | "understanding"
  | "brainstorming"
  | "documentation";

export type ModeratorContextRole =
  | "system"
  | "user"
  | "moderator"
  | "agent"
  | "document"
  | "summary";

export type ModeratorContextEntry = {
  id: string;
  phase: ModeratorContextPhase;
  role: ModeratorContextRole;
  content: string;
  estimatedTokens?: number;
  pinned?: boolean;
};

export type ModeratorContextPolicy = {
  provider: ProviderKind;
  modelId: string;
  contextWindowLabel: string;
  maxContextTokens?: number;
  warningRatio: number;
  warningTokens?: number;
  compactionMode: ModeratorContextCompactionMode;
  copilotInfiniteSessionConfig?:
    | {
        enabled: true;
        backgroundCompactionThreshold: number;
        bufferExhaustionThreshold: number;
      }
    | undefined;
};

export type ModeratorContextState = {
  policy: ModeratorContextPolicy;
  entries: ModeratorContextEntry[];
  usageTokens: number;
  usageRatio: number;
};

export type ModeratorContextCompactionResult = {
  state: ModeratorContextState;
  triggered: boolean;
  mode: ModeratorContextCompactionMode;
  handledBySdk: boolean;
};

export function getModeratorContextPolicy(
  moderator: ModeratorDefinition,
  modelCatalogs?: Partial<ProviderCatalogMap>,
): ModeratorContextPolicy {
  const selectedModel = findSelectedModel(moderator, modelCatalogs);
  const maxContextTokens = parseTokenCount(selectedModel?.contextWindow);

  return {
    provider: moderator.provider,
    modelId: moderator.modelId,
    contextWindowLabel: selectedModel?.contextWindow ?? "n/a",
    maxContextTokens,
    warningRatio: MODERATOR_CONTEXT_WARNING_RATIO,
    warningTokens:
      typeof maxContextTokens === "number"
        ? Math.floor(maxContextTokens * MODERATOR_CONTEXT_WARNING_RATIO)
        : undefined,
    compactionMode: getModeratorCompactionMode(moderator.provider),
    copilotInfiniteSessionConfig:
      moderator.provider === "copilot"
        ? {
            enabled: true,
            backgroundCompactionThreshold: MODERATOR_CONTEXT_WARNING_RATIO,
            bufferExhaustionThreshold: COPILOT_BUFFER_EXHAUSTION_RATIO,
          }
        : undefined,
  };
}

export function buildModeratorContextState(
  moderator: ModeratorDefinition,
  entries: ModeratorContextEntry[],
  modelCatalogs?: Partial<ProviderCatalogMap>,
): ModeratorContextState {
  const policy = getModeratorContextPolicy(moderator, modelCatalogs);
  const usageTokens = entries.reduce(
    (total, entry) => total + getEntryTokenEstimate(entry),
    0,
  );

  return {
    policy,
    entries,
    usageTokens,
    usageRatio:
      typeof policy.maxContextTokens === "number" && policy.maxContextTokens > 0
        ? usageTokens / policy.maxContextTokens
        : 0,
  };
}

export function shouldCompactModeratorContext(
  state: ModeratorContextState,
  pendingTokens = 0,
): boolean {
  if (typeof state.policy.warningTokens === "number") {
    return state.usageTokens + pendingTokens >= state.policy.warningTokens;
  }

  return false;
}

export function compactModeratorContext(
  state: ModeratorContextState,
): ModeratorContextCompactionResult {
  if (!shouldCompactModeratorContext(state)) {
    return {
      state,
      triggered: false,
      mode: state.policy.compactionMode,
      handledBySdk: state.policy.compactionMode === "sdk-managed",
    };
  }

  if (state.policy.compactionMode === "sdk-managed") {
    return {
      state,
      triggered: true,
      mode: state.policy.compactionMode,
      handledBySdk: true,
    };
  }

  const pinnedEntries = state.entries.filter((entry) => entry.pinned);
  const nonPinnedEntries = state.entries.filter((entry) => !entry.pinned);
  const retainedEntries = nonPinnedEntries.slice(-APP_MANAGED_RECENT_ENTRY_COUNT);
  const compactedEntries = nonPinnedEntries.slice(
    0,
    Math.max(0, nonPinnedEntries.length - APP_MANAGED_RECENT_ENTRY_COUNT),
  );

  if (compactedEntries.length === 0) {
    return {
      state,
      triggered: false,
      mode: state.policy.compactionMode,
      handledBySdk: false,
    };
  }

  return {
    state: buildModeratorContextState(
      {
        provider: state.policy.provider,
        modelId: state.policy.modelId,
      },
      [
        ...pinnedEntries,
        {
          id: "moderator-compaction-summary",
          phase: retainedEntries[0]?.phase ?? "brainstorming",
          role: "summary",
          content: summarizeEntries(compactedEntries),
          pinned: true,
        },
        ...retainedEntries,
      ],
      buildCatalogMap(state),
    ),
    triggered: true,
    mode: state.policy.compactionMode,
    handledBySdk: false,
  };
}

export function replaceClarificationWithUnderstanding(
  state: ModeratorContextState,
  understandingDocument: string,
): ModeratorContextState {
  const nextEntries = state.entries.filter(
    (entry) =>
      (entry.pinned || entry.phase !== "clarification") &&
      entry.id !== "understanding-document",
  );

  nextEntries.push({
    id: "understanding-document",
    phase: "understanding",
    role: "document",
    content: understandingDocument,
    pinned: true,
  });

  const nextState = buildModeratorContextState(
    {
      provider: state.policy.provider,
      modelId: state.policy.modelId,
    },
    nextEntries,
    buildCatalogMap(state),
  );

  return compactModeratorContext(nextState).state;
}

export function describeModeratorCompactionMode(
  mode: ModeratorContextCompactionMode,
): string {
  return mode === "sdk-managed"
    ? "Copilot SDK automatic compaction"
    : "App-managed compaction";
}

function getEntryTokenEstimate(entry: ModeratorContextEntry): number {
  return entry.estimatedTokens ?? estimateTokenCount(entry.content);
}

function estimateTokenCount(value: string): number {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return 0;
  }

  return Math.ceil(normalized.length / 4);
}

function parseTokenCount(value?: string): number | undefined {
  if (!value || value === "n/a") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const multiplier = normalized.endsWith("m")
    ? 1_000_000
    : normalized.endsWith("k")
      ? 1_000
      : 1;
  const numericValue = Number.parseFloat(normalized.replace(/[mk]$/u, ""));

  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  return Math.round(numericValue * multiplier);
}

function getModeratorCompactionMode(
  provider: ProviderKind,
): ModeratorContextCompactionMode {
  return provider === "copilot" ? "sdk-managed" : "app-managed";
}

function findSelectedModel(
  moderator: ModeratorDefinition,
  modelCatalogs?: Partial<ProviderCatalogMap>,
): ModelCatalogEntry | undefined {
  return modelCatalogs?.[moderator.provider]?.models.find(
    (model) => model.id === moderator.modelId,
  );
}

function summarizeEntries(entries: ModeratorContextEntry[]): string {
  const highlights = entries
    .map((entry) => {
      const line = entry.content
        .replace(/\s+/gu, " ")
        .trim()
        .slice(0, 180);

      return line.length > 0 ? `- ${line}` : undefined;
    })
    .filter((line): line is string => Boolean(line))
    .slice(-6);

  return [
    "Compacted moderator context summary.",
    ...highlights,
  ].join("\n");
}

function buildCatalogMap(
  state: ModeratorContextState,
): Partial<ProviderCatalogMap> | undefined {
  if (!state.policy.contextWindowLabel || state.policy.contextWindowLabel === "n/a") {
    return undefined;
  }

  return {
    [state.policy.provider]: {
      models: [
        {
          id: state.policy.modelId,
          provider: state.policy.provider,
          label: state.policy.modelId,
          contextWindow: state.policy.contextWindowLabel,
          maxOutput: "n/a",
          capabilities: [],
        },
      ],
    },
  } as Partial<ProviderCatalogMap>;
}
