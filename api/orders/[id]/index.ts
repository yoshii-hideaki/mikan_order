import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../_lib/supabase";
import { calcTotalAmount, mapOrder, mapOrderWithItems } from "../../_lib/menu";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number(req.query.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  try {
    if (req.method === "GET") {
      const withItems = req.query.withItems === "true";

      if (withItems) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", id)
          .single();
        if (error || !data) return res.status(404).json({ message: "Order not found" });
        return res.json(mapOrderWithItems(data));
      } else {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !data) return res.status(404).json({ message: "Order not found" });
        return res.json(mapOrder(data));
      }
    }

    if (req.method === "PATCH") {
      const { orderNumber, status, items } = req.body;
      const totalAmount = calcTotalAmount(
        (items ?? []).map((i: any) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
      );

      const { error: updateError } = await supabase
        .from("orders")
        .update({ order_number: orderNumber, status, total_amount: totalAmount })
        .eq("id", id);
      if (updateError) throw updateError;

      await supabase.from("order_items").delete().eq("order_id", id);

      if (Array.isArray(items) && items.length > 0) {
        const { error: itemsError } = await supabase.from("order_items").insert(
          items.map((item: any) => ({
            order_id: id,
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
            price: 0,
          }))
        );
        if (itemsError) throw itemsError;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (error || !data) return res.status(404).json({ message: "Order not found" });
      return res.json(mapOrderWithItems(data));
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message ?? "Internal server error" });
  }
}
