/**
 * BrandIcon — icône de marque MonPlanFin (la MÊME que public/favicon.svg :
 * onglet navigateur + réseaux sociaux). Carré bleu nuit + cible + courbe verte
 * montante + point doré. À utiliser partout où l'on affichait le carré « MP ».
 */
export default function BrandIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MonPlanFin"
    >
      <rect width="64" height="64" rx="14" fill="hsl(226 44% 8%)" />
      <g transform="translate(6.6,11.5) scale(0.78)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="43" cy="22" r="18" stroke="hsl(220 16% 94%)" strokeWidth="3.4" />
        <circle cx="43" cy="22" r="11" stroke="hsl(220 16% 94%)" strokeWidth="3.9" />
        <path d="M5 48 L18 35 L27 42 L43 22" stroke="hsl(158 55% 58%)" strokeWidth="5" />
        <circle cx="43" cy="22" r="6.3" fill="hsl(40 60% 62%)" />
      </g>
    </svg>
  );
}
