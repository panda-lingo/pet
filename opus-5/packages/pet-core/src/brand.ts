/**
 * Brand tokens transcribed from `/home/ubuntu/speak/brand/brand_design.md` and the
 * approved reference boards (`home_page.png`, `pet.png`).
 *
 * These live in the domain package on purpose: both the SVG renderer and the PixiJS
 * renderer must resolve the *same* literal values, and PixiJS needs numeric colors
 * rather than CSS strings. Keeping one source avoids the two pets drifting apart.
 */

export const brandColor = {
  bg: '#F8F6F2',
  bgSecondary: '#F3EFE8',
  card: '#FFFFFF',
  text: '#1E1E1E',
  textMuted: '#6B6B6B',
  gold: '#B68C5A',
  brown: '#8B6A46',
  dark: '#232323',
  success: '#4F7A61',
  border: 'rgba(0,0,0,0.06)',
} as const;

/** Panda palette. Brand rule: never pure black, never pure-white-everywhere, warm only. */
export const pandaColor = {
  fur: '#F6F1E9',
  furShade: '#E7DFD2',
  furLine: '#DCD3C4',
  ink: '#2A2724',
  inkSoft: '#3C3832',
  muzzle: '#FFFDF9',
  scarf: '#B68C5A',
  scarfDeep: '#8B6A46',
  coat: '#D9C7AD',
  coatShade: '#C3AC8D',
  blush: 'rgba(182, 140, 90, 0.22)',
  eyeWhite: '#FFFFFF',
  highlight: 'rgba(255, 255, 255, 0.78)',
  shadow: 'rgba(42, 39, 36, 0.16)',
} as const;

export const brandShadow = {
  soft: '0 10px 30px rgba(0, 0, 0, 0.05)',
  lifted: '0 16px 40px rgba(30, 26, 20, 0.10)',
} as const;

export const brandRadius = {
  card: 20,
  image: 20,
  bubble: 18,
  pill: 9999,
} as const;

/** Brand motion: 150 / 250 / 400ms, ease-out only. */
export const brandDuration = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const brandEasing = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export const brandType = {
  display:
    "'Canela', 'Cormorant Garamond', 'Playfair Display', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
  body: "Inter, 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

/**
 * Footprints from the `pet.png` design guide. `dock` is the resting floating pet
 * (64 / 56 / 48). `companion` is the engaged size, kept inside the 120–240px
 * readability window the implementation briefs require.
 */
export const petFootprint = {
  dock: { desktop: 64, tablet: 56, mobile: 48 },
  companion: { desktop: 148, tablet: 132, mobile: 116 },
} as const;

export const petEdgeGap = { desktop: 24, mobile: 16 } as const;

/** z-index 9999 per the design guide. */
export const petZIndex = 9999;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function breakpointFor(viewportWidth: number): Breakpoint {
  if (viewportWidth < 640) return 'mobile';
  if (viewportWidth < 1024) return 'tablet';
  return 'desktop';
}

export function petSizeFor(viewportWidth: number, engaged: boolean): number {
  const bp = breakpointFor(viewportWidth);
  return engaged ? petFootprint.companion[bp] : petFootprint.dock[bp];
}

export function edgeGapFor(viewportWidth: number): number {
  return breakpointFor(viewportWidth) === 'mobile' ? petEdgeGap.mobile : petEdgeGap.desktop;
}

/** PixiJS wants 0xRRGGBB. Only accepts the `#rrggbb` form used above. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

/** CSS custom properties consumed by the shared stylesheets in both apps. */
export function brandCssVariables(): Record<string, string> {
  return {
    '--pl-bg': brandColor.bg,
    '--pl-bg-2': brandColor.bgSecondary,
    '--pl-card': brandColor.card,
    '--pl-text': brandColor.text,
    '--pl-muted': brandColor.textMuted,
    '--pl-gold': brandColor.gold,
    '--pl-brown': brandColor.brown,
    '--pl-dark': brandColor.dark,
    '--pl-success': brandColor.success,
    '--pl-border': brandColor.border,
    '--pl-shadow': brandShadow.soft,
    '--pl-shadow-lift': brandShadow.lifted,
    '--pl-radius': `${brandRadius.card}px`,
    '--pl-ease': brandEasing,
    '--pl-fast': `${brandDuration.fast}ms`,
    '--pl-base': `${brandDuration.base}ms`,
    '--pl-slow': `${brandDuration.slow}ms`,
    '--pl-font-display': brandType.display,
    '--pl-font-body': brandType.body,
  };
}
