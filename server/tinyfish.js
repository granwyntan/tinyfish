import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { get, put } from "@vercel/blob";

const API_ENDPOINT = "https://agent.tinyfish.ai/v1/automation/run-sse";
const CACHE_FILE = resolve(process.cwd(), "data/tinyfish-cache.json");
const FALLBACK_FILE = resolve(process.cwd(), "src/data/mockCatalog.json");
const MAX_RESULTS_PER_SITE = 6;
const CONCURRENCY = 4;
const SITE_TIMEOUT_MS = 65000;
const BLOB_PREFIX = "tinyfish-products";
const BLOB_LATEST_PATH = `${BLOB_PREFIX}/catalog/latest.json`;
const BLOB_SNAPSHOTS_PREFIX = `${BLOB_PREFIX}/catalog/snapshots`;

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
  { name: "Harvey Norman SG", url: "https://www.harveynorman.com.sg", origin: "Singapore", currency: "SGD" },
  { name: "Best Denki SG", url: "https://www.bestdenki.com.sg", origin: "Singapore", currency: "SGD" },
  { name: "Challenger SG", url: "https://www.challenger.sg", origin: "Singapore", currency: "SGD" },
  { name: "Gain City SG", url: "https://www.gaincity.com", origin: "Singapore", currency: "SGD" },
  { name: "Mustafa SG", url: "https://mustafacentre.com", origin: "Singapore", currency: "SGD" },
  { name: "Apple SG", url: "https://www.apple.com/sg", origin: "Singapore", currency: "SGD" },
  { name: "Samsung SG", url: "https://www.samsung.com/sg", origin: "Singapore", currency: "SGD" },
  { name: "iStudio SG", url: "https://www.istudiosg.com", origin: "Singapore", currency: "SGD" },
  { name: "Amazon US", url: "https://www.amazon.com", origin: "United States", currency: "USD" },
  { name: "Apple US", url: "https://www.apple.com/us", origin: "United States", currency: "USD" },
  { name: "Amazon JP", url: "https://www.amazon.co.jp", origin: "Japan", currency: "JPY" },
  { name: "Rakuten JP", url: "https://www.rakuten.co.jp", origin: "Japan", currency: "JPY" },
  { name: "Mercari JP", url: "https://jp.mercari.com", origin: "Japan", currency: "JPY" },
  { name: "AliExpress", url: "https://www.aliexpress.com", origin: "China", currency: "USD" },
  { name: "Taobao", url: "https://world.taobao.com", origin: "China", currency: "CNY" },
  { name: "Tmall Global", url: "https://www.tmall.com", origin: "China", currency: "CNY" },
  { name: "eBay", url: "https://www.ebay.com", origin: "United States", currency: "USD" },
  { name: "Walmart", url: "https://www.walmart.com", origin: "United States", currency: "USD" },
  { name: "Target US", url: "https://www.target.com", origin: "United States", currency: "USD" },
  { name: "Newegg", url: "https://www.newegg.com", origin: "United States", currency: "USD" },
  { name: "Costco", url: "https://www.costco.com", origin: "United States", currency: "USD" },
  { name: "B&H Photo", url: "https://www.bhphotovideo.com", origin: "United States", currency: "USD" },
  { name: "HKTVmall", url: "https://www.hktvmall.com", origin: "Hong Kong", currency: "HKD" },
  { name: "JD Worldwide", url: "https://www.jd.com", origin: "China", currency: "CNY" }
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
  VND: 0.000053,
  TWD: 0.042,
  THB: 0.037,
  PHP: 0.024,
  GBP: 1.72,
  CAD: 0.99,
  CHF: 1.52,
  AED: 0.36,
  SEK: 0.13,
  NOK: 0.13,
  DKK: 0.2,
  BRL: 0.27,
  TRY: 0.041
};

const DEFAULT_ORIGIN_MARKETS = [
  "SG",
  "CN",
  "JP",
  "KR",
  "VN",
  "ID",
  "IN",
  "MY",
  "US",
  "EU",
  "AU",
  "NZ",
  "HK",
  "TW",
  "TH",
  "PH",
  "GB",
  "CA",
  "CH",
  "AE",
  "SE",
  "NO",
  "DK",
  "BR",
  "TR"
];

const DEFAULT_ORIGIN_CURRENCIES = [
  "SGD",
  "CNY",
  "JPY",
  "KRW",
  "VND",
  "IDR",
  "INR",
  "MYR",
  "USD",
  "EUR",
  "AUD",
  "NZD",
  "HKD",
  "TWD",
  "THB",
  "PHP",
  "GBP",
  "CAD",
  "CHF",
  "AED",
  "SEK",
  "NOK",
  "DKK",
  "BRL",
  "TRY"
];

const DEFAULT_TRAVEL_TARGETS = [
  { name: "Skyscanner", url: "https://www.skyscanner.net" },
  { name: "Trip.com", url: "https://www.trip.com" },
  { name: "Booking.com", url: "https://www.booking.com" }
];

const SEARCH_FAMILY_HINTS = [
  {
    match: /\biphone\b/i,
    label: "Apple iPhone",
    aliases: [
      "apple iphone",
      "iphone pro",
      "iphone pro max",
      "iphone plus",
      "iphone 128gb",
      "iphone 256gb"
    ]
  },
  {
    match: /\bipad\b/i,
    label: "Apple iPad",
    aliases: ["apple ipad", "ipad air", "ipad pro", "ipad mini"]
  },
  {
    match: /\bmacbook\b/i,
    label: "Apple MacBook",
    aliases: ["macbook air", "macbook pro", "apple laptop"]
  },
  {
    match: /\bairpods?\b/i,
    label: "Apple AirPods",
    aliases: ["airpods pro", "airpods max", "apple earbuds"]
  },
  {
    match: /\bgalaxy\b/i,
    label: "Samsung Galaxy",
    aliases: ["galaxy s", "galaxy ultra", "galaxy buds", "galaxy tab"]
  },
  {
    match: /\bswitch\b/i,
    label: "Nintendo Switch",
    aliases: ["switch oled", "switch lite", "nintendo handheld"]
  },
  {
    match: /\bdyson\b/i,
    label: "Dyson",
    aliases: ["dyson supersonic", "dyson airwrap", "dyson hair dryer"]
  },
  {
    match: /\banker\b/i,
    label: "Anker",
    aliases: ["anker power bank", "anker charger", "anker prime"]
  },
  {
    match: /\bsony\b/i,
    label: "Sony",
    aliases: ["sony headphones", "sony earbuds", "sony camera"]
  },
  {
    match: /\blogitech\b/i,
    label: "Logitech",
    aliases: ["logitech mouse", "logitech keyboard", "logitech mx"]
  }
];

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCurrencyCode(value, fallback = "SGD") {
  const code = String(value || fallback).toUpperCase().trim();
  return code || fallback;
}

function mergeStringList(...lists) {
  return Array.from(
    new Set(
      lists
        .flat()
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

function mergeSourceTargets(...lists) {
  return Array.from(
    new Map(
      lists
        .flat()
        .filter((value) => value?.name && value?.url)
        .map((value) => [String(value.name), { name: String(value.name), url: String(value.url) }])
    ).values()
  );
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

function getSignificantTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !["with", "from", "pack", "for"].includes(token));
}

function getNumericTokens(value) {
  return getSignificantTokens(value).filter((token) => /\d/.test(token));
}

function analyzeQueryShape(searchTerm) {
  const normalized = normalizeText(searchTerm);
  const tokens = getSignificantTokens(searchTerm);
  const numericTokens = getNumericTokens(searchTerm);
  const familyHint = SEARCH_FAMILY_HINTS.find((candidate) => candidate.match.test(searchTerm));
  const broadFamilyQuery =
    normalized.length > 0 &&
    (numericTokens.length === 0 || /^iphone\b|^ipad\b|^macbook\b|^airpods?\b/i.test(searchTerm)) &&
    tokens.length <= 4;

  return {
    normalized,
    tokens,
    numericTokens,
    familyHint,
    broadFamilyQuery
  };
}

function buildSearchProfile(searchTerm, catalog) {
  const shape = analyzeQueryShape(searchTerm);
  const relatedQueries = Array.isArray(catalog?.queries)
    ? catalog.queries
        .filter((query) => {
          const candidateText = normalizeText(
            [query.search_term, query.category, query.search_description, ...query.search_aliases].join(" ")
          );
          if (!shape.normalized) {
            return false;
          }
          if (candidateText.includes(shape.normalized) || shape.normalized.includes(normalizeText(query.search_term))) {
            return true;
          }

          const overlap = shape.tokens.filter((token) => candidateText.includes(token)).length;
          return overlap >= Math.max(1, Math.ceil(shape.tokens.length * 0.5));
        })
        .slice(0, 6)
    : [];

  const aliasHints = mergeStringList(
    shape.familyHint?.aliases ?? [],
    relatedQueries.flatMap((query) => [query.search_term, ...query.search_aliases])
  ).filter((value) => normalizeText(value) !== shape.normalized);

  return {
    ...shape,
    relatedQueries,
    aliasHints,
    broadSearch: shape.broadFamilyQuery || aliasHints.length > 0
  };
}

function isAccessoryQuery(searchTerm) {
  return /\b(case|cover|bag|pouch|sleeve|protector|strap|cable|adapter)\b/i.test(searchTerm);
}

function isAccessoryResult(result) {
  const title = normalizeText(result.product_name);
  return /\b(case|cover|pouch|bag|sleeve|protector|holder|skin|shell|strap)\b/.test(title);
}

function isRelevantResult(searchTerm, result) {
  const profile = analyzeQueryShape(searchTerm);
  const searchTokens = profile.tokens;
  const titleTokens = new Set(getSignificantTokens(result.product_name));
  const overlap = searchTokens.filter((token) => titleTokens.has(token)).length;
  const numericOverlap = profile.numericTokens.filter((token) =>
    Array.from(titleTokens).some(
      (titleToken) => titleToken.includes(token) || token.includes(titleToken)
    )
  ).length;
  const minimumOverlap = Math.max(2, Math.ceil(searchTokens.length * 0.45));

  if (!isAccessoryQuery(searchTerm) && isAccessoryResult(result)) {
    return false;
  }

  if (profile.numericTokens.length > 0 && numericOverlap < profile.numericTokens.length) {
    return false;
  }

  if (profile.broadFamilyQuery) {
    return overlap >= Math.min(Math.max(1, Math.ceil(searchTokens.length * 0.34)), searchTokens.length);
  }

  return overlap >= Math.min(minimumOverlap, searchTokens.length);
}

function ensureCacheFile() {
  if (!existsSync(CACHE_FILE)) {
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
    const seed = readFileSync(FALLBACK_FILE, "utf8");
    writeFileSync(CACHE_FILE, seed);
  }
}

function getBlobToken(options = {}) {
  return options.blobToken || process.env.BLOB_READ_WRITE_TOKEN || "";
}

function buildDefaultEngineContext() {
  return {
    target_market: "Singapore",
    gst_rate_percent: 9,
    landed_cost_formula: "((P x FX) + S + D) x (1 + GST)",
    calculation_notes: [
      "Singapore low-value goods imported by air or post are modeled with 9% GST.",
      "Electronics usually carry zero customs duty unless stated otherwise.",
      "Broad family searches can return multiple relevant variants instead of only one exact SKU."
    ],
    supported_origin_markets: DEFAULT_ORIGIN_MARKETS,
    supported_origin_currencies: DEFAULT_ORIGIN_CURRENCIES,
    source_targets: {
      retail: TARGET_SITES.map(({ name, url }) => ({ name, url })),
      travel: DEFAULT_TRAVEL_TARGETS
    }
  };
}

function readLocalCatalog() {
  ensureCacheFile();
  return sanitizeCatalog(JSON.parse(readFileSync(CACHE_FILE, "utf8")));
}

function writeLocalCatalog(catalog) {
  ensureCacheFile();
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(sanitizeCatalog(catalog), null, 2) + "\n");
  } catch (error) {
    console.warn("[tinyfish] cache write skipped:", error);
  }
}

function sanitizeCatalog(catalog) {
  const baseCatalog = {
    catalog_name: catalog?.catalog_name || "Tinyfish Cached Marketplace Catalog",
    generated_at: catalog?.generated_at || new Date().toISOString(),
    supported_region: catalog?.supported_region || "Singapore",
    default_currency: normalizeCurrencyCode(catalog?.default_currency, "SGD"),
    engine_context: {
      ...buildDefaultEngineContext(),
      ...catalog?.engine_context,
      supported_origin_markets: mergeStringList(
        DEFAULT_ORIGIN_MARKETS,
        catalog?.engine_context?.supported_origin_markets || []
      ),
      supported_origin_currencies: mergeStringList(
        DEFAULT_ORIGIN_CURRENCIES,
        catalog?.engine_context?.supported_origin_currencies || []
      ),
      source_targets: {
        retail: mergeSourceTargets(
          TARGET_SITES.map(({ name, url }) => ({ name, url })),
          catalog?.engine_context?.source_targets?.retail || []
        ),
        travel: mergeSourceTargets(
          DEFAULT_TRAVEL_TARGETS,
          catalog?.engine_context?.source_targets?.travel || []
        )
      }
    }
  };

  const queries = Array.isArray(catalog?.queries)
    ? catalog.queries
        .map((query) => ({
          ...query,
          vertical: query?.vertical || "retail_commerce",
          search_aliases: mergeStringList(query?.search_aliases || [], query?.search_term || ""),
          results: Array.isArray(query?.results)
            ? query.results.filter(
                (result) =>
                  Number(result?.pricing?.landed_sgd?.total) > 0 &&
                  Number(result?.pricing?.landed_sgd?.item_price) > 0 &&
                  isRelevantResult(query.search_term, result)
              )
            : []
        }))
        .filter((query) => query.results.length > 0)
    : [];

  return {
    ...baseCatalog,
    queries
  };
}

async function readBlobCatalog(options = {}) {
  const token = getBlobToken(options);

  if (!token) {
    return null;
  }

  try {
    const payload = await get(BLOB_LATEST_PATH, {
      access: "private",
      token,
      useCache: false
    });

    if (!payload || payload.statusCode !== 200 || !payload.stream) {
      return null;
    }

    const text = await new Response(payload.stream).text();
    const parsed = sanitizeCatalog(JSON.parse(text));
    writeLocalCatalog(parsed);
    return parsed;
  } catch (error) {
    console.warn("[tinyfish] blob read skipped:", error);
    return null;
  }
}

async function writeBlobCatalog(catalog, options = {}) {
  const token = getBlobToken(options);

  if (!token) {
    return;
  }

  const payload = JSON.stringify(sanitizeCatalog(catalog), null, 2) + "\n";
  const snapshotId = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    await put(BLOB_LATEST_PATH, payload, {
      access: "private",
      token,
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });

    await put(`${BLOB_SNAPSHOTS_PREFIX}/${snapshotId}.json`, payload, {
      access: "private",
      token,
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
  } catch (error) {
    console.warn("[tinyfish] blob write skipped:", error);
  }
}

export async function readCatalog(options = {}) {
  const blobCatalog = await readBlobCatalog(options);
  if (blobCatalog) {
    return blobCatalog;
  }

  return readLocalCatalog();
}

async function writeCatalog(catalog, options = {}) {
  writeLocalCatalog(catalog);
  await writeBlobCatalog(catalog, options);
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

function buildGoal(searchTerm, source, searchProfile) {
  const aliasText =
    searchProfile.aliasHints.length > 0
      ? `Related family hints: ${searchProfile.aliasHints.slice(0, 6).join(", ")}.`
      : "";
  const breadthInstruction = searchProfile.broadSearch
    ? "This is a broad product-family query. Return a diversified set of direct listings across genuinely relevant variants, generations, sizes, or storage tiers that shoppers would realistically compare on this marketplace. Avoid six near-duplicate listings from the same narrow configuration."
    : "Treat this as an exact-intent query and prioritize direct exact-model matches over adjacent products.";

  return [
    `Search ${source.name} for the product query "${searchTerm}".`,
    `Return only the most relevant ${MAX_RESULTS_PER_SITE} purchasable product listings for the intended item or product family.`,
    breadthInstruction,
    "Prioritize direct product listings with clear titles, real prices, and real product photos.",
    "Exclude accessories, bundles with unrelated extras, spare parts, replacement items, category pages, brand landing pages, and generic search pages unless a direct product page is unavailable.",
    searchProfile.broadSearch
      ? "If the family query is available, include a healthy mix of relevant models instead of collapsing to one exact SKU."
      : "If the exact product is not found on this site, return an empty results array instead of guessing.",
    aliasText,
    "Prefer listings with a real item price, a real product photo, and a direct live listing URL.",
    "Extract numeric prices only. Remove currency symbols and text. Keep the source currency code separately in currency.",
    "For shipping, customs duty, delivery days, ratings, sold count, and return window, extract the best available numeric value. Use 0 only when truly unavailable.",
    "Keep descriptions concise but specific to the actual listing and mention configuration, seller posture, shipping posture, and warranty when visible.",
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
    "Do not return markdown, commentary, explanations, or code fences.",
    "If a field is unavailable, use null, false, 0, or an empty array as appropriate."
  ].join(" ");
}

async function runTinyfishAutomationWithFetch(searchTerm, source, apiKey, searchProfile) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITE_TIMEOUT_MS);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        url: source.url,
        goal: buildGoal(searchTerm, source, searchProfile)
      })
    });

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
  } finally {
    clearTimeout(timeout);
  }

  throw new Error(`Tinyfish stream ended before completion for ${source.name}`);
}

async function runTinyfishAutomationWithCurl(searchTerm, source, apiKey, searchProfile) {
  const body = JSON.stringify({
    url: source.url,
    goal: buildGoal(searchTerm, source, searchProfile)
  });

  const output = await new Promise((resolveOutput, rejectOutput) => {
    const child = spawn(
      "curl.exe",
      [
        "--max-time",
        String(Math.ceil(SITE_TIMEOUT_MS / 1000)),
        "-k",
        "-N",
        "-sS",
        "-X",
        "POST",
        API_ENDPOINT,
        "-H",
        `X-API-Key: ${apiKey}`,
        "-H",
        "Content-Type: application/json",
        "-d",
        body
      ],
      {
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectOutput);

    child.on("close", (code) => {
      if (code !== 0 && !stdout.includes('"type":"COMPLETE"')) {
        rejectOutput(
          new Error(stderr.trim() || `Tinyfish curl request failed for ${source.name}`)
        );
        return;
      }

      resolveOutput(stdout);
    });
  });

  const blocks = String(output).split(/\r?\n\r?\n/);

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

  throw new Error(`Tinyfish stream ended before completion for ${source.name}`);
}

async function runTinyfishAutomation(searchTerm, source, apiKey, searchProfile) {
  try {
    return await runTinyfishAutomationWithFetch(searchTerm, source, apiKey, searchProfile);
  } catch (error) {
    if (process.platform === "win32") {
      return runTinyfishAutomationWithCurl(searchTerm, source, apiKey, searchProfile);
    }

    throw error;
  }
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

async function runSourcesWithConcurrency(searchTerm, apiKey, catalog) {
  const queue = [...TARGET_SITES];
  const collected = [];
  const searchProfile = buildSearchProfile(searchTerm, catalog);

  async function worker() {
    while (queue.length > 0) {
      const source = queue.shift();

      if (!source) {
        return;
      }

      try {
        const rawPayload = await runTinyfishAutomation(
          searchTerm,
          source,
          apiKey,
          searchProfile
        );
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
  ).filter(
    (item) =>
      item.media.product_image_url &&
      item.pricing.landed_sgd.total > 0 &&
      item.pricing.landed_sgd.item_price > 0
  );

  return finalizeResults(deduped);
}

export async function searchCatalog(searchTerm, options = {}) {
  const normalizedSearch = normalizeKey(searchTerm);
  const catalog = await readCatalog(options);
  const existing = catalog.queries.find(
    (query) => normalizeKey(query.search_term) === normalizedSearch
  );

  if (existing) {
    return { catalog, query: existing, fromCache: true };
  }

  const apiKey = options.apiKey || process.env.TINYFISH_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TINYFISH_API_KEY. Add it to .env.local before searching.");
  }

  const searchProfile = buildSearchProfile(searchTerm, catalog);
  const results = await runSourcesWithConcurrency(searchTerm, apiKey, catalog);

  if (results.length === 0) {
    throw new Error(
      "Tinyfish returned no usable listings for this search yet. Your cached catalog is unchanged."
    );
  }

  const nextQuery = {
    search_term: searchTerm,
    search_aliases: Array.from(
      new Set([
        searchTerm.toLowerCase(),
        normalizeKey(searchTerm).replace(/-/g, " "),
        ...searchProfile.aliasHints
      ])
    ),
    category: inferCategory(searchTerm),
    vertical: "retail_commerce",
    search_intent: searchProfile.broadSearch
      ? `Find broad product-family landed-cost listings for ${searchTerm} across the Tinyfish marketplace network.`
      : `Find exhaustive landed-cost listings for ${searchTerm} across the Tinyfish marketplace network.`,
    search_description: searchProfile.broadSearch
      ? `Cached live family search built from ${TARGET_SITES.length} source targets for ${searchTerm}, diversified across relevant variants.`
      : `Cached live search built from ${TARGET_SITES.length} source targets for ${searchTerm}.`,
    timestamp: new Date().toISOString(),
    results
  };

  const nextCatalog = {
    ...catalog,
    generated_at: new Date().toISOString(),
    queries: [nextQuery, ...catalog.queries.filter((query) => normalizeKey(query.search_term) !== normalizedSearch)]
  };

  await writeCatalog(nextCatalog, options);

  return { catalog: nextCatalog, query: nextQuery, fromCache: false };
}

function scoreSuggestion(query, candidate) {
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 300;
  }

  let score = 0;

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    score += 180;
  } else if (normalizedCandidate.includes(normalizedQuery)) {
    score += 120;
  }

  const queryTokens = getSignificantTokens(query);
  const candidateTokens = getSignificantTokens(candidate);
  const overlap = queryTokens.filter((token) => candidateTokens.includes(token)).length;

  score += overlap * 28;
  score -= Math.max(candidateTokens.length - queryTokens.length, 0) * 2;
  return score;
}

export async function getAutocompleteSuggestions(query, options = {}) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const catalog = await readCatalog(options);
  const profile = buildSearchProfile(query, catalog);
  const suggestionMap = new Map();

  function addSuggestion(value, subtitle, kind, bonus = 0) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      return;
    }

    const score = scoreSuggestion(query, value) + bonus;

    if (score <= 0) {
      return;
    }

    const existing = suggestionMap.get(normalizedValue);
    if (!existing || score > existing.score) {
      suggestionMap.set(normalizedValue, {
        value,
        subtitle,
        kind,
        score
      });
    }
  }

  for (const familyAlias of profile.aliasHints) {
    addSuggestion(familyAlias, "Family suggestion", "family", 35);
  }

  for (const candidate of catalog.queries) {
    addSuggestion(
      candidate.search_term,
      `${candidate.results.length} cached listings`,
      "query",
      25
    );

    for (const alias of candidate.search_aliases || []) {
      addSuggestion(alias, `Alias for ${candidate.search_term}`, "alias", 12);
    }

    for (const result of candidate.results.slice(0, 6)) {
      addSuggestion(
        result.product_name,
        `${result.source} · ${result.origin.country_of_origin}`,
        "listing",
        8
      );
    }
  }

  return Array.from(suggestionMap.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ score, ...suggestion }) => suggestion);
}

export function tinyfishApiPlugin(runtimeEnv = {}) {
  return {
    name: "tinyfish-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/tinyfish/catalog" && req.method === "GET") {
          sendJson(res, 200, await readCatalog(runtimeEnv));
          return;
        }

        if (req.url?.startsWith("/api/tinyfish/autocomplete") && req.method === "GET") {
          const requestUrl = new URL(req.url, "http://localhost");
          const query = requestUrl.searchParams.get("q") || "";
          sendJson(res, 200, {
            suggestions: await getAutocompleteSuggestions(query, runtimeEnv)
          });
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

            const payload = await searchCatalog(searchTerm, {
              apiKey: runtimeEnv.TINYFISH_API_KEY,
              blobToken: runtimeEnv.BLOB_READ_WRITE_TOKEN
            });
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
