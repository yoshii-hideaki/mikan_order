import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";
import { mapOrder, mapOrderWithItems } from "../_lib/menu";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const withItems = req.query.withItems === "true";

      if (withItems) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return res.json((data ?? []).map(mapOrderWithItems));
      } else {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return res.json((data ?? []).map(mapOrder));
      }
    }

    if (req.method === "POST") {
      const { orderNumber, totalAmount, items } = req.body;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ order_number: orderNumber, total_amount: totalAmount, status: "in-progress" })
        .select()
        .single();
      if (orderError) throw orderError;

      if (Array.isArray(items) && items.length > 0) {
        const { error: itemsError } = await supabase.from("order_items").insert(
          items.map((item: any) => ({
            order_id: order.id,
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
            price: item.price ?? 0,
          }))
        );
        if (itemsError) throw itemsError;
      }

      const { data: full, error: fullError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order.id)
        .single();
      if (fullError) throw fullError;

      return res.status(201).json(mapOrderWithItems(full));
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message ?? "Internal server error" });
  }
}
