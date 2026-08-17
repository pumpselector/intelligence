import { Dealer } from "./dealers";
import { TopSelection } from "./selection";

/**
 * Which dealer rows match a given top-level filter. Shared by IntelligenceMap
 * (which additionally requires geocoded coordinates for rendering) and
 * IntelligenceSankey (which doesn't care about coordinates at all), so the
 * two views can't silently drift on what "producer selected" etc. means.
 */
export function filterDealersByTop(dealers: Dealer[], top: TopSelection): Dealer[] {
  switch (top.kind) {
    case "none":
      return [];
    case "producer":
      return dealers.filter((d) => d.uretici === top.value);
    case "country":
      return dealers.filter((d) => d.bayi_ulke === top.value);
    case "pump":
      return dealers.filter((d) => d.pump === top.value);
    case "dealer":
      return dealers.filter((d) => d.bayi_adi === top.value);
  }
}
