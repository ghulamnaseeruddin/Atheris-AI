"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  vision: boolean;
  tier: string;
}

export default function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ModelOption[]>([]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setOptions(d.models ?? []);
        // If no model selected yet, default to the first (balanced tier is sorted first-ish).
        if (!value && d.models?.length) onChange(d.models[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
      >
        {current?.name ?? "Select model"}
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 max-h-96 overflow-y-auto scrollbar-thin rounded-xl border border-border bg-bg shadow-lg z-20 p-1.5">
            {options.length === 0 && (
              <p className="text-xs text-muted px-3 py-3 text-center">Loading models…</p>
            )}
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className="w-full text-left flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-surface"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{opt.name}</div>
                  <div className="text-xs text-muted">{opt.description}</div>
                </div>
                {value === opt.id && <Check size={16} className="text-accent mt-0.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
