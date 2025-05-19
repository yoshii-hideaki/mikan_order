import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Menu item schema
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // Price in cents/sen to avoid floating point issues
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // main, side, drink, etc.
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
  imageUrl: true,
  category: true,
});

// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("new"), // new, in-progress, ready
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  totalAmount: integer("total_amount").notNull(), // Total in cents/sen
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderNumber: true,
  totalAmount: true,
});

// Order item schema (joining orders and menu items)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(), // Price at the time of order
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  menuItemId: true,
  quantity: true,
  price: true,
});

// Status type for orders
export const OrderStatus = z.enum(["new", "in-progress", "ready"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

// Types for our schemas
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Extended types for frontend use
export type OrderWithItems = Order & {
  items: (OrderItem & { menuItem: MenuItem })[];
};
