import PricingClient from "@/components/PricingClient";
import { getAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing — PumpRadar24",
};

export default async function PricingPage() {
  const access = await getAccess();
  // Level 1 = signed in but not yet admin-approved. Those users must not be
  // able to start a subscription (server also enforces this — see
  // /api/paypal/create-subscription). Visitors (level 0) are left enabled: the
  // buttons bounce them to /login.
  const needsApproval = access.level === 1;

  return <PricingClient canSubscribe={!needsApproval} />;
}
