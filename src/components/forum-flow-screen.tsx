"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";
import type { DebateDocument, ForumRecord, ForumStatus } from "@/lib/domain";

const FLOW_STAGES: ForumStatus[] = [
  "clarification",
  "review",
  "debating",
  "completed",
];

type ConfirmAction = "start-debate" | "stop-debate";

export function ForumFlowScreen({
  initialForum,
}: {
  initialForum: ForumRecord;
}) {
  const { copy, language } = usePreferences();
  const router = useRouter();
  const [forum, setForum] = useState(initialForum);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialForum.clarificationQuestions.map((question) => [question.id, ""]),
    ),
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [forum.id, forum.status, forum.clarificationQuestions.length]);

  const refreshForum = useEffectEvent(async () => {
    try {
      const response = await fetch(`/api/forums/${forum.id}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as {
        forum?: ForumRecord;
      } | null;

      if (response.ok && body?.forum) {
        setForum(body.forum);
      }
    } catch {
      // Ignore polling failures and keep the last successful state.
    }
  });

  useEffect(() => {
    if (
      forum.status !== "debating" &&
      forum.status !== "paused" &&
      forum.status !== "stopped"
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshForum();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [forum.id, forum.status]);

  const labels = useMemo(
    () =>
      language === "es"
        ? {
            title: "Flujo del foro",
            subtitle:
              "El moderador genera y reevalúa la clarificación y, cuando corresponde, orquesta automáticamente el debate persistido en el servidor.",
            back: "Volver a foros",
            currentRound: "Ronda actual",
            maxRounds: "Máximo",
            overview: "Resumen del foro",
            understanding: "Borrador de entendimiento",
            activity: "Actividad",
            clarificationTitle: "Preguntas del moderador",
            clarificationBody:
              "Responde cada pregunta para que el moderador decida si hace falta otra ronda o si el entendimiento ya puede pasar a revisión.",
            clarificationSubmit: "Enviar respuestas",
            previousQuestion: "Anterior",
            nextQuestion: "Siguiente",
            questionProgress: "Pregunta",
            answeredProgress: "Respondidas",
            reviewTitle: "Revisión del entendimiento",
            reviewBody:
              "El foro ya cuenta con un borrador suficientemente claro. Puedes iniciar el debate cuando estés conforme.",
            startDebate: "Iniciar debate",
            startDebateConfirmTitle: "Iniciar debate",
            startDebateConfirmBody:
              "Esto lanzará la orquestación automática de lluvia de ideas y redacción documental. El proceso seguirá hasta completarse o hasta que lo pauses o detengas.",
            confirmStartDebate: "Confirmar inicio",
            debatingTitle: "Debate en curso",
            debatingBody:
              "La orquestación automática ya está activa: el moderador coordina rondas, compacta contexto y cierra documentos Markdown.",
            pause: "Pausar debate",
            resume: "Reanudar debate",
            stop: "Detener debate",
            stopConfirmTitle: "Detener debate",
            stopConfirmBody:
              "Se dejarán de programar nuevos turnos. El trabajo ya persistido en documentos y logs se conservará.",
            confirmStopDebate: "Confirmar stop",
            completedTitle: "Foro completado",
            completedBody:
              "El flujo quedó cerrado y los documentos Markdown generados se conservaron en la carpeta de trabajo del foro.",
            stoppedTitle: "Debate detenido",
            stoppedBody:
              "La automatización se detuvo. Los artefactos ya generados siguen disponibles en la carpeta del foro.",
            suggestionLabel: "Respuesta sugerida",
            preferredAnswer: "Respuesta más clara según el moderador",
            customAnswer: "Respuesta libre",
            noActivity: "Todavía no hay actividad registrada.",
            updateError: "No fue posible actualizar el flujo del foro.",
            docsLabel: "Documentos",
            moderatorLabel: "Moderador",
            agentsLabel: "Agentes",
            statusLabel: "Estado",
            deleteError: "No fue posible borrar el foro.",
            stageLabel: "Etapa activa",
            systemPrompt: "System prompt compartido",
            selectedAgents: "Agentes seleccionados",
            debateOverview: "Estado del debate",
            brainstormSummary: "Resumen de lluvia de ideas",
            brainstormRounds: "Rondas de lluvia de ideas",
            documentPipeline: "Pipeline de documentos",
            currentDocument: "Documento actual",
            noDocuments: "Todavía no hay documentos del debate.",
            contextUsage: "Uso de contexto",
            contextCompactions: "Compactaciones",
            documentComments: "Comentarios",
            reviewSystemPromptHint:
              "El prompt compartido se congela al iniciar el debate y se reutiliza para todos los agentes.",
            brainstormEmpty:
              "La lluvia de ideas aún no registra rondas. El backend las añadirá automáticamente.",
            pendingValue: "Pendiente",
            consensusOpen: "Abierto",
            consensusClosed: "Consenso",
            currentDocumentEmpty:
              "Todavía no hay un documento activo en la fase de redacción.",
          }
        : {
            title: "Forum flow",
            subtitle:
              "The moderator reevaluates clarification and, when appropriate, automatically orchestrates the persisted debate on the server.",
            back: "Back to forums",
            currentRound: "Current round",
            maxRounds: "Max",
            overview: "Forum overview",
            understanding: "Understanding draft",
            activity: "Activity",
            clarificationTitle: "Moderator questions",
            clarificationBody:
              "Answer each question so the moderator can decide whether another round is needed or the brief can move to review.",
            clarificationSubmit: "Submit answers",
            previousQuestion: "Previous",
            nextQuestion: "Next",
            questionProgress: "Question",
            answeredProgress: "Answered",
            reviewTitle: "Understanding review",
            reviewBody:
              "The forum already has a clear enough draft. Start debate when you are satisfied with the brief.",
            startDebate: "Start debate",
            startDebateConfirmTitle: "Start debate",
            startDebateConfirmBody:
              "This launches the automatic brainstorming and document drafting orchestration. It will keep running until completion or until you pause or stop it.",
            confirmStartDebate: "Confirm start",
            debatingTitle: "Debate in progress",
            debatingBody:
              "Automatic orchestration is running: the moderator manages rounds, context compaction, and Markdown document closure.",
            pause: "Pause debate",
            resume: "Resume debate",
            stop: "Stop debate",
            stopConfirmTitle: "Stop debate",
            stopConfirmBody:
              "No additional turns will be scheduled. The work already persisted into documents and logs will remain available.",
            confirmStopDebate: "Confirm stop",
            completedTitle: "Forum completed",
            completedBody:
              "The flow is closed and the generated Markdown documents remain in the forum working folder.",
            stoppedTitle: "Debate stopped",
            stoppedBody:
              "Automation was stopped. Any artifacts already generated remain available in the forum folder.",
            suggestionLabel: "Suggested answer",
            preferredAnswer: "Moderator's clearest answer",
            customAnswer: "Custom answer",
            noActivity: "No activity logged yet.",
            updateError: "Unable to update the forum flow.",
            docsLabel: "Documents",
            moderatorLabel: "Moderator",
            agentsLabel: "Agents",
            statusLabel: "Status",
            deleteError: "Unable to delete the forum.",
            stageLabel: "Active stage",
            systemPrompt: "Shared system prompt",
            selectedAgents: "Selected agents",
            debateOverview: "Debate status",
            brainstormSummary: "Brainstorm summary",
            brainstormRounds: "Brainstorm rounds",
            documentPipeline: "Document pipeline",
            currentDocument: "Current document",
            noDocuments: "No debate documents yet.",
            contextUsage: "Context usage",
            contextCompactions: "Compactions",
            documentComments: "Comments",
            reviewSystemPromptHint:
              "The shared prompt is frozen when debate starts and then reused for every agent.",
            brainstormEmpty:
              "Brainstorming has not produced rounds yet. The backend will append them automatically.",
            pendingValue: "Pending",
            consensusOpen: "Open",
            consensusClosed: "Consensus",
            currentDocumentEmpty:
              "There is no active document in the drafting phase yet.",
          },
    [language],
  );

  async function runAction(
    action:
      | "submit-clarification"
      | "start-debate"
      | "pause-debate"
      | "resume-debate"
      | "stop-debate",
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
      const body = (await response.json().catch(() => null)) as {
        forum?: ForumRecord;
        error?: string;
      } | null;

      if (!response.ok || !body?.forum) {
        throw new Error(body?.error ?? labels.updateError);
      }

      setForum(body.forum);
      setAnswers(
        Object.fromEntries(
          body.forum.clarificationQuestions.map((question) => [
            question.id,
            "",
          ]),
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

  const answeredCount = forum.clarificationQuestions.filter(
    (question) => (answers[question.id] ?? "").trim().length > 0,
  ).length;
  const currentQuestion =
    forum.clarificationQuestions[currentQuestionIndex] ?? null;
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? "")
    : "";
  const stageStatus =
    forum.status === "paused" || forum.status === "stopped"
      ? "debating"
      : forum.status;
  const activeStageIndex = FLOW_STAGES.indexOf(stageStatus);
  const debate = forum.debate;
  const currentDocument =
    debate?.documents[debate.currentDocumentIndex] ?? null;
  const reviewSystemPrompt =
    debate?.systemPrompt ??
    (language === "es"
      ? "Se generará un system prompt común para todos los agentes al iniciar el debate."
      : "A shared system prompt for all agents will be generated when the debate starts.");
  const confirmLabels =
    confirmAction === "start-debate"
      ? {
          title: labels.startDebateConfirmTitle,
          body: labels.startDebateConfirmBody,
          confirm: labels.confirmStartDebate,
        }
      : confirmAction === "stop-debate"
        ? {
            title: labels.stopConfirmTitle,
            body: labels.stopConfirmBody,
            confirm: labels.confirmStopDebate,
          }
        : null;

  async function deleteForum() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forums/${forum.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? labels.deleteError);
      }

      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : labels.deleteError,
      );
      setDeleteConfirmOpen(false);
      setIsDeleting(false);
    }
  }

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

          <div className="flex flex-wrap justify-end gap-3">
            <button
              className="secondary-button border-[rgba(185,28,28,0.28)] text-[#b91c1c] hover:bg-[rgba(185,28,28,0.08)] dark:text-[#f87171]"
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                setError(null);
                setDeleteConfirmOpen(true);
              }}
            >
              {copy.deleteForum}
            </button>
            <Link className="secondary-button" href="/">
              {labels.back}
            </Link>
          </div>
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

      {error ? (
        <div className="settings-alert settings-alert--error">{error}</div>
      ) : null}

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
                <dd>
                  {debate?.currentStage === "brainstorming"
                    ? debate.currentBrainstormRound
                    : currentDocument?.currentRound ||
                      forum.clarificationRound ||
                      forum.roundsCompleted}
                </dd>
              </div>
              <div className="summary-row">
                <dt>{labels.maxRounds}</dt>
                <dd>
                  {debate?.currentStage === "brainstorming"
                    ? debate.brainstormMaxRounds
                    : (currentDocument?.maxRounds ??
                      forum.maxClarificationRounds)}
                </dd>
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
                <h2 className="section-title">{copy.statuses.clarification}</h2>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  {labels.clarificationBody}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="signal-card">
                  <p className="text-xs text-(--text-muted)">
                    {labels.currentRound}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {forum.clarificationRound}
                  </p>
                </div>
                <div className="signal-card">
                  <p className="text-xs text-(--text-muted)">
                    {labels.questionProgress}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {currentQuestionIndex + 1} /{" "}
                    {forum.clarificationQuestions.length}
                  </p>
                </div>
                <div className="signal-card">
                  <p className="text-xs text-(--text-muted)">
                    {labels.answeredProgress}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {answeredCount} / {forum.clarificationQuestions.length}
                  </p>
                </div>
                <div className="signal-card">
                  <p className="text-xs text-(--text-muted)">
                    {labels.maxRounds}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {forum.maxClarificationRounds}
                  </p>
                </div>
              </div>

              {currentQuestion ? (
                <article className="agent-card space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-(--text-muted)">
                      {labels.questionProgress} {currentQuestionIndex + 1}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {currentQuestion.prompt}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                      {currentQuestion.rationale}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.suggestedAnswers.map((suggestion) => {
                      const isSelected = currentAnswer.trim() === suggestion;
                      const isPreferred =
                        currentQuestion.preferredAnswer === suggestion;

                      return (
                        <button
                          key={suggestion}
                          className={
                            isSelected
                              ? "control-chip border-transparent bg-[rgba(12,107,84,0.14)] text-foreground"
                              : "control-chip"
                          }
                          type="button"
                          onClick={() =>
                            updateAnswer(currentQuestion.id, suggestion)
                          }
                        >
                          {labels.suggestionLabel}: {suggestion}
                          {isPreferred ? ` • ${labels.preferredAnswer}` : ""}
                        </button>
                      );
                    })}
                  </div>

                  <label className="field">
                    <span>{labels.customAnswer}</span>
                    <textarea
                      rows={5}
                      value={currentAnswer}
                      onChange={(event) =>
                        updateAnswer(currentQuestion.id, event.target.value)
                      }
                    />
                  </label>
                </article>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={currentQuestionIndex === 0 || isSaving}
                  onClick={() =>
                    setCurrentQuestionIndex((current) =>
                      Math.max(0, current - 1),
                    )
                  }
                >
                  {labels.previousQuestion}
                </button>

                {currentQuestionIndex <
                forum.clarificationQuestions.length - 1 ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={isSaving || currentAnswer.trim().length === 0}
                    onClick={() =>
                      setCurrentQuestionIndex((current) =>
                        Math.min(
                          forum.clarificationQuestions.length - 1,
                          current + 1,
                        ),
                      )
                    }
                  >
                    {labels.nextQuestion}
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      isSaving ||
                      answeredCount !== forum.clarificationQuestions.length
                    }
                    onClick={() => runAction("submit-clarification")}
                  >
                    {labels.clarificationSubmit}
                  </button>
                )}
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
                  onClick={() => setConfirmAction("start-debate")}
                >
                  {labels.startDebate}
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="summary-panel">
                  <p className="panel-kicker">{labels.systemPrompt}</p>
                  <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                    {labels.reviewSystemPromptHint}
                  </p>
                  <pre className="markdown-preview mt-4 whitespace-pre-wrap">
                    {reviewSystemPrompt}
                  </pre>
                </article>

                <article className="summary-panel">
                  <p className="panel-kicker">{labels.selectedAgents}</p>
                  <div className="mt-4 space-y-3">
                    {forum.agents.map((agent) => (
                      <div key={agent.id} className="signal-card">
                        <p className="font-medium text-foreground">
                          {agent.name}
                        </p>
                        <p className="mt-1 text-sm text-(--text-secondary)">
                          {copy.providerGroup[agent.provider]} / {agent.modelId}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {forum.status === "debating" ||
          forum.status === "paused" ||
          forum.status === "stopped" ? (
            <section className="section-block space-y-5">
              <div>
                <p className="panel-kicker">
                  {forum.status === "paused"
                    ? copy.statuses.paused
                    : forum.status === "stopped"
                      ? labels.stoppedTitle
                      : labels.debatingTitle}
                </p>
                <h2 className="section-title">{copy.statuses[forum.status]}</h2>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  {forum.status === "stopped"
                    ? labels.stoppedBody
                    : labels.debatingBody}
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
                ) : null}

                {forum.status === "paused" ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => runAction("resume-debate")}
                  >
                    {labels.resume}
                  </button>
                ) : null}

                {forum.status !== "stopped" ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => setConfirmAction("stop-debate")}
                  >
                    {labels.stop}
                  </button>
                ) : null}
              </div>

              {debate ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="signal-card">
                    <p className="text-xs text-(--text-muted)">
                      {labels.stageLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {debate.currentStage}
                    </p>
                  </div>
                  <div className="signal-card">
                    <p className="text-xs text-(--text-muted)">
                      {labels.currentRound}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {debate.currentStage === "brainstorming"
                        ? debate.currentBrainstormRound
                        : (currentDocument?.currentRound ?? 0)}
                    </p>
                  </div>
                  <div className="signal-card">
                    <p className="text-xs text-(--text-muted)">
                      {labels.contextUsage}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {Math.round(
                        (debate.moderatorContext.usageRatio || 0) * 100,
                      )}
                      %
                    </p>
                  </div>
                  <div className="signal-card">
                    <p className="text-xs text-(--text-muted)">
                      {labels.contextCompactions}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {debate.moderatorContext.compactionEvents}
                    </p>
                  </div>
                </div>
              ) : null}
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

          {debate ? (
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <section className="section-block">
                  <p className="panel-kicker">{labels.systemPrompt}</p>
                  <pre className="markdown-preview mt-4 whitespace-pre-wrap">
                    {debate.systemPrompt}
                  </pre>
                </section>

                <section className="section-block">
                  <p className="panel-kicker">{labels.brainstormSummary}</p>
                  <pre className="markdown-preview mt-4 whitespace-pre-wrap">
                    {debate.brainstormSummary || labels.pendingValue}
                  </pre>
                </section>
              </div>

              <div className="space-y-6">
                <section className="section-block">
                  <p className="panel-kicker">{labels.brainstormRounds}</p>
                  <div className="mt-4 space-y-3">
                    {debate.brainstormRounds.length > 0 ? (
                      debate.brainstormRounds.map((round) => (
                        <div
                          key={round.round}
                          className="signal-card space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <strong className="text-foreground">
                              Round {round.round}
                            </strong>
                            <span className="text-xs text-(--text-muted)">
                              {round.consensusReached
                                ? labels.consensusClosed
                                : labels.consensusOpen}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-(--text-secondary)">
                            {round.moderatorSummary || labels.pendingValue}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="signal-card">
                        <p className="text-sm text-(--text-secondary)">
                          {labels.brainstormEmpty}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="section-block">
                  <p className="panel-kicker">{labels.documentPipeline}</p>
                  <div className="mt-4 space-y-4">
                    {debate.documents.length > 0 ? (
                      debate.documents
                        .slice()
                        .sort((left, right) => left.order - right.order)
                        .map((document) => (
                          <DebateDocumentCard
                            key={document.id}
                            document={document}
                            labels={labels}
                            isCurrent={currentDocument?.id === document.id}
                          />
                        ))
                    ) : (
                      <div className="signal-card">
                        <p className="text-sm text-(--text-secondary)">
                          {labels.noDocuments}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {confirmAction && confirmLabels ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              setConfirmAction(null);
            }
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">!</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {confirmLabels.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              {confirmLabels.body}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="secondary-button flex-1 justify-center"
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmAction(null)}
              >
                {copy.cancel}
              </button>
              <button
                className="primary-button flex-1 justify-center"
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  await runAction(action);
                }}
              >
                {confirmLabels.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isDeleting) {
              setDeleteConfirmOpen(false);
            }
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">!</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {copy.deleteForumConfirmTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              {copy.deleteForumConfirmBody}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="secondary-button flex-1 justify-center"
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {copy.cancel}
              </button>
              <button
                className="primary-button flex-1 justify-center border-transparent bg-[#b91c1c] shadow-none hover:bg-[#991b1b]"
                type="button"
                disabled={isDeleting}
                onClick={() => void deleteForum()}
              >
                {isDeleting ? copy.deleteForumSubmitting : copy.deleteForum}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DebateDocumentCard({
  document,
  labels,
  isCurrent,
}: {
  document: DebateDocument;
  labels: {
    currentDocument: string;
    documentComments: string;
    noDocuments: string;
    pendingValue: string;
  };
  isCurrent: boolean;
}) {
  const badgeClass =
    document.status === "closed"
      ? "status-badge status-badge--completed"
      : isCurrent
        ? "status-badge status-badge--debating"
        : "status-badge status-badge--review";

  return (
    <article className="summary-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="panel-kicker">{labels.currentDocument}</p>
          <h3 className="text-lg font-semibold text-foreground">
            {document.title}
          </h3>
        </div>
        <span className={badgeClass}>{document.status}</span>
      </div>

      <pre className="markdown-preview whitespace-pre-wrap">
        {(
          document.finalMarkdown ||
          document.latestMarkdown ||
          labels.pendingValue
        ).trim()}
      </pre>

      <div className="space-y-3">
        <p className="panel-kicker">{labels.documentComments}</p>
        {document.comments.length > 0 ? (
          document.comments.map((comment) => (
            <div
              key={comment.id}
              className="signal-card text-sm leading-6 text-(--text-secondary)"
            >
              <strong className="text-foreground">{comment.agentName}</strong> •{" "}
              {comment.anchor}
              <p className="mt-2">{comment.text}</p>
            </div>
          ))
        ) : (
          <div className="signal-card">
            <p className="text-sm text-(--text-secondary)">
              {labels.noDocuments}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
