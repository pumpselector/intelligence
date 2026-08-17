"use client";

import { useEffect, useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { EMPTY_SELECTION, Selection, TopSelection } from "@/lib/selection";
import { getProducerColor } from "@/lib/producerColor";
import Dropdown, { DropdownOption } from "@/components/ui/Dropdown";
import IntelligenceMap from "@/components/IntelligenceMap";
import IntelligenceDetailPanel from "@/components/IntelligenceDetailPanel";
import IntelligenceSankey from "@/components/IntelligenceSankey";

type IntelligenceClientProps = {
  dealers: Dealer[];
};

export default function IntelligenceClient({ dealers }: IntelligenceClientProps) {
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelView, setPanelView] = useState<"list" | "sankey">("list");

  const selectTop = (top: TopSelection) => setSelection({ top, recordId: null });
  const selectRecord = (id: number) => setSelection((prev) => ({ top: prev.top, recordId: id }));

  const hasActiveFilter = selection.top.kind !== "none";

  useEffect(() => {
    if (!hasActiveFilter) setPanelView("list");
  }, [hasActiveFilter]);

  useEffect(() => {
    if (!isFullscreen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFullscreen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const pumpTypes = useMemo(
    () => [...new Set(dealers.map((d) => d.pump).filter(hasValue))].sort(),
    [dealers]
  );
  const producers = useMemo(
    () => [...new Set(dealers.map((d) => d.uretici).filter(hasValue))].sort(),
    [dealers]
  );
  const countries = useMemo(
    () => [...new Set(dealers.map((d) => d.bayi_ulke).filter(hasValue))].sort(),
    [dealers]
  );
  const dealerNames = useMemo(
    () => [...new Set(dealers.map((d) => d.bayi_adi).filter(hasValue))].sort(),
    [dealers]
  );

  const pumpOptions: DropdownOption[] = useMemo(
    () => pumpTypes.map((pump) => ({ value: pump, label: pump })),
    [pumpTypes]
  );

  const producerOptions: DropdownOption[] = useMemo(
    () =>
      producers.map((producer) => ({
        value: producer,
        label: producer,
        prefix: (
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: getProducerColor(producer) }}
          />
        ),
      })),
    [producers]
  );

  const countryOptions: DropdownOption[] = useMemo(
    () => countries.map((country) => ({ value: country, label: country })),
    [countries]
  );

  const dealerOptions: DropdownOption[] = useMemo(
    () =>
      dealerNames.map((name) => {
        const producer = dealers.find((d) => d.bayi_adi === name && hasValue(d.uretici))?.uretici;
        return {
          value: name,
          label: name,
          prefix: producer ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getProducerColor(producer) }}
            />
          ) : undefined,
        };
      }),
    [dealerNames, dealers]
  );

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : "min-h-screen bg-white px-6 py-10 lg:px-8"}>
      <div className={isFullscreen ? "flex h-full flex-col" : "mx-auto max-w-7xl"}>
        {!isFullscreen && (
          <div className="mb-6">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Pump Industry Intelligence
            </span>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Global Coverage Explorer</h1>
          </div>
        )}

        <div
          className={
            isFullscreen
              ? "grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[65%_35%]"
              : "grid grid-cols-1 gap-6 lg:grid-cols-[65%_35%] lg:items-start"
          }
        >
          <IntelligenceMap
            dealers={dealers}
            selection={selection}
            onDealerClick={selectRecord}
            onProducerClick={(name) => selectTop({ kind: "producer", value: name })}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          />

          <div
            className={
              isFullscreen
                ? "flex h-full flex-col gap-5 overflow-y-auto lg:pr-1"
                : "flex flex-col gap-5 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1"
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Dropdown
                label="Pumps"
                placeholder="Select a pump type"
                options={pumpOptions}
                value={selection.top.kind === "pump" ? selection.top.value : null}
                onChange={(value) => selectTop(value ? { kind: "pump", value } : { kind: "none" })}
              />
              <Dropdown
                label="Producers"
                placeholder="Select a manufacturer"
                options={producerOptions}
                value={selection.top.kind === "producer" ? selection.top.value : null}
                onChange={(value) => selectTop(value ? { kind: "producer", value } : { kind: "none" })}
              />
              <Dropdown
                label="Countries"
                placeholder="Select a country"
                options={countryOptions}
                value={selection.top.kind === "country" ? selection.top.value : null}
                onChange={(value) => selectTop(value ? { kind: "country", value } : { kind: "none" })}
              />
              <Dropdown
                label="Dealers"
                placeholder="Select a dealer"
                options={dealerOptions}
                value={selection.top.kind === "dealer" ? selection.top.value : null}
                onChange={(value) => selectTop(value ? { kind: "dealer", value } : { kind: "none" })}
              />
            </div>

            {hasActiveFilter && (
              <div className="flex gap-1.5 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setPanelView("list")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    panelView === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setPanelView("sankey")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    panelView === "sankey" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Flow
                </button>
              </div>
            )}

            {hasActiveFilter && panelView === "sankey" ? (
              <IntelligenceSankey dealers={dealers} selection={selection} />
            ) : (
              <IntelligenceDetailPanel
                selection={selection}
                dealers={dealers}
                onSelectRecord={selectRecord}
                onSelectProducer={(name) => selectTop({ kind: "producer", value: name })}
                onBack={() =>
                  setSelection((prev) => (prev.recordId != null ? { top: prev.top, recordId: null } : EMPTY_SELECTION))
                }
                onReset={() => setSelection(EMPTY_SELECTION)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
