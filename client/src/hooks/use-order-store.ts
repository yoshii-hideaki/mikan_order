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
    // 各ドリンクの合計数量を計算
    const totalDrinks = get().cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    
    // 新しい料金体系: 1杯700円、2杯1200円、3杯1500円
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
    
    return price;
  },
  
  calculateTax: () => {
    // 消費税を無視
    return 0;
  },
  
  calculateTotal: () => {
    // 消費税を無視するので、小計と合計は同じ
    return get().calculateSubtotal();
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
