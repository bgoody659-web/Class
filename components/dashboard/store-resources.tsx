import { createBookmark, createQuickAccess, deleteBookmark, deleteQuickAccess } from "@/app/actions";

type BookmarkRow = { id: string; title: string; type?: string | null; url?: string | null; content?: string | null; icon?: string | null };
type QuickAccessRow = { id: string; label: string; destination: string; icon?: string | null };

const bookmarkTypeLabel: Record<string, string> = { link: "Link", file: "Archivo", image: "Imagen", note: "Nota" };

export default function StoreResources({ bookmarks, quickAccess, canManage }: { bookmarks: BookmarkRow[]; quickAccess: QuickAccessRow[]; canManage: boolean }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="premium-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">🔖 Bookmarks de tienda</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Links, archivos, imágenes y notas importantes de esta tienda.</p>
          </div>
          <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600">{bookmarks.length}</span>
        </div>
        <form action={createBookmark} className="mb-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
            <input name="title" required className="premium-input" placeholder="Ej: Menú PDF" />
            <select name="type" className="premium-input"><option value="link">Link</option><option value="file">Archivo</option><option value="image">Imagen</option><option value="note">Nota</option></select>
          </div>
          <input name="url" className="premium-input" placeholder="URL / recurso" />
          <textarea name="content" className="premium-input" placeholder="Nota interna opcional" />
          <button className="premium-button w-full">Guardar bookmark</button>
        </form>
        <div className="grid gap-2">
          {bookmarks.length === 0 ? <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-black/20">Sin bookmarks para esta tienda.</p> : null}
          {bookmarks.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl bg-zinc-100 p-3 dark:bg-black/20 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.icon ?? "🔖"} {item.title}</p><p className="break-all text-xs text-zinc-500">{bookmarkTypeLabel[item.type ?? "link"] ?? "Recurso"}{item.url ? ` · ${item.url}` : ""}</p></div><form action={deleteBookmark}><input type="hidden" name="bookmark_id" value={item.id} /><button className="min-h-10 w-full rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 sm:w-auto">Eliminar</button></form></div>)}
        </div>
      </article>
      <article className="premium-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">⚡ Accesos rápidos</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Atajos operativos como Instagram, WhatsApp, Maps, web o delivery.</p>
          </div>
          <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">{quickAccess.length}</span>
        </div>
        {canManage ? <form action={createQuickAccess} className="mb-4 grid gap-3"><div className="grid gap-3 md:grid-cols-[120px_1fr]"><input name="icon" className="premium-input" placeholder="Icono" defaultValue="⚡" /><input name="label" required className="premium-input" placeholder="WhatsApp" /></div><input name="destination" required className="premium-input" placeholder="https://..." /><button className="premium-button w-full">Crear acceso rápido</button></form> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {quickAccess.length === 0 ? <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-black/20">Sin accesos rápidos configurados.</p> : null}
          {quickAccess.map((item) => <div key={item.id} className="rounded-2xl bg-zinc-100 p-3 dark:bg-black/20"><a href={item.destination} target="_blank" rel="noreferrer" className="block break-all font-medium text-blue-600">{item.icon ?? "⚡"} {item.label}</a>{canManage ? <form action={deleteQuickAccess} className="mt-2"><input type="hidden" name="quick_access_id" value={item.id} /><button className="min-h-10 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">Eliminar</button></form> : null}</div>)}
        </div>
      </article>
    </section>
  );
}
