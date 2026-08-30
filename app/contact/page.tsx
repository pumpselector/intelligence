import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact us — PumpRadar24",
};

export default function ContactPage() {
  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contact us</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Questions about the data, pricing, or blocking a competitor? Send us a message and
          we&apos;ll get back to you by email.
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
