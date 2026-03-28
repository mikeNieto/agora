import { DashboardScreen } from "@/components/dashboard-screen";
import { listForumSummaries } from "@/lib/forum-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const forums = await listForumSummaries();
  return <DashboardScreen forums={forums} />;
}
