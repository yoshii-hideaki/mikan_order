import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Edit2, Plus, Trash2, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { useOrderStore } from "@/hooks/use-order-store";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";

// Define types for order items
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface OrderItemWithMenuItem {
  id: number;
  menuItem: MenuItem;
  quantity: number;
}

type OrderStatus = "in-progress" | "ready";

interface OrderWithItems {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemWithMenuItem[];
}

export default function OrderHistory() {
  const queryClient = useQueryClient();
  const { createOrder, updateOrder } = useOrderStore();
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);
  const [editedItems, setEditedItems] = useState<Array<{ id?: number; menuItemId: number; quantity: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders?withItems=true");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const response = await fetch("/api/menu-items");
      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }
      return response.json();
    },
  });
  
  // Get recent orders (last 10)
  const recentOrders = orders?.slice().sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 10);
  
  // Format price from cents to display format
  const formatPrice = (priceInCents: number) => {
    return `¥${(priceInCents / 100).toLocaleString()}`;
  };
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), "HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

  const handleEditClick = (order: OrderWithItems) => {
    setEditingOrder(order);
    setEditedItems(order.items.map((item: OrderItemWithMenuItem) => ({
      id: item.id,
      menuItemId: item.menuItem.id,
      quantity: item.quantity
    })));
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    setEditedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.max(0, newQuantity) } : item
    ));
  };

  const handleAddItem = () => {
    if (!menuItems?.length) return;
    setEditedItems(prev => [...prev, {
      menuItemId: menuItems[0].id,
      quantity: 1
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMenuItemChange = (index: number, menuItemId: number) => {
    setEditedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, menuItemId } : item
    ));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder || isSaving) return;

    try {
      setIsSaving(true);

      // バリデーション
      if (editedItems.length === 0) {
        toast.error("少なくとも1つのメニューを追加してください");
        setIsSaving(false);
        return;
      }

      if (editedItems.some(item => item.quantity <= 0)) {
        toast.error("数量は1以上を指定してください");
        setIsSaving(false);
        return;
      }

      // 注文内容を更新
      await updateOrder(
        editingOrder.id,
        editingOrder.orderNumber,
        editingOrder.status,
        editedItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity
        }))
      );

      // データを再取得
      await queryClient.invalidateQueries({
        queryKey: ["/api/orders"],
        refetchType: 'all'
      });

      toast.success("注文内容を更新しました");
      setEditingOrder(null);
      setEditedItems([]);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error(error instanceof Error ? error.message : "注文内容の更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // Download order history as CSV
  const downloadOrderHistory = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      // サーバーから最新の注文データを取得
      const response = await apiRequest('GET', '/api/orders?withItems=true');
      const allOrders: OrderWithItems[] = await response.json();
      
      if (!allOrders?.length) {
        toast.error("ダウンロードする注文履歴がありません");
        return;
      }

      // CSVヘッダーを作成
      const headers = ["注文番号", "日時", "金額", "ステータス", "注文内容"];
      
      // 各注文をCSV行にフォーマット
      const csvRows = allOrders.map(order => {
        const orderDate = format(parseISO(order.createdAt.toString()), "yyyy/MM/dd HH:mm:ss");
        const status = order.status === "in-progress" ? "準備中" : "準備完了";
        const amount = formatPrice(order.totalAmount);
        
        // 注文アイテムを処理
        const items = order.items.map((item) => 
          `${item.menuItem.name} × ${item.quantity}`
        ).join(", ");
        
        // CSVエスケープ処理
        const escapeCsvValue = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };
        
        return [
          escapeCsvValue(order.orderNumber),
          escapeCsvValue(orderDate),
          escapeCsvValue(amount),
          escapeCsvValue(status),
          escapeCsvValue(items)
        ].join(",");
      });
      
      // ヘッダーと行を結合
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      
      // CSVコンテンツでBlobを作成
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // ダウンロードリンクを作成してダウンロードをトリガー
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `order_history_${format(new Date(), "yyyyMMdd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("注文履歴をダウンロードしました");
    } catch (error) {
      console.error("Failed to download order history:", error);
      toast.error("注文履歴のダウンロードに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">最近の注文履歴</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={downloadOrderHistory}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "ダウンロード中..." : "全履歴をダウンロード"}
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex space-x-4 p-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文内容
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders?.length ? (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{order.orderNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatTime(order.createdAt.toString())}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {order.items?.map((item) => (
                              <div key={item.id} className="text-sm">
                                {item.menuItem.name} × {item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {order.status === "in-progress" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => handleEditClick(order)}
                            >
                              <Edit2 className="h-4 w-4" />
                              編集
                            </Button>
                          ) : (
                            <span className="text-gray-400">編集不可</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        注文履歴がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingOrder} onOpenChange={() => {
        if (!isSaving) {
          setEditingOrder(null);
          setEditedItems([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>注文内容の編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editedItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Select
                    value={item.menuItemId.toString()}
                    onValueChange={(value) => handleMenuItemChange(index, parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="メニューを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems?.map((menuItem) => (
                        <SelectItem key={menuItem.id} value={menuItem.id.toString()}>
                          {menuItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(index, (item.quantity || 0) - 1)}
                    disabled={isSaving}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                    className="w-16 text-center"
                    disabled={isSaving}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(index, (item.quantity || 0) + 1)}
                    disabled={isSaving}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveItem(index)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleAddItem}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" />
              メニューを追加
            </Button>
            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingOrder(null);
                  setEditedItems([]);
                }}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
