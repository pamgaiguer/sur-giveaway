"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { defaultRules, type Rules } from "@/lib/giveaway/types";
interface Settings {
  rules: Rules;
  blacklist: string;
  alternates: number;
}
const defaults: Settings = {
  rules: defaultRules,
  blacklist: "",
  alternates: 2,
};
const key = "sur-settings-v1";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("sur-settings", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("sur-settings", notify);
  };
}
function read() {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parse(raw: string | null): Settings {
  try {
    const saved = JSON.parse(raw || "null");
    if (!saved) return defaults;
    const r = saved.rules;
    return {
      blacklist: typeof saved.blacklist === "string" ? saved.blacklist : "",
      alternates:
        Number.isInteger(saved.alternates) &&
        saved.alternates >= 0 &&
        saved.alternates <= 100
          ? saved.alternates
          : 2,
      rules:
        r &&
        ["user", "comment"].includes(r.entryMode) &&
        Number.isInteger(r.minMentions) &&
        r.minMentions >= 0 &&
        r.minMentions <= 100 &&
        typeof r.ignoreDuplicates === "boolean" &&
        typeof r.ignoreOwner === "boolean"
          ? r
          : defaultRules,
    };
  } catch {
    return defaults;
  }
}
export function useLocalSettings() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const stored = useMemo(() => parse(raw), [raw]);
  // Session copy keeps settings stable during a result, even if another tab changes storage.
  const [session, setSession] = useState<Settings | null>(null);
  const [notice, setNotice] = useState("");
  const settings = session ?? stored;
  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSession(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("sur-settings"));
    } catch {
      setNotice(
        "Não foi possível salvar as configurações neste navegador. Elas continuam disponíveis nesta sessão.",
      );
    }
  }
  return { settings, update, notice, freeze: () => setSession(settings) };
}
