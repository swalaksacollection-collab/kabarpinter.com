import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getMyArticles } from "@/lib/articles";
import { CATEGORY_OPTIONS, categoryLabel } from "@/lib/categories";
import { ProfileForm } from "@/components/contributor/ProfileForm";
import { ArticleForm } from "@/components/contributor/ArticleForm";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Review",
  published: "Tayang",
  rejected: "Ditolak",
};

export default async function ContributorDashboard() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  const myArticles = await getMyArticles(user.id);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Dashboard Kontributor
          </h1>
        </div>
        <p style={{ color: "var(--ink-mute)", marginTop: -20, marginBottom: 32 }}>
          Masuk sebagai {user.email}
        </p>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Profil Penulis</h2>
          <ProfileForm
            displayName={profile?.display_name ?? user.email ?? ""}
            bio={profile?.bio ?? null}
          />
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Tulis Ulasan Baru</h2>
          <ArticleForm userId={user.id} categories={CATEGORY_OPTIONS} />
        </section>

        <section>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Artikel Saya</h2>
          {myArticles.length === 0 ? (
            <p style={{ color: "var(--ink-mute)" }}>Belum ada artikel yang dikirim.</p>
          ) : (
            <ul className="my-articles">
              {myArticles.map((a) => (
                <li key={a.id} className="my-articles__item">
                  <div>
                    <Link
                      href={a.status === "published" ? `/artikel/${a.slug}` : "#"}
                      className="my-articles__title"
                    >
                      {a.title}
                    </Link>
                    <div className="my-articles__meta">
                      {categoryLabel(a.category_slug)}
                      {a.editor_note && (
                        <span style={{ color: "var(--red)" }}> · Catatan: {a.editor_note}</span>
                      )}
                    </div>
                  </div>
                  <span className={`my-articles__status my-articles__status--${a.status}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
