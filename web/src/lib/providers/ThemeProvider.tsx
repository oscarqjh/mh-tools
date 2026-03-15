"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import { storage } from "@/lib/services";
import { applyTheme, themes } from "@/lib/themes";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTheme, setCurrentTheme] = useState("arcane-hunt");

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
    <div className="min-h-screen scene-bg" data-theme={currentTheme}>
      <Navbar
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="pt-14">{children}</main>
    </div>
  );
}
