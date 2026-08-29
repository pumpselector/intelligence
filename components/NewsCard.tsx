import { Globe, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { hasValue } from "@/lib/dealers";
import { DistributorNews, formatNewsDate } from "@/lib/news";
import { getProducerColor } from "@/lib/producerColor";

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** One address / phone / email / website line — mirrors the Intelligence dealer modal. */
function ContactRow({
  icon: Icon,
  label,
  value,
  hrefFor,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  /** When given, each ";"-separated part of `value` becomes its own clickable link. */
  hrefFor?: (part: string) => string;
}) {
  if (!hasValue(value)) return null;
  const parts = hrefFor
    ? value.split(";").map((p) => p.trim()).filter((p) => p.length > 0)
    : [];

  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {hrefFor && parts.length > 0 ? (
          <div className="flex flex-col">
            {parts.map((part, i) => {
              const href = hrefFor(part);
              const isMailto = href.startsWith("mailto:");
              return (
                <a
                  key={i}
                  href={href}
                  target={isMailto ? undefined : "_blank"}
                  rel={isMailto ? undefined : "noopener noreferrer"}
                  className="block break-words text-sm text-slate-700 transition-colors hover:text-indigo-600 hover:underline"
                >
                  {part}
                </a>
              );
            })}
          </div>
        ) : (
          <p className="break-words text-sm text-slate-700">{value}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Shared network-change card — used both on the full /news list and (with
 * preview-masked, contact-stripped rows) in the home-page "Latest Changes in
 * Dealers" section. The contact block only renders when the row actually carries
 * dealer contact fields, so the same component covers both cases.
 */
export default function NewsCard({ item }: { item: DistributorNews }) {
  const hasContact =
    hasValue(item.bayi_adres) ||
    hasValue(item.bayi_telefon) ||
    hasValue(item.bayi_email) ||
    hasValue(item.bayi_web);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      {/* Meta row: change type + date on the left, country pinned top-right.
          Kept separate from the parties grid below so a long/short country
          name can never shift the Producer / Dealer columns. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
            {item.degisiklik_turu}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {formatNewsDate(item.haber_tarihi)}
          </span>
        </div>

        {hasValue(item.ulke) && (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {item.ulke}
          </span>
        )}
      </div>

      {/* Parties: two fixed-width columns so "Pump Producer" and "Pump Dealer"
          start at the same X on every card regardless of value length. Each
          value line leads with a same-size swatch (transparent for the dealer)
          so the two names align too. */}
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,18rem)]">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Pump Producer</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: hasValue(item.uretici) ? getProducerColor(item.uretici) : "transparent" }}
            />
            <span className="min-w-0 truncate font-semibold text-slate-900">
              {hasValue(item.uretici) ? item.uretici : "—"}
            </span>
          </div>
          {hasValue(item.pump) && <p className="mt-0.5 pl-4 text-xs text-slate-500">{item.pump}</p>}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Pump Dealer</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-transparent" />
            <span className="min-w-0 truncate font-semibold text-slate-900">
              {hasValue(item.bayi_adi) ? item.bayi_adi : "—"}
            </span>
          </div>
        </div>
      </div>

      {hasContact && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ContactRow icon={MapPin} label="Address" value={item.bayi_adres} />
            <ContactRow icon={Phone} label="Phone" value={item.bayi_telefon} />
            <ContactRow
              icon={Mail}
              label="Email"
              value={item.bayi_email}
              hrefFor={(email) => `mailto:${email}`}
            />
            <ContactRow icon={Globe} label="Website" value={item.bayi_web} hrefFor={withProtocol} />
          </div>
        </div>
      )}
    </div>
  );
}
