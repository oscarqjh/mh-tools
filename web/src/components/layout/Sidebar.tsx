"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "convertibles-analyser", label: "Convertibles Analyser", href: "/convertibles-analyser", icon: "\u{1F4E6}", enabled: true },
];

interface SidebarProps {
  currentTheme: string;
  onToggleTheme: () => void;
}

export default function Sidebar({ currentTheme, onToggleTheme }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-screen border-r transition-[width] duration-200"
      style={{
        width: expanded ? 200 : 64,
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo / Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center h-14 border-b cursor-pointer hover:opacity-80"
        style={{ borderColor: "var(--border)" }}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <span
          className="text-xl font-bold"
          style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
        >
          {expanded ? "GnawniaVerse" : "GV"}
        </span>
      </button>

      {/* Nav Items */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.id}
              href={item.enabled ? item.href : "#"}
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isActive ? "var(--accent-subtle)" : "transparent",
                color: isActive
                  ? "var(--accent)"
                  : item.enabled
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                pointerEvents: item.enabled ? "auto" : "none",
              }}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              {expanded && <span className="text-sm truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme Toggle */}
      <div className="py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-colors w-[calc(100%-16px)] cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          title="Toggle theme"
        >
          <span className="text-lg w-6 text-center">
            {currentTheme === "dark-parchment" ? "\u{1F319}" : "\u2600\uFE0F"}
          </span>
          {expanded && <span className="text-sm">Theme</span>}
        </button>
      </div>
    </aside>
  );
}
