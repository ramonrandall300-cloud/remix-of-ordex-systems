import { Bell, Check, CheckCheck, Trash2, FlaskConical, Users, CreditCard, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ReactNode> = {
  job_complete: <FlaskConical className="w-4 h-4 text-green-400" />,
  job_failed: <FlaskConical className="w-4 h-4 text-destructive" />,
  invite: <Users className="w-4 h-4 text-blue-400" />,
  credit: <CreditCard className="w-4 h-4 text-yellow-400" />,
  system: <Info className="w-4 h-4 text-muted-foreground" />,
};

function NotificationItem({ n, onRead, onDelete }: { n: Notification; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={cn("flex items-start gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors", !n.read && "bg-primary/5")}>
      <div className="mt-0.5">{typeIcons[n.type] ?? typeIcons.system}</div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-tight", !n.read ? "text-foreground font-medium" : "text-muted-foreground")}>{n.title}</p>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!n.read && (
          <button onClick={() => onRead(n.id)} className="text-muted-foreground hover:text-primary p-1" title="Mark read">
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDelete(n.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationsDropdown() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground" title="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} n={n} onRead={(id) => markRead.mutate(id)} onDelete={(id) => deleteNotification.mutate(id)} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
