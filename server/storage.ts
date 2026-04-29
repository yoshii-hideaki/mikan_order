import { 
  type MenuItem, 
  type InsertMenuItem, 
  type Order, 
  type InsertOrder, 
  type OrderItem, 
  type InsertOrderItem, 
  type OrderWithItems,
  OrderStatus
} from "@shared/schema";

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
    orderData: { orderNumber: string; status: OrderStatus; }, 
    items: Array<{ menuItemId: number; quantity: number; }>
  ): Promise<OrderWithItems | undefined>;
}

export class MemStorage implements IStorage {
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private menuItemIdCounter: number;
  private orderIdCounter: number;
  private orderItemIdCounter: number;
  private orderNumberCounter: number;

  constructor() {
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.menuItemIdCounter = 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.orderNumberCounter = 1000; // Start order numbers at 1000
    
    // Initialize with some default menu items
    this.initializeMenuItems();
  }

  private initializeMenuItems() {
    const defaultItems: InsertMenuItem[] = [
      {
        name: "日本酒みかんロック",
        price: 75000, // ¥750
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "太幸ワイン",
        price: 80000, // ¥800
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "太幸ワインサングリア",
        price: 85000, // ¥850
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "ブラッドオレンジ梅酒",
        price: 78000, // ¥780
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "カシス河内晩柑",
        price: 78000, // ¥780
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "レモン酎ハイ",
        price: 70000, // ¥700
        imageUrl: "",
        category: "お酒",
      },
      {
        name: "河内晩柑ジュース",
        price: 55000, // ¥550
        imageUrl: "",
        category: "ソフトドリンク",
      },
    ];

    defaultItems.forEach(item => this.createMenuItem(item));
  }

  // Menu Items Methods
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
    const existingItem = this.menuItems.get(id);
    if (!existingItem) return undefined;

    const updatedItem = { ...existingItem, ...item };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Orders Methods
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.orderNumber === orderNumber
    );
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const orderNumber = orderData.orderNumber || `#${this.orderNumberCounter++}`;
    
    const now = new Date();
    const order: Order = {
      ...orderData,
      id,
      orderNumber,
      status: "in-progress", 
      createdAt: now,
      updatedAt: now
    };
    
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder = { 
      ...order, 
      status,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    return this.orders.delete(id);
  }

  // Order Items Methods
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const orderItem = { ...item, id };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }

  async deleteOrderItemsByOrderId(orderId: number): Promise<boolean> {
    // Filter out all items that belong to the specified order
    const itemsToKeep = Array.from(this.orderItems.entries()).filter(
      ([_, item]) => item.orderId !== orderId
    );
    
    // Clear all items and re-add only the ones we want to keep
    this.orderItems.clear();
    itemsToKeep.forEach(([id, item]) => {
      this.orderItems.set(id, item);
    });
    
    return true;
  }

  // Combined Operations
  async getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    const orderItems = await this.getOrderItemsByOrderId(orderId);
    const itemsWithDetails = await Promise.all(
      orderItems.map(async (item) => {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        return {
          ...item,
          menuItem: menuItem!
        };
      })
    );

    return {
      ...order,
      items: itemsWithDetails
    };
  }

  async getAllOrdersWithItems(): Promise<OrderWithItems[]> {
    const orders = await this.getAllOrders();
    return Promise.all(
      orders.map(async (order) => {
        const orderWithItems = await this.getOrderWithItems(order.id);
        return orderWithItems!;
      })
    );
  }

  async updateOrderWithItems(
    id: number,
    orderData: { orderNumber: string; status: OrderStatus; },
    items: Array<{ menuItemId: number; quantity: number; }>
  ): Promise<OrderWithItems | undefined> {
    // Check if order exists
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) return undefined;

    // 注文アイテムに基づいて合計金額を計算する
    // メニューアイテムの情報を取得
    const itemsWithMenuInfo = await Promise.all(
      items.map(async (item) => {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        return {
          ...item,
          menuItem
        };
      })
    );

    // 価格計算ロジック（フロントエンドと同じロジック）
    // すべてのドリンクの数を数える
    const totalDrinks = itemsWithMenuInfo.reduce(
      (total, item) => total + item.quantity,
      0
    );
    
    // ソフトドリンクの数を数える（値引き用）
    const softDrinks = itemsWithMenuInfo.reduce(
      (total, item) => total + (item.menuItem?.category === "ソフトドリンク" ? item.quantity : 0),
      0
    );
    
    // 通常の料金計算: 1杯700円、2杯1200円、3杯1500円
    let price = 0;
    const fullSets = Math.floor(totalDrinks / 3);
    const remainder = totalDrinks % 3;
    
    // 3杯セットの価格を加算
    price += fullSets * 150000; // 1500円を100倍した値（セント表記）
    
    // 残りの杯数の価格を加算
    if (remainder === 1) {
      price += 70000; // 700円を100倍
    } else if (remainder === 2) {
      price += 120000; // 1200円を100倍
    }
    
    // ソフトドリンクの値引き：1杯につき200円引き
    const discount = softDrinks * 20000; // 200円 × ソフトドリンクの杯数
    
    // 値引き後の価格を計算
    const totalAmount = Math.max(0, price - discount);

    // Update the order with new total amount
    const updatedOrder = {
      ...existingOrder,
      ...orderData,
      totalAmount,
      updatedAt: new Date()
    };
    this.orders.set(id, updatedOrder);

    // Delete existing order items
    await this.deleteOrderItemsByOrderId(id);

    // Create new order items
    for (const item of items) {
      await this.createOrderItem({
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: 0 // Price is not displayed, so we set it to 0
      });
    }

    // Return the updated order with items
    return this.getOrderWithItems(id);
  }
}

export const storage = new MemStorage();
