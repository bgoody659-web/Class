"use client";
import { useEffect, useState } from "react";

export default function OrderViewToggle() {
  const [mode, setMode] = useState("cards");
  useEffect(() => setMode(localStorage.getItem("class_order_view") ?? "cards"), []);
  useEffect(() => { localStorage.setItem("class_order_view", mode); document.documentElement.dataset.orderView = mode; }, [mode]);
  return <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-white/5"><button onClick={() => setMode("cards")} className={`rounded-xl px-3 py-2 text-sm ${mode === "cards" ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300"}`}>Tarjetas</button><button onClick={() => setMode("list")} className={`rounded-xl px-3 py-2 text-sm ${mode === "list" ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300"}`}>Lista</button></div>;
}
