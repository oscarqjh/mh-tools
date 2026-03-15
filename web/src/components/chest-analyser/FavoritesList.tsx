"use client";

import type { ChestInfo } from "@/types";

interface FavoritesListProps {
  favorites: string[];
  chests: ChestInfo[];
  onSelect: (chest: ChestInfo) => void;
  onRemove: (chestName: string) => void;
}

export default function FavoritesList({
  favorites,
  chests,
  onSelect,
  onRemove,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <p
        className="text-sm px-2 py-4 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        No favorites yet — search and star a chest to add it here
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {favorites.map((name) => {
        const chest = chests.find((c) => c.name === name);
        return (
          <li
            key={name}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer group transition-colors"
            style={{ color: "var(--text-primary)" }}
            onClick={() => chest && onSelect(chest)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--accent-subtle)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(name);
              }}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: "var(--accent)" }}
              title="Remove from favorites"
            >
              ★
            </button>
            <span className="truncate flex-1">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}
