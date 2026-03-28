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

function toReadableNetworkError(error: unknown) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return new Error(
      "Network request failed. On Vercel, check that the `/api/tinyfish/*` functions deployed successfully and that `TINYFISH_API_KEY` is set in project environment variables."
    );
  }

  return error instanceof Error ? error : new Error("Unexpected network failure.");
}

export async function fetchCatalog() {
  try {
    const response = await fetch("/api/tinyfish/catalog");
    return (await parseJsonResponse(response)) as MarketplaceCatalog;
  } catch (error) {
    throw toReadableNetworkError(error);
  }
}

export async function searchCatalog(searchTerm: string) {
  try {
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
  } catch (error) {
    throw toReadableNetworkError(error);
  }
}
