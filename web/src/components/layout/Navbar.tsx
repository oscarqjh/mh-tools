"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [];

interface NavbarProps {
  currentTheme: string;
  onToggleTheme: () => void;
}

export default function Navbar({ currentTheme, onToggleTheme }: NavbarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-6"
      style={{
        backgroundColor: isHome
          ? "rgba(12, 21, 33, 0.6)"
          : "rgba(12, 21, 33, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <span
          className="text-xl font-semibold tracking-wide"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--accent)",
          }}
        >
          GnawniaVerse
        </span>
      </Link>

      {/* Center nav */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.id}
              href={item.enabled ? item.href : "#"}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive
                  ? "var(--accent-subtle)"
                  : "transparent",
                color: isActive
                  ? "var(--accent)"
                  : item.enabled
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                pointerEvents: item.enabled ? "auto" : "none",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          title={`Theme: ${currentTheme}`}
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
            {currentTheme.includes("light") ? (
              <>
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </>
            ) : (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </svg>
        </button>
      </div>
    </nav>
  );
}
