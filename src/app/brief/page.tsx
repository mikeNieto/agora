"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { usePreferences } from "@/components/preferences-provider";

const implementationSlices = [
  "Moderator-led clarification before any debate starts.",
  "Each forum now assigns a dedicated moderator model separate from the debating agents.",
  "Shared system prompt for all debating agents.",
  "The understanding document replaces prior clarification Q&A inside the moderator context.",
  "Moderator context compacts at 60% usage, with Copilot SDK infinite sessions or app-managed fallback behavior.",
  "Markdown-only artifacts with Mermaid for diagrams.",
  "SQLite metadata plus per-forum folders for logs and documents.",
  "Pause and stop semantics applied after the current turn.",
];

export default function BriefPage() {
  const { copy } = usePreferences();

  return (
    <AppShell>
      <section className="section-block space-y-6">
        <div className="max-w-3xl space-y-4">
          <span className="eyebrow">Product brief</span>
          <h1 className="hero-title max-w-4xl text-[clamp(2.4rem,4vw,4.4rem)]">
            Core implementation constraints pulled into the app.
          </h1>
          <p className="hero-body">
            This page does not replace the source document in
            product_definition, but it keeps the highest-impact requirements
            visible while the product is being implemented.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {implementationSlices.map((item) => (
            <article key={item} className="signal-card">
              <p className="text-sm leading-7 text-(--text-secondary)">
                {item}
              </p>
            </article>
          ))}
        </div>

        <div className="summary-panel space-y-4">
          <p className="panel-kicker">Current status</p>
          <h2 className="section-title">Phase 1 implementation is live.</h2>
          <p className="text-sm leading-7 text-(--text-secondary)">
            The active slice now covers the app shell, persisted forum
            creation, the clarification-to-review workflow, and stateful forum
            progression into debate, pause, resume, and completion. The
            remaining major slice is the fully automatic orchestration engine.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="primary-button" href="/forums/new">
              {copy.navNewForum}
            </Link>
            <Link className="secondary-button" href="/">
              {copy.navForums}
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
