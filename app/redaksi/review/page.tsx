import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getSubmittedArticles } from "@/lib/articles";
import { categoryLabel } from "@/lib/categories";
import { AdminNav } from "@/components/AdminNav";

// Staff = editor or admin. The real enforcement is the database (RLS +
// is_editor()); this only avoids pointless writes and fails clearly.
async function isStaff(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "editor" || data?.role === "admin";
}

async function approveArticle(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createServerClient();
  if (!(await isStaff(supabase))) return;
  await supabase
    .from("articles")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/redaksi/review");
}

async function rejectArticle(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const note = (formData.get("note") as string) || null;
  const supabase = await createServerClient();
  if (!(await isStaff(supabase))) return;
  await supabase.from("articles").update({ status: "rejected", editor_note: note }).eq("id", id);
  revalidatePath("/redaksi/review");
}

export default async function EditorReviewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "editor" && profile?.role !== "admin") {
    return (
      <main className="section">
        <div className="container">
          <p style={{ color: "var(--ink-mute)" }}>Halaman ini khusus untuk tim redaksi.</p>
        </div>
      </main>
    );
  }

  const submitted = await getSubmittedArticles();

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Antrean Review
          </h1>
        </div>
        <AdminNav current="review" isAdmin={profile?.role === "admin"} />

        {submitted.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Tidak ada artikel yang menunggu review.</p>
        ) : (
          <ul className="review-queue">
            {submitted.map((a) => (
              <li key={a.id} className="review-queue__item">
                <div className="review-queue__badges">
                  {a.category_slug && (
                    <span className={`story__badge story__badge--${a.category_slug}`}>
                      {categoryLabel(a.category_slug)}
                    </span>
                  )}
                </div>
                <h3 className="review-queue__title">{a.title}</h3>
                <p className="review-queue__author">
                  {a.author?.display_name ?? "Kontributor"}
                  {a.author?.bio ? ` — ${a.author.bio}` : ""}
                </p>
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="review-queue__image" />
                )}
                {a.filter_flags && a.filter_flags.length > 0 && (
                  <div className="notice notice--info" style={{ margin: "0 0 12px" }}>
                    <strong>Peringatan filter otomatis:</strong>
                    <ul style={{ margin: "4px 0 0 18px" }}>
                      {a.filter_flags.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.excerpt && <p className="review-queue__excerpt">{a.excerpt}</p>}
                {a.body && (
                  <details className="adm-fulltext">
                    <summary>Baca teks lengkap</summary>
                    <div className="review-queue__excerpt" style={{ whiteSpace: "pre-wrap" }}>
                      {a.body}
                    </div>
                  </details>
                )}
                <p style={{ fontSize: 13, margin: "8px 0 0" }}>
                  <Link href={`/redaksi/ulasan/${a.id}`}>Edit sebelum terbit →</Link>
                </p>

                <div className="review-queue__actions">
                  <form action={approveArticle}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn-primary">
                      Terbitkan
                    </button>
                  </form>
                  <form action={rejectArticle} className="review-queue__reject-form">
                    <input
                      type="text"
                      name="note"
                      placeholder="Alasan penolakan (opsional)"
                      className="cform__input"
                    />
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn-outline">
                      Tolak
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
