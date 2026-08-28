import { getAllDealers } from "@/lib/dealers";
import { getAccess, hasFullAccess } from "@/lib/access";
import { maskDealer } from "@/lib/mask";
import AccessBanner from "@/components/AccessBanner";
import IntelligenceClient from "@/components/IntelligenceClient";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const [dealers, access] = await Promise.all([getAllDealers(), getAccess()]);

  const restricted = !hasFullAccess(access.level);

  // Mask on the server BEFORE handing rows to the client — real values are never
  // serialized into the RSC payload for restricted users. maskDealer also
  // attaches opaque identity tokens so the client's unique counts stay correct.
  const rows = restricted ? dealers.map(maskDealer) : dealers;

  return (
    <>
      <AccessBanner level={access.level} emailVerified={access.emailVerified} />
      <IntelligenceClient dealers={rows} restricted={restricted} />
    </>
  );
}
