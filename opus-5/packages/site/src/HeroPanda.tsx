import type { ReactElement } from 'react';
import { brandColor, pandaColor } from '@pet/core';

/**
 * Editorial hero illustration: the same panda identity as the floating pet, but a
 * different asset and a different job — a still, warm, seated portrait with tea.
 *
 * Built from vector shapes with soft gradients and a grain filter instead of a bitmap, so
 * it stays crisp at any width and adds nothing to the network payload. Deliberately not a
 * cartoon: no outline, no glow, no gradient orb (brand: "Production Panda Assets").
 */
export function HeroPanda(): ReactElement {
  return (
    <svg
      className="pl-hero__art"
      viewBox="0 0 800 1000"
      role="img"
      aria-label="A panda in a warm coat and gold scarf sits by an arched window with a cup of tea and a book."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="pl-hero-wall" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#F5F0E7" />
          <stop offset="0.6" stopColor={brandColor.bgSecondary} />
          <stop offset="1" stopColor="#E9E1D4" />
        </linearGradient>
        <radialGradient id="pl-hero-light" cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#FFFDF7" />
          <stop offset="0.55" stopColor="#FBF4E6" />
          <stop offset="1" stopColor="#F1E7D6" />
        </radialGradient>
        <linearGradient id="pl-hero-beam" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#FFFCF2" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFCF2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pl-hero-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pandaColor.coat} />
          <stop offset="1" stopColor="#B79E7E" />
        </linearGradient>
        <linearGradient id="pl-hero-fur" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={pandaColor.muzzle} />
          <stop offset="0.55" stopColor={pandaColor.fur} />
          <stop offset="1" stopColor={pandaColor.furShade} />
        </linearGradient>
        <linearGradient id="pl-hero-coat" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#E2D3BB" />
          <stop offset="1" stopColor={pandaColor.coatShade} />
        </linearGradient>
        <linearGradient id="pl-hero-scarf" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#C79C68" />
          <stop offset="1" stopColor={pandaColor.scarfDeep} />
        </linearGradient>
        {/* Paper grain: what makes the illustration read as editorial rather than flat. */}
        <filter id="pl-hero-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" intercept="0" />
          </feComponentTransfer>
        </filter>
        <filter id="pl-hero-soften" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <clipPath id="pl-hero-frame">
          <rect x="0" y="0" width="800" height="1000" rx="24" />
        </clipPath>
      </defs>

      <g clipPath="url(#pl-hero-frame)">
        <rect width="800" height="1000" fill="url(#pl-hero-wall)" />

        {/* Arched window and the light it throws across the wall. */}
        <path d="M96 512V268a152 152 0 0 1 304 0v244Z" fill="url(#pl-hero-light)" />
        <path
          d="M96 512V268a152 152 0 0 1 304 0v244Z"
          fill="none"
          stroke={pandaColor.furLine}
          strokeWidth="3"
          opacity="0.7"
        />
        <path d="M248 116v396M96 380h304" stroke={pandaColor.furLine} strokeWidth="3" opacity="0.55" />
        <path d="M120 512 400 240l260 520-460 120Z" fill="url(#pl-hero-beam)" opacity="0.5" />

        {/* Table: the horizon everything else sits on. */}
        <rect x="0" y="742" width="800" height="258" fill="url(#pl-hero-wood)" />
        <rect x="0" y="742" width="800" height="8" fill="#C8B190" opacity="0.7" />
        <ellipse cx="430" cy="812" rx="286" ry="34" fill="#8B6A46" opacity="0.12" filter="url(#pl-hero-soften)" />
        {/* Torso, then the coat over it: the coat is what keeps the panda "stylish traveler". */}
        <path d="M300 800c-12-160 20-300 130-306 110 6 142 146 130 306Z" fill="url(#pl-hero-fur)" />
        <path
          d="M306 800c-10-150 20-284 124-290 104 6 134 140 124 290Z"
          fill="url(#pl-hero-coat)"
        />
        <path d="M430 510 392 604l38 62 38-62Z" fill="url(#pl-hero-fur)" opacity="0.95" />
        <path
          d="M430 510 392 604M430 510l38 94"
          stroke={pandaColor.coatShade}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
          fill="none"
        />

        {/* Arms resting on the table. */}
        <path
          d="M318 556c-36 52-42 118-30 170 6 26 30 34 56 26"
          fill="none"
          stroke="url(#pl-hero-coat)"
          strokeWidth="78"
          strokeLinecap="round"
        />
        <path
          d="M544 560c34 46 44 104 34 152-6 26-28 36-54 28"
          fill="none"
          stroke="url(#pl-hero-coat)"
          strokeWidth="78"
          strokeLinecap="round"
        />
        <ellipse cx="352" cy="742" rx="42" ry="30" fill={pandaColor.ink} opacity="0.92" />
        <ellipse cx="516" cy="736" rx="40" ry="29" fill={pandaColor.ink} opacity="0.92" />

        {/* Ears behind the head so the silhouette stays soft. */}
        <circle cx="342" cy="246" r="50" fill={pandaColor.ink} />
        <circle cx="518" cy="246" r="50" fill={pandaColor.ink} />
        <circle cx="342" cy="250" r="26" fill={pandaColor.inkSoft} opacity="0.8" />
        <circle cx="518" cy="250" r="26" fill={pandaColor.inkSoft} opacity="0.8" />
        <circle cx="430" cy="336" r="124" fill="url(#pl-hero-fur)" />
        {/* Face: eye patches angled inwards, small calm eyes, gentle smile. */}
        <ellipse cx="386" cy="330" rx="40" ry="49" fill={pandaColor.ink} transform="rotate(-13 386 330)" />
        <ellipse cx="474" cy="330" rx="40" ry="49" fill={pandaColor.ink} transform="rotate(13 474 330)" />
        <ellipse cx="390" cy="332" rx="15" ry="13" fill={pandaColor.muzzle} opacity="0.94" />
        <ellipse cx="470" cy="332" rx="15" ry="13" fill={pandaColor.muzzle} opacity="0.94" />
        <circle cx="392" cy="334" r="7.5" fill="#211E1B" />
        <circle cx="468" cy="334" r="7.5" fill="#211E1B" />
        <circle cx="394.5" cy="331" r="2.4" fill="#FFFFFF" opacity="0.9" />
        <circle cx="470.5" cy="331" r="2.4" fill="#FFFFFF" opacity="0.9" />
        <ellipse cx="430" cy="398" rx="54" ry="42" fill={pandaColor.muzzle} />
        <path d="M414 386c5-7 27-7 32 0 4 7-6 14-16 14s-20-7-16-14Z" fill={pandaColor.ink} />
        <path
          d="M414 416c5 8 11 12 16 12s11-4 16-12"
          fill="none"
          stroke={pandaColor.ink}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <ellipse cx="330" cy="374" rx="26" ry="17" fill={pandaColor.blush} />
        <ellipse cx="530" cy="374" rx="26" ry="17" fill={pandaColor.blush} />

        {/* Scarf: the identity marker shared with the floating pet. */}
        <path
          d="M340 452c52 34 148 34 200 0 18 16 22 44 8 62-70 34-152 34-220 0-14-18-8-46 12-62Z"
          fill="url(#pl-hero-scarf)"
        />
        <path
          d="M508 512c22 8 34 40 30 84-2 26-8 48-18 62-16-6-26-18-28-34-4-38-2-78 16-112Z"
          fill={pandaColor.scarfDeep}
          opacity="0.92"
        />
        <path
          d="M352 470c56 30 140 30 196 0"
          fill="none"
          stroke="#8B6A46"
          strokeWidth="3"
          opacity="0.45"
          strokeLinecap="round"
        />
        {/* Tea and a book: the café mood the brand asks for, not education props. */}
        <g>
          <path
            d="M568 700c-3-9 2-16 11-16h66c9 0 14 7 11 16l-10 40c-3 12-13 20-25 20h-18c-12 0-22-8-25-20Z"
            fill={brandColor.card}
          />
          <ellipse cx="612" cy="686" rx="39" ry="9" fill="#F6EFE2" />
          <ellipse cx="612" cy="686" rx="30" ry="6" fill="#C89A63" opacity="0.55" />
          <path
            d="M656 700c14 0 22 10 20 22-2 11-11 17-22 16"
            fill="none"
            stroke={brandColor.card}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <ellipse cx="612" cy="762" rx="52" ry="9" fill="#8B6A46" opacity="0.16" />
          <path
            d="M598 656c8-12-6-20 2-32M626 654c8-12-6-20 2-30"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>
        <g>
          <rect x="150" y="712" width="150" height="18" rx="6" fill="#C7A87F" />
          <rect x="158" y="700" width="142" height="16" rx="6" fill="#F1E8D8" />
          <rect x="150" y="688" width="150" height="16" rx="6" fill={pandaColor.scarf} />
        </g>

        <rect width="800" height="1000" filter="url(#pl-hero-grain)" opacity="0.11" style={{ mixBlendMode: 'multiply' }} />
      </g>
    </svg>
  );
}
