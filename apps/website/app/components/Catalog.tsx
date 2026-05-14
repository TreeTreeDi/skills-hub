"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface SkillItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  packageName: string;
  installs: number;
  category: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type Tab = "all" | "trending" | "hot";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "总榜" },
  { key: "trending", label: "趋势 (24h)" },
  { key: "hot", label: "热门" },
];

export function Catalog() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [tab, setTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "all"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10) || 1
  );
  const [items, setItems] = useState<SkillItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchData = useCallback(
    async (q: string, t: Tab, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("tab", t);
        params.set("page", String(p));
        params.set("limit", "20");

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        setItems(data.skills || []);
        setPagination(data.pagination || null);
      } catch {
        setItems([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(keyword, tab, page);
  }, [keyword, tab, page, fetchData]);

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [searchParams, router]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    updateUrl({ q: keyword || undefined, page: undefined });
    fetchData(keyword, tab, 1);
  }

  function handleTabClick(newTab: Tab) {
    setTab(newTab);
    setPage(1);
    setSelected(new Set());
    updateUrl({ tab: newTab, page: undefined });
    fetchData(keyword, newTab, 1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateUrl({ page: String(newPage) });
    fetchData(keyword, tab, newPage);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length && items.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  }

  async function copySelected() {
    if (selected.size === 0) return;
    const commands = items
      .filter((item) => selected.has(item.id))
      .map((item) => `dt-skills add ${item.packageName}`);
    const text = commands.join("\n");
    await navigator.clipboard.writeText(text);
    alert(`已复制 ${selected.size} 条安装命令`);
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate">
          技能排行榜
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索技能..."
              className="w-full pl-9 pr-4 py-2.5 border border-hairline rounded-xl bg-canvas font-body text-sm text-ink placeholder:text-slate outline-none focus:ring-1 focus:ring-ring-warm transition-shadow"
            />
          </form>

          {/* Bulk actions */}
          <div className="flex items-center gap-3">
            {someSelected && (
              <span className="font-mono text-[13px] text-olive">
                已选 {selected.size} 项
              </span>
            )}
            <button
              onClick={copySelected}
              disabled={!someSelected}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                someSelected
                  ? "bg-primary text-ivory hover:bg-primary-active cursor-pointer"
                  : "bg-canvas text-slate border border-hairline cursor-default opacity-60"
              }`}
            >
              复制安装命令
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabClick(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "text-ink bg-canvas shadow-[0_0_0_1px_var(--hairline-warm)]"
                    : "text-olive hover:text-ink hover:bg-black/[0.03]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-hairline rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hairline">
              <th className="w-10 py-3 px-2 pl-4 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-hairline-warm cursor-pointer accent-primary"
                />
              </th>
              <th className="w-12 py-3 px-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate font-normal">
                排名
              </th>
              <th className="py-3 px-4 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate font-normal">
                技能
              </th>
              <th className="py-3 px-4 text-right font-mono text-[10px] uppercase tracking-[0.1em] text-slate font-normal">
                安装量
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate">
                  加载中...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate">
                  {keyword ? `未找到 "${keyword}" 相关技能` : "暂无技能数据"}
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const rank = ((pagination?.page || 1) - 1) * (pagination?.pageSize || 20) + index + 1;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-hairline last:border-b-0 cursor-pointer hover:bg-canvas transition-colors"
                    onClick={() => (window.location.href = `/skill/${item.slug}`)}
                  >
                    <td className="py-3.5 px-2 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-hairline-warm cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="py-3.5 px-2 font-mono text-[13px] text-slate">
                      {rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink">{item.name}</span>
                        {item.category === "集成包" && (
                          <span className="font-mono text-[10px] font-medium text-olive bg-warm-sand px-1.5 py-0.5 rounded">
                            技能包
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate mt-0.5">
                        {item.packageName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-[13px] text-olive">
                        {formatInstalls(item.installs)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg text-sm font-medium text-olive hover:text-ink hover:bg-black/[0.03] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-canvas shadow-[0_0_0_1px_var(--hairline-warm)] text-ink"
                  : "text-olive hover:text-ink hover:bg-black/[0.03]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-3 py-2 rounded-lg text-sm font-medium text-olive hover:text-ink hover:bg-black/[0.03] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
