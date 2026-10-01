import { cache } from "react";
import { createPublicClient } from "./supabase/public";
import type { AdSettings, AdSlotRow } from "./ads";

export type AdConfig = { settings: AdSettings; slots: AdSlotRow[] };

const DISABLED: AdConfig = { settings: { publisher_id: null, enabled: false }, slots: [] };

// Public (cookie-free) read so pages stay static/ISR. Fails closed: if the
// tables are unreachable the site simply renders without ads.
export const getAdConfig = cache(async (): Promise<AdConfig> => {
  try {
    const supabase = createPublicClient();
    const [settings, slots] = await Promise.all([
      supabase.from("ad_settings").select("publisher_id, enabled").eq("id", 1).maybeSingle(),
      supabase.from("ad_slots").select("slot_key, ad_slot_id, enabled"),
    ]);
    if (settings.error || slots.error) return DISABLED;
    return {
      settings: (settings.data as AdSettings | null) ?? DISABLED.settings,
      slots: (slots.data as AdSlotRow[] | null) ?? [],
    };
  } catch {
    return DISABLED;
  }
});
