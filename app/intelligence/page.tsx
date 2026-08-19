import { getAllDealers } from "@/lib/dealers";
import IntelligenceClient from "@/components/IntelligenceClient";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const dealers = await getAllDealers();

  return <IntelligenceClient dealers={dealers} />;
}
