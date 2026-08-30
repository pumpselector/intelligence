import PricingClient from "@/components/PricingClient";
import { getAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing — PumpRadar24",
};

export default async function PricingPage() {
  const access = await getAccess();
  // Only admin-approved users (level >= 2) can subscribe. Everyone else —
  // visitors with no session AND signed-in-but-unapproved users — sees the
  // "wait for approval" message instead of any payment button. The server
  // enforces the same rule in /api/paypal/create-subscription.
  const canSubscribe = access.level >= 2;

  return <PricingClient canSubscribe={canSubscribe} />;
}
