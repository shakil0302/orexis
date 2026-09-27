/** Notion's published light palette. Light mode only. */
export const colors = {
  page: "#FFFFFF",
  subtle: "#F1F1EF",
  text: "#373530",
  muted: "#787774",
  divider: "#E9E9E7",
  border: "#D3D1CB",
  accent: "#487CA5",
  accentSubtle: "#E9F3F7",
  danger: "#C4554D",
  onAccent: "#FFFFFF",
} as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
} as const;

export const type = {
  title: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontVariant: ["tabular-nums"] as const },
  section: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20 },
  tag: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { control: 6, sheet: 12, pill: 999 } as const;
