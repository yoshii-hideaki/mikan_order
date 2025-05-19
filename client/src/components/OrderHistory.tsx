import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function OrderHistory() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
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

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">最近の注文履歴</h2>
        
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="text-primary">
                          <FileText className="h-4 w-4 mr-1" /> 詳細
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
  );
}
