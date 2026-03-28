import { getCopilotConnectionStatus } from "@/lib/model-catalog";
import { getProviderSecrets, getProviderSettingsStatus } from "@/lib/provider-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providerSecrets = await getProviderSecrets();
  const [providerStatus, copilotStatus] = await Promise.all([
    getProviderSettingsStatus(),
    getCopilotConnectionStatus(providerSecrets),
  ]);

  return Response.json({ providerStatus, copilotStatus });
}