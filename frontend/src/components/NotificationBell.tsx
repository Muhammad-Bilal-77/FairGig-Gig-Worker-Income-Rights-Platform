import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api, GRIEVANCE_API_BASE, getAccessToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.grievance.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const token = getAccessToken();
    if (!token) return;

    const wsUrl = new URL(`${GRIEVANCE_API_BASE}/api/grievance/ws/notifications`);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.searchParams.set("token", token);

    const ws = new WebSocket(wsUrl.toString());

    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to parse notification", err);
      }
    };

    const interval = setInterval(fetchNotifications, 60000); // 60s fallback poll
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.grievance.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center border-2 border-background animate-in zoom-in duration-300">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {unreadCount} UNREAD
          </span>
        </div>
        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-4 border-b last:border-0 hover:bg-muted/30 transition-colors flex gap-3 relative group",
                  !n.is_read && "bg-primary-soft/30"
                )}
              >
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="absolute top-4 right-4 h-6 w-6 rounded-full bg-background border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{n.sender_name}</span>{" "}
                    {n.message.replace(n.sender_name, "")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <Button variant="ghost" size="sm" className="text-[10px] h-7 w-full">
              VIEW COMMUNITY BOARD
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
