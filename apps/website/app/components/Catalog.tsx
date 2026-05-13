"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback, type FormEvent } from "react";
import type { CatalogItem } from "../lib/types";
import { SkillCard } from "./Card";
import { Chip } from "./Chip";

interface CatalogProps {
  items: CatalogItem[];
  categories: string[];
}

export function Catalog({ items, categories }: CatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "全部");
  const [sort, setSort] = useState<"stars" | "recent">(
    (searchParams.get("sort") as "stars" | "recent") || "stars",
  );

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(kw) ||
          item.description.toLowerCase().includes(kw) ||
          item.tags.some((tag) => tag.toLowerCase().includes(kw)),
      );
    }

    if (category && category !== "全部") {
      result = result.filter((item) => item.category === category);
    }

    if (sort === "recent") {
      result.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
    }

    return result;
  }, [items, keyword, category, sort]);

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "全部" && value !== "stars") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [searchParams, router],
  );

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateUrl({ q: keyword });
  }

  function handleCategoryClick(cat: string) {
    setCategory(cat);
    updateUrl({ category: cat });
  }

  function handleSortClick(newSort: "stars" | "recent") {
    setSort(newSort);
    updateUrl({ sort: newSort });
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl mb-8">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search skills..."
          className="w-full rounded-sm border border-hairline bg-canvas px-4 py-3 pr-10 font-body text-base text-ink placeholder:text-muted focus:border-form-focus focus:outline-none focus:ring-1 focus:ring-form-focus transition-colors"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          aria-label="Search"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </form>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            active={cat === category}
            onClick={() => handleCategoryClick(cat)}
          />
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-xs uppercase text-muted">Sort by</span>
        <button
          onClick={() => handleSortClick("stars")}
          className={`font-body text-sm ${sort === "stars" ? "text-ink font-medium" : "text-muted hover:text-ink"}`}
        >
          Stars
        </button>
        <button
          onClick={() => handleSortClick("recent")}
          className={`font-body text-sm ${sort === "recent" ? "text-ink font-medium" : "text-muted hover:text-ink"}`}
        >
          Recent
        </button>
      </div>

      {/* Skill grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <SkillCard
              key={item.slug}
              name={item.name}
              description={item.description}
              category={item.category}
              stars={item.stars}
              skillCount={item.skillCount}
              href={item.href}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="font-body text-lg text-muted">
            No skills found{keyword ? ` for "${keyword}"` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}
