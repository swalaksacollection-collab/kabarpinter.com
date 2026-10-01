import type { Metadata } from "next";
import Link from "next/link";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { isoToWibInput } from "@/lib/wib";
import { popupIsLiveNow } from "@/lib/popup";
import { fullDateTime } from "@/lib/date";
import { savePopup, togglePopup, deletePopup } from "../actions";

export const metadata: Metadata = { title: "Popup Iklan", robots: { index: false } };

type PopupAdmin = {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  target_paths: string;
  max_per_session: number;
  enabled: boolean;
};

export default async function PopupAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; id?: string; baru?: string }>;
}) {
  const { ok, error, id, baru } = await searchParams;
  const { supabase, isAdmin } = await getStaffContext();
  if (!isAdmin) return <AccessDenied text="Halaman ini khusus untuk admin." />;

  const { data } = await supabase
    .from("popups")
    .select("id, title, body, image_url, link_url, starts_at, ends_at, target_paths, max_per_session, enabled")
    .order("id", { ascending: false });
  const popups = (data ?? []) as PopupAdmin[];

  const { data: statRows } = await supabase.from("popup_stats").select("popup_id, views, clicks");
  const stats = new Map<number, { views: number; clicks: number }>();
  for (const s of statRows ?? []) {
    const cur = stats.get(s.popup_id) ?? { views: 0, clicks: 0 };
    cur.views += s.views;
    cur.clicks += s.clicks;
    stats.set(s.popup_id, cur);
  }

  const editing = id ? popups.find((p) => String(p.id) === id) : undefined;
  const showForm = Boolean(baru) || Boolean(editing);
  const p: PopupAdmin = editing ?? {
    id: 0,
    title: "",
    body: "",
    image_url: null,
    link_url: null,
    starts_at: null,
    ends_at: null,
    target_paths: "semua",
    max_per_session: 1,
    enabled: true,
  };

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Popup Iklan
          </h1>
        </div>
        <AdminNav current="popup" isAdmin />
        <Flash ok={ok} error={error} />

        {showForm ? (
          <>
            <p style={{ marginBottom: 16 }}>
              <Link href="/redaksi/popup">← Kembali ke daftar</Link>
            </p>
            <div className="notice notice--info" style={{ marginBottom: 20 }}>
              Popup selalu punya tombol ✕, bisa ditutup dengan Esc atau klik di luar, dan dibatasi per
              sesi pengunjung. Jangan tempel kode AdSense di sini, gunakan menu{" "}
              <Link href="/redaksi/iklan">Iklan</Link>. Jadwal memakai waktu WIB.
            </div>
            <form action={savePopup} className="cform" style={{ maxWidth: 560 }}>
              <input type="hidden" name="id" value={p.id || ""} />
              <label className="cform__label">
                Judul
                <input name="title" required maxLength={120} defaultValue={p.title} className="cform__input" />
              </label>
              <label className="cform__label">
                Teks (opsional)
                <textarea name="body" rows={3} maxLength={600} defaultValue={p.body} className="cform__textarea" />
              </label>
              <ImageUploadField
                name="image_url"
                folder="popups"
                label="Gambar (opsional)"
                initialUrl={p.image_url}
                maxSide={1200}
              />
              <label className="cform__label">
                Tautan tujuan (opsional)
                <input
                  name="link_url"
                  type="url"
                  placeholder="https://…"
                  defaultValue={p.link_url ?? ""}
                  className="cform__input"
                />
              </label>
              <div className="cform__row">
                <label className="cform__label" style={{ flex: 1 }}>
                  Mulai tayang (WIB)
                  <input
                    name="starts_at"
                    type="datetime-local"
                    defaultValue={isoToWibInput(p.starts_at)}
                    className="cform__input"
                  />
                </label>
                <label className="cform__label" style={{ flex: 1 }}>
                  Selesai (WIB)
                  <input
                    name="ends_at"
                    type="datetime-local"
                    defaultValue={isoToWibInput(p.ends_at)}
                    className="cform__input"
                  />
                </label>
              </div>
              <label className="cform__label">
                Halaman target
                <input name="target_paths" defaultValue={p.target_paths} maxLength={300} className="cform__input" />
                <span className="cform__hint">
                  &quot;semua&quot;, atau daftar dipisah koma, mis. <code>/, /opini, /kategori/finance</code>
                </span>
              </label>
              <label className="cform__label">
                Maksimal tampil per sesi pengunjung
                <input
                  name="max_per_session"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={p.max_per_session}
                  className="cform__input"
                />
              </label>
              <label className="adm-check">
                <input type="checkbox" name="enabled" value="1" defaultChecked={p.enabled} /> Aktif
              </label>
              <button type="submit" className="btn-primary">
                Simpan popup
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 20 }}>
              <Link href="/redaksi/popup?baru=1" className="btn-primary">
                + Popup baru
              </Link>
            </p>
            {popups.length === 0 ? (
              <p style={{ color: "var(--ink-mute)" }}>Belum ada popup.</p>
            ) : (
              <ul className="adm-list">
                {popups.map((x) => {
                  const st = stats.get(x.id) ?? { views: 0, clicks: 0 };
                  const live = popupIsLiveNow(x);
                  const ctr = st.views > 0 ? ((st.clicks / st.views) * 100).toFixed(1) : "0";
                  return (
                    <li key={x.id} className="adm-row">
                      {x.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={x.image_url} alt="" className="adm-thumb" />
                      )}
                      <div className="adm-row__main">
                        <strong>{x.title}</strong>
                        <div className="my-articles__meta">
                          {x.starts_at || x.ends_at
                            ? `${fullDateTime(x.starts_at) || "—"} s/d ${fullDateTime(x.ends_at) || "—"}`
                            : "Selalu"}{" "}
                          · {x.target_paths} · {x.max_per_session}x/sesi
                        </div>
                        <div className="my-articles__meta">
                          {st.views} tampil · {st.clicks} klik ({ctr}%)
                        </div>
                      </div>
                      <span className={live ? "adm-chip adm-chip--ok" : "adm-chip"}>
                        {live ? "Tayang" : x.enabled ? "Terjadwal/berakhir" : "Mati"}
                      </span>
                      <div className="adm-actions">
                        <Link href={`/redaksi/popup?id=${x.id}`} className="btn-outline">
                          Edit
                        </Link>
                        <form action={togglePopup}>
                          <input type="hidden" name="id" value={x.id} />
                          <input type="hidden" name="enabled" value={x.enabled ? "0" : "1"} />
                          <button type="submit" className="btn-outline">
                            {x.enabled ? "Matikan" : "Aktifkan"}
                          </button>
                        </form>
                        <details className="adm-confirm">
                          <summary className="btn-outline">Hapus</summary>
                          <form action={deletePopup}>
                            <input type="hidden" name="id" value={x.id} />
                            <button type="submit" className="btn-primary">
                              Ya, hapus popup
                            </button>
                          </form>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="cform__hint" style={{ marginTop: 16 }}>
              Angka tampil/klik bersifat indikatif (dihitung dari browser pengunjung), bukan untuk
              penagihan sponsor.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
