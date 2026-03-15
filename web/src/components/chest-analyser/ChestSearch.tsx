"use client";

import { useState, useRef, useEffect } from "react";
import type { ChestInfo } from "@/types";
import { MhctService } from "@/lib/services/mhct-service";

interface ChestSearchProps {
  chests: ChestInfo[];
  onSelect: (chest: ChestInfo) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

export default function ChestSearch({ chests, onSelect, disabled }: ChestSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = (() => {
    if (debouncedQuery.length < 2) return [];
    return MhctService.searchChests(chests, debouncedQuery).slice(0, 20);
  })();

  useEffect(() => {
    setIsOpen(results.length > 0);
    setHighlightIndex(-1);
  }, [results]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (chest: ChestInfo) => {
    setQuery(chest.name);
    setIsOpen(false);
    onSelect(chest);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search chests..."
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors disabled:opacity-50"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          borderWidth: 1,
          borderColor: "var(--border)",
        }}
      />

      {isOpen && results.length > 0 && (
        <ul
          className="absolute z-10 w-full mt-1 rounded-lg overflow-y-auto max-h-60 shadow-lg"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderWidth: 1,
            borderColor: "var(--border)",
          }}
        >
          {results.map((chest, i) => (
            <li
              key={chest.id}
              onClick={() => handleSelect(chest)}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  i === highlightIndex ? "var(--accent-subtle)" : "transparent",
                color:
                  i === highlightIndex
                    ? "var(--accent)"
                    : "var(--text-primary)",
              }}
            >
              {chest.name}
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && isOpen && (
        <div
          className="absolute z-10 w-full mt-1 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-muted)",
            borderWidth: 1,
            borderColor: "var(--border)",
          }}
        >
          No chests found
        </div>
      )}
    </div>
  );
}
