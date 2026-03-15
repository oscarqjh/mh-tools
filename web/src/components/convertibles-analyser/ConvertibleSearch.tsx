"use client";

import { useState, useRef, useEffect } from "react";
import type { ConvertibleInfo } from "@/types";
import { MhctService } from "@/lib/services/mhct-service";

interface ConvertibleSearchProps {
  convertibles: ConvertibleInfo[];
  onSelect: (convertible: ConvertibleInfo) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

export default function ConvertibleSearch({ convertibles, onSelect, disabled }: ConvertibleSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = (() => {
    if (debouncedQuery.length < 2) return [];
    return MhctService.searchConvertibles(convertibles, debouncedQuery).slice(0, 20);
  })();

  useEffect(() => {
    if (isFocusedRef.current && results.length > 0) {
      setIsOpen(true);
    }
    setHighlightIndex(-1);
  }, [results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (convertible: ConvertibleInfo) => {
    setQuery(convertible.name);
    setIsOpen(false);
    onSelect(convertible);
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
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            isFocusedRef.current = true;
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={(e) => {
            // Don't close if clicking within the dropdown container
            if (containerRef.current?.contains(e.relatedTarget as Node)) return;
            isFocusedRef.current = false;
            setIsOpen(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search convertibles..."
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-all disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {isOpen && results.length > 0 && (
        <ul
          className="absolute z-10 w-full mt-1.5 rounded-xl overflow-y-auto max-h-60 shadow-xl"
          style={{
            backgroundColor: "var(--bg-card)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--border)",
          }}
        >
          {results.map((convertible, i) => (
            <li
              key={convertible.id}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur so selection fires
                handleSelect(convertible);
              }}
              className="px-3 py-2.5 text-sm cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  i === highlightIndex ? "var(--accent-subtle)" : "transparent",
                color:
                  i === highlightIndex
                    ? "var(--accent)"
                    : "var(--text-primary)",
              }}
            >
              {convertible.name}
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && isOpen && (
        <div
          className="absolute z-10 w-full mt-1.5 px-3 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          No convertibles found
        </div>
      )}
    </div>
  );
}
