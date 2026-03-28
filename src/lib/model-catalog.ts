import "server-only";

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CopilotClient } from "@github/copilot-sdk";
import type { ModelInfo } from "@github/copilot-sdk";
import { deepSeekModelMetadata } from "@/lib/constants";
import type {
  ModelCatalogEntry,
  ProviderCatalogMap,
  ProviderCatalogState,
} from "@/lib/domain";
import type { ProviderSecrets } from "@/lib/provider-settings";

const EMPTY_RESULT: ProviderCatalogState = { models: [] };

type OpenRouterModel = {
  id: string;
  name: string;
  created?: number;
  context_length?: number;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
};

type OpenRouterResponse = {
  data?: OpenRouterModel[];
};

type DeepSeekModel = {
  id: string;
};

type DeepSeekResponse = {
  data?: DeepSeekModel[];
};

export type CopilotConnectionStatus = {
  connected: boolean;
  mode: "stored-token" | "cli-login";
  authType?: string;
  login?: string;
  message: string;
};

export async function loadModelCatalogs(
  providerSecrets: ProviderSecrets = {},
): Promise<ProviderCatalogMap> {
  const [copilot, openrouter, deepseek] = await Promise.all([
    loadCopilotModels(providerSecrets),
    loadOpenRouterModels(providerSecrets),
    loadDeepSeekModels(providerSecrets),
  ]);

  return {
    copilot,
    openrouter,
    deepseek,
  };
}

async function loadCopilotModels(
  providerSecrets: ProviderSecrets,
): Promise<ProviderCatalogState> {
  let client: CopilotClient | undefined;

  try {
    client = createCopilotClient(providerSecrets).client;
    await client.start();
    const auth = await client.getAuthStatus();

    if (!auth.isAuthenticated) {
      return {
        ...EMPTY_RESULT,
        error:
          auth.statusMessage ??
          "Copilot CLI is available but not authenticated for this server user. Run `copilot login` in the same environment as the app.",
      };
    }

    const models = await client.listModels();

    if (models.length === 0) {
      return {
        ...EMPTY_RESULT,
        error:
          "Copilot CLI authenticated successfully, but no models were returned by the SDK.",
      };
    }

    return {
      models: models.map(normalizeCopilotModel),
    };
  } catch (error) {
    return {
      ...EMPTY_RESULT,
      error: getErrorMessage(
        error,
        "Unable to load Copilot SDK models. Make sure Copilot CLI is installed and authenticated in this server environment.",
      ),
    };
  } finally {
    if (client) {
      try {
        await client.stop();
      } catch {
        await client.forceStop().catch(() => undefined);
      }
    }
  }
}

export async function getCopilotConnectionStatus(
  providerSecrets: ProviderSecrets = {},
): Promise<CopilotConnectionStatus> {
  let client: CopilotClient | undefined;
  let mode: "stored-token" | "cli-login" = "cli-login";

  try {
    const config = createCopilotClient(providerSecrets);
    client = config.client;
    mode = config.mode;
    await client.start();
    const auth = await client.getAuthStatus();

    return {
      connected: auth.isAuthenticated,
      mode,
      authType: auth.authType,
      login: auth.login,
      message:
        auth.statusMessage ??
        (auth.isAuthenticated
          ? "Copilot CLI session detected."
          : "Copilot CLI is not authenticated for this server user."),
    };
  } catch (error) {
    return {
      connected: false,
      mode,
      message: getErrorMessage(
        error,
        "Unable to query Copilot CLI authentication status.",
      ),
    };
  } finally {
    if (client) {
      try {
        await client.stop();
      } catch {
        await client.forceStop().catch(() => undefined);
      }
    }
  }
}

function createCopilotClient(providerSecrets: ProviderSecrets = {}) {
  const hasStoredToken = Boolean(providerSecrets.githubToken);
  const cliPath = resolveCopilotCliPath();

  return {
    mode: hasStoredToken ? "stored-token" as const : "cli-login" as const,
    client: new CopilotClient({
      ...(cliPath ? { cliPath } : {}),
      ...(hasStoredToken
        ? {
            githubToken: providerSecrets.githubToken,
            useLoggedInUser: false,
          }
        : {
            useLoggedInUser: true,
          }),
      useStdio: false,
      logLevel: "error",
    }),
  };
}

function resolveCopilotCliPath(): string | undefined {
  const envPath = process.env.COPILOT_CLI_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const homeDir = os.homedir();
  const candidates = [
    path.join(
      homeDir,
      "Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot",
    ),
    path.join(
      homeDir,
      "Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat/copilotCli/copilot",
    ),
    path.join(
      homeDir,
      ".vscode/extensions/github.copilot-chat/copilotCli/copilot",
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const resolved = execFileSync("/bin/zsh", ["-lc", "command -v copilot"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (resolved && existsSync(resolved)) {
      return resolved;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function loadOpenRouterModels(
  providerSecrets: ProviderSecrets,
): Promise<ProviderCatalogState> {
  const apiKey =
    providerSecrets.openrouterApiKey ?? process.env.OPENROUTER_API_KEY;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/models?output_modalities=text",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(apiKey
            ? {
                Authorization: `Bearer ${apiKey}`,
              }
            : {}),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}.`);
    }

    const payload = (await response.json()) as OpenRouterResponse;
    const models = (payload.data ?? []).map((model, index) =>
      normalizeOpenRouterModel(model, index),
    );

    return { models };
  } catch (error) {
    return {
      ...EMPTY_RESULT,
      error: getErrorMessage(
        error,
        "Unable to load OpenRouter models.",
      ),
    };
  }
}

async function loadDeepSeekModels(
  providerSecrets: ProviderSecrets,
): Promise<ProviderCatalogState> {
  const apiKey = providerSecrets.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return {
      ...EMPTY_RESULT,
      error: "Add a DeepSeek API key in Settings or set DEEPSEEK_API_KEY to load DeepSeek models.",
    };
  }

  try {
    const response = await fetch("https://api.deepseek.com/models", {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`DeepSeek returned ${response.status}.`);
    }

    const payload = (await response.json()) as DeepSeekResponse;
    const models = (payload.data ?? []).map(normalizeDeepSeekModel);

    return { models };
  } catch (error) {
    return {
      ...EMPTY_RESULT,
      error: getErrorMessage(error, "Unable to load DeepSeek models."),
    };
  }
}

function normalizeCopilotModel(model: ModelInfo): ModelCatalogEntry {
  const capabilities = ["markdown"];

  if (model.capabilities.supports.reasoningEffort) {
    capabilities.push("reasoning");
  }

  if (model.capabilities.supports.vision) {
    capabilities.push("vision");
  }

  return {
    id: model.id,
    provider: "copilot",
    label: model.name,
    contextWindow: formatTokenCount(
      model.capabilities.limits.max_context_window_tokens,
    ),
    maxOutput: "n/a",
    relativeCost:
      typeof model.billing?.multiplier === "number"
        ? `${trimTrailingZeros(model.billing.multiplier)}x`
        : undefined,
    capabilities,
  };
}

function normalizeOpenRouterModel(
  model: OpenRouterModel,
  index: number,
): ModelCatalogEntry {
  return {
    id: model.id,
    provider: "openrouter",
    label: model.name,
    contextWindow: formatTokenCount(
      model.top_provider?.context_length ?? model.context_length,
    ),
    maxOutput: formatTokenCount(model.top_provider?.max_completion_tokens),
    pricing: {
      input: formatUsdPerMillion(model.pricing?.prompt),
      output: formatUsdPerMillion(model.pricing?.completion),
    },
    capabilities: model.supported_parameters ?? [],
    createdAt: model.created,
    providerRank: index,
  };
}

function normalizeDeepSeekModel(model: DeepSeekModel): ModelCatalogEntry {
  const metadata = deepSeekModelMetadata[model.id];

  return {
    id: model.id,
    provider: "deepseek",
    label: metadata?.label ?? humanizeModelId(model.id),
    contextWindow: metadata?.contextWindow ?? "n/a",
    maxOutput: metadata?.maxOutput ?? "n/a",
    pricing: metadata?.pricing,
    capabilities: metadata?.capabilities ?? [],
  };
}

function formatTokenCount(value?: number): string {
  if (!value || !Number.isFinite(value)) {
    return "n/a";
  }

  if (value >= 1_000_000) {
    return `${trimTrailingZeros(value / 1_000_000)}M`;
  }

  if (value >= 1_000) {
    return `${trimTrailingZeros(value / 1_000)}k`;
  }

  return String(value);
}

function formatUsdPerMillion(value?: string): string {
  const numeric = Number(value ?? "0");

  if (!Number.isFinite(numeric)) {
    return "n/a";
  }

  const perMillion = numeric * 1_000_000;
  return `$${trimTrailingZeros(perMillion)} / 1M`;
}

function trimTrailingZeros(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(value >= 1 ? 2 : 4)
    .replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/u, "");
}

function humanizeModelId(modelId: string): string {
  return (
    modelId
      .split("/")
      .at(-1)
      ?.split("-")
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ") ?? modelId
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}