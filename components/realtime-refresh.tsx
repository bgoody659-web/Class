"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const realtimeTables = [
  "stores",
  "employees",
  "tasks",
  "stock_products",
  "stock_movements",
  "accounting_records",
  "events",
  "reports",
  "purchase_orders",
  "purchase_order_items",
  "bookmarks",
  "quick_access_links",
  "daily_checklists",
  "daily_checklist_run_items",
  "employee_schedules",
  "employee_schedule_requests"
];

export default function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    const supabase = createClient(url, anon);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase.channel("class-store-realtime");
    realtimeTables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
