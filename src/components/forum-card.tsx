"use client";

import Link from "next/link";
import { usePreferences } from "@/components/preferences-provider";
import type { ForumSummary } from "@/lib/domain";

export function ForumCard({ forum }: { forum: ForumSummary }) {
  const { copy } = usePreferences();

  return (
    <article className="forum-card">
      <div className="forum-card__accent" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`status-badge status-badge--${forum.status}`}>
              {copy.statuses[forum.status]}
            </span>
            <span className="text-xs text-(--text-muted)">
              {forum.updatedAt}
            </span>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {forum.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-secondary)">
              {forum.summary}
            </p>
          </div>
        </div>
        <Link className="secondary-button" href={`/forums/${forum.id}`}>
          {copy.openFlowButton}
        </Link>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-(--text-secondary) sm:grid-cols-3">
        <div className="metric-chip">
          <span>{copy.metricAgents}</span>
          <strong>{forum.agentCount}</strong>
        </div>
        <div className="metric-chip">
          <span>{copy.metricDocs}</span>
          <strong>{forum.documentsRequested}</strong>
        </div>
        <div className="metric-chip">
          <span>{copy.metricRounds}</span>
          <strong>{forum.roundsCompleted}</strong>
        </div>
      </div>
    </article>
  );
}
