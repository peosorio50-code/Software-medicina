export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className={`brand brand-${size}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="brand-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0f766e" />
            <stop offset="1" stopColor="#eab86c" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#brand-gradient)" />
        <path
          d="M13 26.5h5.2l2.6-6.5 4 12 3-9 2 3.5h5.2"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-word">
        <em>Software</em>Medicina
      </span>
    </div>
  );
}
