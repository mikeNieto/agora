import { CreateForumScreen } from "@/components/create-forum-screen";
import { defaultForumDraft } from "@/lib/constants";

export const runtime = "nodejs";

export default function NewForumPage() {
  return <CreateForumScreen initialDraft={defaultForumDraft} />;
}
