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
          <div className="flex items-center">
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg px-4 py-2 border border-border">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-foreground" data-testid="text-username">
                  {user?.firstName || user?.email || 'User'}
                </span>
                <span className="text-xs text-muted-foreground" data-testid="text-user-role">
                  {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
                </span>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
