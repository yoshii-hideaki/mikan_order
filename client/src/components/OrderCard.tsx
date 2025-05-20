import { OrderWithItems } from "@shared/schema";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useOrderStore } from "@/hooks/use-order-store";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

type OrderCardProps = {
  order: OrderWithItems;
};

const statusColorMap = {
  "in-progress": {
    bg: "bg-yellow-100",
    border: "border-yellow-500",
    header: "bg-yellow-500",
    divider: "border-yellow-200",
  },
  "ready": {
    bg: "bg-green-100",
    border: "border-green-500",
    header: "bg-green-500",
    divider: "border-green-200",
  },
};

export default function OrderCard({ order }: OrderCardProps) {
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  
  // statusColorMapが持つキーとして保証されたOrderStatusのみを使用
  const statusColors = statusColorMap[order.status as "in-progress" | "ready"];
  
  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus);
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };
  
  // Calculate time since order was created
  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString.toString()), {
        addSuffix: true,
        locale: ja,
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className={`order-card ${statusColors.bg} border-l-4 ${statusColors.border} rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200`}>
      <div className={`${statusColors.header} text-white px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center">
          <span className="font-bold text-lg">{order.orderNumber}</span>
          <StatusBadge 
            status={order.status} 
            animated={order.status === "new"} 
            className="ml-2"
          />
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>{getTimeSince(order.createdAt.toString())}</span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-2 mb-4">
          {order.items?.map((item) => (
            <div 
              key={item.id}
              className={`flex justify-between py-1 border-b ${statusColors.divider}`}
            >
              <span className="font-medium">{item.menuItem.name}</span>
              <span>× {item.quantity}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mt-4">
          {order.status === "in-progress" ? (
            <Button 
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              onClick={() => handleStatusChange("ready")}
            >
              完了
            </Button>
          ) : (
            <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed">
              提供済み
            </span>
          )}
          
          <span className="text-sm text-gray-600 self-end">
            {order.createdAt && new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
