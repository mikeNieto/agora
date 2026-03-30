import {
  createForum,
  listForumSummaries,
} from "@/lib/forum-store";
import type { CreateForumDraft } from "@/lib/domain";
import { getProviderSecrets } from "@/lib/provider-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const forums = await listForumSummaries();
  return Response.json({ forums });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | CreateForumDraft
    | null;

  if (!payload) {
    return Response.json(
      { error: "Invalid forum payload." },
      { status: 400 },
    );
  }

  try {
    const providerSecrets = await getProviderSecrets();
    const forum = await createForum(payload, providerSecrets);
    return Response.json({ forum }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create forum.",
      },
      { status: 400 },
    );
  }
}
