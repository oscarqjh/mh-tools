"use client";

import { useEffect, useState, useCallback } from "react";

interface TopBarProps {
  title: string;
  canRefresh: boolean;
  cooldownRemaining: number;
  onRefresh: () => void;
}

export default function TopBar({
  title,
  canRefresh,
  cooldownRemaining,
  onRefresh,
}: TopBarProps) {
  const [remaining, setRemaining] = useState(cooldownRemaining);

  useEffect(() => {
    setRemaining(cooldownRemaining);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return (
    <header
      className="flex items-center justify-between h-14 px-6 border-b"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <h1
        className="text-lg font-bold"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-heading)",
        }}
      >
        {title}
      </h1>

      <button
        onClick={onRefresh}
        disabled={!canRefresh && remaining > 0}
        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: canRefresh && remaining <= 0
            ? "var(--accent)"
            : "var(--bg-tertiary)",
          color: canRefresh && remaining <= 0
            ? "var(--bg-primary)"
            : "var(--text-muted)",
          borderWidth: 1,
          borderColor: "var(--border)",
        }}
      >
        {remaining > 0 ? `Refresh (${formatTime(remaining)})` : "Refresh Prices"}
      </button>
    </header>
  );
}
