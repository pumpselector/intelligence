"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectFilterProps = {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional swatch color per option/chip — used for the Producers filter. */
  chipColor?: (value: string) => string;
};

export default function MultiSelectFilter({
  label,
  placeholder,
  options,
  selected,
  onChange,
  chipColor,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-slate-500">{label}</span>

      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <span
              key={value}
              className="flex max-w-full items-center gap-1 rounded-full border border-slate-300 bg-slate-100 py-0.5 pl-2 pr-1 text-xs text-slate-700"
            >
              {chipColor && (
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: chipColor(value) }} />
              )}
              <span className="max-w-[8rem] truncate">{value}</span>
              <button
                type="button"
                onClick={() => remove(value)}
                title={`Remove ${value}`}
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-300 hover:text-slate-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-slate-400"
      >
        <span className={selected.length > 0 ? "truncate text-slate-900" : "truncate text-slate-500"}>
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M5.25 7.5 10 12.25 14.75 7.5Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-md border border-slate-300 bg-white shadow-xl shadow-slate-300/40">
          <div className="border-b border-slate-200 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filteredOptions.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No matches</li>}
            {filteredOptions.map((option) => (
              <li key={option}>
                <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-900 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                  />
                  {chipColor && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: chipColor(option) }} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
