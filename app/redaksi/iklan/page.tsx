import type { Metadata } from "next";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { AD_SLOT_KEYS, canRenderAd, type AdSettings, type AdSlotRow } from "@/lib/ads";
import { saveAdSettings, saveAdSlot } from "../actions";

export const metadata: Metadata = { title: "Ruang Iklan", robots: { index: false } };

type SlotAdmin = AdSlotRow & { label: string };

export default async function AdsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase, isAdmin } = await getStaffContext();
  if (!isAdmin) return <AccessDenied text="Halaman ini khusus untuk admin." />;

  const [{ data: s }, { data: sl }] = await Promise.all([
    supabase.from("ad_settings").select("publisher_id, enabled").eq("id", 1).maybeSingle(),
    supabase.from("ad_slots").select("slot_key, label, ad_slot_id, enabled"),
  ]);
  const settings: AdSettings = (s as AdSettings | null) ?? { publisher_id: null, enabled: false };
  const rows = ((sl ?? []) as SlotAdmin[]).sort(
    (a, b) =>
      (AD_SLOT_KEYS as readonly string[]).indexOf(a.slot_key) -
      (AD_SLOT_KEYS as readonly string[]).indexOf(b.slot_key)
  );

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Ruang Iklan (Google AdSense)
          </h1>
        </div>
        <AdminNav current="iklan" isAdmin />
        <Flash ok={ok} error={error} />

        <div className="notice notice--info" style={{ marginBottom: 24 }}>
          <strong>Cara memasang:</strong> daftar di Google AdSense dan tunggu situs disetujui. Salin{" "}
          <em>ID penerbit</em> (<code>ca-pub-…</code>) ke bawah, lalu buat unit iklan di AdSense dan
          salin <em>ID slot</em> (angka) tiap penempatan. Situs menampilkan iklannya sendiri, jadi
          tidak perlu menempel kode HTML. File{" "}
          <a href="/ads.txt" target="_blank" rel="noopener noreferrer">
            /ads.txt
          </a>{" "}
          dibuat otomatis dari ID penerbit. Sebelum disetujui Google, biarkan nonaktif.
        </div>

        <h2 className="adm-h2">Akun penerbit</h2>
        <form action={saveAdSettings} className="cform" style={{ maxWidth: 520 }}>
          <label className="cform__label">
            ID penerbit
            <input
              name="publisher_id"
              placeholder="ca-pub-1234567890123456"
              defaultValue={settings.publisher_id ?? ""}
              className="cform__input"
              autoComplete="off"
            />
          </label>
          <label className="adm-check">
            <input type="checkbox" name="enabled" value="1" defaultChecked={settings.enabled} /> Aktifkan
            iklan di situs
          </label>
          <button type="submit" className="btn-primary">
            Simpan
          </button>
        </form>

        <h2 className="adm-h2">Penempatan</h2>
        <ul className="adm-list">
          {rows.map((r) => {
            const live = canRenderAd(settings, r);
            return (
              <li key={r.slot_key} className="adm-row adm-row--form">
                <form action={saveAdSlot} className="adm-slot">
                  <input type="hidden" name="slot_key" value={r.slot_key} />
                  <div className="adm-row__main">
                    <strong>{r.label}</strong>
                    <div className="my-articles__meta">
                      <code>{r.slot_key}</code>{" "}
                      <span className={live ? "adm-chip adm-chip--ok" : "adm-chip"}>
                        {live ? "Tayang" : "Belum tayang"}
                      </span>
                    </div>
                  </div>
                  <input
                    name="ad_slot_id"
                    placeholder="ID slot (angka)"
                    defaultValue={r.ad_slot_id ?? ""}
                    className="cform__input adm-slot__id"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <label className="adm-check">
                    <input type="checkbox" name="enabled" value="1" defaultChecked={r.enabled} /> Aktif
                  </label>
                  <button type="submit" className="btn-outline">
                    Simpan
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
