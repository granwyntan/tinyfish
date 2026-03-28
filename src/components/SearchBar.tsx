interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ query, onQueryChange, isLoading = false }: SearchBarProps) {
  return (
    <label className="group flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/6 px-5 py-4 shadow-[0_12px_40px_rgba(6,12,15,0.18)] backdrop-blur-xl transition focus-within:border-[#f0ba6d]/70">
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
          Search Marketplace
          </p>
          {isLoading ? (
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#f7dfb0]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#f0ba6d]" />
              Searching
            </span>
          ) : null}
        </div>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="mt-1 w-full bg-transparent text-lg font-medium text-white outline-none placeholder:text-white/30"
          placeholder="Search products, brands, destinations, or model numbers"
          type="search"
        />
      </div>
    </label>
  );
}
