import { getAutocompleteSuggestions } from "../../server/tinyfish.js";

export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const query = String(req.query?.q || "").trim();
    const suggestions = await getAutocompleteSuggestions(query);
    res.status(200).json({ suggestions });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Autocomplete failed"
    });
  }
}
