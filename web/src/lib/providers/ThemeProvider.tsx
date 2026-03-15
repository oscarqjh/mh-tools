"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { storage } from "@/lib/services";
import { applyTheme, themes } from "@/lib/themes";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTheme, setCurrentTheme] = useState("dark-parchment");

  useEffect(() => {
    const saved = storage.getTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const currentIndex = themes.findIndex((t) => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex].id;
    setCurrentTheme(nextTheme);
    storage.setTheme(nextTheme);
    applyTheme(nextTheme);
  }, [currentTheme]);

  return (
    <div className="flex h-screen overflow-hidden" data-theme={currentTheme}>
      <Sidebar
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
