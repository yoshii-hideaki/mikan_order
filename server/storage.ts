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
  
  // Order Items
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  
  // Combined Operations
  getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined>;
  getAllOrdersWithItems(): Promise<OrderWithItems[]>;
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
        name: "獺祭 純米大吟醸",
        price: 98000, // ¥980
        imageUrl: "",
        category: "日本酒",
      },
      {
        name: "十四代 秘蔵酒",
        price: 120000, // ¥1200
        imageUrl: "",
        category: "日本酒",
      },
      {
        name: "久保田 千寿",
        price: 75000, // ¥750
        imageUrl: "",
        category: "日本酒",
      },
      {
        name: "黒龍 純米吟醸",
        price: 85000, // ¥850
        imageUrl: "",
        category: "日本酒",
      },
      {
        name: "梅酒 ロック",
        price: 65000, // ¥650
        imageUrl: "",
        category: "梅酒",
      },
      {
        name: "梅酒 ソーダ",
        price: 70000, // ¥700
        imageUrl: "",
        category: "梅酒",
      },
      {
        name: "モヒート",
        price: 85000, // ¥850
        imageUrl: "",
        category: "カクテル",
      },
      {
        name: "マティーニ",
        price: 90000, // ¥900
        imageUrl: "",
        category: "カクテル",
      },
      {
        name: "赤ワインサングリア",
        price: 78000, // ¥780
        imageUrl: "",
        category: "サングリア",
      },
      {
        name: "白ワインサングリア",
        price: 78000, // ¥780
        imageUrl: "",
        category: "サングリア",
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
      status: "new", 
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
}

export const storage = new MemStorage();
