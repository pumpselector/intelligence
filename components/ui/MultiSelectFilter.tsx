"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectFilterProps = {
  /** Facet name, always shown in the trigger (e.g. "Manufacturer"). */
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional swatch color per option — used for the Manufacturer filter. */
  chipColor?: (value: string) => string;
  /** Border/background/text classes applied to the trigger while it has a selection — lets each filter carry its own pastel accent. */
  activeClassName?: string;
};

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  chipColor,
  activeClassName = "border-indigo-200 bg-indigo-50/60 text-slate-900",
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

  const active = selected.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
          active ? activeClassName : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {chipColor && selected.length === 1 && (
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: chipColor(selected[0]) }} />
          )}
          <span className={`shrink-0 ${active ? "text-slate-500" : ""}`}>{label}</span>
          {active && (
            <span className="truncate font-medium text-slate-900">
              {selected.length === 1 ? selected[0] : `${selected[0]} +${selected.length - 1}`}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M5.25 7.5 10 12.25 14.75 7.5Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full min-w-[240px] rounded-md border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filteredOptions.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No matches</li>}
            {filteredOptions.map((option) => (
              <li key={option}>
                <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
