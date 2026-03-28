"use client";

import { useEffect, useState, useTransition } from "react";
import { AppShell } from "@/components/app-shell";
import { usePreferences } from "@/components/preferences-provider";
import type { CopilotConnectionStatus } from "@/lib/model-catalog";

type ProviderSettingsStatus = {
  githubTokenConfigured: boolean;
  openrouterConfigured: boolean;
  deepseekConfigured: boolean;
};

type SettingsPayload = {
  providerStatus: ProviderSettingsStatus;
  copilotStatus: CopilotConnectionStatus;
};

const DEFAULT_PROVIDER_STATUS: ProviderSettingsStatus = {
  githubTokenConfigured: false,
  openrouterConfigured: false,
  deepseekConfigured: false,
};

export function SettingsScreen() {
  const { copy } = usePreferences();
  const [providerStatus, setProviderStatus] = useState(DEFAULT_PROVIDER_STATUS);
  const [copilotStatus, setCopilotStatus] =
    useState<CopilotConnectionStatus | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    setLoadingStatus(true);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(copy.settingsLoadError);
      }

      const payload = (await response.json()) as SettingsPayload;
      setProviderStatus(payload.providerStatus);
      setCopilotStatus(payload.copilotStatus);
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : copy.settingsLoadError,
      });
    } finally {
      setLoadingStatus(false);
    }
  }

  function saveGithubToken(clearGithubToken = false) {
    startTransition(async () => {
      setFeedback(null);

      try {
        const response = await fetch("/api/settings/providers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            githubToken,
            clearGithubToken,
          }),
        });

        if (!response.ok) {
          throw new Error(copy.settingsSaveError);
        }

        setGithubToken("");
        const nextStatus = (await response.json()) as ProviderSettingsStatus;
        setProviderStatus(nextStatus);
        await refreshStatus();
        setFeedback({
          kind: "success",
          message: clearGithubToken
            ? copy.settingsCopilotTokenCleared
            : copy.settingsCopilotTokenSaved,
        });
      } catch (error) {
        setFeedback({
          kind: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : copy.settingsSaveError,
        });
      }
    });
  }

  function saveDeepSeekSettings(clearDeepSeekApiKey = false) {
    startTransition(async () => {
      setFeedback(null);

      try {
        const response = await fetch("/api/settings/providers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deepseekApiKey,
            clearDeepSeekApiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(copy.settingsSaveError);
        }

        const nextStatus = (await response.json()) as ProviderSettingsStatus;
        setProviderStatus(nextStatus);
        setDeepseekApiKey("");
        await refreshStatus();
        setFeedback({
          kind: "success",
          message: clearDeepSeekApiKey
            ? copy.settingsDeepSeekCleared
            : copy.settingsDeepSeekSaved,
        });
      } catch (error) {
        setFeedback({
          kind: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : copy.settingsSaveError,
        });
      }
    });
  }

  function saveOpenRouterSettings(clearOpenRouterApiKey = false) {
    startTransition(async () => {
      setFeedback(null);

      try {
        const response = await fetch("/api/settings/providers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            openrouterApiKey,
            clearOpenRouterApiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(copy.settingsSaveError);
        }

        const nextStatus = (await response.json()) as ProviderSettingsStatus;
        setProviderStatus(nextStatus);
        setOpenrouterApiKey("");
        await refreshStatus();
        setFeedback({
          kind: "success",
          message: clearOpenRouterApiKey
            ? copy.settingsOpenRouterCleared
            : copy.settingsOpenRouterSaved,
        });
      } catch (error) {
        setFeedback({
          kind: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : copy.settingsSaveError,
        });
      }
    });
  }

  return (
    <AppShell>
      <section className="section-block space-y-8">
        <div className="max-w-3xl space-y-4">
          <span className="eyebrow">{copy.navSettings}</span>
          <h1 className="hero-title max-w-3xl text-[clamp(2rem,4vw,4rem)]">
            {copy.settingsTitle}
          </h1>
          <p className="hero-body">{copy.settingsSubtitle}</p>
        </div>

        {feedback ? (
          <div
            className={
              feedback.kind === "error"
                ? "settings-alert settings-alert--error"
                : "settings-alert"
            }
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="settings-grid">
          <section className="settings-card space-y-5">
            <div>
              <p className="panel-kicker">Copilot SDK</p>
              <h2 className="section-title">{copy.settingsCopilotTitle}</h2>
            </div>

            <p className="text-sm leading-7 text-(--text-secondary)">
              {copy.settingsCopilotBody}
            </p>

            <div className="settings-status-row">
              <div>
                <div className="settings-status-label">
                  {copy.settingsStatusLabel}
                </div>
                <div className="mt-2 text-sm text-(--text-secondary)">
                  {loadingStatus
                    ? copy.settingsLoadingStatus
                    : (copilotStatus?.message ?? copy.settingsLoadError)}
                </div>
              </div>
              <strong>
                {copilotStatus?.connected
                  ? copy.settingsConfigured
                  : copy.settingsNotConfigured}
              </strong>
            </div>

            <div className="settings-status-row">
              <div>
                <div className="settings-status-label">
                  {copy.settingsStoredTokenLabel}
                </div>
                <div className="mt-2 text-sm text-(--text-secondary)">
                  {providerStatus.githubTokenConfigured
                    ? copy.settingsCopilotTokenConfiguredBody
                    : copy.settingsCopilotTokenMissingBody}
                </div>
              </div>
              <strong>
                {providerStatus.githubTokenConfigured
                  ? copy.settingsConfigured
                  : copy.settingsNotConfigured}
              </strong>
            </div>

            {copilotStatus?.login ? (
              <div className="text-sm text-(--text-secondary)">
                {copy.settingsCopilotLoggedInAs} {copilotStatus.login}
              </div>
            ) : null}

            <label className="field">
              <span>{copy.settingsCopilotTokenLabel}</span>
              <input
                type="password"
                value={githubToken}
                placeholder={copy.settingsCopilotTokenPlaceholder}
                onChange={(event) => setGithubToken(event.target.value)}
              />
              <small>{copy.settingsCopilotTokenHint}</small>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                className="primary-button"
                type="button"
                disabled={isPending || githubToken.trim().length === 0}
                onClick={() => saveGithubToken(false)}
              >
                {isPending ? copy.settingsSaving : copy.settingsSaveButton}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isPending || !providerStatus.githubTokenConfigured}
                onClick={() => saveGithubToken(true)}
              >
                {copy.settingsClearButton}
              </button>
            </div>
          </section>

          <section className="settings-card space-y-5">
            <div>
              <p className="panel-kicker">OpenRouter</p>
              <h2 className="section-title">{copy.settingsOpenRouterTitle}</h2>
            </div>

            <p className="text-sm leading-7 text-(--text-secondary)">
              {copy.settingsOpenRouterBody}
            </p>

            <div className="settings-status-row">
              <div>
                <div className="settings-status-label">
                  {copy.settingsStatusLabel}
                </div>
                <div className="mt-2 text-sm text-(--text-secondary)">
                  {providerStatus.openrouterConfigured
                    ? copy.settingsOpenRouterConfiguredBody
                    : copy.settingsOpenRouterMissingBody}
                </div>
              </div>
              <strong>
                {providerStatus.openrouterConfigured
                  ? copy.settingsConfigured
                  : copy.settingsNotConfigured}
              </strong>
            </div>

            <label className="field">
              <span>{copy.settingsOpenRouterInputLabel}</span>
              <input
                type="password"
                value={openrouterApiKey}
                placeholder={copy.settingsOpenRouterPlaceholder}
                onChange={(event) => setOpenrouterApiKey(event.target.value)}
              />
              <small>{copy.settingsOpenRouterInputHint}</small>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                className="primary-button"
                type="button"
                disabled={isPending || openrouterApiKey.trim().length === 0}
                onClick={() => saveOpenRouterSettings(false)}
              >
                {isPending ? copy.settingsSaving : copy.settingsSaveButton}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isPending || !providerStatus.openrouterConfigured}
                onClick={() => saveOpenRouterSettings(true)}
              >
                {copy.settingsClearButton}
              </button>
            </div>
          </section>

          <section className="settings-card space-y-5">
            <div>
              <p className="panel-kicker">DeepSeek</p>
              <h2 className="section-title">{copy.settingsDeepSeekTitle}</h2>
            </div>

            <p className="text-sm leading-7 text-(--text-secondary)">
              {copy.settingsDeepSeekBody}
            </p>

            <div className="settings-status-row">
              <div>
                <div className="settings-status-label">
                  {copy.settingsStatusLabel}
                </div>
                <div className="mt-2 text-sm text-(--text-secondary)">
                  {providerStatus.deepseekConfigured
                    ? copy.settingsDeepSeekConfiguredBody
                    : copy.settingsDeepSeekMissingBody}
                </div>
              </div>
              <strong>
                {providerStatus.deepseekConfigured
                  ? copy.settingsConfigured
                  : copy.settingsNotConfigured}
              </strong>
            </div>

            <label className="field">
              <span>{copy.settingsDeepSeekInputLabel}</span>
              <input
                type="password"
                value={deepseekApiKey}
                placeholder={copy.settingsDeepSeekPlaceholder}
                onChange={(event) => setDeepseekApiKey(event.target.value)}
              />
              <small>{copy.settingsDeepSeekInputHint}</small>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                className="primary-button"
                type="button"
                disabled={isPending || deepseekApiKey.trim().length === 0}
                onClick={() => saveDeepSeekSettings(false)}
              >
                {isPending ? copy.settingsSaving : copy.settingsSaveButton}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isPending || !providerStatus.deepseekConfigured}
                onClick={() => saveDeepSeekSettings(true)}
              >
                {copy.settingsClearButton}
              </button>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
