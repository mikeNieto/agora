"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { copy } from "@/lib/copy";
import type { AppLanguage, ThemeMode } from "@/lib/domain";

type PreferencesContextValue = {
  language: AppLanguage;
  theme: ThemeMode;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const LANGUAGE_KEY = "agora-language";
const THEME_KEY = "agora-theme";
const PREFERENCES_EVENT = "agora-preferences-change";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguageSnapshot,
    getLanguageServerSnapshot,
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      theme,
      setLanguage: (nextLanguage) => {
        window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
        window.dispatchEvent(new Event(PREFERENCES_EVENT));
      },
      toggleLanguage: () => updateLanguage(language === "es" ? "en" : "es"),
      setTheme: (nextTheme) => {
        window.localStorage.setItem(THEME_KEY, nextTheme);
        window.dispatchEvent(new Event(PREFERENCES_EVENT));
      },
      toggleTheme: () => updateTheme(theme === "dark" ? "light" : "dark"),
    }),
    [language, theme],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return {
    ...context,
    copy: copy[context.language],
  };
}

function subscribeToPreferences(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCES_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCES_EVENT, onStoreChange);
  };
}

function getLanguageSnapshot(): AppLanguage {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
  return savedLanguage === "en" || savedLanguage === "es"
    ? savedLanguage
    : "es";
}

function getLanguageServerSnapshot(): AppLanguage {
  return "es";
}

function getThemeSnapshot(): ThemeMode {
  const savedTheme = window.localStorage.getItem(THEME_KEY);
  return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
}

function getThemeServerSnapshot(): ThemeMode {
  return "dark";
}

function updateLanguage(nextLanguage: AppLanguage) {
  window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

function updateTheme(nextTheme: ThemeMode) {
  window.localStorage.setItem(THEME_KEY, nextTheme);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}
