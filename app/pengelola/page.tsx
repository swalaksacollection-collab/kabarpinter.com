import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { SignOutButton } from "@/components/pengelola/StaffAuthForms";

export const metadata: Metadata = { title: "Beranda Pengelola", robots: { index: false } };

const AREAS = {
  impor: { href: "/redaksi/impor", desc: "Tempel link, tulis ulang otomatis, terbitkan." },
  review: { href: "/redaksi/review", desc: "Setujui atau tolak tulisan kontributor." },
  ulasan: { href: "/redaksi/ulasan", desc: "Kelola Ulasan Pakar yang sudah masuk." },
} as const;

const ADMIN_AREAS: [string, string, string][] = [
  ["/pengelola/tim", "Tim & Akses", "Undang staf dan atur izin tiap orang."],
  ["/redaksi/pelamar", "Pelamar Kontributor", "Setujui atau tolak pendaftar."],
  ["/redaksi/kontributor", "Kontributor", "Foto profil, nonaktifkan."],
  ["/redaksi/filter", "Filter Tulisan", "Aturan penyaring kiriman."],
  ["/redaksi/popup", "Popup", "Promo popup."],
  ["/redaksi/iklan", "Iklan", "Pengaturan Google AdSense."],
];

export default async function StaffHomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/pengelola/masuk");

  // Apply a pending invitation for this (confirmed) email, if there is one.
  await supabase.rpc("claim_staff_invite");
  const { data } = await supabase
    .from("profiles")
    .select("display_name, role, permissions")
    .eq("id", user.id)
    .maybeSingle();
  const role = data?.role as string | undefined;
  const perms = (data?.permissions ?? []) as string[];
  const isAdmin = role === "admin";
  const isStaff = isAdmin || role === "editor";

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Beranda Pengelola
          </h1>
        </div>
        <p style={{ marginBottom: 16 }}>
          Masuk sebagai <strong>{data?.display_name ?? user.email}</strong> (
          {isAdmin ? "Super Admin" : role === "editor" ? "Redaksi" : "belum ada akses pengelola"}).
        </p>

        {!isStaff && (
          <div className="notice notice--info">
            Akun ini belum punya akses pengelola. Minta super admin mengundang email Anda, lalu buka
            halaman ini lagi.
          </div>
        )}

        {isStaff && (
          <ul className="adm-list">
            {PERMISSIONS.filter((p) => hasPermission(role, perms, p.key)).map((p) => (
              <li key={p.key} className="adm-row">
                <div style={{ flex: 1 }}>
                  <Link href={AREAS[p.key].href}>
                    <strong>{p.label}</strong>
                  </Link>
                  <div className="my-articles__meta">{AREAS[p.key].desc}</div>
                </div>
              </li>
            ))}
            {isAdmin &&
              ADMIN_AREAS.map(([href, label, desc]) => (
                <li key={href} className="adm-row">
                  <div style={{ flex: 1 }}>
                    <Link href={href}>
                      <strong>{label}</strong>
                    </Link>
                    <div className="my-articles__meta">{desc}</div>
                  </div>
                </li>
              ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/pengelola/password" className="btn-secondary">
            Ubah password saya
          </Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
