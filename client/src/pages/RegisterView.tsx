import MenuGrid from "@/components/MenuGrid";
import OrderSummary from "@/components/OrderSummary";
import OrderHistory from "@/components/OrderHistory";

export default function RegisterView() {
  return (
    <div className="register-view">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Section */}
        <div className="lg:col-span-2">
          <MenuGrid />
        </div>
        
        {/* Order Summary */}
        <div className="order-summary lg:h-auto">
          <OrderSummary />
        </div>
      </div>
      
      {/* Order History */}
      <OrderHistory />
    </div>
  );
}
