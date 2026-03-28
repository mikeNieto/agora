export const runtime = "nodejs";

import { getProviderSettingsStatus, saveProviderSettings } from "@/lib/provider-settings";

export async function GET() {
  const status = await getProviderSettingsStatus();

  return Response.json(status);
}

export async function PUT(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    githubToken?: string;
    clearGithubToken?: boolean;
    openrouterApiKey?: string;
    clearOpenRouterApiKey?: boolean;
    deepseekApiKey?: string;
    clearDeepSeekApiKey?: boolean;
  };

  const status = await saveProviderSettings(payload);

  return Response.json(status);
}
