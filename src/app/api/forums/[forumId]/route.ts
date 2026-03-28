import { applyForumAction, getForumById } from "@/lib/forum-store";
import type { ClarificationAnswer } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ forumId: string }> },
) {
  const { forumId } = await context.params;
  const forum = await getForumById(forumId);

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
    const forum =
      payload.action === "submit-clarification"
        ? await applyForumAction(forumId, {
            type: payload.action,
            answers: payload.answers ?? [],
          })
        : await applyForumAction(forumId, {
            type: payload.action,
          });

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
