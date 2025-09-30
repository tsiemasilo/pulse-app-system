import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import HRDashboard from "@/pages/hr-dashboard";
import ContactCenterDashboard from "@/pages/contact-center-dashboard";
import TeamLeaderDashboard from "@/pages/team-leader-dashboard";
import Header from "@/components/header";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user || null} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Switch>
          <Route path="/" component={() => {
            if (!user?.role) {
              return <div>Loading user role...</div>;
            }
            switch (user.role) {
              case 'admin':
                return <AdminDashboard />;
              case 'hr':
                return <HRDashboard />;
              case 'contact_center_ops_manager':
              case 'contact_center_manager':
                return <ContactCenterDashboard />;
              case 'team_leader':
                return <TeamLeaderDashboard />;
              case 'agent':
                return (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
                    <p className="text-muted-foreground">Dashboard access is not available for your role.</p>
                  </div>
                );
              default:
                return <div>No dashboard available for your role: {user.role}</div>;
            }
          }} />
          {/* Admin Routes */}
          <Route path="/admin" component={() => user?.role === 'admin' ? <AdminDashboard /> : <NotFound />} />
          <Route path="/admin/hr" component={() => user?.role === 'admin' ? <HRDashboard /> : <NotFound />} />
          <Route path="/admin/contact-center" component={() => user?.role === 'admin' ? <ContactCenterDashboard /> : <NotFound />} />
          <Route path="/admin/team-leader" component={() => user?.role === 'admin' ? <TeamLeaderDashboard /> : <NotFound />} />
          
          {/* Role-specific Routes */}
          <Route path="/hr" component={() => user?.role === 'hr' ? <HRDashboard /> : <NotFound />} />
          <Route path="/contact-center" component={() => 
            (user?.role === 'contact_center_ops_manager' || user?.role === 'contact_center_manager') 
              ? <ContactCenterDashboard /> 
              : <NotFound />
          } />
          <Route path="/team-leader" component={() => user?.role === 'team_leader' ? <TeamLeaderDashboard /> : <NotFound />} />
          
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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
