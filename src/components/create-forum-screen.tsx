"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { usePreferences } from "@/components/preferences-provider";
import { agentColors, providerLabels } from "@/lib/constants";
import {
  describeModeratorCompactionMode,
  getModeratorContextPolicy,
  MODERATOR_CONTEXT_WARNING_RATIO,
} from "@/lib/moderator-context";
import type {
  AgentDefinition,
  CreateForumDraft,
  ModelCatalogEntry,
  ModeratorDefinition,
  OpenRouterSortMode,
  ProviderCatalogMap,
  ProviderKind,
} from "@/lib/domain";

export function CreateForumScreen({
  initialDraft,
  modelCatalogs,
}: {
  initialDraft: CreateForumDraft;
  modelCatalogs?: ProviderCatalogMap;
}) {
  const { copy } = usePreferences();
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<ProviderCatalogMap>(() =>
    normalizeCatalogMap(undefined),
  );
  const safeModelCatalogs = normalizeCatalogMap(modelCatalogs ?? catalogs);
  const [draft, setDraft] = useState<CreateForumDraft>(() =>
    syncDraftWithCatalogs(initialDraft, normalizeCatalogMap(modelCatalogs)),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openRouterSort, setOpenRouterSort] =
    useState<OpenRouterSortMode>("popular");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load model catalogs.");
        }

        const payload = (await response.json()) as {
          modelCatalogs?: ProviderCatalogMap;
        };

        if (cancelled) {
          return;
        }

        const nextCatalogs = normalizeCatalogMap(payload.modelCatalogs);
        setCatalogs(nextCatalogs);
        setDraft((current) => syncDraftWithCatalogs(current, nextCatalogs));
      } catch {
        if (cancelled) {
          return;
        }

        setCatalogs((current) => ({
          ...current,
          copilot: {
            ...current.copilot,
            error:
              current.copilot.error ??
              "Unable to load Copilot SDK models right now.",
          },
        }));
      }
    }

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeAgents = useMemo(
    () => draft.agents.slice(0, draft.agentCount),
    [draft.agentCount, draft.agents],
  );
  const moderatorModels = useMemo(
    () =>
      getProviderModels(
        draft.moderator.provider,
        safeModelCatalogs,
        openRouterSort,
      ),
    [draft.moderator.provider, openRouterSort, safeModelCatalogs],
  );
  const moderatorPolicy = useMemo(
    () => getModeratorContextPolicy(draft.moderator, safeModelCatalogs),
    [draft.moderator, safeModelCatalogs],
  );

  const showOpenRouterSort = activeAgents.some(
    (agent) => agent.provider === "openrouter",
  );
  const showModeratorOpenRouterSort =
    draft.moderator.provider === "openrouter";
  const shouldShowOpenRouterSort =
    showOpenRouterSort || showModeratorOpenRouterSort;

  function updateAgent(index: number, next: Partial<AgentDefinition>) {
    setDraft((current) => ({
      ...current,
      agents: current.agents.map((agent, agentIndex) =>
        agentIndex === index ? { ...agent, ...next } : agent,
      ),
    }));
  }

  function updateModerator(next: Partial<ModeratorDefinition>) {
    setDraft((current) => ({
      ...current,
      moderator: {
        ...current.moderator,
        ...next,
      },
    }));
  }

  function setAgentCount(nextCount: number) {
    setDraft((current) => ({
      ...current,
      agentCount: nextCount,
    }));
  }

  async function submitForum() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/forums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            forum?: {
              id: string;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.forum?.id) {
        throw new Error(payload?.error ?? "Unable to create forum.");
      }

      setConfirmOpen(false);
      router.push(`/forums/${payload.forum.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to create forum.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="section-block space-y-8">
        <div className="max-w-3xl space-y-4">
          <span className="eyebrow">{copy.navNewForum}</span>
          <h1 className="hero-title max-w-3xl text-[clamp(2rem,4vw,4rem)]">
            {copy.createTitle}
          </h1>
          <p className="hero-body">{copy.createSubtitle}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="form-panel">
              <div className="section-header-row">
                <div>
                  <p className="panel-kicker">01</p>
                  <h2 className="section-title">{copy.countLabel}</h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {[2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={
                      count === draft.agentCount
                        ? "count-button count-button--active"
                        : "count-button"
                    }
                    onClick={() => setAgentCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </section>

            <section className="form-panel">
              <div className="section-header-row gap-4">
                <div>
                  <p className="panel-kicker">02</p>
                  <h2 className="section-title">{copy.moderatorLabel}</h2>
                </div>
                {shouldShowOpenRouterSort ? (
                  <label className="field min-w-64">
                    <span>{copy.openRouterSortLabel}</span>
                    <select
                      value={openRouterSort}
                      onChange={(event) =>
                        setOpenRouterSort(
                          event.target.value as OpenRouterSortMode,
                        )
                      }
                    >
                      {Object.entries(copy.openRouterSort).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span>{copy.providerLabel}</span>
                  <select
                    value={draft.moderator.provider}
                    onChange={(event) => {
                      const provider = event.target.value as ProviderKind;
                      updateModerator({
                        provider,
                        modelId:
                          getProviderModels(
                            provider,
                            safeModelCatalogs,
                            openRouterSort,
                          )[0]?.id ?? "",
                      });
                    }}
                  >
                    {Object.entries(providerLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{copy.modelLabel}</span>
                  <select
                    value={draft.moderator.modelId}
                    disabled={moderatorModels.length === 0}
                    onChange={(event) =>
                      updateModerator({
                        modelId: event.target.value,
                      })
                    }
                  >
                    {moderatorModels.length > 0 ? (
                      moderatorModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {describeModel(model)}
                        </option>
                      ))
                    ) : (
                      <option value="">{copy.noModelsLabel}</option>
                    )}
                  </select>
                  <small>
                    {copy.moderatorHint} {copy.summaryCompactionLabel}:{" "}
                    {describeModeratorCompactionMode(
                      moderatorPolicy.compactionMode,
                    )} @{" "}
                    {Math.round(MODERATOR_CONTEXT_WARNING_RATIO * 100)}%.
                  </small>
                  {safeModelCatalogs[draft.moderator.provider].error ? (
                    <small>
                      {copy.providerUnavailableLabel}:{" "}
                      {safeModelCatalogs[draft.moderator.provider].error}
                      {draft.moderator.provider === "deepseek" ||
                      draft.moderator.provider === "openrouter" ? (
                        <>
                          {" "}
                          <Link className="inline-link" href="/settings">
                            {copy.openSettings}
                          </Link>
                        </>
                      ) : null}
                    </small>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="form-panel">
              <div className="section-header-row gap-4">
                <div>
                  <p className="panel-kicker">03</p>
                  <h2 className="section-title">{copy.agentsLabel}</h2>
                </div>
              </div>

              <div className="space-y-4">
                {activeAgents.map((agent, index) => {
                  const providerState = safeModelCatalogs[agent.provider];
                  const availableModels = getProviderModels(
                    agent.provider,
                    safeModelCatalogs,
                    openRouterSort,
                  );

                  return (
                    <article key={agent.id} className="agent-card">
                      <div className="agent-card__header">
                        <div className={`avatar avatar--${agent.color}`}>
                          {agent.initial}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Agent {agent.slot}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {agentColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={
                                  color === agent.color
                                    ? `color-swatch color-swatch--${color} color-swatch--selected`
                                    : `color-swatch color-swatch--${color}`
                                }
                                onClick={() => updateAgent(index, { color })}
                                aria-label={`Use ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="field">
                          <span>{copy.nameLabel}</span>
                          <input
                            value={agent.name}
                            onChange={(event) =>
                              updateAgent(index, {
                                name: event.target.value,
                                initial:
                                  event.target.value
                                    .slice(0, 1)
                                    .toUpperCase() || agent.initial,
                              })
                            }
                          />
                        </label>

                        <label className="field">
                          <span>{copy.providerLabel}</span>
                          <select
                            value={agent.provider}
                            onChange={(event) => {
                              const provider = event.target
                                .value as ProviderKind;
                              updateAgent(index, {
                                provider,
                                modelId:
                                  getProviderModels(
                                    provider,
                                    safeModelCatalogs,
                                    openRouterSort,
                                  )[0]?.id ?? "",
                              });
                            }}
                          >
                            {Object.entries(providerLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className="field md:col-span-2">
                          <span>{copy.modelLabel}</span>
                          <select
                            value={agent.modelId}
                            disabled={availableModels.length === 0}
                            onChange={(event) =>
                              updateAgent(index, {
                                modelId: event.target.value,
                              })
                            }
                          >
                            {availableModels.length > 0 ? (
                              availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {describeModel(model)}
                                </option>
                              ))
                            ) : (
                              <option value="">{copy.noModelsLabel}</option>
                            )}
                          </select>
                          {providerState.error ? (
                            <small>
                              {copy.providerUnavailableLabel}:{" "}
                              {providerState.error}
                              {agent.provider === "deepseek" ||
                              agent.provider === "openrouter" ? (
                                <>
                                  {" "}
                                  <Link
                                    className="inline-link"
                                    href="/settings"
                                  >
                                    {copy.openSettings}
                                  </Link>
                                </>
                              ) : null}
                            </small>
                          ) : null}
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="form-panel space-y-4">
              <div className="section-header-row">
                <div>
                  <p className="panel-kicker">04</p>
                  <h2 className="section-title">{copy.contextLabel}</h2>
                </div>
              </div>

              <label className="field">
                <span>{copy.titleLabel}</span>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>{copy.ideaLabel}</span>
                <textarea
                  value={draft.idea}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      idea: event.target.value,
                    }))
                  }
                  rows={8}
                />
              </label>

              <label className="field">
                <span>{copy.documentsLabel}</span>
                <textarea
                  value={draft.requestedDocuments}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requestedDocuments: event.target.value,
                    }))
                  }
                  rows={6}
                />
                <small>{copy.requestedDocsHint}</small>
              </label>
            </section>
          </div>

          <aside className="sticky top-24 h-fit space-y-5">
            <section className="summary-panel">
              <p className="panel-kicker">{copy.launchPackageLabel}</p>
              <h2 className="section-title">{copy.moderatorSummaryLabel}</h2>
              <dl className="space-y-4 text-sm text-(--text-secondary)">
                <div className="summary-row">
                  <dt>{copy.summaryForumLabel}</dt>
                  <dd>{draft.title}</dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryModeratorLabel}</dt>
                  <dd>
                    {copy.providerGroup[draft.moderator.provider]} /{" "}
                    {getModelLabel(
                      draft.moderator.provider,
                      draft.moderator.modelId,
                      safeModelCatalogs,
                    )}
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryAgentsLabel}</dt>
                  <dd>{draft.agentCount}</dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryProvidersLabel}</dt>
                  <dd>
                    {Array.from(
                      new Set(
                        [
                          copy.providerGroup[draft.moderator.provider],
                          ...activeAgents.map(
                            (agent) => copy.providerGroup[agent.provider],
                          ),
                        ],
                      ),
                    ).join(", ")}
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryDocumentsLabel}</dt>
                  <dd>
                    {
                      draft.requestedDocuments.split("\n").filter(Boolean)
                        .length
                    }
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryContextLabel}</dt>
                  <dd>
                    {moderatorPolicy.contextWindowLabel} ·{" "}
                    {Math.round(moderatorPolicy.warningRatio * 100)}%
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>{copy.summaryCompactionLabel}</dt>
                  <dd>
                    {describeModeratorCompactionMode(
                      moderatorPolicy.compactionMode,
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="summary-panel">
              <p className="panel-kicker">{copy.workflowLabel}</p>
              <ul className="space-y-3 text-sm leading-6 text-(--text-secondary)">
                <li>{copy.workflowStep1}</li>
                <li>{copy.workflowStep2}</li>
                <li>{copy.workflowStep3}</li>
              </ul>
            </section>

            <button
              className="primary-button w-full justify-center"
              type="button"
              onClick={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
            >
              {copy.confirmLaunch}
            </button>
          </aside>
        </div>
      </section>

      {submitError ? (
        <div className="settings-alert settings-alert--error">{submitError}</div>
      ) : null}

      {confirmOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">✦</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {copy.confirmLaunch}
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              {copy.confirmBody}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="secondary-button flex-1 justify-center"
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmOpen(false)}
              >
                {copy.cancel}
              </button>
              <button
                className="primary-button flex-1 justify-center"
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitForum()}
              >
                {isSubmitting ? `${copy.submit}...` : copy.submit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function syncDraftWithCatalogs(
  initialDraft: CreateForumDraft,
  modelCatalogs: ProviderCatalogMap,
): CreateForumDraft {
  return {
    ...initialDraft,
    moderator: {
      ...initialDraft.moderator,
      modelId: getSelectedModelId(
        initialDraft.moderator.provider,
        initialDraft.moderator.modelId,
        modelCatalogs,
      ),
    },
    agents: initialDraft.agents.map((agent) => {
      return {
        ...agent,
        modelId: getSelectedModelId(
          agent.provider,
          agent.modelId,
          modelCatalogs,
        ),
      };
    }),
  };
}

function getProviderModels(
  provider: ProviderKind,
  modelCatalogs: ProviderCatalogMap,
  openRouterSort: OpenRouterSortMode,
): ModelCatalogEntry[] {
  const models = modelCatalogs[provider]?.models ?? [];

  if (provider !== "openrouter") {
    return models;
  }

  return [...models].sort((left, right) => {
    if (openRouterSort === "newest") {
      return (right.createdAt ?? 0) - (left.createdAt ?? 0);
    }

    return (
      (left.providerRank ?? Number.MAX_SAFE_INTEGER) -
      (right.providerRank ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function normalizeCatalogMap(
  modelCatalogs: Partial<ProviderCatalogMap> | undefined,
): ProviderCatalogMap {
  return {
    copilot: modelCatalogs?.copilot ?? { models: [] },
    openrouter: modelCatalogs?.openrouter ?? { models: [] },
    deepseek: modelCatalogs?.deepseek ?? { models: [] },
  };
}

function describeModel(model: ModelCatalogEntry) {
  const detailParts: string[] = [];

  if (model.relativeCost) {
    detailParts.push(model.relativeCost);
  } else if (model.pricing) {
    detailParts.push(`${model.pricing.input} in`);
    detailParts.push(`${model.pricing.output} out`);
  }

  detailParts.push(
    model.maxOutput !== "n/a"
      ? `ctx ${model.contextWindow}/${model.maxOutput}`
      : `ctx ${model.contextWindow}`,
  );

  return `${model.label} · ${detailParts.join(" · ")}`;
}

function getSelectedModelId(
  provider: ProviderKind,
  currentModelId: string,
  modelCatalogs: ProviderCatalogMap,
) {
  const models = modelCatalogs[provider].models;

  return models.some((model) => model.id === currentModelId)
    ? currentModelId
    : (models[0]?.id ?? "");
}

function getModelLabel(
  provider: ProviderKind,
  modelId: string,
  modelCatalogs: ProviderCatalogMap,
) {
  return (
    (modelCatalogs[provider].models.find((model) => model.id === modelId)?.label ??
      modelId) ||
    "n/a"
  );
}
