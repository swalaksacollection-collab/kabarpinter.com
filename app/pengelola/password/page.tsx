import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/pengelola/StaffAuthForms";

export const metadata: Metadata = { title: "Ubah Password", robots: { index: false } };

export default async function PasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/pengelola/masuk");
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Ubah Password
          </h1>
        </div>
        <p style={{ marginBottom: 16 }}>
          <Link href="/pengelola">← Beranda Pengelola</Link>
        </p>
        <ChangePasswordForm email={user.email ?? ""} />
      </div>
    </main>
  );
}
