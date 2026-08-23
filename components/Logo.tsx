type BrandMarkProps = {
  className?: string;
};

/**
 * Minimal industrial "P" monogram: a hollow, blueprint-style glyph with a single
 * amber data-node accent. Deliberately not a generic AI/startup mark — no gradient,
 * no brain/robot iconography, no neon.
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
      <path
        d="M10.6 8.4H18C20.4853 8.4 22.5 10.3266 22.5 12.75C22.5 15.1734 20.4853 17.1 18 17.1H14V23.6H10.6V8.4Z"
        fill="#F7FAFC"
      />
      <rect x="14" y="11.2" width="4.5" height="3.5" fill="#0B1830" />
      <rect x="19.6" y="19.6" width="3.1" height="3.1" rx="0.6" fill="#F5A900" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

/** Reusable "Pump Intelligence" brand lockup: BrandMark + two-weight wordmark. */
export default function Logo({ className = "", markClassName = "h-8 w-8", wordmarkClassName = "text-[16px]" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className={markClassName} />
      <span className={`flex items-baseline gap-1.5 leading-none whitespace-nowrap ${wordmarkClassName}`}>
        <span className="font-bold tracking-tight text-[#0B1830]">Pump</span>
        <span className="font-medium tracking-tight text-[#3D4E63]">Intelligence</span>
      </span>
    </span>
  );
}
