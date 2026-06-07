"use client";
import { Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

export default function AvatarUpload({ name, initialValue, label }: { name: string; initialValue?: string | null; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue ?? "");

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setValue(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 ring-1 ring-black/5 dark:ring-white/10">
          {value ? <img src={value} alt="Preview" className="h-full w-full object-cover" /> : <span className="text-2xl text-blue-500">◌</span>}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Subí una imagen desde tu dispositivo. Se previsualiza antes de guardar.</p>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm text-white shadow-lg shadow-blue-600/20"><Upload className="h-4 w-4" /> Subir</button>
            <button type="button" onClick={() => setValue("")} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-white/10"><X className="h-4 w-4" /> Quitar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
