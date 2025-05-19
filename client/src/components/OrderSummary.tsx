import { useOrderStore } from "@/hooks/use-order-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, SendIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function OrderSummary() {
  const {
    cartItems,
    removeItemFromCart,
    updateItemQuantity,
    clearCart,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    createOrder,
  } = useOrderStore();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `¥${(amount / 100).toLocaleString()}`;
  };
  
  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "カートが空です",
        description: "注文を確定する前に商品を追加してください。",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const order = await createOrder();
      if (order) {
        toast({
          title: "注文が確定しました",
          description: `注文番号: ${order.orderNumber}`,
          variant: "default",
        });
        
        // Refresh orders data
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      }
    } catch (error) {
      toast({
        title: "エラーが発生しました",
        description: "注文の確定に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">注文内容</h2>
        
        <div className="order-items space-y-3 max-h-80 overflow-y-auto mb-4 flex-grow">
          {cartItems.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              カートに商品がありません
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{item.menuItem.name}</div>
                  <div className="text-gray-500 text-sm">
                    {formatCurrency(item.menuItem.price)} × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="font-medium">
                    {formatCurrency(item.menuItem.price * item.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 text-gray-500 hover:text-red-500"
                    onClick={() => removeItemFromCart(item.menuItem.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">小計</span>
            <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">消費税 (10%)</span>
            <span className="font-medium">{formatCurrency(calculateTax())}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>合計</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={clearCart}
            disabled={cartItems.length === 0 || isSubmitting}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            注文をリセット
          </Button>
          <Button
            className="w-full"
            onClick={handleCreateOrder}
            disabled={cartItems.length === 0 || isSubmitting}
          >
            <SendIcon className="mr-1 h-4 w-4" />
            注文を確定する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
