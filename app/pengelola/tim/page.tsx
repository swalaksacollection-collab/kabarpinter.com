import type { Metadata } from "next";
import Link from "next/link";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { AccessDenied } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PERMISSIONS } from "@/lib/permissions";
import { inviteStaff, removeInvite, updateStaffAccess } from "../actions";

export const metadata: Metadata = { title: "Tim & Akses", robots: { index: false } };

const OK: Record<string, string> = {
  diundang: "Undangan disimpan. Orangnya bisa mendaftar di halaman Masuk → Daftar (diundang).",
  "undangan-dihapus": "Undangan dihapus.",
  "akses-disimpan": "Akses disimpan.",
};

type Staff = { id: string; display_name: string; role: string; permissions: string[] };
type Invite = { email: string; display_name: string; role: string; permissions: string[]; claimed_at: string | null };

function PermBoxes({ selected }: { selected: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {PERMISSIONS.map((p) => (
        <label key={p.key} style={{ display: "flex", gap: 8, fontSize: 14 }}>
          <input type="checkbox" name="permissions" value={p.key} defaultChecked={selected.includes(p.key)} />
          <span>
            <strong>{p.label}</strong> — {p.hint}
          </span>
        </label>
      ))}
    </div>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase, user, isAdmin } = await getStaffContext();
  if (!isAdmin) return <AccessDenied text="Halaman ini khusus untuk super admin." />;

  const [{ data: staffData }, { data: inviteData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, role, permissions")
      .in("role", ["admin", "editor"])
      .order("created_at"),
    supabase
      .from("staff_invites")
      .select("email, display_name, role, permissions, claimed_at")
      .order("created_at", { ascending: false }),
  ]);
  const staff = (staffData ?? []) as Staff[];
  const invites = (inviteData ?? []) as Invite[];

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Tim & Akses
          </h1>
        </div>
        <AdminNav current="tim" />
        {error && <div className="notice notice--error">{error}</div>}
        {ok && OK[ok] && <div className="notice notice--success">{OK[ok]}</div>}

        <h2 style={{ margin: "8px 0 12px", fontSize: 18 }}>Undang pengelola baru</h2>
        <form action={inviteStaff} className="cform" style={{ maxWidth: 620 }}>
          <label className="cform__label">
            Email
            <input name="email" type="email" required className="cform__input" />
          </label>
          <label className="cform__label">
            Nama tampilan
            <input name="display_name" required maxLength={80} className="cform__input" />
          </label>
          <label className="cform__label">
            Peran
            <select name="role" defaultValue="editor" className="cform__input">
              <option value="editor">Redaksi (akses sesuai izin di bawah)</option>
              <option value="admin">Super Admin (akses penuh)</option>
            </select>
          </label>
          <PermBoxes selected={["impor"]} />
          <SubmitButton pendingText="Menyimpan…">Undang</SubmitButton>
        </form>

        <h2 style={{ margin: "32px 0 12px", fontSize: 18 }}>Undangan</h2>
        {invites.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada.</p>
        ) : (
          <ul className="adm-list">
            {invites.map((i) => (
              <li key={i.email} className="adm-row">
                <div style={{ flex: 1 }}>
                  <strong>{i.display_name}</strong> · {i.email}
                  <div className="my-articles__meta">
                    {i.role === "admin" ? "Super Admin" : `Redaksi: ${i.permissions.join(", ") || "tanpa izin"}`} ·{" "}
                    {i.claimed_at ? "sudah dipakai" : "menunggu pendaftaran"}
                  </div>
                </div>
                <form action={removeInvite}>
                  <input type="hidden" name="email" value={i.email} />
                  <SubmitButton pendingText="…" className="btn-secondary">
                    Hapus
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <h2 style={{ margin: "32px 0 12px", fontSize: 18 }}>Pengelola aktif</h2>
        <ul className="adm-list">
          {staff.map((s) => (
            <li key={s.id} className="adm-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <strong>{s.display_name}</strong>
                {s.id === user.id && " (Anda)"}
                {s.id === user.id ? (
                  <div className="my-articles__meta">
                    Super Admin · <Link href="/pengelola/password">ubah password</Link>
                  </div>
                ) : (
                  <form action={updateStaffAccess} className="cform" style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={s.id} />
                    <select name="role" defaultValue={s.role} className="cform__input">
                      <option value="editor">Redaksi</option>
                      <option value="admin">Super Admin</option>
                      <option value="contributor">Cabut akses pengelola</option>
                    </select>
                    <PermBoxes selected={s.permissions} />
                    <SubmitButton pendingText="Menyimpan…">Simpan akses</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="my-articles__meta" style={{ marginTop: 16 }}>
          Izin berlaku untuk peran Redaksi. Area Pelamar, Kontributor, Filter, Popup, Iklan, dan Tim & Akses
          hanya untuk Super Admin.
        </p>
      </div>
    </main>
  );
}
