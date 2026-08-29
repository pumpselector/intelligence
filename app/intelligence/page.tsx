import { getAllDealers } from "@/lib/dealers";
import { getAccess, hasFullAccess } from "@/lib/access";
import { maskDealer } from "@/lib/mask";
import AccessBanner from "@/components/AccessBanner";
import IntelligenceClient from "@/components/IntelligenceClient";

// This page is still rendered per request — `getAccess()` reads the session, so
// the masking is always the current viewer's. We deliberately don't set
// `force-dynamic`: it also forces `fetchCache: "force-no-store"`, which would
// disable the `unstable_cache` layer around `getAllDealers()` and send us back
// to Supabase for the full table on every hit.

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
