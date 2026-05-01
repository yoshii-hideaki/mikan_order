import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MENU_ITEMS } from "./_lib/menu";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json(MENU_ITEMS);
}
