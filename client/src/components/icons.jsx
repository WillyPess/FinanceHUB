// Hand-drawn line icon set — replaces emoji glyphs everywhere in the app.
// Every icon shares one 20x20 grid and stroke language so they read as one
// system regardless of where they're used (nav, category chips, buttons).
const PATHS = {
  // -- nav --------------------------------------------------------------
  grid: (
    <>
      <rect x="3.2" y="3.2" width="6" height="6" rx="1.3" />
      <rect x="10.8" y="3.2" width="6" height="6" rx="1.3" />
      <rect x="3.2" y="10.8" width="6" height="6" rx="1.3" />
      <rect x="10.8" y="10.8" width="6" height="6" rx="1.3" />
    </>
  ),
  list: (
    <>
      <line x1="4" y1="5.5" x2="16" y2="5.5" />
      <line x1="4" y1="10" x2="16" y2="10" />
      <line x1="4" y1="14.5" x2="12" y2="14.5" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 8.5a5 5 0 0 1 8.5-3.5L14 6.5" />
      <path d="M14 3.2v3.3h-3.3" />
      <path d="M16 11.5a5 5 0 0 1-8.5 3.5L6 13.5" />
      <path d="M6 17v-3.3h3.3" />
    </>
  ),
  exchange: (
    <>
      <path d="M4 7h10.5" />
      <path d="M11.5 4l3.5 3-3.5 3" />
      <path d="M16 13H5.5" />
      <path d="M8.5 10l-3.5 3 3.5 3" />
    </>
  ),
  chart: (
    <>
      <path d="M3.4 14.6 7.6 10l3 3 5.6-6.4" />
      <path d="M12.6 6.6h3.6v3.6" />
    </>
  ),

  // -- transaction / fixed-cost categories -------------------------------
  home: (
    <>
      <path d="M3 10.3 10 4.3l7 6" />
      <path d="M5 8.8V16h10V8.8" />
      <path d="M8 16v-4.3h4V16" />
    </>
  ),
  food: (
    <>
      <path d="M6.2 3v5.6a1.4 1.4 0 0 0 2.8 0V3" />
      <path d="M7.6 8.6V17" />
      <path d="M13 3c-1.1 0-1.9 1.5-1.9 3.8s.8 3.3 1.9 3.3V17" />
    </>
  ),
  car: (
    <>
      <path d="M4 12.2 5.1 8a2 2 0 0 1 1.9-1.4h6a2 2 0 0 1 1.9 1.4l1.1 4.2" />
      <rect x="3" y="12.2" width="14" height="4" rx="1.2" />
      <circle cx="6.4" cy="16.6" r="1.2" />
      <circle cx="13.6" cy="16.6" r="1.2" />
    </>
  ),
  health: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v7" />
      <path d="M6.5 10h7" />
    </>
  ),
  game: (
    <>
      <rect x="2.6" y="7" width="14.8" height="8" rx="4" />
      <path d="M6.4 9.5v3" />
      <path d="M4.9 11h3" />
      <circle cx="13.2" cy="9.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.2c1.7-.9 3.7-.9 5.6 0v11.2c-1.9-.9-3.9-.9-5.6 0z" />
      <path d="M16 4.2c-1.7-.9-3.7-.9-5.6 0v11.2c1.9-.9 3.9-.9 5.6 0z" />
    </>
  ),
  cart: (
    <>
      <path d="M6.3 7V5.4a3.7 3.7 0 0 1 7.4 0V7" />
      <rect x="4.2" y="7" width="11.6" height="9.6" rx="1.4" />
    </>
  ),
  power: <path d="M11 3 5.2 11h3.9l-.9 6L14 9h-3.9z" />,
  salary: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M7.3 12.7 12.7 7.3" />
      <path d="M8.4 7.3h4.3v4.3" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="7.3" width="14" height="9" rx="1.4" />
      <path d="M7.4 7.3V5.8a1.8 1.8 0 0 1 1.8-1.8h1.6a1.8 1.8 0 0 1 1.8 1.8v1.5" />
      <path d="M3 11.5h14" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="4.6" width="14" height="9.4" rx="1.4" />
      <path d="M7.4 17h5.2" />
    </>
  ),
  package: (
    <>
      <path d="M10 3.3 16.4 7 10 10.7 3.6 7z" />
      <path d="M3.6 7v6.4L10 17l6.4-3.6V7" />
      <path d="M10 10.7V17" />
    </>
  ),

  // -- fixed-cost / subscription categories ------------------------------
  design: (
    <>
      <rect x="3" y="4" width="14" height="9.4" rx="1.4" />
      <path d="M7 17h6" />
      <path d="M7.2 9l1.7 1.7L7.2 12.4" />
      <path d="M11 12.4h2" />
    </>
  ),
  internet: (
    <>
      <path d="M4 8.3a8.8 8.8 0 0 1 12 0" />
      <path d="M6.4 10.9a5.4 5.4 0 0 1 7.2 0" />
      <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  phone: (
    <>
      <rect x="6.4" y="2.6" width="7.2" height="14.8" rx="1.6" />
      <path d="M9 15.2h2" />
    </>
  ),
  water: <path d="M10 3.2c2.6 3.5 5 6.5 5 9.3a5 5 0 0 1-10 0c0-2.8 2.4-5.8 5-9.3z" />,
  fire: <path d="M10.2 17c-3 0-5-2-5-4.7 0-2 1.3-3.1 1.8-4.7.4 1 1 1.6 1.7 1.6-.3-2.5.6-4.7 2.7-6-.4 2 .3 3 1 3.7 1.3 1.1 2.6 2.3 2.6 5.4 0 2.7-1.9 4.7-4.8 4.7z" />,
  fitness: (
    <>
      <path d="M5 10h10" />
      <rect x="2.6" y="7.4" width="2.6" height="5.2" rx="0.9" />
      <rect x="14.8" y="7.4" width="2.6" height="5.2" rx="0.9" />
    </>
  ),
  shield: <path d="M10 3 16 5.2v4.2c0 4-2.6 6.8-6 7.6-3.4-.8-6-3.6-6-7.6V5.2z" />,
  building: (
    <>
      <rect x="4.4" y="3" width="11.2" height="14" rx="1.2" />
      <path d="M7.4 6.4h1.4M11.2 6.4h1.4M7.4 10h1.4M11.2 10h1.4M7.4 13.6h1.4M11.2 13.6h1.4" />
    </>
  ),
  receipt: (
    <>
      <path d="M5.4 3h9.2v14l-1.6-1.1-1.6 1.1-1.6-1.1-1.6 1.1-1.6-1.1-1.6 1.1z" />
      <path d="M8 7.4h4M8 10.3h4" />
    </>
  ),

  // -- ui chrome ----------------------------------------------------------
  refresh: (
    <>
      <path d="M4 8a6 6 0 0 1 10-3.3L16 6.3" />
      <path d="M16 3v3.3h-3.3" />
      <path d="M16 12a6 6 0 0 1-10 3.3L4 13.7" />
      <path d="M4 17v-3.3h3.3" />
    </>
  ),
  chevronDown: <path d="M5 7.5 10 12.5 15 7.5" />,
  close: (
    <>
      <path d="M5 5l10 10" />
      <path d="M15 5 5 15" />
    </>
  ),
  search: (
    <>
      <circle cx="8.6" cy="8.6" r="5.4" />
      <path d="M16 16l-3.8-3.8" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8.2a4 4 0 0 1 8 0c0 3.1 1 4.4 1 4.4H5s1-1.3 1-4.4Z" />
      <path d="M8.5 15a1.5 1.5 0 0 0 3 0" />
    </>
  ),
};

export default function Icon({ name, size = 18, strokeWidth = 1.6, className, style }) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
