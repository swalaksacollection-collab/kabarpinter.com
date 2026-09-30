export const REGIONS = [
  { slug: "jabar", label: "Jabar" },
  { slug: "jateng", label: "Jateng" },
  { slug: "jatim", label: "Jatim" },
  { slug: "sumut", label: "Sumut" },
  { slug: "sulsel", label: "Sulsel" },
  { slug: "bali", label: "Bali" },
] as const;

export function regionLabel(slug: string | null): string {
  if (!slug) return "Daerah";
  return REGIONS.find((r) => r.slug === slug)?.label ?? slug;
}

export function isKnownRegion(slug: string): boolean {
  return REGIONS.some((r) => r.slug === slug);
}
