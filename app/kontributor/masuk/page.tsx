import type { Metadata } from "next";
import { LoginForm } from "@/components/contributor/LoginForm";

export const metadata: Metadata = {
  title: "Masuk Kontributor",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Masuk Kontributor
          </h1>
        </div>
        <p style={{ color: "var(--ink-mute)", marginTop: -12, marginBottom: 24 }}>
          Untuk kontributor dan pakar (dokter, akademisi, praktisi) yang menulis ulasan di
          Kabarpinter.com. Tidak perlu kata sandi — kami kirim link masuk ke email Anda.
        </p>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>
          Kontributor baru diminta melengkapi biodata dan foto diri. Pengajuan Anda ditinjau
          tim redaksi sebelum bisa mengirim tulisan.
        </p>
        <LoginForm linkExpired={error === "link"} />
      </div>
    </main>
  );
}
