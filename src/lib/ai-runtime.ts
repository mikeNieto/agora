import "server-only";

import { approveAll } from "@github/copilot-sdk";
import type {
  AgentDefinition,
  ModeratorDefinition,
  ProviderKind,
} from "@/lib/domain";
import { createCopilotClient } from "@/lib/model-catalog";
import type { ProviderSecrets } from "@/lib/provider-settings";

type ParticipantDefinition = Pick<ModeratorDefinition, "provider" | "modelId">;

export async function generateParticipantText(
  participant: ParticipantDefinition,
  providerSecrets: ProviderSecrets,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  if (participant.provider === "copilot") {
    return runCopilotPrompt(participant, providerSecrets, systemPrompt, prompt);
  }

  if (participant.provider === "openrouter") {
    const apiKey =
      providerSecrets.openrouterApiKey ?? process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenRouter model selected, but no OpenRouter API key is configured.",
      );
    }

    return runOpenAiCompatiblePrompt({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      modelId: participant.modelId,
      prompt,
      systemPrompt,
      providerLabel: "OpenRouter",
      provider: participant.provider,
    });
  }

  const apiKey = providerSecrets.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "DeepSeek model selected, but no DeepSeek API key is configured.",
    );
  }

  return runOpenAiCompatiblePrompt({
    endpoint: "https://api.deepseek.com/chat/completions",
    apiKey,
    modelId: participant.modelId,
    prompt,
    systemPrompt,
    providerLabel: "DeepSeek",
    provider: participant.provider,
  });
}

export async function generateAgentText(
  agent: AgentDefinition,
  providerSecrets: ProviderSecrets,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  return generateParticipantText(agent, providerSecrets, systemPrompt, prompt);
}

export function extractJsonObject(value: string) {
  const normalized = value.trim();
  const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const source = fenceMatch?.[1]?.trim() ?? normalized;
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("The model response did not contain a JSON object.");
  }

  return source.slice(firstBrace, lastBrace + 1);
}

export function extractJsonArray(value: string) {
  const normalized = value.trim();
  const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const source = fenceMatch?.[1]?.trim() ?? normalized;
  const firstBracket = source.indexOf("[");
  const lastBracket = source.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error("The model response did not contain a JSON array.");
  }

  return source.slice(firstBracket, lastBracket + 1);
}

async function runCopilotPrompt(
  participant: ParticipantDefinition,
  providerSecrets: ProviderSecrets,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  const { client } = createCopilotClient(providerSecrets);

  try {
    await client.start();
    const auth = await client.getAuthStatus();

    if (!auth.isAuthenticated) {
      throw new Error(
        auth.statusMessage ??
          "Copilot CLI is not authenticated for the selected model.",
      );
    }

    const session = await client.createSession({
      model: participant.modelId,
      onPermissionRequest: approveAll,
      systemMessage: {
        content: systemPrompt,
      },
    });

    try {
      const response = await session.sendAndWait({ prompt }, 120000);
      const content = response?.data.content?.trim();

      if (!content) {
        throw new Error("The model did not return any content.");
      }

      return content;
    } finally {
      await session.disconnect();
    }
  } finally {
    try {
      await client.stop();
    } catch {
      await client.forceStop().catch(() => undefined);
    }
  }
}

async function runOpenAiCompatiblePrompt({
  endpoint,
  apiKey,
  modelId,
  prompt,
  systemPrompt,
  providerLabel,
  provider,
}: {
  endpoint: string;
  apiKey: string;
  modelId: string;
  prompt: string;
  systemPrompt: string;
  providerLabel: string;
  provider: ProviderKind;
}): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(provider === "openrouter"
        ? {
            "HTTP-Referer": "https://agora.local",
            "X-Title": "Agora",
          }
        : {}),
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${providerLabel} returned ${response.status} while generating model output.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((entry) => entry.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error(`${providerLabel} returned an empty model response.`);
}