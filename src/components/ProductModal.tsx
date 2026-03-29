import { useState } from "react";
import type { ProductResult } from "../types/marketplace";
import {
  compactFormatter,
  formatDeliveryRange,
  formatOriginalPrice,
  formatRating,
  formatSentiment,
  formatWorthIt,
  sgdFormatter
} from "../utils/formatters";

interface ProductModalProps {
  product: ProductResult;
  onClose: () => void;
}

const breakdownRows = [
  { key: "item_price", label: "Item price" },
  { key: "shipping", label: "Shipping" },
  { key: "gst", label: "GST" },
  { key: "customs_duty", label: "Customs duty" }
] as const;

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [descriptionMode, setDescriptionMode] = useState<"details" | "reviews">("details");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071217]/82 px-4 py-6 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/10 bg-[#0c1b21] shadow-[0_28px_90px_rgba(4,8,10,0.42)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-full border border-white/12 bg-black/24 p-2 text-white/80 transition hover:border-white/20 hover:text-white"
          aria-label="Close details"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6 18 18" />
            <path d="M18 6 6 18" />
          </svg>
        </button>

        <div className="grid gap-0 overflow-y-auto lg:grid-cols-[0.96fr_1.04fr]">
          <section className="relative min-h-[320px] overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
            <img
              src={product.media.product_image_url}
              alt={product.product_name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,23,0.08),rgba(7,18,23,0.92))]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(240,186,109,0.34),_transparent_54%)]" />

            <div className="absolute inset-x-0 bottom-0 space-y-5 p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75">
                  {product.source}
                </span>
                <span className="rounded-full border border-[#4db3ab]/28 bg-[#4db3ab]/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#b8f7ef]">
                  Origin {product.origin.country_of_origin}
                </span>
                <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75">
                  {product.fulfillment.availability.local_stock ? "Local stock" : "Cross-border"}
                </span>
              </div>

              <div>
                <h2 className="max-w-2xl text-3xl font-semibold text-white">
                  {product.product_name}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["details", "Detailed description"],
                    ["reviews", "Review summary"]
                  ].map(([key, label]) => {
                    const active = descriptionMode === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setDescriptionMode(key as "details" | "reviews")
                        }
                        className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${
                          active
                            ? "border-[#f0ba6d]/40 bg-[#f0ba6d]/14 text-[#f7dfb0]"
                            : "border-white/12 bg-black/24 text-white/70 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="surface-scroll mt-4 max-h-36 max-w-2xl overflow-y-auto pr-2 text-base leading-7 text-white/68">
                  {descriptionMode === "details"
                    ? product.content.detailed_description
                    : product.content.review_summary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-md">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                    Final landed price
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {sgdFormatter.format(product.pricing.landed_sgd.total)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-md">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                    Worth it score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {formatWorthIt(product.comparison.worth_it_score)}
                  </p>
                </div>
              </div>

              <a
                href={product.listing_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#f0ba6d]/28 bg-[#f0ba6d]/12 px-4 py-2 text-sm font-medium text-[#f7dfb0] transition hover:border-[#f0ba6d]/50 hover:text-white"
              >
                Open live listing
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
          </section>

          <section className="space-y-5 overflow-y-auto p-8">
            <div>
              <h3 className="text-lg font-semibold text-white">Landed cost breakdown</h3>
              <div className="mt-5 space-y-3">
                {breakdownRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-4"
                  >
                    <span className="text-sm text-white/62">{row.label}</span>
                    <span className="text-sm font-medium text-white">
                      {sgdFormatter.format(product.pricing.landed_sgd[row.key])}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-[#f0ba6d]/24 bg-[#f0ba6d]/10 px-4 py-4">
                  <span className="text-sm text-[#f7d7a1]">Total landed</span>
                  <span className="text-lg font-semibold text-white">
                    {sgdFormatter.format(product.pricing.landed_sgd.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                <h3 className="text-lg font-semibold text-white">Decision rationale</h3>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {product.comparison.rationale_summary}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(140deg,_rgba(77,179,171,0.12),_rgba(255,255,255,0.04))] p-5">
                <h3 className="text-lg font-semibold text-white">Best for</h3>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {product.content.best_for}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Original market
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {product.origin.country_of_origin} ·{" "}
                  {formatOriginalPrice(
                    product.pricing.original.amount,
                    product.pricing.original.currency
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Delivery window
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {formatDeliveryRange(
                    product.fulfillment.delivery.min_days,
                    product.fulfillment.delivery.max_days
                  )}{" "}
                  · {product.fulfillment.delivery.option_label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Rating / sentiment
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {formatRating(product.metrics.rating_out_of_5)} ·{" "}
                  {formatSentiment(product.metrics.sentiment_score)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Review count / sold
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {compactFormatter.format(product.metrics.rating_count)} reviews /{" "}
                  {compactFormatter.format(product.metrics.sold_count)} sold
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Warranty / returns
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {product.fulfillment.commercial_terms.warranty_summary} ·{" "}
                  {product.fulfillment.commercial_terms.return_window_days} day returns
                  {product.fulfillment.commercial_terms.free_returns ? " · Free return" : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Availability / stock
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {product.fulfillment.availability.status} ·{" "}
                  {product.fulfillment.availability.stock_notes}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  FX / price per unit
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {product.pricing.fx_rate_to_sgd} FX ·{" "}
                  {sgdFormatter.format(product.comparison.price_per_unit_sgd)}{" "}
                  {product.comparison.comparison_unit_label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Seller / condition
                </p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {product.seller_name} · {product.condition}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(140deg,_rgba(77,179,171,0.12),_rgba(255,255,255,0.04))] p-5">
              <h3 className="text-lg font-semibold text-white">Key features</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/68">
                {product.content.key_features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                <h3 className="text-lg font-semibold text-white">In the box</h3>
                <ul className="mt-4 space-y-3 text-sm text-white/68">
                  {product.content.included_in_box.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(140deg,_rgba(240,186,109,0.12),_rgba(255,255,255,0.04))] p-5">
                <h3 className="text-lg font-semibold text-white">Seller badges</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.seller_badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/10 bg-black/14 px-3 py-2 text-sm text-white/78"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
