import type { ReactNode } from "react";
import { getAdConfig } from "@/lib/ad-config";
import { canRenderAd, type AdSlotKey } from "@/lib/ads";
import { AdUnit } from "./AdUnit";

// Server component: decides whether a placement is live (admin enabled it and
// both ids are valid). If not, renders `fallback` (default: nothing).
export async function AdSlot({
  slot,
  fallback = null,
}: {
  slot: AdSlotKey;
  fallback?: ReactNode;
}) {
  const { settings, slots } = await getAdConfig();
  const row = slots.find((s) => s.slot_key === slot);
  if (!canRenderAd(settings, row)) return <>{fallback}</>;
  return <AdUnit client={settings.publisher_id!} slotId={row!.ad_slot_id!} slotKey={slot} />;
}
