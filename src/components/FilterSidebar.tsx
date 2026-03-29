import type { ReactNode } from "react";
import type { FiltersState, RangeFilter, SortOption } from "../types/marketplace";

interface FilterSidebarProps {
  filters: FiltersState;
  defaults: FiltersState;
  sortBy: SortOption;
  totalPriceBounds: RangeFilter;
  pricePerUnitBounds: RangeFilter;
  deliveryBounds: RangeFilter;
  shippingFeeBounds: RangeFilter;
  gstBounds: RangeFilter;
  reviewCountBounds: RangeFilter;
  soldCountBounds: RangeFilter;
  availableSources: string[];
  availableOriginCountries: string[];
  availableCurrencies: string[];
  availableDeliveryOptions: string[];
  availableDeliveryTimings: string[];
  availableWarrantyTypes: string[];
  availableAvailability: string[];
  onSortChange: (value: SortOption) => void;
  onFiltersChange: (next: FiltersState) => void;
}

const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: "Lowest to highest", value: "lowest" },
  { label: "Highest to lowest", value: "highest" },
  { label: "Best reviews", value: "reviews" },
  { label: "Most sold", value: "sold" },
  { label: "Fastest delivery", value: "fastest" },
  { label: "Most worth it", value: "worth_it" }
];

function FilterSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/8 bg-black/14 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ToggleChipGroup({
  items,
  selectedItems,
  onToggle,
  activeClass
}: {
  items: string[];
  selectedItems: string[];
  onToggle: (value: string) => void;
  activeClass: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-white/45">No values in the active dataset.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selectedItems.includes(item);

        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full border px-3 py-2 text-sm transition ${
              active
                ? activeClass
                : "border-white/10 bg-white/4 text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function RangeControl({
  label,
  range,
  bounds,
  suffix,
  step,
  accentClass,
  onChange
}: {
  label: string;
  range: RangeFilter;
  bounds: RangeFilter;
  suffix: string;
  step: number;
  accentClass: string;
  onChange: (next: RangeFilter) => void;
}) {
  const span = Math.max(bounds.max - bounds.min, 1);
  const minPercent = ((range.min - bounds.min) / span) * 100;
  const maxPercent = ((range.max - bounds.min) / span) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm text-white/64">
        <span>{label}</span>
        <span className="font-medium text-white/82">
          {range.min}
          {suffix} - {range.max}
          {suffix}
        </span>
      </div>

      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${accentClass}`}
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(maxPercent - minPercent, 0)}%`
          }}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={range.min}
          onChange={(event) =>
            onChange({
              min: Math.min(Number(event.target.value), range.max),
              max: range.max
            })
          }
          className="range-thumb absolute inset-0 h-10 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={range.max}
          onChange={(event) =>
            onChange({
              min: range.min,
              max: Math.max(Number(event.target.value), range.min)
            })
          }
          className="range-thumb absolute inset-0 h-10 w-full appearance-none bg-transparent"
        />
      </div>

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/40">
        <span>
          Start {range.min}
          {suffix}
        </span>
        <span>
          End {range.max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function FilterSidebar({
  filters,
  defaults,
  sortBy,
  totalPriceBounds,
  pricePerUnitBounds,
  deliveryBounds,
  shippingFeeBounds,
  gstBounds,
  reviewCountBounds,
  soldCountBounds,
  availableSources,
  availableOriginCountries,
  availableCurrencies,
  availableDeliveryOptions,
  availableDeliveryTimings,
  availableWarrantyTypes,
  availableAvailability,
  onSortChange,
  onFiltersChange
}: FilterSidebarProps) {
  function toggleFilterItem(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  return (
    <aside className="rounded-[34px] border border-white/10 bg-[#102128]/92 p-5 shadow-[0_18px_60px_rgba(6,12,15,0.26)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Filters</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Decision controls</h2>
        </div>
        <button
          type="button"
          onClick={() => onFiltersChange(defaults)}
          className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <FilterSection title="Ranking">
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-[#f0ba6d]/70"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#102128]">
                {option.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <FilterSection title="Decision presets">
          <div className="grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
              <input
                type="checkbox"
                checked={filters.highConfidenceOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    highConfidenceOnly: event.target.checked
                  })
                }
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
              />
              <span>
                <span className="block text-sm font-medium text-white">High confidence only</span>
                <span className="block text-sm text-white/55">
                  Keep strong ratings, meaningful review count, and better sentiment only.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
              <input
                type="checkbox"
                checked={filters.zeroImportFeesOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    zeroImportFeesOnly: event.target.checked
                  })
                }
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
              />
              <span>
                <span className="block text-sm font-medium text-white">Zero import fees</span>
                <span className="block text-sm text-white/55">
                  Hide listings with GST or customs charges added on top.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
              <input
                type="checkbox"
                checked={filters.fastLocalOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    fastLocalOnly: event.target.checked
                  })
                }
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
              />
              <span>
                <span className="block text-sm font-medium text-white">Fast local only</span>
                <span className="block text-sm text-white/55">
                  Focus on local stock with delivery capped at three days.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
              <input
                type="checkbox"
                checked={filters.crossBorderOnly}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    crossBorderOnly: event.target.checked
                  })
                }
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
              />
              <span>
                <span className="block text-sm font-medium text-white">Cross-border only</span>
                <span className="block text-sm text-white/55">
                  Show imported options only when you want overseas deals.
                </span>
              </span>
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Price windows">
          <div className="space-y-5">
            <RangeControl
              label="Landed price"
              range={filters.totalPriceRange}
              bounds={totalPriceBounds}
              suffix=" SGD"
              step={1}
              accentClass="bg-gradient-to-r from-[#f0ba6d] to-[#ffdf9d]"
              onChange={(next) => onFiltersChange({ ...filters, totalPriceRange: next })}
            />
            <RangeControl
              label="Price per unit"
              range={filters.pricePerUnitRange}
              bounds={pricePerUnitBounds}
              suffix=" SGD"
              step={1}
              accentClass="bg-gradient-to-r from-[#4db3ab] to-[#9af0e7]"
              onChange={(next) => onFiltersChange({ ...filters, pricePerUnitRange: next })}
            />
            <RangeControl
              label="Shipping fee"
              range={filters.shippingFeeRange}
              bounds={shippingFeeBounds}
              suffix=" SGD"
              step={1}
              accentClass="bg-gradient-to-r from-[#f5a07b] to-[#ffd4a8]"
              onChange={(next) => onFiltersChange({ ...filters, shippingFeeRange: next })}
            />
            <RangeControl
              label="GST amount"
              range={filters.gstRange}
              bounds={gstBounds}
              suffix=" SGD"
              step={1}
              accentClass="bg-gradient-to-r from-[#e9d16f] to-[#fff1a8]"
              onChange={(next) => onFiltersChange({ ...filters, gstRange: next })}
            />
          </div>
        </FilterSection>

        <FilterSection title="Delivery">
          <div className="space-y-5">
            <RangeControl
              label="Delivery days"
              range={filters.deliveryDaysRange}
              bounds={deliveryBounds}
              suffix=" d"
              step={1}
              accentClass="bg-gradient-to-r from-[#6fd7d0] to-[#c7fff8]"
              onChange={(next) => onFiltersChange({ ...filters, deliveryDaysRange: next })}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/62">Minimum return window</span>
                <span className="text-white/55">{filters.minReturnWindowDays} days</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={filters.minReturnWindowDays}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minReturnWindowDays: Number(event.target.value)
                  })
                }
                className="range-thumb h-10 w-full appearance-none bg-transparent"
              />
            </div>

            <ToggleChipGroup
              items={availableDeliveryOptions}
              selectedItems={filters.selectedDeliveryOptions}
              onToggle={(value) =>
                onFiltersChange({
                  ...filters,
                  selectedDeliveryOptions: toggleFilterItem(
                    filters.selectedDeliveryOptions,
                    value
                  )
                })
              }
              activeClass="border-[#f0ba6d]/60 bg-[#f0ba6d]/12 text-[#f6d7a5]"
            />
            <ToggleChipGroup
              items={availableDeliveryTimings}
              selectedItems={filters.selectedDeliveryTimings}
              onToggle={(value) =>
                onFiltersChange({
                  ...filters,
                  selectedDeliveryTimings: toggleFilterItem(
                    filters.selectedDeliveryTimings,
                    value
                  )
                })
              }
              activeClass="border-[#4db3ab]/60 bg-[#4db3ab]/12 text-[#b8f7ef]"
            />
          </div>
        </FilterSection>

        <FilterSection title="Availability">
          <div className="space-y-4">
            <ToggleChipGroup
              items={availableAvailability}
              selectedItems={filters.selectedAvailability}
              onToggle={(value) =>
                onFiltersChange({
                  ...filters,
                  selectedAvailability: toggleFilterItem(
                    filters.selectedAvailability,
                    value
                  )
                })
              }
              activeClass="border-[#6fd7d0]/60 bg-[#6fd7d0]/12 text-[#c7fff8]"
            />

            <div className="grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
                <input
                  type="checkbox"
                  checked={filters.freeReturnsOnly}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      freeReturnsOnly: event.target.checked
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Free returns only</span>
                  <span className="block text-sm text-white/55">
                    Prioritize low-friction return policies.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
                <input
                  type="checkbox"
                  checked={filters.localStockOnly}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      localStockOnly: event.target.checked
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Local stock only</span>
                  <span className="block text-sm text-white/55">
                    Focus on Singapore-ready inventory and faster dispatch.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
                <input
                  type="checkbox"
                  checked={filters.officialSellerOnly}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      officialSellerOnly: event.target.checked
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Official sellers only</span>
                  <span className="block text-sm text-white/55">
                    Restrict to official, mall, or flagship-style badges.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20">
                <input
                  type="checkbox"
                  checked={filters.cheapestOnly}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      cheapestOnly: event.target.checked
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f0ba6d] focus:ring-[#f0ba6d]"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Cheapest only</span>
                  <span className="block text-sm text-white/55">
                    Show just the current lowest landed-price candidate.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Value thresholds">
          <div className="space-y-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/62">Minimum worth-it score</span>
              <span className="text-white/55">{filters.minWorthItScore}/100</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="1"
              value={filters.minWorthItScore}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  minWorthItScore: Number(event.target.value)
                })
              }
              className="range-thumb h-10 w-full appearance-none bg-transparent"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/62">Minimum rating</span>
                <span className="text-white/55">{filters.minRating.toFixed(1)}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={filters.minRating}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minRating: Number(event.target.value)
                  })
                }
                className="range-thumb h-10 w-full appearance-none bg-transparent"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/62">Minimum review count</span>
                <span className="text-white/55">{filters.minReviewCount}</span>
              </div>
              <input
                type="range"
                min={reviewCountBounds.min}
                max={reviewCountBounds.max}
                step="1"
                value={filters.minReviewCount}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minReviewCount: Number(event.target.value)
                  })
                }
                className="range-thumb h-10 w-full appearance-none bg-transparent"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/62">Minimum sold count</span>
                <span className="text-white/55">{filters.minSoldCount}</span>
              </div>
              <input
                type="range"
                min={soldCountBounds.min}
                max={soldCountBounds.max}
                step="1"
                value={filters.minSoldCount}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minSoldCount: Number(event.target.value)
                  })
                }
                className="range-thumb h-10 w-full appearance-none bg-transparent"
              />
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Marketplace">
          <ToggleChipGroup
            items={availableSources}
            selectedItems={filters.selectedSources}
            onToggle={(value) =>
              onFiltersChange({
                ...filters,
                selectedSources: toggleFilterItem(filters.selectedSources, value)
              })
            }
            activeClass="border-[#f0ba6d]/60 bg-[#f0ba6d]/12 text-[#f6d7a5]"
          />
        </FilterSection>

        <FilterSection title="Origin markets">
          <ToggleChipGroup
            items={availableOriginCountries}
            selectedItems={filters.selectedOriginCountries}
            onToggle={(value) =>
              onFiltersChange({
                ...filters,
                selectedOriginCountries: toggleFilterItem(
                  filters.selectedOriginCountries,
                  value
                )
              })
            }
            activeClass="border-[#4db3ab]/60 bg-[#4db3ab]/12 text-[#b8f7ef]"
          />
        </FilterSection>

        <FilterSection title="Currencies">
          <ToggleChipGroup
            items={availableCurrencies}
            selectedItems={filters.selectedCurrencies}
            onToggle={(value) =>
              onFiltersChange({
                ...filters,
                selectedCurrencies: toggleFilterItem(filters.selectedCurrencies, value)
              })
            }
            activeClass="border-[#6fd7d0]/60 bg-[#6fd7d0]/12 text-[#c7fff8]"
          />
        </FilterSection>

        <FilterSection title="Warranty">
          <ToggleChipGroup
            items={availableWarrantyTypes}
            selectedItems={filters.selectedWarrantyTypes}
            onToggle={(value) =>
              onFiltersChange({
                ...filters,
                selectedWarrantyTypes: toggleFilterItem(
                  filters.selectedWarrantyTypes,
                  value
                )
              })
            }
            activeClass="border-[#f0ba6d]/60 bg-[#f0ba6d]/12 text-[#f6d7a5]"
          />
        </FilterSection>
      </div>
    </aside>
  );
}
