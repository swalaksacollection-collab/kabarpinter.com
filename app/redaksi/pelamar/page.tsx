import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { fullDateTime } from "@/lib/date";
import { AdminNav } from "@/components/AdminNav";

export const metadata: Metadata = {
  title: "Pelamar Kontributor",
  robots: { index: false },
};

// Approve / reject an application. The real authorisation is enforced in the
// database (review_contributor_application() checks is_admin()); this action
// only provides a friendly success/failure path.
async function reviewApplication(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("review_contributor_application", {
    target: id,
    approve: decision === "approve",
    reason: decision === "reject" ? reason : null,
  });

  revalidatePath("/redaksi/pelamar");
  if (error) redirect(`/redaksi/pelamar?error=${encodeURIComponent(error.message)}`);
  redirect(`/redaksi/pelamar?ok=${decision === "approve" ? "approve" : "reject"}`);
}

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kontributor/masuk");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return (
      <main className="section">
        <div className="container">
          <p style={{ color: "var(--ink-mute)" }}>Halaman ini khusus untuk admin.</p>
        </div>
      </main>
    );
  }

  // For a pending applicant profiles.display_name is still the sign-up email
  // (the chosen display name is only copied over on approval).
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, display_name, application_submitted_at")
    .eq("application_status", "pending")
    .order("application_submitted_at", { ascending: true });

  const ids = (pending ?? []).map((p) => p.id);
  const { data: apps } = ids.length
    ? await supabase.from("contributor_applications").select("*").in("user_id", ids)
    : { data: [] };

  const rows = await Promise.all(
    (pending ?? []).map(async (p) => {
      const app = (apps ?? []).find((a) => a.user_id === p.id);
      let selfieUrl: string | null = null;
      if (app?.selfie_path) {
        const { data } = await supabase.storage
          .from("contributor-verification")
          .createSignedUrl(app.selfie_path, 600);
        selfieUrl = data?.signedUrl ?? null;
      }
      return { profile: p, app, selfieUrl };
    })
  );

  const { data: history } = await supabase
    .from("profiles")
    .select("id, display_name, application_status, application_reason, application_reviewed_at")
    .in("application_status", ["approved", "rejected"])
    .not("application_reviewed_at", "is", null)
    .order("application_reviewed_at", { ascending: false })
    .limit(10);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Pelamar Kontributor
          </h1>
        </div>
        <AdminNav current="pelamar" isAdmin />

        {ok === "approve" && (
          <div className="notice notice--success">
            Pelamar disetujui dan kini dapat mengirim tulisan.
          </div>
        )}
        {ok === "reject" && (
          <div className="notice notice--info">
            Pengajuan ditolak. Pelamar dapat memperbaiki dan mengirim ulang.
          </div>
        )}
        {error && <div className="notice notice--error">{error}</div>}

        {rows.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>
            Tidak ada pengajuan yang menunggu peninjauan.
          </p>
        ) : (
          <ul className="review-queue">
            {rows.map(({ profile, app, selfieUrl }) => (
              <li key={profile.id} className="review-queue__item applicant">
                <div className="applicant__top">
                  {selfieUrl ? (
                    <a href={selfieUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selfieUrl}
                        alt={`Foto diri ${app?.full_name ?? ""}`}
                        className="applicant__selfie"
                      />
                    </a>
                  ) : (
                    <div className="applicant__selfie applicant__selfie--empty">Tanpa foto</div>
                  )}
                  <div>
                    <h3 className="review-queue__title" style={{ margin: 0 }}>
                      {app?.full_name || "(nama belum diisi)"}
                    </h3>
                    <p className="review-queue__author" style={{ margin: "4px 0" }}>
                      Tampil sebagai: <strong>{app?.display_name}</strong>
                    </p>
                    <p className="applicant__meta">
                      {app?.profession} · {app?.institution}
                    </p>
                    <p className="applicant__meta">
                      {app?.city} ·{" "}
                      {app?.phone && (
                        <a href={`tel:${app.phone.replace(/[^\d+]/g, "")}`}>{app.phone}</a>
                      )}
                    </p>
                    <p className="applicant__meta">Email akun: {profile.display_name}</p>
                    <p className="applicant__meta">
                      Dikirim {fullDateTime(profile.application_submitted_at)}
                    </p>
                    {app?.social_url && (
                      <p className="applicant__meta">
                        <a href={app.social_url} target="_blank" rel="noopener noreferrer nofollow">
                          {app.social_url}
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <p className="review-queue__excerpt">{app?.bio}</p>

                <div className="review-queue__actions">
                  <form action={reviewApplication}>
                    <input type="hidden" name="id" value={profile.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className="btn-primary">
                      Setujui
                    </button>
                  </form>
                  <form action={reviewApplication} className="review-queue__reject-form">
                    <input type="hidden" name="id" value={profile.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input
                      type="text"
                      name="reason"
                      required
                      minLength={5}
                      placeholder="Alasan penolakan (wajib, dilihat pelamar)"
                      className="cform__input"
                    />
                    <button type="submit" className="btn-outline">
                      Tolak
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {history && history.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Riwayat terakhir</h2>
            <ul className="my-articles">
              {history.map((h) => (
                <li key={h.id} className="my-articles__item">
                  <div>
                    <span className="my-articles__title">{h.display_name}</span>
                    <div className="my-articles__meta">
                      {fullDateTime(h.application_reviewed_at)}
                      {h.application_reason && ` · ${h.application_reason}`}
                    </div>
                  </div>
                  <span
                    className={`my-articles__status my-articles__status--${
                      h.application_status === "approved" ? "published" : "rejected"
                    }`}
                  >
                    {h.application_status === "approved" ? "Disetujui" : "Ditolak"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
