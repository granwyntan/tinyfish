import type { SearchSuggestion } from "../types/marketplace";

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onBlurSubmit: () => void;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect: (value: string) => void;
  isLoading?: boolean;
}

export function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  onBlurSubmit,
  suggestions = [],
  onSuggestionSelect,
  isLoading = false
}: SearchBarProps) {
  return (
    <div className="group relative rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-3 shadow-[0_16px_50px_rgba(6,12,15,0.2)] backdrop-blur-xl transition focus-within:border-[#f0ba6d]/70">
      <div className="flex items-center gap-4 rounded-[24px] bg-[#07151a]/65 px-4 py-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ba6d] text-[#0d1a1f] shadow-[0_10px_30px_rgba(240,186,109,0.35)]">
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">
              Search marketplace
            </p>
            <div className="flex items-center gap-3">
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-white/36 sm:inline">
                Enter or blur to search
              </span>
              {isLoading ? (
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#f7dfb0]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#f0ba6d]" />
                  Searching
                </span>
              ) : null}
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onBlur={onBlurSubmit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            className="mt-1 w-full bg-transparent text-lg font-medium text-white outline-none placeholder:text-white/30 sm:text-xl"
            placeholder="Search products, brands, destinations, or model numbers"
            type="search"
          />
        </div>
      </div>

      {query.trim() && suggestions.length > 0 ? (
        <div className="absolute inset-x-3 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[24px] border border-white/10 bg-[#08161b]/96 shadow-[0_20px_60px_rgba(3,8,10,0.34)] backdrop-blur-xl">
          <div className="max-h-80 overflow-y-auto p-2">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.kind}-${suggestion.value}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSuggestionSelect(suggestion.value);
                }}
                className="flex w-full items-start justify-between gap-4 rounded-[18px] px-4 py-3 text-left transition hover:bg-white/6"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {suggestion.value}
                  </span>
                  <span className="mt-1 block truncate text-xs uppercase tracking-[0.18em] text-white/42">
                    {suggestion.subtitle}
                  </span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/4 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  {suggestion.kind}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
