import type { Metadata } from "next";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { FilterTester } from "@/components/admin/FilterTester";
import type { FilterRule } from "@/lib/filter";
import { addFilterRule, toggleFilterRule, deleteFilterRule } from "../actions";

export const metadata: Metadata = { title: "Aturan Filter", robots: { index: false } };

const TYPE_LABEL: Record<string, string> = {
  banned_word: "Kata/frasa terlarang",
  min_words: "Minimal jumlah kata",
  max_links: "Maksimal jumlah tautan",
};

type RuleRow = FilterRule & { id: number };

export default async function FilterPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase, isAdmin } = await getStaffContext();
  if (!isAdmin) return <AccessDenied text="Halaman ini khusus untuk admin." />;

  const { data } = await supabase
    .from("filter_rules")
    .select("id, rule_type, value, action, enabled")
    .order("rule_type", { ascending: true })
    .order("id", { ascending: true });
  const rules = (data ?? []) as RuleRow[];

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Aturan Filter Tulisan
          </h1>
        </div>
        <AdminNav current="filter" isAdmin />
        <Flash ok={ok} error={error} />

        <p className="cform__hint" style={{ marginBottom: 20 }}>
          Dijalankan otomatis pada setiap tulisan kontributor. <strong>Tandai</strong> = tetap
          masuk antrean review dengan peringatan. <strong>Tolak</strong> = langsung ditolak dan
          kontributor melihat alasannya. Keputusan akhir tetap di tangan redaksi.
        </p>

        {rules.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada aturan. Semua tulisan akan lolos filter.</p>
        ) : (
          <ul className="adm-list">
            {rules.map((r) => (
              <li key={r.id} className="adm-row">
                <div className="adm-row__main">
                  <strong>{r.value}</strong>
                  <div className="my-articles__meta">{TYPE_LABEL[r.rule_type] ?? r.rule_type}</div>
                </div>
                <span className={r.action === "reject" ? "adm-chip adm-chip--bad" : "adm-chip"}>
                  {r.action === "reject" ? "Tolak" : "Tandai"}
                </span>
                <span className={r.enabled ? "adm-chip adm-chip--ok" : "adm-chip"}>
                  {r.enabled ? "Aktif" : "Mati"}
                </span>
                <div className="adm-actions">
                  <form action={toggleFilterRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="enabled" value={r.enabled ? "0" : "1"} />
                    <button type="submit" className="btn-outline">
                      {r.enabled ? "Matikan" : "Aktifkan"}
                    </button>
                  </form>
                  <details className="adm-confirm">
                    <summary className="btn-outline">Hapus</summary>
                    <form action={deleteFilterRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn-primary">
                        Ya, hapus aturan
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2 className="adm-h2">Tambah aturan</h2>
        <form action={addFilterRule} className="cform" style={{ maxWidth: 560 }}>
          <label className="cform__label">
            Jenis
            <select name="rule_type" className="cform__input" defaultValue="banned_word">
              <option value="banned_word">Kata/frasa terlarang</option>
              <option value="min_words">Minimal jumlah kata (isi tulisan)</option>
              <option value="max_links">Maksimal jumlah tautan</option>
            </select>
          </label>
          <label className="cform__label">
            Nilai (kata/frasa, atau angka)
            <input name="value" required maxLength={100} className="cform__input" />
          </label>
          <label className="cform__label">
            Jika terkena aturan
            <select name="action" className="cform__input" defaultValue="flag">
              <option value="flag">Tandai untuk redaksi</option>
              <option value="reject">Tolak otomatis</option>
            </select>
          </label>
          <button type="submit" className="btn-primary">
            Tambah aturan
          </button>
        </form>

        <h2 className="adm-h2">Uji aturan</h2>
        <FilterTester
          rules={rules.map(({ rule_type, value, action, enabled }) => ({
            rule_type,
            value,
            action,
            enabled,
          }))}
        />
      </div>
    </main>
  );
}
