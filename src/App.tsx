import { useDeferredValue, useEffect, useState } from "react";
import { FilterSidebar } from "./components/FilterSidebar";
import { ProductCard } from "./components/ProductCard";
import { ProductModal } from "./components/ProductModal";
import { SearchBar } from "./components/SearchBar";
import { fetchCatalog, searchCatalog } from "./lib/tinyfish";
import { marketplaceCatalog } from "./data/mockResults";
import type {
  FiltersState,
  ProductResult,
  RangeFilter,
  SearchResponse,
  SortOption
} from "./types/marketplace";
import {
  compactFormatter,
  formatDeliveryRange,
  formatSentiment,
  formatWorthIt,
  sgdFormatter
} from "./utils/formatters";
import {
  getBestSearchResponse,
  getExactSearchResponse,
  matchesProductQuery
} from "./utils/search";

type PageView = "compare" | "dataset" | "engine";

function getRangeBounds(values: number[]): RangeFilter {
  return {
    min: Math.floor(Math.min(...values)),
    max: Math.ceil(Math.max(...values))
  };
}

function getSearchBounds(activeSearch: SearchResponse) {
  return {
    totalPriceBounds: getRangeBounds(
      activeSearch.results.map((product) => product.pricing.landed_sgd.total)
    ),
    pricePerUnitBounds: getRangeBounds(
      activeSearch.results.map((product) => product.comparison.price_per_unit_sgd)
    ),
    deliveryBounds: getRangeBounds(
      activeSearch.results.flatMap((product) => [
        product.fulfillment.delivery.min_days,
        product.fulfillment.delivery.max_days
      ])
    )
  };
}

function createFilters(activeSearch: SearchResponse): FiltersState {
  const { totalPriceBounds, pricePerUnitBounds, deliveryBounds } =
    getSearchBounds(activeSearch);

  return {
    totalPriceRange: totalPriceBounds,
    pricePerUnitRange: pricePerUnitBounds,
    deliveryDaysRange: deliveryBounds,
    minWorthItScore: 40,
    minReturnWindowDays: 0,
    selectedSources: [],
    selectedOriginCountries: [],
    selectedCurrencies: [],
    selectedDeliveryOptions: [],
    selectedDeliveryTimings: [],
    selectedWarrantyTypes: [],
    selectedAvailability: [],
    freeReturnsOnly: false,
    localStockOnly: false
  };
}

function App() {
  const [page, setPage] = useState<PageView>("compare");
  const [catalog, setCatalog] = useState(marketplaceCatalog);
  const [query, setQuery] = useState(marketplaceCatalog.queries[0].search_term);
  const [sortBy, setSortBy] = useState<SortOption>("lowest");
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("Loading cached Tinyfish catalog...");
  const [liveError, setLiveError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);
  const activeSearch = getBestSearchResponse(catalog.queries, deferredQuery);
  const [filters, setFilters] = useState<FiltersState>(() => createFilters(activeSearch));

  useEffect(() => {
    setFilters(createFilters(activeSearch));
  }, [activeSearch.search_term]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const nextCatalog = await fetchCatalog();

        if (!cancelled) {
          setCatalog(nextCatalog);
          setSearchStatus("Loaded cached Tinyfish catalog.");
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(
            error instanceof Error ? error.message : "Failed to load Tinyfish cache."
          );
          setSearchStatus("Using bundled fallback catalog.");
        }
      } finally {
        if (!cancelled) {
          setIsCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();

    if (!trimmedQuery || isCatalogLoading) {
      return;
    }

    if (getExactSearchResponse(catalog.queries, trimmedQuery)) {
      setLiveError(null);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      try {
        setIsSearching(true);
        setLiveError(null);
        setPage("compare");
        setSearchStatus(
          `Scanning ${catalog.engine_context.source_targets.retail.length} marketplaces for ${trimmedQuery}...`
        );

        const payload = await searchCatalog(trimmedQuery);

        if (!cancelled) {
          setCatalog(payload.catalog);
          setSearchStatus(
            payload.fromCache
              ? `Loaded ${trimmedQuery} from cache.`
              : `Cached ${payload.query.results.length} live listings for ${trimmedQuery}.`
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(
            error instanceof Error ? error.message : "Tinyfish live search failed."
          );
          setSearchStatus("Search failed. Cached data is still available.");
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void runSearch();
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [catalog.engine_context.source_targets.retail.length, catalog.queries, deferredQuery, isCatalogLoading]);

  const { totalPriceBounds, pricePerUnitBounds, deliveryBounds } =
    getSearchBounds(activeSearch);

  const availableSources = Array.from(
    new Set(activeSearch.results.map((result) => result.source))
  );
  const availableOriginCountries = Array.from(
    new Set(activeSearch.results.map((result) => result.origin.country_of_origin))
  );
  const availableCurrencies = Array.from(
    new Set(activeSearch.results.map((result) => result.origin.currency_of_origin))
  );
  const availableDeliveryOptions = Array.from(
    new Set(activeSearch.results.map((result) => result.fulfillment.delivery.option_label))
  );
  const availableDeliveryTimings = Array.from(
    new Set(activeSearch.results.map((result) => result.fulfillment.delivery.timing_label))
  );
  const availableWarrantyTypes = Array.from(
    new Set(
      activeSearch.results.map(
        (result) => result.fulfillment.commercial_terms.warranty_type
      )
    )
  );
  const availableAvailability = Array.from(
    new Set(activeSearch.results.map((result) => result.fulfillment.availability.status))
  );

  const filteredResults = activeSearch.results
    .filter((result) => {
      if (!matchesProductQuery(result, deferredQuery)) {
        return false;
      }

      if (result.pricing.landed_sgd.total < filters.totalPriceRange.min) {
        return false;
      }

      if (result.pricing.landed_sgd.total > filters.totalPriceRange.max) {
        return false;
      }

      if (result.comparison.price_per_unit_sgd < filters.pricePerUnitRange.min) {
        return false;
      }

      if (result.comparison.price_per_unit_sgd > filters.pricePerUnitRange.max) {
        return false;
      }

      if (result.fulfillment.delivery.min_days < filters.deliveryDaysRange.min) {
        return false;
      }

      if (result.fulfillment.delivery.max_days > filters.deliveryDaysRange.max) {
        return false;
      }

      if (result.comparison.worth_it_score < filters.minWorthItScore) {
        return false;
      }

      if (
        result.fulfillment.commercial_terms.return_window_days <
        filters.minReturnWindowDays
      ) {
        return false;
      }

      if (filters.freeReturnsOnly && !result.fulfillment.commercial_terms.free_returns) {
        return false;
      }

      if (filters.localStockOnly && !result.fulfillment.availability.local_stock) {
        return false;
      }

      if (
        filters.selectedSources.length > 0 &&
        !filters.selectedSources.includes(result.source)
      ) {
        return false;
      }

      if (
        filters.selectedOriginCountries.length > 0 &&
        !filters.selectedOriginCountries.includes(result.origin.country_of_origin)
      ) {
        return false;
      }

      if (
        filters.selectedCurrencies.length > 0 &&
        !filters.selectedCurrencies.includes(result.origin.currency_of_origin)
      ) {
        return false;
      }

      if (
        filters.selectedDeliveryOptions.length > 0 &&
        !filters.selectedDeliveryOptions.includes(result.fulfillment.delivery.option_label)
      ) {
        return false;
      }

      if (
        filters.selectedDeliveryTimings.length > 0 &&
        !filters.selectedDeliveryTimings.includes(result.fulfillment.delivery.timing_label)
      ) {
        return false;
      }

      if (
        filters.selectedWarrantyTypes.length > 0 &&
        !filters.selectedWarrantyTypes.includes(
          result.fulfillment.commercial_terms.warranty_type
        )
      ) {
        return false;
      }

      if (
        filters.selectedAvailability.length > 0 &&
        !filters.selectedAvailability.includes(result.fulfillment.availability.status)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      switch (sortBy) {
        case "highest":
          return right.pricing.landed_sgd.total - left.pricing.landed_sgd.total;
        case "reviews":
          return (
            right.metrics.rating_out_of_5 * 1000 +
            right.metrics.rating_count -
            (left.metrics.rating_out_of_5 * 1000 + left.metrics.rating_count)
          );
        case "sold":
          return right.metrics.sold_count - left.metrics.sold_count;
        case "fastest":
          return (
            left.fulfillment.delivery.max_days - right.fulfillment.delivery.max_days
          );
        case "worth_it":
          return right.comparison.worth_it_score - left.comparison.worth_it_score;
        case "lowest":
        default:
          return left.pricing.landed_sgd.total - right.pricing.landed_sgd.total;
      }
    });

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const stillVisible = filteredResults.find(
      (result) => result.listing_id === selectedProduct.listing_id
    );

    if (!stillVisible) {
      setSelectedProduct(null);
    }
  }, [filteredResults, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedProduct]);

  const bestPrice = filteredResults.find((result) => result.metrics.is_cheapest);
  const bestWorthIt = [...filteredResults].sort(
    (left, right) => right.comparison.worth_it_score - left.comparison.worth_it_score
  )[0];
  const averageSentiment =
    filteredResults.reduce((sum, result) => sum + result.metrics.sentiment_score, 0) /
    (filteredResults.length || 1);
  const avgDeliveryMax = Math.round(
    filteredResults.reduce(
      (sum, result) => sum + result.fulfillment.delivery.max_days,
      0
    ) / (filteredResults.length || 1)
  );
  const localStockCount = filteredResults.filter(
    (result) => result.fulfillment.availability.local_stock
  ).length;
  const priceFloor = filteredResults[0]?.pricing.landed_sgd.total ?? 0;
  const priceCeiling =
    filteredResults[filteredResults.length - 1]?.pricing.landed_sgd.total ?? 0;
  const datasetPreview = JSON.stringify(
    {
      search_term: activeSearch.search_term,
      category: activeSearch.category,
      vertical: activeSearch.vertical,
      search_intent: activeSearch.search_intent,
      timestamp: activeSearch.timestamp,
      result_count: activeSearch.results.length,
      results: activeSearch.results.slice(0, 2)
    },
    null,
    2
  );

  const trackedSourceTargets =
    catalog.engine_context.source_targets.retail.length +
    catalog.engine_context.source_targets.travel.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09161b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(240,186,109,0.18),_transparent_28%),radial-gradient(circle_at_85%_10%,_rgba(77,179,171,0.14),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(110,216,208,0.12),_transparent_26%)]" />

      <div className="relative mx-auto max-w-[1580px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))] p-5 shadow-[0_24px_90px_rgba(4,8,10,0.28)] sm:p-8">
          <header className="rounded-[34px] border border-white/10 bg-[#0f2027]/80 p-5 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                  Tinyfish compare cockpit
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-[3.45rem]">
                  A price comparison workspace built around landed cost, value density,
                  and fulfillment confidence.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                  Search once, then inspect live listing links, cached product media,
                  price windows, delivery timing, local stock, warranty quality, and
                  Singapore-first landed pricing assumptions.
                </p>
              </div>

              <nav className="flex flex-wrap gap-2">
                {([
                  ["compare", "Compare"],
                  ["dataset", "Dataset"],
                  ["engine", "Engine"]
                ] as const).map(([key, label]) => {
                  const active = page === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPage(key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-[#f0ba6d]/40 bg-[#f0ba6d]/14 text-[#f7dfb0]"
                          : "border-white/10 bg-white/4 text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="space-y-5">
                <SearchBar
                  query={query}
                  onQueryChange={setQuery}
                  isLoading={isCatalogLoading || isSearching}
                />

                <div className="rounded-[24px] border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/68">
                  {searchStatus}
                </div>

                {liveError ? (
                  <div className="rounded-[24px] border border-[#f0ba6d]/28 bg-[#f0ba6d]/10 px-4 py-3 text-sm text-[#f7dfb0]">
                    {liveError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                    Current query {activeSearch.search_term}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                    Category {activeSearch.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                    Region {catalog.engine_context.target_market}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                    Cached links {activeSearch.results.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-black/16 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Best visible price
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {bestPrice
                      ? sgdFormatter.format(bestPrice.pricing.landed_sgd.total)
                      : "No match"}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Cheapest landed result in the current compare view.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/16 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Best worth-it
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {bestWorthIt ? formatWorthIt(bestWorthIt.comparison.worth_it_score) : "N/A"}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Highest blended value score after filters.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/16 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Avg. sentiment
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {formatSentiment(averageSentiment)}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Review-quality signal across visible offers.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/16 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Tracked sources
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {trackedSourceTargets}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Cached retail and travel targets in the engine layer.
                  </p>
                </div>
              </div>
            </div>
          </header>

          {page === "compare" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
              <div className="self-start xl:sticky xl:top-6">
                <FilterSidebar
                  filters={filters}
                  defaults={createFilters(activeSearch)}
                  sortBy={sortBy}
                  totalPriceBounds={totalPriceBounds}
                  pricePerUnitBounds={pricePerUnitBounds}
                  deliveryBounds={deliveryBounds}
                  availableSources={availableSources}
                  availableOriginCountries={availableOriginCountries}
                  availableCurrencies={availableCurrencies}
                  availableDeliveryOptions={availableDeliveryOptions}
                  availableDeliveryTimings={availableDeliveryTimings}
                  availableWarrantyTypes={availableWarrantyTypes}
                  availableAvailability={availableAvailability}
                  onSortChange={setSortBy}
                  onFiltersChange={setFilters}
                />
              </div>

              <main className="space-y-6">
                {bestWorthIt ? (
                  <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,_rgba(240,186,109,0.12),_rgba(77,179,171,0.1))] shadow-[0_18px_60px_rgba(6,12,15,0.2)]">
                    <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
                      <div className="relative min-h-[280px]">
                        <img
                          src={bestWorthIt.media.product_image_url}
                          alt={bestWorthIt.product_name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,23,0.12),rgba(7,18,23,0.78))]" />
                      </div>

                      <div className="space-y-5 p-6 sm:p-7">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
                            Top recommendation
                          </span>
                          <span className="rounded-full border border-[#4db3ab]/28 bg-[#4db3ab]/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#b8f7ef]">
                            Origin {bestWorthIt.origin.country_of_origin}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-3xl font-semibold text-white">
                            {bestWorthIt.product_name}
                          </h2>
                          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
                            {bestWorthIt.comparison.rationale_summary}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                              Worth it
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {formatWorthIt(bestWorthIt.comparison.worth_it_score)}
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                              Delivery
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {formatDeliveryRange(
                                bestWorthIt.fulfillment.delivery.min_days,
                                bestWorthIt.fulfillment.delivery.max_days
                              )}
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                              Live listing
                            </p>
                            <a
                              href={bestWorthIt.listing_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#f7dfb0] hover:text-white"
                            >
                              Open source
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M7 17 17 7" />
                                <path d="M9 7h8v8" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Compare snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Focused on useful decisions, not raw listing spam.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/62">
                      Every visible card includes landed cost, origin, delivery window,
                      return friction, and warranty posture. Open a card to inspect the
                      cost breakdown, then jump to the live marketplace listing when
                      you are ready to validate the offer.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Visible offers
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {filteredResults.length}
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        {localStockCount} with local stock signals.
                      </p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Delivery ceiling
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {avgDeliveryMax}d
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Average upper-bound delivery estimate.
                      </p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Price window
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {filteredResults.length
                          ? `${sgdFormatter.format(priceFloor)} - ${sgdFormatter.format(
                              priceCeiling
                            )}`
                          : "No match"}
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Current landed-price spread after filters.
                      </p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Units observed
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {compactFormatter.format(
                          filteredResults.reduce(
                            (sum, result) => sum + result.metrics.sold_count,
                            0
                          )
                        )}
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Aggregate sold-count signal across visible offers.
                      </p>
                    </div>
                  </div>
                </section>

                {isSearching ? (
                  <section className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                          Live Tinyfish search
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          Building fresh cache for {deferredQuery.trim() || query}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-white/62">
                          Waiting for marketplace runs to finish across all configured
                          sites. Cached results will appear here automatically as soon as
                          the new query is stored.
                        </p>
                      </div>
                      <div className="grid h-16 w-16 place-items-center rounded-full border border-[#f0ba6d]/30 bg-[#f0ba6d]/10">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f0ba6d]/30 border-t-[#f0ba6d]" />
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-5 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl sm:p-7">
                  <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                        Result matrix
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Ranked offers
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                        Sort {sortBy.replace("_", " ")}
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                        Live links enabled
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/68">
                        Media cache ready
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                    {filteredResults.map((product) => (
                      <ProductCard
                        key={product.listing_id}
                        product={product}
                        onClick={() => setSelectedProduct(product)}
                      />
                    ))}
                  </div>

                  {filteredResults.length === 0 ? (
                    <div className="mt-6 rounded-[28px] border border-dashed border-white/12 bg-white/4 p-10 text-center">
                      <p className="text-lg font-medium text-white">
                        No listings match these controls.
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Loosen the landed-price range, widen the delivery window, or
                        lower the worth-it threshold to reveal more candidates.
                      </p>
                    </div>
                  ) : null}
                </section>
              </main>
            </div>
          ) : null}

          {page === "dataset" ? (
            <div className="mt-6 space-y-6">
              <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                        Active dataset info
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {activeSearch.search_term}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-white/62">
                        {activeSearch.search_description}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/16 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Updated
                      </p>
                      <p className="mt-2 text-sm font-medium text-white/80">
                        {new Date(activeSearch.timestamp).toLocaleString("en-SG")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Category / vertical
                      </p>
                      <p className="mt-2 text-sm font-medium text-white/82">
                        {activeSearch.category} · {activeSearch.vertical}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Search intent
                      </p>
                      <p className="mt-2 text-sm font-medium text-white/82">
                        {activeSearch.search_intent}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeSearch.search_aliases.map((alias) => (
                      <span
                        key={alias}
                        className="rounded-full border border-white/10 bg-black/12 px-3 py-2 text-sm text-white/58"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Results
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {activeSearch.results.length}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Listings cached for this search term.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Origins
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {availableOriginCountries.length}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Unique country-of-origin values in the dataset.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Cheapest cached total
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {sgdFormatter.format(totalPriceBounds.min)}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Lower bound across all cached listings.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Cached photos
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {activeSearch.results.length}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Each cached listing keeps the real site image URL returned by
                      Tinyfish whenever available.
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0c1c22]/84 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                  <div className="border-b border-white/10 px-6 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Cached listing ledger
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Data ready to replace with your Tinyfish endpoint
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/42">
                        <tr>
                          <th className="px-6 py-4">Listing</th>
                          <th className="px-6 py-4">Origin</th>
                          <th className="px-6 py-4">Landed</th>
                          <th className="px-6 py-4">Delivery</th>
                          <th className="px-6 py-4">Worth it</th>
                          <th className="px-6 py-4">Live URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSearch.results.map((result) => (
                          <tr key={result.listing_id} className="border-t border-white/8">
                            <td className="px-6 py-4 align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(result);
                                  setPage("compare");
                                }}
                                className="text-left"
                              >
                                <p className="font-medium text-white">{result.product_name}</p>
                                <p className="mt-1 text-sm text-white/56">{result.source}</p>
                              </button>
                            </td>
                            <td className="px-6 py-4 align-top text-sm text-white/72">
                              {result.origin.country_of_origin}
                              <div className="mt-1 text-white/45">
                                {result.origin.currency_of_origin}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top text-sm font-medium text-white">
                              {sgdFormatter.format(result.pricing.landed_sgd.total)}
                            </td>
                            <td className="px-6 py-4 align-top text-sm text-white/72">
                              {formatDeliveryRange(
                                result.fulfillment.delivery.min_days,
                                result.fulfillment.delivery.max_days
                              )}
                            </td>
                            <td className="px-6 py-4 align-top text-sm text-white/72">
                              {formatWorthIt(result.comparison.worth_it_score)}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <a
                                href={result.listing_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-[#f7dfb0] hover:text-white"
                              >
                                Open
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      JSON preview
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Clean payload shape
                    </h2>
                    <pre className="surface-scroll mt-5 max-h-[420px] overflow-auto rounded-[24px] border border-white/10 bg-[#08151a] p-4 text-xs leading-6 text-[#c6e9e5]">
                      {datasetPreview}
                    </pre>
                  </div>

                  <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Filter coverage
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-white">Sources</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {availableSources.map((value) => (
                            <span
                              key={value}
                              className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/66"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Delivery options</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {availableDeliveryOptions.map((value) => (
                            <span
                              key={value}
                              className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/66"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {page === "engine" ? (
            <div className="mt-6 space-y-6">
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                    Engine assumptions
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Landed cost formula
                  </h2>
                  <div className="mt-4 rounded-[24px] border border-[#f0ba6d]/18 bg-[#f0ba6d]/10 p-4">
                    <p className="font-mono text-sm text-[#f6d7a5]">
                      {catalog.engine_context.landed_cost_formula}
                    </p>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm text-white/66">
                    {catalog.engine_context.calculation_notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      GST modeled
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {catalog.engine_context.gst_rate_percent}%
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Singapore low-value goods logic in the current engine.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Supported origins
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {catalog.engine_context.supported_origin_markets.length}
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Cached market codes available for future endpoint expansion.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#0c1c22]/84 p-5 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Origin coverage map
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {catalog.engine_context.supported_origin_markets.map((market) => (
                        <span
                          key={market}
                          className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/66"
                        >
                          {market}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                    Retail source cache
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Singapore-first marketplace targets
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {catalog.engine_context.source_targets.retail.map((target) => (
                      <a
                        key={target.name}
                        href={target.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/4 px-4 py-4 transition hover:border-[#f0ba6d]/30 hover:bg-[#f0ba6d]/6"
                      >
                        <span>
                          <span className="block font-medium text-white">{target.name}</span>
                          <span className="mt-1 block text-sm text-white/52">{target.url}</span>
                        </span>
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 text-white/45"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M7 17 17 7" />
                          <path d="M9 7h8v8" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[32px] border border-white/10 bg-[#0c1c22]/84 p-6 shadow-[0_18px_60px_rgba(6,12,15,0.22)] backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Travel extensions
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Adjacent search surfaces
                    </h2>
                    <div className="mt-5 grid gap-3">
                      {catalog.engine_context.source_targets.travel.map((target) => (
                        <a
                          key={target.name}
                          href={target.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/4 px-4 py-4 transition hover:border-[#4db3ab]/30 hover:bg-[#4db3ab]/6"
                        >
                          <span>
                            <span className="block font-medium text-white">{target.name}</span>
                            <span className="mt-1 block text-sm text-white/52">{target.url}</span>
                          </span>
                          <svg
                            aria-hidden="true"
                            className="h-5 w-5 text-white/45"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M7 17 17 7" />
                            <path d="M9 7h8v8" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(140deg,_rgba(240,186,109,0.12),_rgba(255,255,255,0.04))] p-6 shadow-[0_18px_60px_rgba(6,12,15,0.2)]">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Cache status
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Temporary bridge until the live Tinyfish endpoint is ready
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/66">
                      Each cached result stores `listing_url` and `media.product_image_url`
                      from the Tinyfish run, so new searches can be merged into one local
                      JSON catalog while the UI stays fast on repeat queries.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>

      {selectedProduct ? (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
