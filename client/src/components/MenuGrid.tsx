import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderStore } from "@/hooks/use-order-store";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";

type CategoryType = "all" | "お酒" | "ソフトドリンク";

export default function MenuGrid() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });
  
  const addItemToCart = useOrderStore((state) => state.addItemToCart);
  const updateItemQuantity = useOrderStore((state) => state.updateItemQuantity);

  const filteredItems = menuItems?.filter((item) => 
    activeCategory === "all" || item.category === activeCategory
  );
  
  const handleCategoryClick = (category: CategoryType) => {
    setActiveCategory(category);
  };
  
  const handleAddToCart = (item: MenuItem) => {
    const quantity = quantities[item.id] || 1;
    for (let i = 0; i < quantity; i++) {
      addItemToCart(item);
    }
    // Reset quantity after adding to cart
    setQuantities(prev => ({...prev, [item.id]: 1}));
  };
  
  const handleQuantityChange = (id: number, value: number) => {
    if (value >= 1) {
      setQuantities(prev => ({...prev, [id]: value}));
    }
  };
  
  const incrementQuantity = (id: number) => {
    setQuantities(prev => ({...prev, [id]: (prev[id] || 1) + 1}));
  };
  
  const decrementQuantity = (id: number) => {
    if ((quantities[id] || 1) > 1) {
      setQuantities(prev => ({...prev, [id]: (prev[id] || 1) - 1}));
    }
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
              variant={activeCategory === "お酒" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("お酒")}
            >
              お酒
            </Button>
            <Button
              variant={activeCategory === "ソフトドリンク" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => handleCategoryClick("ソフトドリンク")}
            >
              ソフトドリンク
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <div className="flex items-center justify-between mt-4">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {filteredItems?.map((item) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg hover:shadow-md transition-all"
              >
                <div className="font-medium text-gray-800 mb-3">{item.name}</div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => decrementQuantity(item.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={quantities[item.id] || 1}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      className="w-12 h-8 mx-1 text-center"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => incrementQuantity(item.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleAddToCart(item)}
                  >
                    追加
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
