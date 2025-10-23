import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Companies from "@/pages/Companies";
import CompanyDetail from "@/pages/CompanyDetail";
import Dashboard from "@/pages/Dashboard";
import PostJob from "@/pages/PostJob";
import Pricing from "@/pages/Pricing";
import Checkout from "@/pages/Checkout";
import AdminPanel from "@/pages/AdminPanel";
import Settings from "@/pages/Settings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      {!isAuthenticated && !isLoading && <Route path="/" component={Landing} />}
      
      {/* Authenticated routes */}
      {isAuthenticated && <Route path="/" component={Jobs} />}
      
      {/* Job routes */}
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetail} />
      
      {/* Company routes */}
      <Route path="/companies" component={Companies} />
      <Route path="/companies/:slug" component={CompanyDetail} />
      
      {/* User routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      
      {/* Employer routes */}
      <Route path="/post-job" component={PostJob} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout" component={Checkout} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminPanel} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
