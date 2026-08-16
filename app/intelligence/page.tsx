import { getAllDealers } from "@/lib/dealers";
import IntelligenceClient from "@/components/IntelligenceClient";

export default async function IntelligencePage() {
  const dealers = await getAllDealers();

  return <IntelligenceClient dealers={dealers} />;
}
