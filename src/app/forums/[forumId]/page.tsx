import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ForumFlowScreen } from "@/components/forum-flow-screen";
import { getForumById } from "@/lib/forum-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ForumPage({
  params,
}: {
  params: Promise<{ forumId: string }>;
}) {
  const { forumId } = await params;
  const forum = await getForumById(forumId);

  if (!forum) {
    notFound();
  }

  return (
    <AppShell>
      <ForumFlowScreen initialForum={forum} />
    </AppShell>
  );
}
