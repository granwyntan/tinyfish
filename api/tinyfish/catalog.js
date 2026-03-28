import { readCatalog } from "../../server/tinyfish.js";

export default function handler(_req, res) {
  res.status(200).json(readCatalog());
}
