"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";
import type { ForumRecord, ForumStatus } from "@/lib/domain";

const FLOW_STAGES: ForumStatus[] = [
  "clarification",
  "review",
  "debating",
  "completed",
];

export function ForumFlowScreen({ initialForum }: { initialForum: ForumRecord }) {
  const { copy, language } = usePreferences();
  const [forum, setForum] = useState(initialForum);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialForum.clarificationQuestions.map((question) => [question.id, ""]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () =>
      language === "es"
        ? {
            title: "Flujo del foro",
            subtitle:
              "Esta vista ya usa estado persistido del servidor para clarificación, revisión y debate.",
            back: "Volver a foros",
            currentRound: "Ronda actual",
            maxRounds: "Máximo",
            overview: "Resumen del foro",
            understanding: "Borrador de entendimiento",
            activity: "Actividad",
            clarificationTitle: "Preguntas del moderador",
            clarificationBody:
              "Responde todas las preguntas para que el moderador actualice el documento de entendimiento.",
            clarificationSubmit: "Enviar respuestas",
            reviewTitle: "Revisión del entendimiento",
            reviewBody:
              "El foro ya cuenta con un borrador suficientemente claro. Puedes iniciar el debate cuando estés conforme.",
            startDebate: "Iniciar debate",
            debatingTitle: "Debate en curso",
            debatingBody:
              "En esta primera implementación el estado de debate ya es real y persistente, aunque la orquestación automática completa aún no está conectada.",
            pause: "Pausar debate",
            resume: "Reanudar debate",
            complete: "Completar foro",
            completedTitle: "Foro completado",
            completedBody:
              "El flujo quedó cerrado y el borrador de entendimiento se mantiene como brief final de esta etapa.",
            suggestionLabel: "Respuesta sugerida",
            customAnswer: "Respuesta libre",
            noActivity: "Todavía no hay actividad registrada.",
            updateError: "No fue posible actualizar el flujo del foro.",
            docsLabel: "Documentos",
            moderatorLabel: "Moderador",
            agentsLabel: "Agentes",
            statusLabel: "Estado",
          }
        : {
            title: "Forum flow",
            subtitle:
              "This screen now uses persisted server state for clarification, review, and debate.",
            back: "Back to forums",
            currentRound: "Current round",
            maxRounds: "Max",
            overview: "Forum overview",
            understanding: "Understanding draft",
            activity: "Activity",
            clarificationTitle: "Moderator questions",
            clarificationBody:
              "Answer every question so the moderator can update the understanding draft.",
            clarificationSubmit: "Submit answers",
            reviewTitle: "Understanding review",
            reviewBody:
              "The forum already has a clear enough draft. Start debate when you are satisfied with the brief.",
            startDebate: "Start debate",
            debatingTitle: "Debate in progress",
            debatingBody:
              "In this implementation slice the debate state is real and persisted, even though full automatic orchestration is not wired yet.",
            pause: "Pause debate",
            resume: "Resume debate",
            complete: "Complete forum",
            completedTitle: "Forum completed",
            completedBody:
              "The flow is now closed and the understanding draft is kept as the final brief for this slice.",
            suggestionLabel: "Suggested answer",
            customAnswer: "Custom answer",
            noActivity: "No activity logged yet.",
            updateError: "Unable to update the forum flow.",
            docsLabel: "Documents",
            moderatorLabel: "Moderator",
            agentsLabel: "Agents",
            statusLabel: "Status",
          },
    [language],
  );

  async function runAction(
    action:
      | "submit-clarification"
      | "start-debate"
      | "pause-debate"
      | "resume-debate"
      | "complete-forum",
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const payload =
        action === "submit-clarification"
          ? {
              action,
              answers: forum.clarificationQuestions.map((question) => ({
                questionId: question.id,
                answer: answers[question.id]?.trim() ?? "",
              })),
            }
          : { action };
      const response = await fetch(`/api/forums/${forum.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { forum?: ForumRecord; error?: string }
        | null;

      if (!response.ok || !body?.forum) {
        throw new Error(body?.error ?? labels.updateError);
      }

      setForum(body.forum);
      setAnswers(
        Object.fromEntries(
          body.forum.clarificationQuestions.map((question) => [question.id, ""]),
        ),
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : labels.updateError,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateAnswer(questionId: string, answer: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }));
  }

  const activeStageIndex = FLOW_STAGES.indexOf(
    forum.status === "paused" ? "debating" : forum.status,
  );

  return (
    <div className="space-y-6">
      <section className="section-block space-y-6">
        <div className="section-header-row">
          <div className="max-w-3xl space-y-3">
            <span className="eyebrow">{labels.title}</span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-title text-[clamp(2rem,3vw,3rem)]">
                {forum.title}
              </h1>
              <span className={`status-badge status-badge--${forum.status}`}>
                {copy.statuses[forum.status]}
              </span>
            </div>
            <p className="hero-body">{labels.subtitle}</p>
          </div>

          <Link className="secondary-button" href="/">
            {labels.back}
          </Link>
        </div>

        <div className="flow-stepper">
          {FLOW_STAGES.map((stage, index) => {
            const isDone = index < activeStageIndex;
            const isActive = index === activeStageIndex;

            return (
              <div
                key={stage}
                className={
                  isDone
                    ? "flow-step flow-step--done"
                    : isActive
                      ? "flow-step flow-step--active"
                      : "flow-step"
                }
              >
                <span className="flow-step__index">{index + 1}</span>
                <strong>{copy.statuses[stage]}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {error ? <div className="settings-alert settings-alert--error">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="space-y-5">
          <div className="summary-panel">
            <p className="panel-kicker">{labels.overview}</p>
            <dl className="mt-4 space-y-4 text-sm text-(--text-secondary)">
              <div className="summary-row">
                <dt>{labels.statusLabel}</dt>
                <dd>{copy.statuses[forum.status]}</dd>
              </div>
              <div className="summary-row">
                <dt>{labels.docsLabel}</dt>
                <dd>{forum.documentsRequested}</dd>
              </div>
              <div className="summary-row">
                <dt>{labels.agentsLabel}</dt>
                <dd>{forum.agentCount}</dd>
              </div>
              <div className="summary-row">
                <dt>{labels.currentRound}</dt>
                <dd>{forum.clarificationRound || forum.roundsCompleted}</dd>
              </div>
              <div className="summary-row">
                <dt>{labels.maxRounds}</dt>
                <dd>{forum.maxClarificationRounds}</dd>
              </div>
              <div className="summary-row">
                <dt>{labels.moderatorLabel}</dt>
                <dd>
                  {copy.providerGroup[forum.moderator.provider]} /{" "}
                  {forum.moderator.modelId}
                </dd>
              </div>
            </dl>
          </div>

          <div className="summary-panel">
            <p className="panel-kicker">{labels.activity}</p>
            <div className="mt-4 space-y-3">
              {forum.activity.length > 0 ? (
                forum.activity
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className="signal-card">
                      <p className="text-xs text-(--text-muted)">
                        {entry.createdAt}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                        {entry.message}
                      </p>
                    </div>
                  ))
              ) : (
                <div className="signal-card">
                  <p className="text-sm text-(--text-secondary)">
                    {labels.noActivity}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {forum.status === "clarification" ? (
            <section className="section-block space-y-5">
              <div>
                <p className="panel-kicker">{labels.clarificationTitle}</p>
                <h2 className="section-title">
                  {copy.statuses.clarification}
                </h2>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  {labels.clarificationBody}
                </p>
              </div>

              <div className="space-y-4">
                {forum.clarificationQuestions.map((question) => (
                  <article key={question.id} className="agent-card space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {question.prompt}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                        {question.rationale}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {question.suggestedAnswers.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="control-chip"
                          type="button"
                          onClick={() => updateAnswer(question.id, suggestion)}
                        >
                          {labels.suggestionLabel}: {suggestion}
                        </button>
                      ))}
                    </div>

                    <label className="field">
                      <span>{labels.customAnswer}</span>
                      <textarea
                        rows={4}
                        value={answers[question.id] ?? ""}
                        onChange={(event) =>
                          updateAnswer(question.id, event.target.value)
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => runAction("submit-clarification")}
                >
                  {labels.clarificationSubmit}
                </button>
              </div>
            </section>
          ) : null}

          {forum.status === "review" ? (
            <section className="section-block space-y-5">
              <div>
                <p className="panel-kicker">{labels.reviewTitle}</p>
                <h2 className="section-title">{copy.statuses.review}</h2>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  {labels.reviewBody}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => runAction("start-debate")}
                >
                  {labels.startDebate}
                </button>
              </div>
            </section>
          ) : null}

          {forum.status === "debating" || forum.status === "paused" ? (
            <section className="section-block space-y-5">
              <div>
                <p className="panel-kicker">
                  {forum.status === "paused"
                    ? copy.statuses.paused
                    : labels.debatingTitle}
                </p>
                <h2 className="section-title">{copy.statuses[forum.status]}</h2>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  {labels.debatingBody}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {forum.status === "debating" ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => runAction("pause-debate")}
                  >
                    {labels.pause}
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => runAction("resume-debate")}
                  >
                    {labels.resume}
                  </button>
                )}
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => runAction("complete-forum")}
                >
                  {labels.complete}
                </button>
              </div>
            </section>
          ) : null}

          {forum.status === "completed" ? (
            <section className="section-block space-y-3">
              <p className="panel-kicker">{labels.completedTitle}</p>
              <h2 className="section-title">{copy.statuses.completed}</h2>
              <p className="text-sm leading-6 text-(--text-secondary)">
                {labels.completedBody}
              </p>
            </section>
          ) : null}

          <section className="section-block">
            <p className="panel-kicker">{labels.understanding}</p>
            <pre className="markdown-preview mt-4 whitespace-pre-wrap">
              {forum.understandingDraft}
            </pre>
          </section>
        </div>
      </section>
    </div>
  );
}
