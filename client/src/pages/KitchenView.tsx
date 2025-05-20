import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderWithItems, OrderStatus } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OrderCard from "@/components/OrderCard";
import { Skeleton } from "@/components/ui/skeleton";

type FilterStatus = "all" | OrderStatus;

export default function KitchenView() {
  const [filter, setFilter] = useState<FilterStatus>("in-progress");
  
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", "withItems"],
    queryFn: async () => {
      const response = await fetch("/api/orders?withItems=true");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,  // Consider data fresh for 5 seconds
    select: (data) => {
      // データを事前に処理して、レンダリング時の処理を軽減
      return data.map(order => ({
        ...order,
        createdAt: new Date(order.createdAt), // 日付文字列を日付オブジェクトに変換
        items: order.items || [] // itemsが存在しない場合は空配列を設定
      }));
    }
  });
  
  // より効率的なフィルタリングとソート - useMemoを使用して再計算を防止
  const { filteredOrders, counts } = useState(() => {
    if (!orders) {
      return { 
        filteredOrders: [], 
        counts: { new: 0, "in-progress": 0, ready: 0 } 
      };
    }
    
    // 1回のループですべての処理を完了
    const statusCounts = { new: 0, "in-progress": 0, ready: 0 };
    
    // フィルタリングしながらカウントを行う
    const filtered = orders.filter(order => {
      // ステータスをカウント
      if (order.status === "in-progress") {
        statusCounts["in-progress"]++;
      } else if (order.status === "ready") {
        statusCounts.ready++;
      } else if (order.status === "new") {
        statusCounts.new++;
      }
      
      // フィルタリング条件
      return filter === "all" || order.status === filter;
    });
    
    // ソート - 日付は既に事前処理済み
    const sorted = [...filtered].sort((a, b) => {
      // createdAtはすでにDateオブジェクト
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    
    return { 
      filteredOrders: sorted, 
      counts: statusCounts 
    };
  }, [orders, filter]);

  return (
    <div className="kitchen-view">
      <Card className="bg-gray-900 text-white mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-xl font-bold">厨房注文画面</h2>
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span className="text-sm">新規: {counts.new}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-sm">調理中: {counts["in-progress"]}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-sm">完了: {counts.ready}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Order filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "secondary"}
          className={filter === "all" ? "" : "bg-gray-800 text-white"}
          onClick={() => setFilter("all")}
        >
          すべて
        </Button>
        <Button
          variant={filter === "in-progress" ? "default" : "secondary"}
          className={filter === "in-progress" ? "" : "bg-yellow-500 text-white"}
          onClick={() => setFilter("in-progress")}
        >
          調理中
        </Button>
        <Button
          variant={filter === "ready" ? "default" : "secondary"}
          className={filter === "ready" ? "" : "bg-green-500 text-white"}
          onClick={() => setFilter("ready")}
        >
          完了
        </Button>
      </div>
      
      {/* Orders grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
              <div className="flex justify-between mt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders?.length ? (
            filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">表示する注文がありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
