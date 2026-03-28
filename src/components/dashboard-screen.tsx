"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ForumCard } from "@/components/forum-card";
import { usePreferences } from "@/components/preferences-provider";
import type { DashboardMetric, ForumSummary } from "@/lib/domain";

function buildDashboardMetrics(
  forums: ForumSummary[],
  copy: ReturnType<typeof usePreferences>["copy"],
): DashboardMetric[] {
  const totalForums = forums.length;
  const activeForums = forums.filter(
    (forum) => forum.status !== "completed" && forum.status !== "paused",
  ).length;
  const needsAttention = forums.filter(
    (forum) => forum.status === "clarification" || forum.status === "review",
  ).length;
  const requestedDocuments = forums.reduce(
    (total, forum) => total + forum.documentsRequested,
    0,
  );

  return [
    {
      id: "total",
      label: copy.dashboardMetrics.totalLabel,
      value: String(totalForums),
      detail: copy.dashboardMetrics.totalDetail,
    },
    {
      id: "active",
      label: copy.dashboardMetrics.activeLabel,
      value: String(activeForums),
      detail: copy.dashboardMetrics.activeDetail,
    },
    {
      id: "attention",
      label: copy.dashboardMetrics.attentionLabel,
      value: String(needsAttention),
      detail: copy.dashboardMetrics.attentionDetail,
    },
    {
      id: "documents",
      label: copy.dashboardMetrics.documentsLabel,
      value: String(requestedDocuments),
      detail: copy.dashboardMetrics.documentsDetail,
    },
  ];
}

export function DashboardScreen({ forums }: { forums: ForumSummary[] }) {
  const { copy } = usePreferences();
  const metrics = buildDashboardMetrics(forums, copy);

  return (
    <AppShell>
      <section className="hero-grid">
        <div className="hero-panel">
          <span className="eyebrow">{copy.heroEyebrow}</span>
          <h1 className="hero-title">{copy.heroTitle}</h1>
          <p className="hero-body">{copy.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/forums/new" className="primary-button">
              {copy.heroPrimary}
            </Link>
            <Link href="/brief" className="secondary-button">
              {copy.heroSecondary}
            </Link>
          </div>
        </div>

        <aside className="signal-panel">
          <div className="panel-heading">
            <p className="panel-kicker">{copy.metricsTitle}</p>
            <h2 className="panel-title">Implementation slice</h2>
          </div>
          <div className="grid gap-3">
            {metrics.map((metric) => (
              <div key={metric.id} className="signal-card">
                <p className="text-sm text-(--text-muted)">{metric.label}</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <strong className="font-display text-3xl tracking-tight text-foreground">
                    {metric.value}
                  </strong>
                  <span className="max-w-32 text-right text-xs leading-5 text-(--text-muted)">
                    {metric.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-header-row">
          <div>
            <p className="panel-kicker">{copy.forumsTitle}</p>
            <h2 className="section-title">{copy.forumsSubtitle}</h2>
          </div>
          <Link href="/forums/new" className="secondary-button">
            {copy.navNewForum}
          </Link>
        </div>
        <div className="grid gap-4">
          {forums.length > 0 ? (
            forums.map((forum) => <ForumCard key={forum.id} forum={forum} />)
          ) : (
            <div className="signal-card px-6 py-8">
              <h5 className="font-display text-xl tracking-tight text-foreground">
                {copy.forumsEmptyTitle}
              </h5>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
