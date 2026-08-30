import type { ReactNode } from "react";

/** Shared shell + typography for the /legal/* static pages. */
export default function LegalArticle({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <article
          className="space-y-4 text-sm leading-relaxed text-slate-600
            [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-slate-900
            [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900
            [&_a]:font-medium [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-800
            [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
            [&_strong]:font-medium [&_strong]:text-slate-900"
        >
          {children}
        </article>
      </div>
    </main>
  );
}
