import type { Metadata } from "next";
import Link from "next/link";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Avatar } from "@/components/Avatar";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { fullDateTime } from "@/lib/date";
import { setOpinionStatus, deleteOpinion } from "../actions";

export const metadata: Metadata = { title: "Ulasan Pakar", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  published: "Tayang",
  submitted: "Menunggu review",
  draft: "Disembunyikan",
  rejected: "Ditolak",
};
const TABS: { key: string; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "published", label: "Tayang" },
  { key: "submitted", label: "Menunggu" },
  { key: "draft", label: "Disembunyikan" },
  { key: "rejected", label: "Ditolak" },
];

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  image_url: string | null;
  filter_flags: string[] | null;
  author: { display_name: string; avatar_url: string | null } | null;
};

export default async function OpinionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; s?: string }>;
}) {
  const { ok, error, s } = await searchParams;
  const { supabase, isAdmin, isStaff } = await getStaffContext();
  if (!isStaff) return <AccessDenied text="Halaman ini khusus untuk tim redaksi." />;

  let q = supabase
    .from("articles")
    .select(
      "id, title, slug, status, published_at, created_at, image_url, filter_flags, author:contributor_id(display_name, avatar_url)"
    )
    .eq("source_type", "contributor")
    .order("created_at", { ascending: false })
    .limit(100);
  if (s && STATUS_LABEL[s]) q = q.eq("status", s);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Kelola Ulasan Pakar
          </h1>
        </div>
        <AdminNav current="ulasan" isAdmin={isAdmin} />
        <Flash ok={ok} error={error} />

        <div className="adm-tabs">
          {TABS.map((t) => (
            <Link
              key={t.key || "all"}
              href={t.key ? `/redaksi/ulasan?s=${t.key}` : "/redaksi/ulasan"}
              className={(s ?? "") === t.key ? "admin-nav__item admin-nav__item--active" : "admin-nav__item"}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Tidak ada ulasan di sini.</p>
        ) : (
          <ul className="adm-list">
            {rows.map((r) => (
              <li key={r.id} className="adm-row">
                {r.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt="" className="adm-thumb" />
                )}
                <div className="adm-row__main">
                  <Link href={`/redaksi/ulasan/${r.id}`} className="my-articles__title">
                    {r.title}
                  </Link>
                  <div className="my-articles__meta adm-byline">
                    <Avatar
                      name={r.author?.display_name ?? "Kontributor"}
                      url={r.author?.avatar_url}
                      size={20}
                    />
                    {r.author?.display_name ?? "Kontributor"} ·{" "}
                    {fullDateTime(r.published_at ?? r.created_at)}
                  </div>
                  {r.filter_flags && r.filter_flags.length > 0 && (
                    <div className="my-articles__meta" style={{ color: "var(--red)" }}>
                      ⚑ {r.filter_flags.join(" · ")}
                    </div>
                  )}
                </div>
                <span
                  className={`my-articles__status my-articles__status--${
                    r.status === "published" ? "published" : r.status === "rejected" ? "rejected" : "submitted"
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <div className="adm-actions">
                  <Link href={`/redaksi/ulasan/${r.id}`} className="btn-outline">
                    Edit
                  </Link>
                  <form action={setOpinionStatus}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={r.status === "published" ? "draft" : "published"}
                    />
                    <button type="submit" className="btn-outline">
                      {r.status === "published" ? "Sembunyikan" : "Terbitkan"}
                    </button>
                  </form>
                  <details className="adm-confirm">
                    <summary className="btn-outline">Hapus</summary>
                    <form action={deleteOpinion}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn-primary">
                        Ya, hapus permanen
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
