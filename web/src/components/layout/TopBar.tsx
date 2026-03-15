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

  const isReady = canRefresh && remaining <= 0;

  return (
    <div className="flex items-center justify-between mb-6">
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: "var(--font-heading)",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h1>

      <button
        onClick={onRefresh}
        disabled={!isReady}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: isReady ? "var(--accent)" : "var(--bg-card)",
          color: isReady ? "var(--bg-primary)" : "var(--text-muted)",
          border: isReady ? "none" : "1px solid var(--border)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {remaining > 0 ? formatTime(remaining) : "Refresh Prices"}
      </button>
    </div>
  );
}
