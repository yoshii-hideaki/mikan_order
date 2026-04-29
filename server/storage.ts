import {
  type MenuItem,
  type InsertMenuItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  OrderStatus,
  orders,
  orderItems,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";

const { Pool } = pg;

export interface IStorage {
  // Menu Items
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Orders
  getAllOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;

  // Order Items
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItemsByOrderId(orderId: number): Promise<boolean>;

  // Combined Operations
  getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined>;
  getAllOrdersWithItems(): Promise<OrderWithItems[]>;
  updateOrderWithItems(
    id: number,
    orderData: { orderNumber: string; status: OrderStatus },
    items: Array<{ menuItemId: number; quantity: number }>
  ): Promise<OrderWithItems | undefined>;
}

// ---------------------------------------------------------------------------
// Menu items are always hardcoded (not stored in DB)
// ---------------------------------------------------------------------------

const FIXED_MENU_ITEMS: MenuItem[] = [
  { id: 1, name: "日本酒みかんロック",     price: 75000, imageUrl: "", category: "お酒" },
  { id: 2, name: "太幸ワイン",             price: 80000, imageUrl: "", category: "お酒" },
  { id: 3, name: "太幸ワインサングリア",   price: 85000, imageUrl: "", category: "お酒" },
  { id: 4, name: "ブラッドオレンジ梅酒",   price: 78000, imageUrl: "", category: "お酒" },
  { id: 5, name: "カシス河内晩柑",         price: 78000, imageUrl: "", category: "お酒" },
  { id: 6, name: "レモン酎ハイ",           price: 70000, imageUrl: "", category: "お酒" },
  { id: 7, name: "河内晩柑ジュース",       price: 55000, imageUrl: "", category: "ソフトドリンク" },
];

const MENU_MAP = new Map<number, MenuItem>(FIXED_MENU_ITEMS.map((m) => [m.id, m]));

function calcTotalAmount(
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

// ---------------------------------------------------------------------------
// PostgreSQL storage — orders & order_items only (used when DATABASE_URL is set)
// ---------------------------------------------------------------------------

export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    this.db = drizzle(pool);
  }

  // Menu items — always from fixed list, never touches DB
  async getAllMenuItems() { return FIXED_MENU_ITEMS; }
  async getMenuItemById(id: number) { return MENU_MAP.get(id); }
  async createMenuItem(item: InsertMenuItem) {
    const id = Math.max(...FIXED_MENU_ITEMS.map((m) => m.id)) + 1;
    const newItem = { ...item, id };
    FIXED_MENU_ITEMS.push(newItem);
    MENU_MAP.set(id, newItem);
    return newItem;
  }
  async updateMenuItem(id: number, item: Partial<InsertMenuItem>) {
    const existing = MENU_MAP.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...item };
    MENU_MAP.set(id, updated);
    return updated;
  }
  async deleteMenuItem(id: number) {
    return MENU_MAP.delete(id);
  }

  // Orders — DB
  async getAllOrders() {
    return this.db.select().from(orders);
  }

  async getOrderById(id: number) {
    const rows = await this.db.select().from(orders).where(eq(orders.id, id));
    return rows[0];
  }

  async getOrderByNumber(orderNumber: string) {
    const rows = await this.db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return rows[0];
  }

  async createOrder(order: InsertOrder) {
    const rows = await this.db
      .insert(orders)
      .values({ ...order, status: "in-progress" })
      .returning();
    return rows[0];
  }

  async updateOrderStatus(id: number, status: OrderStatus) {
    const rows = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return rows[0];
  }

  async deleteOrder(id: number) {
    const rows = await this.db.delete(orders).where(eq(orders.id, id)).returning();
    return rows.length > 0;
  }

  // Order items — DB
  async getOrderItemsByOrderId(orderId: number) {
    return this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem) {
    const rows = await this.db.insert(orderItems).values(item).returning();
    return rows[0];
  }

  async deleteOrderItemsByOrderId(orderId: number) {
    await this.db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    return true;
  }

  // Combined — orders from DB, menu items from fixed list
  async getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    const items = await this.getOrderItemsByOrderId(orderId);
    return {
      ...order,
      items: items.map((item) => ({ ...item, menuItem: MENU_MAP.get(item.menuItemId)! })),
    };
  }

  async getAllOrdersWithItems() {
    const allOrders = await this.getAllOrders();
    return Promise.all(allOrders.map((o) => this.getOrderWithItems(o.id).then((r) => r!)));
  }

  async updateOrderWithItems(
    id: number,
    orderData: { orderNumber: string; status: OrderStatus },
    items: Array<{ menuItemId: number; quantity: number }>
  ): Promise<OrderWithItems | undefined> {
    const existing = await this.getOrderById(id);
    if (!existing) return undefined;

    const totalAmount = calcTotalAmount(items);
    await this.db
      .update(orders)
      .set({ ...orderData, totalAmount, updatedAt: new Date() })
      .where(eq(orders.id, id));

    await this.deleteOrderItemsByOrderId(id);
    for (const item of items) {
      await this.createOrderItem({ orderId: id, menuItemId: item.menuItemId, quantity: item.quantity, price: 0 });
    }

    return this.getOrderWithItems(id);
  }
}

// ---------------------------------------------------------------------------
// In-memory storage (fallback when DATABASE_URL is not set)
// ---------------------------------------------------------------------------

export class MemStorage implements IStorage {
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private menuItemIdCounter: number;
  private orderIdCounter: number;
  private orderItemIdCounter: number;
  private orderNumberCounter: number;

  constructor() {
    this.menuItems = new Map(FIXED_MENU_ITEMS.map((m) => [m.id, m]));
    this.orders = new Map();
    this.orderItems = new Map();
    this.menuItemIdCounter = FIXED_MENU_ITEMS.length + 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.orderNumberCounter = 1000;
  }

  async getAllMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemIdCounter++;
    const newItem = { ...item, id };
    this.menuItems.set(id, newItem);
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...item };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find((o) => o.orderNumber === orderNumber);
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const orderNumber = orderData.orderNumber || `#${this.orderNumberCounter++}`;
    const now = new Date();
    const order: Order = { ...orderData, id, orderNumber, status: "in-progress", createdAt: now, updatedAt: now };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  async deleteOrder(id: number): Promise<boolean> {
    return this.orders.delete(id);
  }

  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter((i) => i.orderId === orderId);
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const orderItem = { ...item, id };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }

  async deleteOrderItemsByOrderId(orderId: number): Promise<boolean> {
    const keep = Array.from(this.orderItems.entries()).filter(([, i]) => i.orderId !== orderId);
    this.orderItems.clear();
    keep.forEach(([id, item]) => this.orderItems.set(id, item));
    return true;
  }

  async getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    const items = await this.getOrderItemsByOrderId(orderId);
    return {
      ...order,
      items: items.map((item) => ({ ...item, menuItem: this.menuItems.get(item.menuItemId)! })),
    };
  }

  async getAllOrdersWithItems(): Promise<OrderWithItems[]> {
    const allOrders = await this.getAllOrders();
    return Promise.all(allOrders.map((o) => this.getOrderWithItems(o.id).then((r) => r!)));
  }

  async updateOrderWithItems(
    id: number,
    orderData: { orderNumber: string; status: OrderStatus },
    items: Array<{ menuItemId: number; quantity: number }>
  ): Promise<OrderWithItems | undefined> {
    const existing = await this.getOrderById(id);
    if (!existing) return undefined;

    const totalAmount = calcTotalAmount(items);
    const updated = { ...existing, ...orderData, totalAmount, updatedAt: new Date() };
    this.orders.set(id, updated);

    await this.deleteOrderItemsByOrderId(id);
    for (const item of items) {
      await this.createOrderItem({ orderId: id, menuItemId: item.menuItemId, quantity: item.quantity, price: 0 });
    }

    return this.getOrderWithItems(id);
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DbStorage()
  : new MemStorage();
