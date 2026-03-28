import type { MarketplaceCatalog, SearchResponse } from "../types/marketplace";

interface TinyfishSearchPayload {
  catalog: MarketplaceCatalog;
  query: SearchResponse;
  fromCache: boolean;
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON response but received: ${text.slice(0, 160) || "empty response"}`
    );
  }

  return JSON.parse(text);
}

export async function fetchCatalog() {
  const response = await fetch("/api/tinyfish/catalog");
  return (await parseJsonResponse(response)) as MarketplaceCatalog;
}

export async function searchCatalog(searchTerm: string) {
  const response = await fetch("/api/tinyfish/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ searchTerm })
  });

  const payload = (await parseJsonResponse(response)) as
    | TinyfishSearchPayload
    | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Tinyfish search failed.");
  }

  return payload;
}
