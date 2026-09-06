"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, Info, UserPlus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDateTimeBR } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  APPOINTMENT_TODAY: CalendarClock,
  APPOINTMENT_REMINDER: CalendarClock,
  PAYMENT_PENDING: Wallet,
  NEW_PATIENT: UserPlus,
  GENERIC: Info,
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/notifications?limit=100");
    const data = await res.json();
    setItems(data.notifications ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  async function handleClick(item: NotificationItem) {
    if (!item.read) await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    if (item.link) router.push(item.link);
    else load();
  }

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Você está em dia."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </span>
          <p className="font-medium">Nenhuma notificação por aqui</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = ICONS[item.type] ?? Info;
            return (
              <Card
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 p-4 transition-colors hover:border-primary/40",
                  !item.read && "bg-primary/5"
                )}
                onClick={() => handleClick(item)}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeBR(item.createdAt)}</p>
                </div>
                {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
