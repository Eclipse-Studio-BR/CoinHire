import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
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
import Profile from "@/pages/Profile";
import RoleSelection from "@/pages/RoleSelection";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import EmployerApplications from "@/pages/EmployerApplications";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'guest' && location !== '/select-role') {
      setLocation('/select-role');
    }
  }, [isAuthenticated, user, location, setLocation]);

  return (
    <Switch>
      {/* Role selection (for new users) */}
      <Route path="/select-role" component={RoleSelection} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Home route - authenticated users see Jobs, others see Landing */}
      <Route path="/">
        {isAuthenticated && user?.role !== 'guest' ? <Jobs /> : <Landing />}
      </Route>
      
      {/* Job routes */}
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetail} />
      
      {/* Company routes */}
      <Route path="/companies" component={Companies} />
      <Route path="/companies/:slug" component={CompanyDetail} />
      
      {/* User routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      
      {/* Employer routes */}
      <Route path="/post-job" component={PostJob} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/employer/applications" component={EmployerApplications} />
      
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
