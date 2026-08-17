"use client";

import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import { Dealer, hasValue } from "@/lib/dealers";
import { Selection } from "@/lib/selection";
import { filterDealersByTop } from "@/lib/selectionFilter";
import { getProducerColor } from "@/lib/producerColor";

const WIDTH = 640;
const HEIGHT = 440;
const NODE_WIDTH = 12;

type NodeLayer = "producer" | "country" | "dealer";

type NodeExtra = {
  id: string;
  label: string;
  layer: NodeLayer;
};

type LinkExtra = {
  producer: string;
};

type SankeyNode = SankeyNodeMinimal<NodeExtra, LinkExtra> & NodeExtra;
type SankeyLinkDatum = SankeyLinkMinimal<NodeExtra, LinkExtra> & LinkExtra;

function buildGraph(rows: Dealer[]) {
  const pcLinks = new Map<string, { producer: string; country: string; value: number }>();
  const cdLinks = new Map<string, { producer: string; country: string; dealer: string; value: number }>();

  for (const row of rows) {
    if (!hasValue(row.uretici) || !hasValue(row.bayi_ulke) || !hasValue(row.bayi_adi)) continue;

    const pcKey = `${row.uretici}|${row.bayi_ulke}`;
    const pc = pcLinks.get(pcKey);
    if (pc) pc.value += 1;
    else pcLinks.set(pcKey, { producer: row.uretici, country: row.bayi_ulke, value: 1 });

    const cdKey = `${row.uretici}|${row.bayi_ulke}|${row.bayi_adi}`;
    const cd = cdLinks.get(cdKey);
    if (cd) cd.value += 1;
    else cdLinks.set(cdKey, { producer: row.uretici, country: row.bayi_ulke, dealer: row.bayi_adi, value: 1 });
  }

  if (pcLinks.size === 0) return null;

  const nodeIndex = new Map<string, number>();
  const nodes: SankeyNode[] = [];

  function nodeFor(id: string, label: string, layer: NodeLayer): number {
    let idx = nodeIndex.get(id);
    if (idx == null) {
      idx = nodes.length;
      nodeIndex.set(id, idx);
      nodes.push({ id, label, layer } as SankeyNode);
    }
    return idx;
  }

  const links: SankeyLinkDatum[] = [];

  for (const l of pcLinks.values()) {
    const source = nodeFor(`p:${l.producer}`, l.producer, "producer");
    const target = nodeFor(`c:${l.country}`, l.country, "country");
    links.push({ source, target, value: l.value, producer: l.producer } as SankeyLinkDatum);
  }
  for (const l of cdLinks.values()) {
    const source = nodeFor(`c:${l.country}`, l.country, "country");
    const target = nodeFor(`d:${l.dealer}`, l.dealer, "dealer");
    links.push({ source, target, value: l.value, producer: l.producer } as SankeyLinkDatum);
  }

  // Color each country/dealer node by whichever producer contributes the most flow to it.
  const dominantProducer = new Map<number, { producer: string; value: number }>();
  for (const link of links) {
    const targetIdx = link.target as number;
    const current = dominantProducer.get(targetIdx);
    if (!current || link.value > current.value) {
      dominantProducer.set(targetIdx, { producer: link.producer, value: link.value });
    }
  }

  const nodeColors = nodes.map((n, i) => {
    if (n.layer === "producer") return getProducerColor(n.label);
    const dominant = dominantProducer.get(i);
    return dominant ? getProducerColor(dominant.producer) : "#64748b";
  });

  const sankeyGenerator = sankey<NodeExtra, LinkExtra>()
    .nodeId((d) => (d as SankeyNode).id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(10)
    .extent([
      [1, 10],
      [WIDTH - 1, HEIGHT - 10],
    ]);

  const graph = sankeyGenerator({ nodes, links });
  return { ...graph, nodeColors };
}

type IntelligenceSankeyProps = {
  dealers: Dealer[];
  selection: Selection;
};

export default function IntelligenceSankey({ dealers, selection }: IntelligenceSankeyProps) {
  const rows = useMemo(() => filterDealersByTop(dealers, selection.top), [dealers, selection.top]);
  const graph = useMemo(() => buildGraph(rows), [rows]);

  if (selection.top.kind === "none" || !graph) return null;

  const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
        Manufacturer → Country → Dealer flow
      </h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-w-[520px]" role="img">
          <g>
            {graph.links.map((link, i) => {
              const d = linkPath(link as never);
              if (!d) return null;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={getProducerColor((link as SankeyLinkDatum).producer)}
                  strokeOpacity={0.25}
                  strokeWidth={Math.max(1, link.width ?? 0)}
                />
              );
            })}
          </g>
          <g>
            {graph.nodes.map((node, i) => {
              const x0 = node.x0 ?? 0;
              const x1 = node.x1 ?? 0;
              const y0 = node.y0 ?? 0;
              const y1 = node.y1 ?? 0;
              const isRight = (node.layer as NodeLayer) === "dealer";
              return (
                <g key={node.id}>
                  <rect
                    x={x0}
                    y={y0}
                    width={Math.max(1, x1 - x0)}
                    height={Math.max(1, y1 - y0)}
                    fill={graph.nodeColors[i]}
                    rx={2}
                  />
                  <title>{`${node.label} (${node.value ?? 0})`}</title>
                  <text
                    x={isRight ? x0 - 6 : x1 + 6}
                    y={(y0 + y1) / 2}
                    dominantBaseline="middle"
                    textAnchor={isRight ? "end" : "start"}
                    style={{ fontSize: 9, fill: "#334155" }}
                  >
                    {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
