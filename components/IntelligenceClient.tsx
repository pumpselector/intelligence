"use client";

import { useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { Selection } from "@/lib/selection";
import { PumpShapeIcon } from "@/components/shapes";
import Dropdown, { DropdownOption } from "@/components/ui/Dropdown";
import IntelligenceMap from "@/components/IntelligenceMap";
import IntelligenceDetailPanel from "@/components/IntelligenceDetailPanel";

type IntelligenceClientProps = {
  dealers: Dealer[];
};

export default function IntelligenceClient({ dealers }: IntelligenceClientProps) {
  const [selection, setSelection] = useState<Selection>({ kind: "none" });

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
    () =>
      pumpTypes.map((pump) => ({
        value: pump,
        label: pump,
        prefix: <PumpShapeIcon key={pump} pumpType={pump} filled size={14} />,
      })),
    [pumpTypes]
  );

  const producerOptions: DropdownOption[] = useMemo(
    () =>
      producers.map((producer) => {
        const pumps = [
          ...new Set(dealers.filter((d) => d.uretici === producer).map((d) => d.pump).filter(hasValue)),
        ];
        return {
          value: producer,
          label: producer,
          suffix: pumps.map((p) => <PumpShapeIcon key={p} pumpType={p} filled size={12} />),
        };
      }),
    [producers, dealers]
  );

  const countryOptions: DropdownOption[] = useMemo(
    () => countries.map((country) => ({ value: country, label: country })),
    [countries]
  );

  const dealerOptions: DropdownOption[] = useMemo(
    () =>
      dealerNames.map((name) => {
        const pumps = [
          ...new Set(dealers.filter((d) => d.bayi_adi === name).map((d) => d.pump).filter(hasValue)),
        ];
        return {
          value: name,
          label: name,
          suffix: pumps.map((p) => <PumpShapeIcon key={p} pumpType={p} filled={false} size={12} />),
        };
      }),
    [dealerNames, dealers]
  );

  const visibleDealers = useMemo(() => {
    switch (selection.kind) {
      case "pump":
        return dealers.filter((d) => d.pump === selection.value);
      case "producer":
        return dealers.filter((d) => d.uretici === selection.value);
      case "country":
        return dealers.filter((d) => d.bayi_ulke === selection.value);
      case "dealer":
        return dealers.filter((d) => d.bayi_adi === selection.value);
      default:
        return dealers;
    }
  }, [dealers, selection]);

  const selectedRecordId = selection.kind === "record" ? selection.id : null;
  const selectedProducer = selection.kind === "producer" ? selection.value : null;

  return (
    <div className="min-h-screen bg-white px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Pump Industry Intelligence
          </span>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Global Coverage Explorer</h1>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dropdown
            label="Pumps"
            placeholder="Select a pump type"
            options={pumpOptions}
            value={selection.kind === "pump" ? selection.value : null}
            onChange={(value) => setSelection(value ? { kind: "pump", value } : { kind: "none" })}
          />
          <Dropdown
            label="Producers"
            placeholder="Select a manufacturer"
            options={producerOptions}
            value={selection.kind === "producer" ? selection.value : null}
            onChange={(value) => setSelection(value ? { kind: "producer", value } : { kind: "none" })}
          />
          <Dropdown
            label="Countries"
            placeholder="Select a country"
            options={countryOptions}
            value={selection.kind === "country" ? selection.value : null}
            onChange={(value) => setSelection(value ? { kind: "country", value } : { kind: "none" })}
          />
          <Dropdown
            label="Dealers"
            placeholder="Select a dealer"
            options={dealerOptions}
            value={selection.kind === "dealer" ? selection.value : null}
            onChange={(value) => setSelection(value ? { kind: "dealer", value } : { kind: "none" })}
          />
        </div>

        <IntelligenceMap
          dealers={visibleDealers}
          allPumpTypes={pumpTypes}
          selectedId={selectedRecordId}
          selectedProducer={selectedProducer}
          onDealerClick={(id) => setSelection({ kind: "record", id })}
          onProducerClick={(name) => setSelection({ kind: "producer", value: name })}
          onOverflowClick={(country) => setSelection({ kind: "country", value: country })}
        />

        <div className="mt-8">
          <IntelligenceDetailPanel selection={selection} dealers={dealers} />
        </div>
      </div>
    </div>
  );
}
