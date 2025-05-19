import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  OrderStatus 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Menu Items Routes
  app.get("/api/menu-items", async (req: Request, res: Response) => {
    try {
      const menuItems = await storage.getAllMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const menuItem = await storage.getMenuItemById(id);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to get menu item" });
    }
  });

  app.post("/api/menu-items", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Order Routes
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const withItems = req.query.withItems === "true";
      
      if (withItems) {
        const orders = await storage.getAllOrdersWithItems();
        res.json(orders);
      } else {
        const orders = await storage.getAllOrders();
        res.json(orders);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const withItems = req.query.withItems === "true";
      
      if (withItems) {
        const order = await storage.getOrderWithItems(id);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
      } else {
        const order = await storage.getOrderById(id);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get order" });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Create order items if they are included
      const items = req.body.items;
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const orderItemData = insertOrderItemSchema.parse({
            ...item,
            orderId: order.id
          });
          await storage.createOrderItem(orderItemData);
        }
      }
      
      // Return the complete order with items
      const orderWithItems = await storage.getOrderWithItems(order.id);
      res.status(201).json(orderWithItems);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const statusSchema = z.object({ status: OrderStatus });
      const { status } = statusSchema.parse(req.body);
      
      const updatedOrder = await storage.updateOrderStatus(id, status);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
