import Link from "next/link";
import { getStaffContext } from "@/lib/staff";
import { hasPermission } from "@/lib/permissions";

export type AdminTab =
  | "impor"
  | "pelamar"
  | "kontributor"
  | "review"
  | "ulasan"
  | "filter"
  | "popup"
  | "iklan"
  | "tim";

// Tab bar shared by the staff-only pages under /redaksi. Tabs follow the
// signed-in person's role and granted permissions (the database and the page
// guards enforce the same rules; this only hides what they cannot use).
// `isAdmin` is kept for existing call sites but the context decides.
export async function AdminNav({ current }: { current: AdminTab; isAdmin?: boolean }) {
  const { role, permissions } = await getStaffContext();
  const admin = role === "admin";
  const can = (k: "impor" | "review" | "ulasan") => hasPermission(role, permissions, k);
  const cls = (active: boolean) =>
    active ? "admin-nav__item admin-nav__item--active" : "admin-nav__item";

  return (
    <nav className="admin-nav" aria-label="Menu redaksi">
      <Link href="/pengelola" className="admin-nav__item">
        Beranda Pengelola
      </Link>
      {can("impor") && (
        <Link href="/redaksi/impor" className={cls(current === "impor")}>
          Impor Berita
        </Link>
      )}
      {admin && (
        <>
          <Link href="/redaksi/pelamar" className={cls(current === "pelamar")}>
            Pelamar
          </Link>
          <Link href="/redaksi/kontributor" className={cls(current === "kontributor")}>
            Kontributor
          </Link>
        </>
      )}
      {can("review") && (
        <Link href="/redaksi/review" className={cls(current === "review")}>
          Review Tulisan
        </Link>
      )}
      {can("ulasan") && (
        <Link href="/redaksi/ulasan" className={cls(current === "ulasan")}>
          Ulasan Pakar
        </Link>
      )}
      {admin && (
        <>
          <Link href="/redaksi/filter" className={cls(current === "filter")}>
            Filter
          </Link>
          <Link href="/redaksi/popup" className={cls(current === "popup")}>
            Popup
          </Link>
          <Link href="/redaksi/iklan" className={cls(current === "iklan")}>
            Iklan
          </Link>
          <Link href="/pengelola/tim" className={cls(current === "tim")}>
            Tim & Akses
          </Link>
        </>
      )}
      <Link href="/kontributor/dashboard" className="admin-nav__item">
        Dashboard Saya
      </Link>
    </nav>
  );
}
