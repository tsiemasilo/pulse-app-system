import { LogOut, Shield, Users, Headphones, UserCheck, Clock, Menu, X, Network } from "lucide-react";
import { useState } from "react";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import NotificationBell from "@/components/notification-bell";
import type { User } from "@shared/schema";

interface NavigationProps {
  user: User | null;
}

export default function Navigation({ user }: NavigationProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    { path: "/admin/organogram", label: "Organogram", icon: Network, testId: "nav-organogram" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src={alteramLogo} 
                alt="Alteram Solutions" 
                className="h-6 sm:h-8 w-auto"
              />
            </div>
            
            {/* Admin Role Navigation Buttons - Desktop */}
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
                      className="flex items-center space-x-1 transition-all duration-200"
                      data-testid={button.testId}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{button.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Mobile menu button */}
            {user?.role === 'admin' && (
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <div className="hidden sm:flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
              <div className="flex flex-col items-end justify-center">
                <span className="text-sm font-semibold text-foreground leading-tight" data-testid="text-username">
                  {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'}
                </span>
                <span className="text-xs text-muted-foreground leading-tight" data-testid="text-user-role">
                  {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
                </span>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
            
            {/* Mobile logout button */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="p-2"
                data-testid="button-logout-mobile"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {user?.role === 'admin' && mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-3 space-y-1">
            {adminRoleButtons.map((button) => {
              const Icon = button.icon;
              const isActive = location === button.path;
              return (
                <Button
                  key={button.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    navigate(button.path);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start space-x-2 transition-all duration-200"
                  data-testid={`${button.testId}-mobile`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{button.label}</span>
                </Button>
              );
            })}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
