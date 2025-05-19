import { create } from 'zustand';
import { MenuItem, OrderWithItems, OrderItem, OrderStatus } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface OrderStore {
  // Cart management for register view
  cartItems: CartItem[];
  addItemToCart: (menuItem: MenuItem) => void;
  removeItemFromCart: (menuItemId: number) => void;
  updateItemQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  calculateTotal: () => number;
  
  // Order creation
  createOrder: () => Promise<OrderWithItems | null>;
  
  // Order status management for kitchen view
  updateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  cartItems: [],
  
  addItemToCart: (menuItem: MenuItem) => {
    set((state) => {
      const existingItemIndex = state.cartItems.findIndex(
        (item) => item.menuItem.id === menuItem.id
      );
      
      if (existingItemIndex >= 0) {
        // Item already exists, increase quantity
        const newCartItems = [...state.cartItems];
        newCartItems[existingItemIndex].quantity += 1;
        return { cartItems: newCartItems };
      } else {
        // New item, add to cart
        return { cartItems: [...state.cartItems, { menuItem, quantity: 1 }] };
      }
    });
  },
  
  removeItemFromCart: (menuItemId: number) => {
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.menuItem.id !== menuItemId)
    }));
  },
  
  updateItemQuantity: (menuItemId: number, quantity: number) => {
    set((state) => {
      const newCartItems = state.cartItems.map((item) => {
        if (item.menuItem.id === menuItemId) {
          return { ...item, quantity };
        }
        return item;
      });
      
      // Remove item if quantity is zero or less
      return {
        cartItems: newCartItems.filter((item) => item.quantity > 0)
      };
    });
  },
  
  clearCart: () => set({ cartItems: [] }),
  
  calculateSubtotal: () => {
    return get().cartItems.reduce(
      (total, item) => total + (item.menuItem.price * item.quantity),
      0
    );
  },
  
  calculateTax: () => {
    const subtotal = get().calculateSubtotal();
    return Math.round(subtotal * 0.1); // 10% tax
  },
  
  calculateTotal: () => {
    const subtotal = get().calculateSubtotal();
    const tax = get().calculateTax();
    return subtotal + tax;
  },
  
  createOrder: async () => {
    const { cartItems, calculateTotal, clearCart } = get();
    
    if (cartItems.length === 0) {
      return null;
    }
    
    try {
      const orderData = {
        orderNumber: `#${Math.floor(1000 + Math.random() * 9000)}`, // Random 4-digit number
        totalAmount: calculateTotal(),
        items: cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          price: item.menuItem.price
        }))
      };
      
      const response = await apiRequest('POST', '/api/orders', orderData);
      const newOrder = await response.json();
      
      // Clear the cart after successful order creation
      clearCart();
      
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      return newOrder;
    } catch (error) {
      console.error('Failed to create order:', error);
      return null;
    }
  },
  
  updateOrderStatus: async (orderId: number, status: OrderStatus) => {
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }
}));
