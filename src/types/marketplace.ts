export type SortOption =
  | "lowest"
  | "highest"
  | "reviews"
  | "sold"
  | "fastest"
  | "worth_it";

export interface RangeFilter {
  min: number;
  max: number;
}

export interface LandedPriceSgd {
  item_price: number;
  shipping: number;
  gst: number;
  customs_duty: number;
  total: number;
}

export interface OriginalPrice {
  amount: number;
  currency: string;
}

export interface MarketplaceMetrics {
  is_cheapest: boolean;
  sentiment_score: number;
  rating_out_of_5: number;
  sold_count: number;
  rating_count: number;
}

export interface OriginInfo {
  country_of_origin: string;
  market_region: string;
  currency_of_origin: string;
}

export interface DeliveryEstimate {
  min_days: number;
  max_days: number;
  timing_label: string;
  option_label: string;
}

export interface AvailabilityInfo {
  status: string;
  local_stock: boolean;
  stock_notes: string;
}

export interface CommercialTerms {
  return_window_days: number;
  free_returns: boolean;
  warranty_type: string;
  warranty_summary: string;
  warranty_months: number;
}

export interface FulfillmentInfo {
  ships_from_country: string;
  shipping_method: string;
  delivery: DeliveryEstimate;
  availability: AvailabilityInfo;
  commercial_terms: CommercialTerms;
}

export interface ProductContent {
  short_description: string;
  detailed_description: string;
  review_summary: string;
  best_for: string;
  key_features: string[];
  included_in_box: string[];
}

export interface ComparisonSignals {
  price_per_unit_sgd: number;
  comparison_unit_label: string;
  units_in_listing: number;
  worth_it_score: number;
  value_band: string;
  landed_cost_rank: number;
  rationale_summary: string;
}

export interface ProductPricing {
  original: OriginalPrice;
  landed_sgd: LandedPriceSgd;
  fx_rate_to_sgd: number;
}

export interface ProductMedia {
  product_image_url: string;
}

export interface ProductResult {
  listing_id: string;
  listing_url: string;
  source: string;
  source_family: string;
  vertical: string;
  seller_name: string;
  seller_badges: string[];
  product_name: string;
  category_path: string[];
  condition: string;
  origin: OriginInfo;
  pricing: ProductPricing;
  metrics: MarketplaceMetrics;
  fulfillment: FulfillmentInfo;
  comparison: ComparisonSignals;
  content: ProductContent;
  media: ProductMedia;
  hero_image?: string;
}

export interface SourceTarget {
  name: string;
  url: string;
}

export interface LandedCostEngineContext {
  target_market: string;
  gst_rate_percent: number;
  landed_cost_formula: string;
  calculation_notes: string[];
  supported_origin_markets: string[];
  source_targets: {
    retail: SourceTarget[];
    travel: SourceTarget[];
  };
}

export interface SearchResponse {
  search_term: string;
  search_aliases: string[];
  category: string;
  vertical: string;
  search_intent: string;
  search_description: string;
  timestamp: string;
  results: ProductResult[];
}

export interface MarketplaceCatalog {
  catalog_name: string;
  generated_at: string;
  supported_region: string;
  default_currency: string;
  engine_context: LandedCostEngineContext;
  queries: SearchResponse[];
}

export interface FiltersState {
  totalPriceRange: RangeFilter;
  pricePerUnitRange: RangeFilter;
  deliveryDaysRange: RangeFilter;
  minWorthItScore: number;
  minReturnWindowDays: number;
  selectedSources: string[];
  selectedOriginCountries: string[];
  selectedCurrencies: string[];
  selectedDeliveryOptions: string[];
  selectedDeliveryTimings: string[];
  selectedWarrantyTypes: string[];
  selectedAvailability: string[];
  freeReturnsOnly: boolean;
  localStockOnly: boolean;
}
