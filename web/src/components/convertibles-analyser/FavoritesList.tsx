"use client";

import type { ConvertibleInfo } from "@/types";

interface FavoritesListProps {
  favorites: string[];
  convertibles: ConvertibleInfo[];
  onSelect: (convertible: ConvertibleInfo) => void;
  onRemove: (name: string) => void;
}

export default function FavoritesList({
  favorites,
  convertibles,
  onSelect,
  onRemove,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <p
        className="text-sm py-3 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        Star to save it here
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {favorites.map((name) => {
        const convertible = convertibles.find((c) => c.name === name);
        return (
          <button
            key={name}
            className="pill-tag group"
            onClick={() => convertible && onSelect(convertible)}
          >
            <span className="truncate max-w-[200px]">{name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onRemove(name);
              }}
              className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity text-xs cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              title="Remove"
            >
              &times;
            </span>
          </button>
        );
      })}
    </div>
  );
}
