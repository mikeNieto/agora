import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
	readProviderSecrets,
	writeProviderSecrets,
} from "@/lib/provider-settings.secure";

export type ProviderSecrets = {
	githubToken?: string;
	openrouterApiKey?: string;
	deepseekApiKey?: string;
};

export type ProviderSettingsStatus = {
	githubTokenConfigured: boolean;
	openrouterConfigured: boolean;
	deepseekConfigured: boolean;
};

const PROVIDER_SESSION_COOKIE = "agora-provider-session";

export async function getProviderSecrets(): Promise<ProviderSecrets> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(PROVIDER_SESSION_COOKIE)?.value;

	if (!sessionId) {
		return {};
	}

	return readProviderSecrets(sessionId);
}

export async function getProviderSettingsStatus(): Promise<ProviderSettingsStatus> {
	const secrets = await getProviderSecrets();

	return {
		githubTokenConfigured: Boolean(secrets.githubToken),
		openrouterConfigured: Boolean(secrets.openrouterApiKey),
		deepseekConfigured: Boolean(secrets.deepseekApiKey),
	};
}

export async function saveProviderSettings(input: {
	githubToken?: string;
	clearGithubToken?: boolean;
	openrouterApiKey?: string;
	clearOpenRouterApiKey?: boolean;
	deepseekApiKey?: string;
	clearDeepSeekApiKey?: boolean;
}): Promise<ProviderSettingsStatus> {
	const cookieStore = await cookies();
	let sessionId = cookieStore.get(PROVIDER_SESSION_COOKIE)?.value;

	if (!sessionId) {
		sessionId = randomUUID();
		cookieStore.set(PROVIDER_SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
		});
	}

	const current = await readProviderSecrets(sessionId);
	const next: ProviderSecrets = { ...current };
	const normalizedGithubToken = input.githubToken?.trim();
	const normalizedOpenRouterApiKey = input.openrouterApiKey?.trim();
	const normalizedDeepSeekApiKey = input.deepseekApiKey?.trim();

	if (input.clearGithubToken) {
		delete next.githubToken;
	} else if (normalizedGithubToken) {
		next.githubToken = normalizedGithubToken;
	}

	if (input.clearOpenRouterApiKey) {
		delete next.openrouterApiKey;
	} else if (normalizedOpenRouterApiKey) {
		next.openrouterApiKey = normalizedOpenRouterApiKey;
	}

	if (input.clearDeepSeekApiKey) {
		delete next.deepseekApiKey;
	} else if (normalizedDeepSeekApiKey) {
		next.deepseekApiKey = normalizedDeepSeekApiKey;
	}

	await writeProviderSecrets(sessionId, next);

	return {
		githubTokenConfigured: Boolean(next.githubToken),
		openrouterConfigured: Boolean(next.openrouterApiKey),
		deepseekConfigured: Boolean(next.deepseekApiKey),
	};
}
