import { LogOut, Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
import type { User } from "@shared/schema";

interface UnifiedNavbarProps {
  user: User | null;
  title?: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
  showMobileMenuButton?: boolean;
  showNotifications?: boolean;
  className?: string;
}

export default function UnifiedNavbar({
  user,
  title,
  subtitle,
  onMobileMenuToggle,
  showMobileMenuButton = false,
  showNotifications = false,
  className = "",
}: UnifiedNavbarProps) {
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
      window.location.reload();
    }
  };

  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          {showMobileMenuButton && onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden flex-shrink-0"
              onClick={onMobileMenuToggle}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Logo - Hidden on mobile when menu button is shown */}
          <div className={`flex-shrink-0 ${showMobileMenuButton ? 'hidden sm:block' : ''}`}>
            <img 
              src={alteramLogo} 
              alt="Alteram Solutions" 
              className="h-6 sm:h-8 w-auto"
            />
          </div>

          {/* Title Section */}
          {title && (
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right side - User info and actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Notifications Button */}
          {showNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="relative hidden sm:flex"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
          )}

          {/* User info and logout - Desktop */}
          {user && (
            <div className="hidden sm:flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
              <div className="flex flex-col items-end justify-center">
                <span className="text-sm font-semibold text-foreground leading-tight" data-testid="text-username">
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'}
                </span>
                <span className="text-xs text-muted-foreground leading-tight" data-testid="text-user-role">
                  {roleDisplayMap[user.role as keyof typeof roleDisplayMap] || user.role}
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
          )}

          {/* Mobile logout button */}
          {user && (
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
          )}
        </div>
      </div>
    </header>
  );
}
