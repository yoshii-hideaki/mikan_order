import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../_lib/supabase";
import { mapOrder } from "../../_lib/menu";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ message: "Method not allowed" });

  const id = Number(req.query.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const { status } = req.body;
  if (!["in-progress", "ready"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ message: "Order not found" });
    return res.json(mapOrder(data));
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message ?? "Internal server error" });
  }
}
