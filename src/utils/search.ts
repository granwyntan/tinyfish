import type { ProductResult, SearchResponse } from "../types/marketplace";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

export function getBestSearchResponse(
  queries: SearchResponse[],
  query: string
) {
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

  return haystack.includes(normalizedQuery);
}
