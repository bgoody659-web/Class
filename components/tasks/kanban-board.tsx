"use client";
import { useOptimistic } from "react";
import { deleteTask, toggleTask, updateTaskStatus } from "@/app/actions";

type Task = { id: string; title: string; status?: string | null; completed?: boolean | null };
const columns = [["todo", "📋 Por hacer"], ["in_progress", "⚙️ En progreso"], ["completed", "✅ Completada"]] as const;

export default function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const [optimisticTasks, moveTask] = useOptimistic(tasks, (state, payload: { id: string; status: string }) => state.map((task) => task.id === payload.id ? { ...task, status: payload.status, completed: payload.status === "completed" } : task));
  return <div className="grid gap-4 xl:grid-cols-3">{columns.map(([status, label]) => <section key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("task_id"); if (!id) return; moveTask({ id, status }); const fd = new FormData(); fd.set("task_id", id); fd.set("status", status); updateTaskStatus(fd); }} className="premium-card min-h-80"><h3 className="mb-4 font-semibold">{label}</h3>{optimisticTasks.filter((task) => (task.status ?? (task.completed ? "completed" : "todo")) === status).map((task) => <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("task_id", task.id)} className="mb-3 cursor-grab rounded-2xl bg-zinc-100 p-4 shadow-sm transition active:cursor-grabbing dark:bg-black/20"><form action={toggleTask}><input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="completed" value={String(status !== "completed")}/><button className="font-medium">{status === "completed" ? "✅" : "⬜"} {task.title}</button></form><form action={deleteTask} className="mt-3"><input type="hidden" name="task_id" value={task.id}/><button className="text-xs text-zinc-400 hover:text-red-500">Eliminar</button></form></article>)}<p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-400 dark:border-white/10">Arrastrá tareas acá.</p></section>)}</div>;
}
