import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_ENDPOINT = "https://agent.tinyfish.ai/v1/automation/run-sse";
const CACHE_FILE = resolve(process.cwd(), "data/tinyfish-cache.json");
const FALLBACK_FILE = resolve(process.cwd(), "src/data/mockCatalog.json");
const MAX_RESULTS_PER_SITE = 6;
const CONCURRENCY = 4;
const SITE_TIMEOUT_MS = 65000;

const TARGET_SITES = [
  { name: "Shopee SG", url: "https://shopee.sg", origin: "Singapore", currency: "SGD" },
  { name: "Lazada SG", url: "https://www.lazada.sg", origin: "Singapore", currency: "SGD" },
  { name: "Amazon SG", url: "https://www.amazon.sg", origin: "Singapore", currency: "SGD" },
  { name: "Carousell SG", url: "https://www.carousell.sg", origin: "Singapore", currency: "SGD" },
  { name: "Zalora SG", url: "https://www.zalora.sg", origin: "Singapore", currency: "SGD" },
  { name: "FairPrice SG", url: "https://www.fairprice.com.sg", origin: "Singapore", currency: "SGD" },
  { name: "RedMart", url: "https://redmart.lazada.sg", origin: "Singapore", currency: "SGD" },
  { name: "Sephora SG", url: "https://www.sephora.sg", origin: "Singapore", currency: "SGD" },
  { name: "Decathlon SG", url: "https://www.decathlon.sg", origin: "Singapore", currency: "SGD" },
  { name: "Courts SG", url: "https://www.courts.com.sg", origin: "Singapore", currency: "SGD" },
  { name: "Amazon US", url: "https://www.amazon.com", origin: "United States", currency: "USD" },
  { name: "AliExpress", url: "https://www.aliexpress.com", origin: "China", currency: "USD" },
  { name: "Taobao", url: "https://world.taobao.com", origin: "China", currency: "CNY" },
  { name: "eBay", url: "https://www.ebay.com", origin: "United States", currency: "USD" },
  { name: "Walmart", url: "https://www.walmart.com", origin: "United States", currency: "USD" }
];

const FX_TO_SGD = {
  SGD: 1,
  USD: 1.34,
  CNY: 0.19,
  JPY: 0.0089,
  HKD: 0.17,
  KRW: 0.001,
  INR: 0.016,
  IDR: 0.000084,
  MYR: 0.3,
  EUR: 1.46,
  AUD: 0.88,
  NZD: 0.81,
  VND: 0.000053
};

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]+/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item));
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureCacheFile() {
  if (!existsSync(CACHE_FILE)) {
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
    const seed = readFileSync(FALLBACK_FILE, "utf8");
    writeFileSync(CACHE_FILE, seed);
  }
}

function readCatalog() {
  ensureCacheFile();
  return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
}

function writeCatalog(catalog) {
  ensureCacheFile();
  writeFileSync(CACHE_FILE, JSON.stringify(catalog, null, 2) + "\n");
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function buildGoal(searchTerm, source) {
  return [
    `Search ${source.name} for the product query "${searchTerm}".`,
    `Return only the most relevant ${MAX_RESULTS_PER_SITE} listings.`,
    "Respond as a single JSON object with this exact shape:",
    "{",
    '  "source": string,',
    '  "results": [{',
    '    "product_name": string,',
    '    "listing_url": string,',
    '    "image_url": string,',
    '    "seller_name": string,',
    '    "seller_badges": string[],',
    '    "condition": string,',
    '    "category_path": string[],',
    '    "currency": string,',
    '    "unit_price": number,',
    '    "shipping": number,',
    '    "customs_duty": number,',
    '    "ships_from_country": string,',
    '    "country_of_origin": string,',
    '    "delivery_min_days": number,',
    '    "delivery_max_days": number,',
    '    "rating_out_of_5": number,',
    '    "rating_count": number,',
    '    "sold_count": number,',
    '    "return_window_days": number,',
    '    "free_returns": boolean,',
    '    "warranty_summary": string,',
    '    "availability_status": string,',
    '    "local_stock": boolean,',
    '    "shipping_method": string,',
    '    "short_description": string,',
    '    "detailed_description": string,',
    '    "review_summary": string,',
    '    "best_for": string,',
    '    "key_features": string[],',
    '    "included_in_box": string[]',
    "  }]",
    "}",
    "Use the real product photo URL from the site for image_url.",
    "Do not invent listing URLs or images.",
    "If a field is unavailable, use null, false, 0, or an empty array as appropriate."
  ].join(" ");
}

async function runTinyfishAutomation(searchTerm, source, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITE_TIMEOUT_MS);
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    signal: controller.signal,
    body: JSON.stringify({
      url: source.url,
      goal: buildGoal(searchTerm, source)
    })
  }).finally(() => clearTimeout(timeout));

  if (!response.ok || !response.body) {
    throw new Error(`Tinyfish request failed for ${source.name}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const dataLine = block
        .split(/\r?\n/)
        .find((line) => line.startsWith("data: "));

      if (!dataLine) {
        continue;
      }

      const payload = JSON.parse(dataLine.slice(6));

      if (payload.type === "COMPLETE") {
        return payload.result;
      }

      if (payload.type === "FAILED") {
        throw new Error(payload.error || `Tinyfish search failed for ${source.name}`);
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error(`Tinyfish stream ended before completion for ${source.name}`);
}

function inferCategory(searchTerm) {
  const value = searchTerm.toLowerCase();
  if (value.includes("iphone") || value.includes("phone")) return "Mobile";
  if (value.includes("headphone") || value.includes("earbud")) return "Audio";
  if (value.includes("mouse") || value.includes("keyboard")) return "Computer Accessories";
  if (value.includes("switch") || value.includes("playstation") || value.includes("xbox")) return "Gaming";
  if (value.includes("dryer") || value.includes("beauty")) return "Beauty";
  return "Marketplace Search";
}

function normalizeResult(raw, source, searchTerm) {
  const currency = String(raw.currency || source.currency || "SGD").toUpperCase();
  const fxRate = FX_TO_SGD[currency] || 1;
  const itemPrice = roundMoney(toNumber(raw.unit_price) * fxRate);
  const shipping = roundMoney(toNumber(raw.shipping) * fxRate);
  const customsDuty = roundMoney(toNumber(raw.customs_duty) * fxRate);
  const shipsFrom = raw.ships_from_country || source.origin;
  const localStock = Boolean(raw.local_stock || /singapore/i.test(String(shipsFrom)));
  const gst = localStock ? 0 : roundMoney((itemPrice + shipping + customsDuty) * 0.09);
  const total = roundMoney(itemPrice + shipping + customsDuty + gst);
  const rating = clamp(toNumber(raw.rating_out_of_5, 4.2), 0, 5);
  const ratingCount = Math.max(0, Math.round(toNumber(raw.rating_count)));
  const soldCount = Math.max(0, Math.round(toNumber(raw.sold_count)));
  const minDays = Math.max(1, Math.round(toNumber(raw.delivery_min_days, localStock ? 2 : 7)));
  const maxDays = Math.max(minDays, Math.round(toNumber(raw.delivery_max_days, minDays + 3)));
  const worthSeed = clamp(
    rating * 12 +
      Math.min(Math.log10(ratingCount + 1) * 10, 12) +
      Math.min(Math.log10(soldCount + 1) * 8, 10) +
      (localStock ? 10 : 4) +
      (raw.free_returns ? 8 : 2) +
      Math.max(0, 12 - maxDays),
    45,
    96
  );
  const warrantySummary = raw.warranty_summary || "Seller-stated warranty terms vary by listing";
  const warrantyType = /official/i.test(warrantySummary)
    ? "Official"
    : localStock
      ? "Local"
      : "Import";

  return {
    listing_id: normalizeKey(`${searchTerm}-${source.name}-${raw.listing_url || raw.product_name}`),
    listing_url: raw.listing_url || source.url,
    source: source.name,
    source_family: source.name.split(" ")[0],
    vertical: "retail_commerce",
    seller_name: raw.seller_name || `${source.name} marketplace seller`,
    seller_badges: toStringArray(raw.seller_badges),
    product_name: raw.product_name || searchTerm,
    category_path: toStringArray(raw.category_path),
    condition: raw.condition || "Not specified",
    origin: {
      country_of_origin: raw.country_of_origin || shipsFrom || source.origin,
      market_region: source.origin,
      currency_of_origin: currency
    },
    pricing: {
      original: {
        amount: roundMoney(toNumber(raw.unit_price)),
        currency
      },
      landed_sgd: {
        item_price: itemPrice,
        shipping,
        gst,
        customs_duty: customsDuty,
        total
      },
      fx_rate_to_sgd: fxRate
    },
    metrics: {
      is_cheapest: false,
      sentiment_score: clamp(rating / 5, 0.4, 0.99),
      rating_out_of_5: rating,
      sold_count: soldCount,
      rating_count: ratingCount
    },
    fulfillment: {
      ships_from_country: shipsFrom,
      shipping_method: raw.shipping_method || (localStock ? "Local courier" : "International shipping"),
      delivery: {
        min_days: minDays,
        max_days: maxDays,
        timing_label: maxDays <= 3 ? "Fast" : maxDays <= 8 ? "Standard" : "Long haul",
        option_label: raw.shipping_method || (localStock ? "Local courier" : "Cross-border shipping")
      },
      availability: {
        status: raw.availability_status || "Available",
        local_stock: localStock,
        stock_notes: localStock
          ? "Seller indicates local or Singapore-ready inventory."
          : "Cross-border fulfillment with import lead time."
      },
      commercial_terms: {
        return_window_days: Math.max(0, Math.round(toNumber(raw.return_window_days, 7))),
        free_returns: Boolean(raw.free_returns),
        warranty_type: warrantyType,
        warranty_summary: warrantySummary,
        warranty_months: /(\d+)/.test(warrantySummary)
          ? Number(warrantySummary.match(/(\d+)/)?.[1] || 0)
          : warrantyType === "Official"
            ? 12
            : 3
      }
    },
    comparison: {
      price_per_unit_sgd: total,
      comparison_unit_label: "per item",
      units_in_listing: 1,
      worth_it_score: Math.round(worthSeed),
      value_band: "Under review",
      landed_cost_rank: 0,
      rationale_summary: "Scored using landed total, review confidence, shipping speed, and policy quality."
    },
    content: {
      short_description: raw.short_description || `${source.name} listing for ${searchTerm}.`,
      detailed_description:
        raw.detailed_description ||
        `${source.name} result cached by Tinyfish for ${searchTerm}. Review the live listing for current seller terms and configuration details.`,
      review_summary:
        raw.review_summary ||
        "Review commentary was limited, so this listing leans on seller quality, rating volume, and shipping terms.",
      best_for: raw.best_for || "Shoppers comparing cross-market landed cost and delivery tradeoffs.",
      key_features: toStringArray(raw.key_features),
      included_in_box: toStringArray(raw.included_in_box)
    },
    media: {
      product_image_url: raw.image_url || ""
    },
    hero_image: raw.image_url || ""
  };
}

function finalizeResults(results) {
  const sortedByPrice = [...results].sort(
    (left, right) => left.pricing.landed_sgd.total - right.pricing.landed_sgd.total
  );

  return sortedByPrice.map((result, index) => {
    const priceAdvantage = 18 - Math.min(index * 2, 16);
    const worthIt = clamp(result.comparison.worth_it_score + priceAdvantage, 42, 99);
    const valueBand =
      worthIt >= 90 ? "Excellent value" : worthIt >= 78 ? "Strong value" : worthIt >= 64 ? "Balanced" : "Needs review";

    return {
      ...result,
      metrics: {
        ...result.metrics,
        is_cheapest: index === 0
      },
      comparison: {
        ...result.comparison,
        worth_it_score: worthIt,
        value_band: valueBand,
        landed_cost_rank: index + 1,
        rationale_summary: `${valueBand}: landed price ${sgdString(result.pricing.landed_sgd.total)}, ${result.fulfillment.delivery.max_days}d delivery ceiling, ${result.fulfillment.commercial_terms.warranty_type.toLowerCase()} warranty posture.`
      }
    };
  });
}

function sgdString(value) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 2
  }).format(value);
}

async function runSourcesWithConcurrency(searchTerm, apiKey) {
  const queue = [...TARGET_SITES];
  const collected = [];

  async function worker() {
    while (queue.length > 0) {
      const source = queue.shift();

      if (!source) {
        return;
      }

      try {
        const rawPayload = await runTinyfishAutomation(searchTerm, source, apiKey);
        const items = Array.isArray(rawPayload)
          ? rawPayload
          : Array.isArray(rawPayload?.results)
            ? rawPayload.results
            : rawPayload
              ? [rawPayload]
              : [];

        for (const item of items) {
          collected.push(normalizeResult(item, source, searchTerm));
        }
      } catch (error) {
        console.error(`[tinyfish] ${source.name}:`, error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, TARGET_SITES.length) }, () => worker())
  );

  const deduped = Array.from(
    new Map(collected.map((item) => [item.listing_url || item.listing_id, item])).values()
  ).filter((item) => item.media.product_image_url);

  return finalizeResults(deduped);
}

export async function searchCatalog(searchTerm) {
  const normalizedSearch = normalizeKey(searchTerm);
  const catalog = readCatalog();
  const existing = catalog.queries.find(
    (query) => normalizeKey(query.search_term) === normalizedSearch
  );

  if (existing) {
    return { catalog, query: existing, fromCache: true };
  }

  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TINYFISH_API_KEY. Add it to .env.local before searching.");
  }

  const results = await runSourcesWithConcurrency(searchTerm, apiKey);
  const nextQuery = {
    search_term: searchTerm,
    search_aliases: Array.from(
      new Set([searchTerm.toLowerCase(), normalizeKey(searchTerm).replace(/-/g, " ")])
    ),
    category: inferCategory(searchTerm),
    vertical: "retail_commerce",
    search_intent: `Find exhaustive landed-cost listings for ${searchTerm} across the Tinyfish marketplace network.`,
    search_description: `Cached live search built from ${TARGET_SITES.length} source targets for ${searchTerm}.`,
    timestamp: new Date().toISOString(),
    results
  };

  const nextCatalog = {
    ...catalog,
    generated_at: new Date().toISOString(),
    queries: [nextQuery, ...catalog.queries.filter((query) => normalizeKey(query.search_term) !== normalizedSearch)]
  };

  writeCatalog(nextCatalog);

  return { catalog: nextCatalog, query: nextQuery, fromCache: false };
}

export function tinyfishApiPlugin() {
  return {
    name: "tinyfish-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/tinyfish/catalog" && req.method === "GET") {
          sendJson(res, 200, readCatalog());
          return;
        }

        if (req.url === "/api/tinyfish/search" && req.method === "POST") {
          try {
            const body = await readJsonBody(req);
            const searchTerm = String(body.searchTerm || "").trim();

            if (!searchTerm) {
              sendJson(res, 400, { error: "searchTerm is required" });
              return;
            }

            const payload = await searchCatalog(searchTerm);
            sendJson(res, 200, payload);
          } catch (error) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : "Tinyfish search failed"
            });
          }
          return;
        }

        next();
      });
    }
  };
}
