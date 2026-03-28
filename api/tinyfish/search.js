import { searchCatalog } from "../../server/tinyfish.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const searchTerm = String(req.body?.searchTerm || "").trim();

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
