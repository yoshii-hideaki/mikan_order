export interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 1, name: "日本酒みかんロック",   price: 75000, imageUrl: "", category: "お酒" },
  { id: 2, name: "太幸ワイン",           price: 80000, imageUrl: "", category: "お酒" },
  { id: 3, name: "太幸ワインサングリア", price: 85000, imageUrl: "", category: "お酒" },
  { id: 4, name: "ブラッドオレンジ梅酒", price: 78000, imageUrl: "", category: "お酒" },
  { id: 5, name: "カシス河内晩柑",       price: 78000, imageUrl: "", category: "お酒" },
  { id: 6, name: "レモン酎ハイ",         price: 70000, imageUrl: "", category: "お酒" },
  { id: 7, name: "河内晩柑ジュース",     price: 55000, imageUrl: "", category: "ソフトドリンク" },
];

export const MENU_MAP = new Map<number, MenuItem>(MENU_ITEMS.map((m) => [m.id, m]));

export function calcTotalAmount(
  items: Array<{ menuItemId: number; quantity: number }>
): number {
  const totalDrinks = items.reduce((sum, i) => sum + i.quantity, 0);
  const softDrinks = items.reduce(
    (sum, i) => sum + (MENU_MAP.get(i.menuItemId)?.category === "ソフトドリンク" ? i.quantity : 0),
    0
  );
  const fullSets = Math.floor(totalDrinks / 3);
  const remainder = totalDrinks % 3;
  let price = fullSets * 150000;
  if (remainder === 1) price += 70000;
  else if (remainder === 2) price += 120000;
  return Math.max(0, price - softDrinks * 20000);
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
