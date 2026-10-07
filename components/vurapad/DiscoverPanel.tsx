"use client";

// ============================================================================
// Discover — search GitHub for open-source repos to use as launch source.
// Direct client fetch to api.github.com (CORS open, unauth 10 req/min search)
// ============================================================================

import { useState } from "react";
import { Card, btnPrimary, inputCls, alertCls } from "./ui";

export type RepoSource = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
};

export function DiscoverPanel({ onUse }: { onUse: (repo: RepoSource) => void }) {
  const [query, setQuery] = useState("vura");
  const [repos, setRepos] = useState<RepoSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(
          q
        )}&sort=stars&order=desc&per_page=8`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (res.status === 403 || res.status === 429) {
        setError("GITHUB RATE LIMIT — WAIT A MINUTE AND RETRY");
        return;
      }
      if (!res.ok) {
        setError(`GITHUB API ERROR ${res.status}`);
        return;
      }
      const data = await res.json();
      setRepos(
        (data.items || []).map(
          (r: Record<string, unknown>): RepoSource => ({
            full_name: r.full_name as string,
            html_url: r.html_url as string,
            description: (r.description as string | null) ?? null,
            stargazers_count: (r.stargazers_count as number) ?? 0,
            language: (r.language as string | null) ?? null,
            topics: (r.topics as string[]) ?? [],
            updated_at: r.updated_at as string,
          })
        )
      );
      setSearched(true);
    } catch {
      setError("NETWORK FAILURE — RETRY");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Discover // GitHub Source Research"
      meta={
        <span className="hidden font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a] sm:inline">
          Unauth 10 req/min
        </span>
      }
    >
      <div className="p-5">
        <p className="mb-4 text-[13px] leading-relaxed text-[#8a8a8a]">
          Search an open-source repo → adopt it as source → generate the brief →
          launch on Robinhood Chain.
        </p>

        {/* search bar */}
        <div className="flex gap-2">
          <span className="self-center font-mono text-sm text-[#00ff66]">$</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="repo, topic, org…"
            className={inputCls}
          />
          <button onClick={search} disabled={loading} className={btnPrimary}>
            {loading ? "Scanning…" : "Search"}
          </button>
        </div>

        {/* status */}
        {error && <div className={`mt-4 ${alertCls}`}>! {error}</div>}
        {!error && searched && repos.length === 0 && (
          <div className="mt-4 font-mono text-[12px] text-[#8a8a8a]">
            NO REPOSITORIES FOUND.
          </div>
        )}

        {/* results */}
        <div className="-mx-5 mt-4 divide-y divide-[#2a2a2a] border-t border-[#2a2a2a]">
          {repos.map((r) => (
            <div
              key={r.full_name}
              className="flex flex-wrap items-start gap-4 px-5 py-4 transition-colors hover:bg-[#161616]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-sm font-semibold text-white transition-colors hover:text-[#00ff66]"
                  >
                    {r.full_name}
                  </a>
                  <span className="rounded-md border border-[#00ff66]/40 bg-[#00ff66]/10 px-2 py-0.5 font-mono text-[10px] text-[#00ff66]">
                    ★ {r.stargazers_count}
                  </span>
                  {r.language && (
                    <span className="rounded-md border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 font-mono text-[10px] text-[#8a8a8a]">
                      {r.language}
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#8a8a8a]">
                    {r.description}
                  </p>
                )}
                {r.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.topics.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[#2a2a2a] px-2.5 py-0.5 text-[10px] tracking-[0.5px] text-[#8a8a8a]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => onUse(r)}
                className={btnPrimary + " shrink-0 px-4 py-2 text-[11px]"}
              >
                Use as source →
              </button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
