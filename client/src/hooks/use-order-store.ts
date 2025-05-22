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

  // Order update
  updateOrder: (orderId: number, orderNumber: string, status: OrderStatus, items: Array<{ menuItemId: number; quantity: number }>) => Promise<OrderWithItems | null>;
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
    const { cartItems } = get();
    
    // すべてのドリンクの数を数える
    const totalDrinks = cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    
    // ソフトドリンクの数を数える（後で値引き用）
    const softDrinks = cartItems.reduce(
      (total, item) => total + (item.menuItem.category === "ソフトドリンク" ? item.quantity : 0),
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
    
    // 値引き後の価格を返す
    return Math.max(0, price - discount); // マイナスにならないように0以上を保証
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
      // 現在の注文数を取得して次の注文番号を決定
      const ordersResponse = await apiRequest('GET', '/api/orders');
      const orders = await ordersResponse.json();
      const nextOrderNumber = orders.length + 1;

      const orderData = {
        orderNumber: `#${nextOrderNumber}`,
        totalAmount: calculateTotal(),
        items: cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          price: 0 // 価格は表示しないので0にする
        }))
      };
      
      const createResponse = await apiRequest('POST', '/api/orders', orderData);
      const newOrder = await createResponse.json();
      
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
  },

  updateOrder: async (orderId: number, orderNumber: string, status: OrderStatus, items: Array<{ menuItemId: number; quantity: number }>) => {
    try {
      // 注文内容をPATCHで更新
      const orderData = {
        orderNumber,
        status,
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity
        }))
      };
      
      const response = await apiRequest('PATCH', `/api/orders/${orderId}`, orderData);
      const updatedOrder = await response.json();
      
      // キャッシュを明示的に更新
      queryClient.setQueryData<OrderWithItems[]>(['/api/orders'], (oldData) => {
        if (!oldData) return [updatedOrder];
        
        // 既存のキャッシュデータを更新
        return oldData.map(order => 
          order.id === orderId ? updatedOrder : order
        );
      });
      
      // withItems=trueのクエリも更新
      queryClient.setQueryData<OrderWithItems[]>(['/api/orders?withItems=true'], (oldData) => {
        if (!oldData) return [updatedOrder];
        
        // 既存のキャッシュデータを更新
        return oldData.map(order => 
          order.id === orderId ? updatedOrder : order
        );
      });

      // 関連するクエリを強制的に再取得
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/orders'],
        refetchType: 'all'
      });
      
      return updatedOrder;
    } catch (error) {
      console.error('Failed to update order:', error);
      throw error; // エラーを上位に伝播させる
    }
  }
}));
