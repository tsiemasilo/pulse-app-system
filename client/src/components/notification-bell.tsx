import { useState } from "react";
import { Bell, Check, AlertTriangle, Info, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { Notification, NotificationSeverity } from "@shared/schema";

function getSeverityConfig(severity: NotificationSeverity) {
  switch (severity) {
    case "urgent":
      return {
        icon: AlertCircle,
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-600 dark:text-red-400",
        borderColor: "border-l-red-500",
        badgeVariant: "destructive" as const,
      };
    case "warning":
      return {
        icon: AlertTriangle,
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-600 dark:text-yellow-400",
        borderColor: "border-l-yellow-500",
        badgeVariant: "secondary" as const,
      };
    case "info":
    default:
      return {
        icon: Info,
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-l-blue-500",
        badgeVariant: "outline" as const,
      };
  }
}

function getActionLabel(subjectType: string, requiresAction?: boolean): string {
  switch (subjectType) {
    case "transfer":
      return requiresAction ? "Review Transfer Request" : "View Transfers";
    case "termination":
      return "View Terminations";
    case "asset":
      return requiresAction ? "Review Asset Status" : "View Assets";
    case "system":
      return "View Details";
    default:
      return "View Details";
  }
}

interface MetadataRecord {
  targetUserName?: string;
  transferType?: string;
  statusType?: string;
  assetType?: string;
  [key: string]: unknown;
}

function MetadataDetails({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return null;
  
  const meta = metadata as MetadataRecord;
  const hasDetails = meta.targetUserName || meta.transferType || meta.statusType || meta.assetType;
  
  if (!hasDetails) return null;
  
  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      {meta.targetUserName && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Agent:</span> {String(meta.targetUserName)}
        </p>
      )}
      {meta.transferType && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Type:</span> {String(meta.transferType)}
        </p>
      )}
      {meta.statusType && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Status:</span> {String(meta.statusType)}
        </p>
      )}
      {meta.assetType && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Asset:</span> {String(meta.assetType)}
        </p>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  isExpanded,
  onToggleExpand,
  onMarkAsRead,
  onNavigate,
  locallyReadIds,
}: {
  notification: Notification;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onNavigate: (url: string) => void;
  locallyReadIds: Set<string>;
}) {
  const severityConfig = getSeverityConfig(notification.severity);
  const SeverityIcon = severityConfig.icon;
  // Check both server state and local optimistic state
  const isRead = !!notification.readAt || locallyReadIds.has(notification.id);
  const actionLabel = getActionLabel(notification.subjectType, notification.requiresAction);

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark as read when expanding (if not already read)
    if (!isRead && !isExpanded) {
      onMarkAsRead(notification.id);
    }
    
    onToggleExpand(notification.id);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
    }
  };

  return (
    <div
      className={cn(
        "border-l-4 transition-all duration-200",
        severityConfig.borderColor,
        isRead ? "opacity-70" : "",
      )}
      data-testid={`notification-item-${notification.id}`}
    >
      {/* Header - Always visible, clickable to expand */}
      <div
        onClick={handleHeaderClick}
        className={cn(
          "flex gap-3 p-3 cursor-pointer hover-elevate",
        )}
        data-testid={`notification-header-${notification.id}`}
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            severityConfig.bgColor
          )}
        >
          <SeverityIcon className={cn("w-4 h-4", severityConfig.textColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                isRead ? "text-muted-foreground" : "text-foreground",
                !isExpanded && "truncate"
              )}
            >
              {notification.title}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isRead && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-notification-preview-${notification.id}`}>
              {notification.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {notification.createdAt
              ? formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })
              : ""}
          </p>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div 
          className="px-3 pb-3 pt-0 ml-11 space-y-3"
          data-testid={`notification-expanded-${notification.id}`}
        >
          {/* Full message body */}
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {notification.body}
            </p>
            
            <MetadataDetails metadata={notification.metadata} />
          </div>

          {/* Timestamp details */}
          <p className="text-xs text-muted-foreground">
            {notification.createdAt
              ? format(new Date(notification.createdAt), "PPpp")
              : ""}
          </p>

          {/* Action button */}
          {notification.actionUrl && (
            <Button
              size="sm"
              onClick={handleActionClick}
              className="w-full"
              data-testid={`notification-action-${notification.id}`}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              {actionLabel}
            </Button>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={severityConfig.badgeVariant} className="text-xs">
              {notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)}
            </Badge>
            {notification.requiresAction && (
              <Badge variant="outline" className="text-xs">
                Action Required
              </Badge>
            )}
            {isRead && (
              <Badge variant="secondary" className="text-xs">
                Read
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const { data: notifications = [], isLoading: isLoadingNotifications } =
    useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Calculate unread count including optimistic updates
  const serverUnreadCount = unreadData?.count ?? 0;
  const optimisticReadsCount = Array.from(locallyReadIds).filter(
    id => notifications.some(n => n.id === id && !n.readAt)
  ).length;
  const unreadCount = Math.max(0, serverUnreadCount - optimisticReadsCount);

  const handleMarkAsRead = (notificationId: string) => {
    // Optimistically mark as read locally
    setLocallyReadIds(prev => new Set(prev).add(notificationId));
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    // Optimistically mark all as read locally
    const allIds = new Set(notifications.map(n => n.id));
    setLocallyReadIds(allIds);
    markAllAsRead.mutate();
  };

  const handleToggleExpand = (notificationId: string) => {
    setExpandedId(prev => prev === notificationId ? null : notificationId);
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    setOpen(false);
    setExpandedId(null);
  };

  // Reset expanded state when dropdown closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setExpandedId(null);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 p-0 z-[100]"
        sideOffset={8}
        data-testid="dropdown-notifications"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
              className="text-xs"
              data-testid="button-mark-all-read"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[28rem]">
          {isLoadingNotifications ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center" data-testid="empty-notifications">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isExpanded={expandedId === notification.id}
                  onToggleExpand={handleToggleExpand}
                  onMarkAsRead={handleMarkAsRead}
                  onNavigate={handleNavigate}
                  locallyReadIds={locallyReadIds}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            data-testid="button-view-all-notifications"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
