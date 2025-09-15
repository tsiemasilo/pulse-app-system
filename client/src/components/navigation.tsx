import { Heart, LogOut, Shield, Users, Headphones, UserCheck, Clock, Bell, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    <>
      {/* Sidebar Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold pulse-logo">Pulse</span>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <div className="flex-1 py-4">
        <SidebarMenu>
          {user?.role === 'admin' && (
            adminRoleButtons.map((button) => {
              const Icon = button.icon;
              const isActive = location === button.path;
              return (
                <SidebarMenuItem key={button.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    data-testid={button.testId}
                  >
                    <button
                      onClick={() => navigate(button.path)}
                      className="w-full flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{button.label}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </div>

      {/* Notification Tab */}
      <div className="px-2 mb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="w-full flex items-center gap-2" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                <Badge variant="secondary" className="ml-auto h-5 min-w-5 flex items-center justify-center rounded-full px-1 text-xs">3</Badge>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      {/* Profile Section at Bottom */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-username">
                {user?.firstName || user?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-user-role">
                {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
