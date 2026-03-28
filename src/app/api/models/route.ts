import { loadModelCatalogs } from "@/lib/model-catalog";
import { getProviderSecrets } from "@/lib/provider-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providerSecrets = await getProviderSecrets();
  const modelCatalogs = await loadModelCatalogs(providerSecrets);

  return Response.json({ modelCatalogs });
}