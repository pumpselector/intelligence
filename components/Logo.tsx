type BrandMarkProps = {
  className?: string;
};

/**
 * PumpRadar24 mark: a blueprint-style radar dish inside a rounded industrial
 * badge — two range rings, a sweep line and a single amber contact blip.
 * Reads as tracking/monitoring, not as a generic AI/startup logo.
 */
export function BrandMark({ className = "h-8 w-8" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#0B1830" />
      {/* range rings */}
      <circle cx="14.5" cy="17.5" r="9" stroke="#33496A" strokeWidth="1.4" />
      <circle cx="14.5" cy="17.5" r="4.6" stroke="#33496A" strokeWidth="1.4" />
      {/* sweep line from the dish centre out to the contact */}
      <path
        d="M14.5 17.5L23 10.2"
        stroke="#F7FAFC"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* centre pivot */}
      <circle cx="14.5" cy="17.5" r="1.5" fill="#F7FAFC" />
      {/* contact blip */}
      <circle cx="23" cy="10.2" r="2.4" fill="#F5A900" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

/** Reusable PumpRadar24 brand lockup: BrandMark + two-weight wordmark. */
export default function Logo({ className = "", markClassName = "h-8 w-8", wordmarkClassName = "text-[16px]" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className={markClassName} />
      <span className={`flex items-baseline leading-none whitespace-nowrap ${wordmarkClassName}`}>
        <span className="font-bold tracking-tight text-[#0B1830]">Pump</span>
        <span className="font-medium tracking-tight text-[#3D4E63]">Radar</span>
        <span className="font-semibold tracking-tight text-[#F5A900]">24</span>
      </span>
    </span>
  );
}
