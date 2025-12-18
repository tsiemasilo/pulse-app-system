import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Check, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  ExternalLink, 
  ArrowLeft,
  Inbox,
  Filter,
  Search,
  CheckCheck,
  Clock,
  ChevronRight,
  Mail,
  MailOpen,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Notification, NotificationSeverity } from "@shared/schema";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";

type FilterType = 'all' | 'unread' | 'urgent' | 'warning' | 'info';

function getSeverityConfig(severity: NotificationSeverity) {
  switch (severity) {
    case "urgent":
      return {
        icon: AlertCircle,
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-600 dark:text-red-400",
        borderColor: "border-l-red-500",
        label: "Urgent",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-600 dark:text-yellow-400",
        borderColor: "border-l-yellow-500",
        label: "Warning",
      };
    case "info":
    default:
      return {
        icon: Info,
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-l-blue-500",
        label: "Info",
      };
  }
}

function NotificationListItem({
  notification,
  isSelected,
  onSelect,
  isRead,
}: {
  notification: Notification;
  isSelected: boolean;
  onSelect: () => void;
  isRead: boolean;
}) {
  const severityConfig = getSeverityConfig(notification.severity);
  const SeverityIcon = severityConfig.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex gap-3 p-3 cursor-pointer border-l-4 transition-all",
        severityConfig.borderColor,
        isSelected 
          ? "bg-accent" 
          : "hover-elevate",
        isRead && "opacity-70"
      )}
      data-testid={`notification-list-item-${notification.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          severityConfig.bgColor
        )}
      >
        <SeverityIcon className={cn("w-4 h-4", severityConfig.textColor)} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          {!isRead && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" data-testid={`indicator-unread-${notification.id}`} />
          )}
          <p className={cn(
            "text-sm truncate",
            isRead ? "text-muted-foreground" : "font-semibold"
          )} data-testid={`text-notification-title-${notification.id}`}>
            {notification.title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-notification-preview-${notification.id}`}>
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground" data-testid={`text-notification-time-${notification.id}`}>
          {formatDistanceToNow(new Date(notification.createdAt!), { addSuffix: true })}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
    </div>
  );
}

function NotificationDetail({
  notification,
  onMarkAsRead,
  onNavigate,
  isRead,
}: {
  notification: Notification | null;
  onMarkAsRead: (id: string) => void;
  onNavigate: (url: string) => void;
  isRead: boolean;
}) {
  if (!notification) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8" data-testid="notification-detail-empty">
        <Mail className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium" data-testid="text-empty-title">Select a notification</p>
        <p className="text-sm mt-1" data-testid="text-empty-description">Choose a notification from the list to view its details</p>
      </div>
    );
  }

  const severityConfig = getSeverityConfig(notification.severity);
  const SeverityIcon = severityConfig.icon;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid={`notification-detail-${notification.id}`}>
      <div className="p-6 border-b">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
              severityConfig.bgColor
            )}
          >
            <SeverityIcon className={cn("w-6 h-6", severityConfig.textColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={severityConfig.textColor} data-testid="badge-severity">
                {severityConfig.label}
              </Badge>
              {notification.requiresAction && (
                <Badge variant="secondary" data-testid="badge-action-required">Action Required</Badge>
              )}
              {!isRead && (
                <Badge variant="default" data-testid="badge-unread">Unread</Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold" data-testid="text-detail-title">{notification.title}</h2>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-detail-date">
              {format(new Date(notification.createdAt!), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-base leading-relaxed whitespace-pre-wrap" data-testid="text-detail-body">
              {notification.body}
            </p>
          </div>

          {notification.metadata && typeof notification.metadata === 'object' && Object.keys(notification.metadata).length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-3">Additional Details</h4>
              <dl className="space-y-2 text-sm">
                {Object.keys(notification.metadata).map((key) => {
                  const metadataObj = notification.metadata as Record<string, string | number | boolean | null | undefined>;
                  const rawValue = metadataObj[key];
                  const displayValue = rawValue === null || rawValue === undefined ? 'N/A' : String(rawValue);
                  const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="flex gap-2">
                      <dt className="text-muted-foreground capitalize min-w-[120px]">
                        {displayKey}:
                      </dt>
                      <dd className="font-medium">
                        {displayValue}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex items-center gap-2">
        {!isRead && (
          <Button
            variant="outline"
            onClick={() => onMarkAsRead(notification.id)}
            data-testid="button-mark-read-detail"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark as Read
          </Button>
        )}
        {notification.actionUrl && (
          <Button
            onClick={() => onNavigate(notification.actionUrl!)}
            data-testid="button-view-action"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data: notifications = [], isLoading } = useNotifications(100, 0);
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isAuthLoading, toast]);

  const getBackUrl = () => {
    if (!user?.role) return "/";
    switch (user.role) {
      case 'admin': return "/admin";
      case 'hr': return "/hr";
      case 'contact_center_ops_manager':
      case 'contact_center_manager': return "/contact-center";
      case 'team_leader': return "/team-leader";
      default: return "/";
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term)
      );
    }

    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.readAt && !locallyReadIds.has(n.id));
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.severity === 'urgent');
        break;
      case 'warning':
        filtered = filtered.filter(n => n.severity === 'warning');
        break;
      case 'info':
        filtered = filtered.filter(n => n.severity === 'info');
        break;
    }

    return filtered;
  }, [notifications, activeFilter, searchTerm, locallyReadIds]);

  const selectedNotification = useMemo(() => {
    return notifications.find(n => n.id === selectedId) || null;
  }, [notifications, selectedId]);

  const handleSelect = (notification: Notification) => {
    setSelectedId(notification.id);
    if (!notification.readAt && !locallyReadIds.has(notification.id)) {
      setLocallyReadIds(prev => new Set(prev).add(notification.id));
      markAsRead.mutate(notification.id);
    }
  };

  const handleMarkAsRead = (id: string) => {
    setLocallyReadIds(prev => new Set(prev).add(id));
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setLocallyReadIds(allIds);
    markAllAsRead.mutate();
  };

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  const isNotificationRead = (notification: Notification) => {
    return !!notification.readAt || locallyReadIds.has(notification.id);
  };

  const filterItems: { id: FilterType; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: 'all', label: 'All Notifications', icon: Inbox, count: notifications.length },
    { id: 'unread', label: 'Unread', icon: Mail, count: unreadCount },
    { id: 'urgent', label: 'Urgent', icon: AlertCircle, count: notifications.filter(n => n.severity === 'urgent').length },
    { id: 'warning', label: 'Warnings', icon: AlertTriangle, count: notifications.filter(n => n.severity === 'warning').length },
    { id: 'info', label: 'Info', icon: Info, count: notifications.filter(n => n.severity === 'info').length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(getBackUrl())}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img 
              src={alteramLogo} 
              alt="Alteram Solutions" 
              className="h-10 w-auto"
            />
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="heading-notifications">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" data-testid="badge-unread-count">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
              <div className="flex flex-col items-end justify-center">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.username || 'User'}
                </span>
                <span className="text-xs text-muted-foreground leading-tight capitalize">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 border-r flex flex-col bg-muted/30">
          <div className="p-3">
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-1">
              {filterItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveFilter(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      activeFilter === item.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover-elevate"
                    )}
                    data-testid={`filter-${item.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-xs opacity-70">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-notifications"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="notifications-loading">
                <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="notifications-empty">
                <MailOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium" data-testid="text-empty-state">No notifications</p>
                <p className="text-xs mt-1" data-testid="text-empty-hint">
                  {activeFilter !== 'all' 
                    ? "Try changing your filter" 
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <NotificationListItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedId === notification.id}
                    onSelect={() => handleSelect(notification)}
                    isRead={isNotificationRead(notification)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t text-center text-xs text-muted-foreground" data-testid="text-notification-count">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </div>
        </div>

        <NotificationDetail
          notification={selectedNotification}
          onMarkAsRead={handleMarkAsRead}
          onNavigate={handleNavigate}
          isRead={selectedNotification ? isNotificationRead(selectedNotification) : false}
        />
      </div>
    </div>
  );
}
