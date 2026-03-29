import { readCatalog } from "../../server/tinyfish.js";

export const config = {
  runtime: "nodejs"
};

export default async function handler(_req, res) {
  try {
    res.status(200).json(await readCatalog());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load catalog"
    });
  }
}
