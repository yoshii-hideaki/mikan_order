import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { error } = await supabase.from("orders").select("id").limit(1);
    if (error) throw error;
    return res.json({ status: "ok", db: "connected" });
  } catch (err: any) {
    return res.status(500).json({ status: "error", db: "failed", message: err.message });
  }
}
