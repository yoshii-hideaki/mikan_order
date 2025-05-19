import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderStore } from "@/hooks/use-order-store";

type CategoryType = "all" | "main" | "side" | "drink";

export default function MenuGrid() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });
  
  const addItemToCart = useOrderStore((state) => state.addItemToCart);

  const filteredItems = menuItems?.filter((item) => 
    activeCategory === "all" || item.category === activeCategory
  );
  
  const handleCategoryClick = (category: CategoryType) => {
    setActiveCategory(category);
  };
  
  const handleMenuItemClick = (item: MenuItem) => {
    addItemToCart(item);
  };
  
  // Format price from cents to display format (e.g., 85000 -> ¥850)
  const formatPrice = (priceInCents: number) => {
    return `¥${(priceInCents / 100).toLocaleString()}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-800">メニュー</h2>
          <div className="flex space-x-2 flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("all")}
            >
              全て
            </Button>
            <Button
              variant={activeCategory === "main" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("main")}
            >
              主菜
            </Button>
            <Button
              variant={activeCategory === "side" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("side")}
            >
              副菜
            </Button>
            <Button
              variant={activeCategory === "drink" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("drink")}
            >
              飲み物
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <Skeleton className="w-full h-24 rounded mb-2" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {filteredItems?.map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded-lg hover:border-primary cursor-pointer transition-all"
                onClick={() => handleMenuItemClick(item)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-24 object-cover rounded mb-2"
                />
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-gray-600 text-sm">{formatPrice(item.price)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
