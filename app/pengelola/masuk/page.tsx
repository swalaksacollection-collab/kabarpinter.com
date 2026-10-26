import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { StaffLoginForm } from "@/components/pengelola/StaffAuthForms";

export const metadata: Metadata = { title: "Masuk Pengelola", robots: { index: false } };

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sebagai?: string; ok?: string; error?: string }>;
}) {
  const { sebagai, ok, error } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/pengelola");
  const as = sebagai === "redaksi" ? "redaksi" : "admin";

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Masuk {as === "admin" ? "Admin" : "Redaksi"}
          </h1>
        </div>
        {error && <div className="notice notice--error">{error}</div>}
        {ok === "daftar" && (
          <div className="notice notice--success">
            Pendaftaran diterima. Buka email Anda dan klik tautan konfirmasi, lalu kembali ke halaman ini
            dan pilih Masuk.
          </div>
        )}
        <StaffLoginForm sebagai={as} />
        <p style={{ marginTop: 24, fontSize: 14, color: "var(--ink-mute)" }}>
          Untuk kontributor/pakar, gunakan <a href="/kontributor/masuk">halaman masuk kontributor</a>.
        </p>
      </div>
    </main>
  );
}
