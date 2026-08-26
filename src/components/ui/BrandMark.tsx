interface BrandMarkProps {
  className?: string;
  size?: number;
}

/** The original MyProperty leaf-and-house mark used by the live application. */
export function BrandMark({ className = "brand-mark", size }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 48 48"
      width={size}
    >
      <path d="M24 4C35 12 40 22 35 34C31 42 17 42 13 34C8 22 13 12 24 4Z" />
      <path d="M24 4V38" />
      <path d="M14 20L24 27L34 20" />
      <path d="M16 29L24 34L32 29" />
      <path d="M18 38V29H30V38" />
      <path d="M22 33H26" />
      <path d="M9 40C15 37 20 39 24 41C28 39 33 37 39 40" />
    </svg>
  );
}
