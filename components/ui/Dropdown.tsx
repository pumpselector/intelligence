"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export type DropdownOption = {
  value: string;
  label: string;
  prefix?: ReactNode;
  suffix?: ReactNode[];
};

type DropdownProps = {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string | null) => void;
};

export default function Dropdown({ label, placeholder, options, value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-slate-500">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:border-slate-500"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.prefix}
          <span className={`truncate ${selected ? "text-slate-100" : "text-slate-500"}`}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.suffix && selected.suffix.length > 0 && (
            <span className="flex shrink-0 items-center gap-1">{selected.suffix}</span>
          )}
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
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40">
          <li>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 ${
                value === null ? "bg-slate-800/70" : ""
              }`}
            >
              — All —
            </button>
          </li>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800 ${
                  value === option.value ? "bg-slate-800/70" : ""
                }`}
              >
                {option.prefix}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.suffix && option.suffix.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1">{option.suffix}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
