import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getMyArticles } from "@/lib/articles";
import { CATEGORY_OPTIONS, categoryLabel } from "@/lib/categories";
import { fullDateTime } from "@/lib/date";
import { ApplicationForm } from "@/components/contributor/ApplicationForm";
import { ArticleForm } from "@/components/contributor/ArticleForm";

export const metadata: Metadata = {
  title: "Dashboard Kontributor",
  robots: { index: false },
};

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
    .select(
      "display_name, bio, role, application_status, application_reason, application_submitted_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  const status = profile?.application_status ?? "none";
  const isStaff = profile?.role === "editor" || profile?.role === "admin";
  const canWrite = status === "approved" || isStaff;

  const { data: application } = await supabase
    .from("contributor_applications")
    .select(
      "full_name, display_name, bio, phone, city, profession, institution, social_url, selfie_path"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Owner-only, short-lived link so the applicant can see the photo they sent.
  let selfieUrl: string | null = null;
  if (application?.selfie_path) {
    const { data } = await supabase.storage
      .from("contributor-verification")
      .createSignedUrl(application.selfie_path, 600);
    selfieUrl = data?.signedUrl ?? null;
  }

  const myArticles = canWrite ? await getMyArticles(user.id) : [];

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

        {isStaff && (
          <div className="notice notice--info" style={{ marginBottom: 32 }}>
            Anda adalah <strong>{profile?.role === "admin" ? "Admin" : "Editor"}</strong>.{" "}
            {profile?.role === "admin" && (
              <>
                <Link href="/redaksi/pelamar">Tinjau pelamar kontributor</Link> ·{" "}
              </>
            )}
            <Link href="/redaksi/review">Tinjau tulisan</Link>
          </div>
        )}

        {!profile && (
          <div className="notice notice--error">
            Profil akun Anda belum terbentuk. Coba keluar lalu masuk kembali, atau hubungi
            redaksi@kabarpinter.com.
          </div>
        )}

        {profile && status === "none" && !isStaff && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Daftar sebagai Kontributor</h2>
            <p style={{ color: "var(--ink-mute)", marginBottom: 20 }}>
              Lengkapi biodata dan foto diri Anda. Tim redaksi akan meninjau pengajuan ini
              sebelum Anda dapat mengirim tulisan.
            </p>
            <ApplicationForm
              userId={user.id}
              initial={{
                fullName: application?.full_name ?? "",
                displayName: application?.display_name ?? "",
                bio: application?.bio ?? "",
                phone: application?.phone ?? "",
                city: application?.city ?? "",
                profession: application?.profession ?? "",
                institution: application?.institution ?? "",
                socialUrl: application?.social_url ?? "",
              }}
              existingSelfieUrl={selfieUrl}
              hasExistingSelfie={Boolean(application?.selfie_path)}
              isResubmission={false}
            />
          </section>
        )}

        {profile && status === "pending" && (
          <div className="notice notice--info" style={{ marginBottom: 48 }}>
            <strong>Pengajuan Anda sedang ditinjau.</strong>
            <br />
            Dikirim {fullDateTime(profile.application_submitted_at)}. Kami akan menghubungi
            Anda bila ada yang perlu dilengkapi. Selama menunggu, data pengajuan tidak dapat
            diubah.
          </div>
        )}

        {profile && status === "rejected" && (
          <section style={{ marginBottom: 48 }}>
            <div className="notice notice--error" style={{ marginBottom: 24 }}>
              <strong>Pengajuan Anda belum dapat disetujui.</strong>
              <br />
              Alasan dari redaksi: {profile.application_reason ?? "(tidak dicantumkan)"}
              <br />
              Silakan perbaiki data di bawah ini, lalu kirim ulang.
            </div>
            <ApplicationForm
              userId={user.id}
              initial={{
                fullName: application?.full_name ?? "",
                displayName: application?.display_name ?? "",
                bio: application?.bio ?? "",
                phone: application?.phone ?? "",
                city: application?.city ?? "",
                profession: application?.profession ?? "",
                institution: application?.institution ?? "",
                socialUrl: application?.social_url ?? "",
              }}
              existingSelfieUrl={selfieUrl}
              hasExistingSelfie={Boolean(application?.selfie_path)}
              isResubmission
            />
          </section>
        )}

        {profile && canWrite && (
          <>
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Profil Penulis</h2>
              <p style={{ margin: 0 }}>
                <strong>{profile.display_name}</strong>
              </p>
              {profile.bio && (
                <p style={{ color: "var(--ink-mute)", marginTop: 6 }}>{profile.bio}</p>
              )}
              <p style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 8 }}>
                Untuk mengubah data profil, hubungi redaksi@kabarpinter.com.
              </p>
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
                            <span style={{ color: "var(--red)" }}>
                              {" "}
                              · Catatan: {a.editor_note}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`my-articles__status my-articles__status--${a.status}`}
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
