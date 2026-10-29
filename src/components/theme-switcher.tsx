"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <select
      aria-label="主题模式"
      className="max-w-24 rounded-md border border-(--line) bg-(--bg) px-2 py-1 text-xs text-(--ink) dark:bg-(--sidebar)"
      value={mounted ? theme : "system"}
      disabled={!mounted}
      onChange={(event) => setTheme(event.target.value)}
    >
      <option value="system">跟随系统</option>
      <option value="light">浅色模式</option>
      <option value="dark">暗黑模式</option>
    </select>
  );
}
