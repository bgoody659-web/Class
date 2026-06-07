"use client";
import { useMemo, useState } from "react";
import { createEvent, updateEvent } from "@/app/actions";

type EventItem = { id: string; title: string; date: string };

export default function DashboardCalendar({ events, canManage = false }: { events: EventItem[]; canManage?: boolean }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const days = monthEnd.getDate();
  const cells = Array.from({ length: 42 }, (_, i) => i - startWeekday + 1);

  const byDay = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    events.forEach((e) => { const d = new Date(e.date); const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; m.set(k, [...(m.get(k) ?? []), e]); });
    return m;
  }, [events]);

  return <section className="premium-card"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Calendario</h3><div className="flex items-center gap-2"><button className="rounded-xl bg-zinc-100 px-3 py-1 dark:bg-white/10" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>←</button><p className="text-sm text-zinc-500 dark:text-zinc-300">{monthStart.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p><button className="rounded-xl bg-zinc-100 px-3 py-1 dark:bg-white/10" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>→</button></div></div><div className="mb-2 grid grid-cols-7 gap-2 text-xs text-zinc-400">{"L M X J V S D".split(" ").map((d) => <div key={d}>{d}</div>)}</div><div className="grid grid-cols-7 gap-2">{cells.map((d, idx) => { const inMonth = d >= 1 && d <= days; const date = new Date(cursor.getFullYear(), cursor.getMonth(), d); const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; const items = inMonth ? (byDay.get(k) ?? []) : []; return <button type="button" key={idx} onClick={() => { if (!inMonth) return; setSelected(date); setSelectedEvent(items[0] ?? null); }} className={`min-h-20 rounded-2xl border p-2 text-left transition ${inMonth ? "border-zinc-200 bg-zinc-50 hover:border-blue-500 dark:border-white/10 dark:bg-black/20" : "border-zinc-100 bg-zinc-50 opacity-40 dark:border-white/5 dark:bg-black/10"} ${items.length ? "ring-2 ring-blue-500/30" : ""}`}><p className="text-xs">{inMonth ? d : ""}</p>{items.length ? <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-600"/> : null}<div className="mt-1 space-y-1">{items.slice(0,2).map((e)=> <p key={e.id} className="truncate rounded bg-blue-500/10 px-1 text-[10px] text-blue-600">{e.title}</p>)}</div></button>; })}</div>{selected ? <div className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-black/20"><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold">{selected.toLocaleDateString("es-AR")}</h4><button onClick={() => { setSelected(null); setSelectedEvent(null); }} className="text-sm text-zinc-400">Cerrar</button></div>{selectedEvent ? <div className="mb-3 rounded-2xl bg-white p-3 dark:bg-white/5"><p className="font-medium">{selectedEvent.title}</p><p className="text-xs text-zinc-500">{new Date(selectedEvent.date).toLocaleString("es-AR")}</p>{canManage ? <form action={updateEvent} className="mt-3 grid gap-2"><input type="hidden" name="event_id" value={selectedEvent.id}/><input name="title" defaultValue={selectedEvent.title} className="premium-input"/><input type="datetime-local" name="date" defaultValue={new Date(selectedEvent.date).toISOString().slice(0,16)} className="premium-input"/><button className="premium-button">Guardar evento</button></form> : null}</div> : <p className="text-sm text-zinc-500">No hay eventos en este día.</p>}{canManage ? <form action={createEvent} className="grid gap-2"><input name="title" required className="premium-input" placeholder="Crear evento"/><input name="description" className="premium-input" placeholder="Descripción"/><input type="datetime-local" name="date" required defaultValue={selected.toISOString().slice(0,10) + "T09:00"} className="premium-input"/><button className="premium-button">Crear evento</button></form> : null}</div> : null}</section>;
}
