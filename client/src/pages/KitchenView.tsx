import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderWithItems, OrderStatus } from "@shared/schema";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OrderCard from "@/components/OrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff } from "lucide-react";

type FilterStatus = "all" | OrderStatus;

function playDing() {
  try {
    const ctx = new AudioContext();
    // 3音: ド・ミ・ソ の和音的な上昇チャイム
    const notes = [
      { freq: 660, delay: 0 },
      { freq: 880, delay: 0.22 },
      { freq: 1100, delay: 0.44 },
    ];
    notes.forEach(({ freq, delay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.01);  // 音量 0.25→0.7
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2); // 持続 0.45→1.2秒
      osc.start(t);
      osc.stop(t + 1.2);
    });
  } catch {
    // ブラウザが AudioContext に対応していない場合は無視
  }
}

export default function KitchenView() {
  const [filter, setFilter] = useState<FilterStatus>("in-progress");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("kitchenSoundEnabled") !== "false";
  });
  const queryClient = useQueryClient();
  const knownOrderIds = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem("kitchenSoundEnabled", String(next));
      return next;
    });
  }, []);

  // Supabase Realtime（Vercel環境のみ）。未設定のRender環境ではポーリングにフォールバック。
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [queryClient]);

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders?withItems=true");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
    refetchInterval: supabase ? false : 2000, // Realtime使用時はポーリング不要
  });

  // 新規注文を検知して通知音を鳴らす
  useEffect(() => {
    if (!orders) return;
    if (!initialLoadDone.current) {
      orders.forEach(o => knownOrderIds.current.add(o.id));
      initialLoadDone.current = true;
      return;
    }
    const hasNew = orders.some(o => !knownOrderIds.current.has(o.id));
    if (hasNew && soundEnabled) playDing();
    orders.forEach(o => knownOrderIds.current.add(o.id));
  }, [orders, soundEnabled]);

  // フィルタリングされた注文
  const filteredOrders = orders
    ? orders.filter(order => filter === "all" || order.status === filter)
        .sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return filter === "in-progress" ? timeA - timeB : timeB - timeA;
        })
    : [];

  // ステータスごとのカウント
  const countInProgress = orders ? orders.filter(order => order.status === "in-progress").length : 0;
  const countReady = orders ? orders.filter(order => order.status === "ready").length : 0;

  return (
    <div className="kitchen-view">
      <Card className="bg-gray-900 text-white mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-xl font-bold">厨房注文画面</h2>
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-sm">調理中: {countInProgress}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-sm">完了: {countReady}</span>
              </div>
              <button
                onClick={toggleSound}
                title={soundEnabled ? "通知音ON（クリックでOFF）" : "通知音OFF（クリックでON）"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  soundEnabled
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-600 hover:bg-gray-500 text-gray-300"
                }`}
              >
                {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                {soundEnabled ? "通知音ON" : "通知音OFF"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Order filter */}
      <div className="mb-6 flex flex-wrap gap-2">
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
          {filteredOrders.length > 0 ? (
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
