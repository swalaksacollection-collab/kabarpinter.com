import type { Metadata } from "next";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Avatar } from "@/components/Avatar";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { setContributorAvatar, setContributorSuspended } from "../actions";

export const metadata: Metadata = { title: "Kelola Kontributor", robots: { index: false } };

type Person = {
  id: string;
  display_name: string;
  bio: string | null;
  role: "contributor" | "editor" | "admin";
  suspended: boolean;
  avatar_url: string | null;
};

export default async function ContributorsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase, user, isAdmin } = await getStaffContext();
  if (!isAdmin) return <AccessDenied text="Halaman ini khusus untuk admin." />;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, bio, role, suspended, avatar_url")
    .or("application_status.eq.approved,role.in.(editor,admin)")
    .order("display_name", { ascending: true });
  const people = (data ?? []) as Person[];

  const { data: arts } = await supabase
    .from("articles")
    .select("contributor_id, status")
    .eq("source_type", "contributor");
  const counts = new Map<string, { total: number; published: number }>();
  for (const a of arts ?? []) {
    if (!a.contributor_id) continue;
    const c = counts.get(a.contributor_id) ?? { total: 0, published: 0 };
    c.total += 1;
    if (a.status === "published") c.published += 1;
    counts.set(a.contributor_id, c);
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Kelola Kontributor
          </h1>
        </div>
        <AdminNav current="kontributor" isAdmin />
        <Flash ok={ok} error={error} />

        <p className="cform__hint" style={{ marginBottom: 20 }}>
          Foto profil tampil di samping nama pakar pada ulasan. Kontributor yang dinonaktifkan tidak
          bisa mengirim tulisan baru, tetapi tulisannya yang sudah tayang tetap ada.
        </p>

        {people.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada kontributor yang disetujui.</p>
        ) : (
          <ul className="review-queue">
            {people.map((p) => {
              const c = counts.get(p.id) ?? { total: 0, published: 0 };
              const self = p.id === user.id;
              return (
                <li key={p.id} className="review-queue__item">
                  <div className="applicant__top">
                    <Avatar name={p.display_name} url={p.avatar_url} size={72} />
                    <div>
                      <h3 className="review-queue__title" style={{ margin: 0 }}>
                        {p.display_name}
                        {p.role !== "contributor" && (
                          <span className="adm-chip">{p.role === "admin" ? "Admin" : "Editor"}</span>
                        )}
                        {p.suspended && <span className="adm-chip adm-chip--bad">Dinonaktifkan</span>}
                      </h3>
                      {p.bio && <p className="review-queue__author">{p.bio}</p>}
                      <p className="applicant__meta">
                        {c.published} tayang · {c.total} total tulisan
                      </p>
                    </div>
                  </div>

                  <form action={setContributorAvatar} className="cform" style={{ maxWidth: 520 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <ImageUploadField
                      name="url"
                      folder="avatars"
                      label="Foto profil"
                      initialUrl={p.avatar_url}
                      square
                      maxSide={640}
                      hint="Dipotong persegi otomatis."
                    />
                    <button type="submit" className="btn-primary">
                      Simpan foto
                    </button>
                  </form>

                  {p.role === "contributor" && !self && (
                    <form action={setContributorSuspended} style={{ marginTop: 12 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="suspend" value={p.suspended ? "0" : "1"} />
                      <button type="submit" className="btn-outline">
                        {p.suspended ? "Aktifkan kembali" : "Nonaktifkan kontributor"}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
