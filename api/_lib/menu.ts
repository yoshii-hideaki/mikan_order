import type { MenuItem } from "../../shared/schema";
import { MENU_ITEMS } from "../../shared/menuData";

export type { MenuItem };
export { MENU_ITEMS };
export const MENU_MAP = new Map<number, MenuItem>(MENU_ITEMS.map((m) => [m.id, m]));

export function calcTotalAmount(
  items: Array<{ menuItemId: number; quantity: number }>
): number {
  const alcoholCount = items.reduce(
    (sum, i) => sum + (MENU_MAP.get(i.menuItemId)?.category !== "ソフトドリンク" ? i.quantity : 0),
    0
  );
  const softDrinkCount = items.reduce(
    (sum, i) => sum + (MENU_MAP.get(i.menuItemId)?.category === "ソフトドリンク" ? i.quantity : 0),
    0
  );
  const fullSets = Math.floor(alcoholCount / 3);
  const remainder = alcoholCount % 3;
  let price = fullSets * 150000;
  if (remainder === 1) price += 70000;
  else if (remainder === 2) price += 120000;
  price += softDrinkCount * 50000; // ¥500 per soft drink (flat rate, not in set)
  return price;
}

// Supabaseのsnake_case → フロントのcamelCase変換
export function mapOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderWithItems(row: any) {
  return {
    ...mapOrder(row),
    items: (row.order_items ?? []).map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      menuItem: MENU_MAP.get(item.menu_item_id)!,
    })),
  };
}
