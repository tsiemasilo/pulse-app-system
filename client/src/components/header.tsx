import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.reload();
    }
  };

  const roleDisplayMap = {
    admin: "System Admin",
    hr: "HR Manager", 
    contact_center_ops_manager: "CC Ops Manager",
    contact_center_manager: "CC Manager",
    team_leader: "Team Leader",
    agent: "Agent"
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img 
              src={alteramLogo} 
              alt="Alteram Solutions" 
              className="h-8 w-auto"
            />
          </div>

          {/* Right side: Notifications and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Profile */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-username">
                  {user?.firstName || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="text-user-role">
                  {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
                </p>
              </div>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
