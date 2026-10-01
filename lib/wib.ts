// The admin enters popup schedules in WIB (UTC+7). Vercel runs in UTC, so we
// convert explicitly instead of trusting the server's local time zone.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// "2026-10-10T08:00" (datetime-local, WIB) -> ISO string in UTC, or null.
export function wibInputToIso(value: string | null | undefined): string | null {
  const m = INPUT_RE.exec((value ?? "").trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(wallAsUtc);
  // Reject overflowing values such as month 13 or 25:61 (Date would roll over).
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d ||
    check.getUTCHours() !== h ||
    check.getUTCMinutes() !== mi
  ) {
    return null;
  }
  return new Date(wallAsUtc - WIB_OFFSET_MS).toISOString();
}

// Stored timestamp -> value for <input type="datetime-local"> shown in WIB.
export function isoToWibInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = new Date(t + WIB_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${s.getUTCFullYear()}-${p(s.getUTCMonth() + 1)}-${p(s.getUTCDate())}T${p(s.getUTCHours())}:${p(s.getUTCMinutes())}`;
}
