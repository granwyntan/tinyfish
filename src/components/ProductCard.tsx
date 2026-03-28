import type { ProductResult } from "../types/marketplace";
import {
  compactFormatter,
  formatDeliveryRange,
  formatRating,
  formatSentiment,
  formatWorthIt,
  sgdFormatter
} from "../utils/formatters";

interface ProductCardProps {
  product: ProductResult;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-[32px] border border-white/10 bg-[#102128] shadow-[0_24px_70px_rgba(6,12,15,0.26)] transition duration-300 hover:-translate-y-1 hover:border-white/20">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className="relative h-56 overflow-hidden">
          <img
            src={product.media.product_image_url}
            alt={product.product_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,23,0.04),rgba(7,18,23,0.82))]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,_rgba(240,186,109,0.34),_transparent_52%)]" />

          <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {product.metrics.is_cheapest ? (
                <span className="rounded-full bg-[#f0ba6d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0d1a1f]">
                  Best price
                </span>
              ) : null}
              <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                {product.source}
              </span>
            </div>
            <div className="rounded-[20px] border border-white/12 bg-black/26 px-4 py-3 text-right backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Landed</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {sgdFormatter.format(product.pricing.landed_sgd.total)}
              </p>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#4db3ab]/30 bg-[#4db3ab]/14 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#b8f7ef]">
                Origin {product.origin.country_of_origin}
              </span>
              <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/74">
                Ships from {product.fulfillment.ships_from_country}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <h3 className="text-xl font-semibold leading-tight text-white">
              {product.product_name}
            </h3>
            <p className="surface-scroll mt-3 max-h-24 overflow-y-auto pr-1 text-sm leading-6 text-white/68">
              {product.content.short_description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Worth it</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatWorthIt(product.comparison.worth_it_score)}
              </p>
              <p className="mt-1 text-xs text-white/55">{product.comparison.value_band}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Delivery</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatDeliveryRange(
                  product.fulfillment.delivery.min_days,
                  product.fulfillment.delivery.max_days
                )}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {product.fulfillment.delivery.option_label}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Rating / sentiment
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatRating(product.metrics.rating_out_of_5)} ·{" "}
                {formatSentiment(product.metrics.sentiment_score)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {compactFormatter.format(product.metrics.rating_count)} reviews
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Price per unit
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {sgdFormatter.format(product.comparison.price_per_unit_sgd)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {compactFormatter.format(product.metrics.sold_count)} sold
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              Currency {product.origin.currency_of_origin}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              {product.fulfillment.commercial_terms.warranty_type} warranty
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              {product.fulfillment.availability.local_stock ? "Local stock" : "Cross-border"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              {product.fulfillment.availability.status}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              {product.fulfillment.commercial_terms.free_returns
                ? "Free returns"
                : "Returns may vary"}
            </span>
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
        <p className="text-sm text-white/58">{product.seller_name}</p>
        <a
          href={product.listing_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/84 transition hover:border-[#f0ba6d]/40 hover:text-white"
          onClick={(event) => event.stopPropagation()}
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
    </article>
  );
}
