import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RegisterView from "@/pages/RegisterView";
import KitchenView from "@/pages/KitchenView";
import ViewSwitcher from "@/components/ViewSwitcher";
import { Navigation2 } from "lucide-react";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="bg-gray-100 min-h-screen">
          {/* Header/Navigation */}
          <header className="bg-white shadow-sm">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center">
                  <Navigation2 className="text-primary h-6 w-6 mr-2" />
                  <h1 className="text-xl font-semibold text-gray-800">注文管理システム</h1>
                </div>
                <ViewSwitcher />
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Switch>
              <Route path="/" component={RegisterView} />
              <Route path="/kitchen" component={KitchenView} />
              <Route component={NotFound} />
            </Switch>
          </main>
          
          {/* Footer */}
          <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
            <p>注文管理システムデモ | レストラン向けPOSソリューション</p>
          </footer>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
