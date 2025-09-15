import { LogOut, Shield, Users, Headphones, UserCheck, Clock } from "lucide-react";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface NavigationProps {
  user: User | null;
}

export default function Navigation({ user }: NavigationProps) {
  const [location, navigate] = useLocation();
  
  const roleDisplayMap = {
    admin: "System Admin",
    hr: "HR Manager", 
    contact_center_ops_manager: "CC Ops Manager",
    contact_center_manager: "CC Manager",
    team_leader: "Team Leader",
    agent: "Agent"
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force reload even if logout fails to clear the session
      window.location.reload();
    }
  };

  const adminRoleButtons = [
    { path: "/admin", label: "Admin", icon: Shield, testId: "nav-admin" },
    { path: "/admin/hr", label: "HR", icon: Users, testId: "nav-hr" },
    { path: "/admin/contact-center", label: "Contact Center", icon: Headphones, testId: "nav-contact-center" },
    { path: "/admin/team-leader", label: "Team Leader", icon: UserCheck, testId: "nav-team-leader" },
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src={alteramLogo} 
                alt="Alteram Solutions" 
                className="h-8 w-auto mr-3"
              />
            </div>
            
            {/* Admin Role Navigation Buttons */}
            {user?.role === 'admin' && (
              <div className="hidden md:flex items-center space-x-2">
                {adminRoleButtons.map((button) => {
                  const Icon = button.icon;
                  const isActive = location === button.path;
                  return (
                    <Button
                      key={button.path}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => navigate(button.path)}
                      className="flex items-center space-x-1"
                      data-testid={button.testId}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{button.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}

          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Welcome,</span>
              <span className="font-medium text-foreground ml-1" data-testid="text-username">
                {user?.firstName || user?.email || 'User'}
              </span>
            </div>
            <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full" data-testid="text-user-role">
              {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
