import type { CatalogItem } from "../types";

export function WeaponSchematic({ item }: { item: CatalogItem }) {
  return (
    <div className="weapon-schematic" role="img" aria-label={`${item.nameZh} 原创武器示意图`}>
      <svg viewBox="0 0 720 300" aria-hidden="true">
        <defs>
          <linearGradient id="weaponBody" x1="0" x2="1">
            <stop offset="0" stopColor="#26302f" />
            <stop offset="0.55" stopColor="#48514f" />
            <stop offset="1" stopColor="#252c2c" />
          </linearGradient>
          <linearGradient id="weaponEdge" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#56615f" />
            <stop offset="1" stopColor="#9ba5a2" />
          </linearGradient>
          <filter id="weaponShadow" x="-20%" y="-30%" width="140%" height="180%">
            <feDropShadow dx="0" dy="13" stdDeviation="10" floodColor="#000" floodOpacity=".65" />
          </filter>
          <pattern id="techGrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#9cafaa" strokeOpacity=".12" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="720" height="300" fill="url(#techGrid)" />
        <g opacity=".42" stroke="#74827f" strokeWidth="1">
          <path d="M36 43h100M36 43v31M684 43H584M684 43v31M36 257h100M36 257v-31M684 257H584M684 257v-31" />
          <path d="M70 150h580" strokeDasharray="5 8" />
        </g>
        <g filter="url(#weaponShadow)" transform="translate(20 6)">
          <path d="M72 116h82l35-28h214l39 19h131l28 24-12 55H398l-35-11H198l-38 22H70l-19-27z" fill="url(#weaponBody)" stroke="url(#weaponEdge)" strokeWidth="3" />
          <path d="M589 134h76v28h-79z" fill="#333c3b" stroke="#899390" strokeWidth="2" />
          <path d="M665 139h36v17h-36z" fill="#151a1a" stroke="#66716e" strokeWidth="2" />
          <path d="M91 121l43 4 23 20-8 34H84l-15-15z" fill="#171d1d" stroke="#687370" strokeWidth="2" />
          <path d="M224 176h69l-9 77h-61l-20-14z" fill="#242c2b" stroke="#7a8582" strokeWidth="3" />
          <path d="M296 174h86l27 33h-43l-21-18h-49z" fill="#141919" stroke="#6c7774" strokeWidth="3" />
          <path d="M185 88h169l23 26H165z" fill="#1b2222" stroke="#7c8784" strokeWidth="3" />
          <rect x="224" y="72" width="116" height="16" rx="4" fill="#313a39" stroke="#8e9996" strokeWidth="2" />
          <path d="M447 107h98l16 16H451z" fill="#111616" stroke="#606b68" strokeWidth="2" />
          <path d="M408 122h102" stroke="#f1c94a" strokeWidth="7" />
          <path d="M232 197h45M228 214h47M226 231h47" stroke="#66716e" strokeWidth="2" />
          <circle cx="327" cy="157" r="17" fill="#111616" stroke="#8d9895" strokeWidth="3" />
          <circle cx="327" cy="157" r="5" fill="#f1c94a" />
          <path d="M183 142h72M430 148h122M454 168h86" stroke="#98a29f" strokeOpacity=".54" strokeWidth="3" />
          <path d="M113 137h25M113 147h32M113 157h22" stroke="#f1c94a" strokeWidth="3" />
        </g>
        <text x="42" y="272" fill="#81908c" fontFamily="Cascadia Code, monospace" fontSize="12" letterSpacing="2">ORIGINAL REFERENCE SCHEMATIC // {item.id.toUpperCase()}</text>
      </svg>
      <span>原创示意图 · 非游戏素材</span>
    </div>
  );
}
