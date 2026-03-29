import type {
  ProductResult,
  SearchResponse,
  SearchSuggestion
} from "../types/marketplace";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function scoreTextMatch(query: string, candidate: string) {
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
  } else if (normalizedQuery.includes(normalizedCandidate)) {
    score += 80;
  }

  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);
  const overlap = queryTokens.filter((token) => candidateTokens.includes(token)).length;
  score += overlap * 24;
  score -= Math.max(candidateTokens.length - queryTokens.length, 0) * 2;
  return score;
}

export function getBestSearchResponse(
  queries: SearchResponse[],
  query: string
) {
  if (queries.length === 0) {
    return {
      search_term: query,
      search_aliases: [],
      category: "Marketplace Search",
      vertical: "retail_commerce",
      search_intent: `Search for ${query}`,
      search_description: "No cached Tinyfish searches yet.",
      timestamp: "",
      results: []
    };
  }

  const candidates = queries.filter((candidate) => candidate.results.length > 0);
  const searchPool = candidates.length > 0 ? candidates : queries;
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return searchPool[0];
  }

  let bestMatch = searchPool[0];
  let bestScore = -1;

  for (const candidate of searchPool) {
    const candidateTerms = [
      candidate.search_term,
      candidate.category,
      candidate.search_description,
      ...candidate.search_aliases
    ];

    let score = 0;

    for (const term of candidateTerms) {
      const normalizedTerm = normalizeText(term);

      if (normalizedTerm === normalizedQuery) {
        score = Math.max(score, 120);
      } else if (
        normalizedTerm.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedTerm)
      ) {
        score = Math.max(score, 80);
      }

      const overlappingTokens = tokenize(term).filter((token) =>
        tokenize(query).includes(token)
      ).length;

      score += overlappingTokens * 8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

export function getCompositeSearchResponse(
  queries: SearchResponse[],
  query: string
) {
  if (queries.length === 0) {
    return {
      search_term: query,
      search_aliases: [],
      category: "Marketplace Search",
      vertical: "retail_commerce",
      search_intent: `Search for ${query}`,
      search_description: "No cached Tinyfish searches yet.",
      timestamp: "",
      results: []
    };
  }

  const exact = getExactSearchResponse(queries, query);

  if (exact) {
    return exact;
  }

  const normalizedQuery = normalizeText(query);
  const searchPool = queries.filter((candidate) => candidate.results.length > 0);

  if (!normalizedQuery || searchPool.length === 0) {
    return searchPool[0] || queries[0];
  }

  const scoredQueries = searchPool
    .map((candidate) => {
      const score = Math.max(
        scoreTextMatch(query, candidate.search_term),
        scoreTextMatch(query, candidate.category),
        scoreTextMatch(query, candidate.search_description),
        ...candidate.search_aliases.map((alias) => scoreTextMatch(query, alias))
      );

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  if (scoredQueries.length === 0) {
    return getBestSearchResponse(queries, query);
  }

  const resultMap = new Map<string, ProductResult>();

  for (const { candidate, score } of scoredQueries) {
    for (const result of candidate.results) {
      if (matchesProductQuery(result, query) || score >= 160) {
        resultMap.set(result.listing_id, result);
      }
    }
  }

  return {
    search_term: query,
    search_aliases: Array.from(
      new Set(scoredQueries.flatMap(({ candidate }) => candidate.search_aliases).slice(0, 12))
    ),
    category: scoredQueries[0]?.candidate.category || "Marketplace Search",
    vertical: "retail_commerce",
    search_intent: `Combined cached matches for ${query}`,
    search_description: `Merged cached results from ${scoredQueries.length} related Tinyfish searches for ${query}.`,
    timestamp: new Date().toISOString(),
    results: Array.from(resultMap.values())
  };
}

export function getExactSearchResponse(
  queries: SearchResponse[],
  query: string
) {
  const normalizedQuery = normalizeText(query);

  return queries.find(
    (candidate) =>
      candidate.results.length > 0 &&
      normalizeText(candidate.search_term) === normalizedQuery
  );
}

export function matchesProductQuery(product: ProductResult, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeText(
    [
      product.product_name,
      product.source,
      product.seller_name,
      product.content.short_description,
      product.content.detailed_description,
      product.content.review_summary,
      product.content.best_for,
      product.origin.country_of_origin,
      product.origin.currency_of_origin,
      product.fulfillment.ships_from_country,
      product.fulfillment.delivery.option_label,
      product.fulfillment.delivery.timing_label,
      product.fulfillment.commercial_terms.warranty_type,
      product.fulfillment.commercial_terms.warranty_summary,
      product.comparison.value_band,
      product.comparison.rationale_summary,
      ...product.category_path,
      ...product.seller_badges,
      ...product.content.key_features
    ].join(" ")
  );

  if (haystack.includes(normalizedQuery)) {
    return true;
  }

  const queryTokens = tokenize(query);
  const haystackTokens = tokenize(haystack);
  const overlap = queryTokens.filter((token) => haystackTokens.includes(token)).length;
  return overlap >= Math.max(1, Math.ceil(queryTokens.length * 0.6));
}

export function getLocalSuggestions(
  queries: SearchResponse[],
  query: string
) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const suggestionMap = new Map<string, SearchSuggestion & { score: number }>();

  function addSuggestion(value: string, subtitle: string, kind: SearchSuggestion["kind"], bonus = 0) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      return;
    }

    const score = scoreTextMatch(query, value) + bonus;

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

  for (const candidate of queries) {
    addSuggestion(candidate.search_term, `${candidate.results.length} cached listings`, "query", 25);

    for (const alias of candidate.search_aliases) {
      addSuggestion(alias, `Alias for ${candidate.search_term}`, "alias", 10);
    }

    for (const result of candidate.results.slice(0, 4)) {
      addSuggestion(
        result.product_name,
        `${result.source} · ${result.origin.country_of_origin}`,
        "listing",
        6
      );
    }
  }

  return Array.from(suggestionMap.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ score, ...suggestion }) => suggestion);
}
