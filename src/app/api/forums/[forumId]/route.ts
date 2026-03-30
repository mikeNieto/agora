import {
  applyForumAction,
  deleteForumById,
  ensureForumDebateIsRunning,
} from "@/lib/forum-store";
import type { ClarificationAnswer } from "@/lib/domain";
import { getProviderSecrets } from "@/lib/provider-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ forumId: string }> },
) {
  const { forumId } = await context.params;
  const providerSecrets = await getProviderSecrets();
  const forum = await ensureForumDebateIsRunning(forumId, providerSecrets);

  if (!forum) {
    return Response.json({ error: "Forum not found." }, { status: 404 });
  }

  return Response.json({ forum });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ forumId: string }> },
) {
  const { forumId } = await context.params;
  const payload = (await request.json().catch(() => null)) as
    | {
        action?:
          | "submit-clarification"
          | "start-debate"
          | "pause-debate"
          | "stop-debate"
          | "resume-debate"
          | "complete-forum";
        answers?: ClarificationAnswer[];
      }
    | null;

  if (!payload?.action) {
    return Response.json(
      { error: "A forum action is required." },
      { status: 400 },
    );
  }

  try {
    const providerSecrets = await getProviderSecrets();
    const forum =
      payload.action === "submit-clarification"
        ? await applyForumAction(forumId, {
            type: payload.action,
            answers: payload.answers ?? [],
          }, providerSecrets)
        : await applyForumAction(forumId, {
            type: payload.action,
          }, providerSecrets);

    return Response.json({ forum });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update forum.",
      },
      { status: error instanceof Error && error.message === "Forum not found." ? 404 : 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ forumId: string }> },
) {
  const { forumId } = await context.params;

  try {
    await deleteForumById(forumId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete forum.",
      },
      { status: error instanceof Error && error.message === "Forum not found." ? 404 : 400 },
    );
  }
}
