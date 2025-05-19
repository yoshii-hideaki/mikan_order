import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScanBarcode, ChefHat } from "lucide-react";

export default function ViewSwitcher() {
  const [, setLocation] = useLocation();
  const [isRegisterRoute] = useRoute("/");
  const [isKitchenRoute] = useRoute("/kitchen");

  return (
    <div className="flex items-center space-x-2 sm:space-x-4">
      <Button
        variant={isRegisterRoute ? "default" : "outline"}
        className="flex items-center text-sm sm:text-base"
        onClick={() => setLocation("/")}
      >
        <ScanBarcode className="mr-1 h-4 w-4" />
        <span>レジ画面</span>
      </Button>

      <Button
        variant={isKitchenRoute ? "default" : "outline"}
        className="flex items-center text-sm sm:text-base"
        onClick={() => setLocation("/kitchen")}
      >
        <ChefHat className="mr-1 h-4 w-4" />
        <span>厨房画面</span>
      </Button>
    </div>
  );
}
