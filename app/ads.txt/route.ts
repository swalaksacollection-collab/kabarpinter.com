import { getAdConfig } from "@/lib/ad-config";
import { adsTxtContent } from "@/lib/ads";

// Required by Google AdSense; generated from the publisher id set at
// /redaksi/iklan. Revalidated hourly (and on every save in the admin).
export const revalidate = 3600;

export async function GET() {
  const { settings } = await getAdConfig();
  return new Response(adsTxtContent(settings.publisher_id), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
