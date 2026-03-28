import { searchCatalog } from "../../server/tinyfish.js";

export const config = {
  runtime: "nodejs"
};

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await readBody(req);
    const searchTerm = String(body?.searchTerm || "").trim();

    if (!searchTerm) {
      res.status(400).json({ error: "searchTerm is required" });
      return;
    }

    const payload = await searchCatalog(searchTerm, {
      apiKey: process.env.TINYFISH_API_KEY
    });

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Tinyfish search failed"
    });
  }
}
