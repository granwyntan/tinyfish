import type { MarketplaceCatalog, SearchResponse } from "../types/marketplace";

interface TinyfishSearchPayload {
  catalog: MarketplaceCatalog;
  query: SearchResponse;
  fromCache: boolean;
}

export async function fetchCatalog() {
  const response = await fetch("/api/tinyfish/catalog");

  if (!response.ok) {
    throw new Error("Failed to load Tinyfish catalog cache.");
  }

  return (await response.json()) as MarketplaceCatalog;
}

export async function searchCatalog(searchTerm: string) {
  const response = await fetch("/api/tinyfish/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ searchTerm })
  });

  const payload = (await response.json()) as TinyfishSearchPayload | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Tinyfish search failed.");
  }

  return payload;
}
