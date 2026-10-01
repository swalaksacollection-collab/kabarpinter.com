import Link from "next/link";

export type AdminTab =
  | "pelamar"
  | "kontributor"
  | "review"
  | "ulasan"
  | "filter"
  | "popup"
  | "iklan";

// Tab bar shared by the staff-only pages under /redaksi. Admin-only tabs are
// hidden from editors (the database refuses them anyway).
export function AdminNav({ current, isAdmin }: { current: AdminTab; isAdmin: boolean }) {
  const cls = (active: boolean) =>
    active ? "admin-nav__item admin-nav__item--active" : "admin-nav__item";

  return (
    <nav className="admin-nav" aria-label="Menu redaksi">
      {isAdmin && (
        <>
          <Link href="/redaksi/pelamar" className={cls(current === "pelamar")}>
            Pelamar
          </Link>
          <Link href="/redaksi/kontributor" className={cls(current === "kontributor")}>
            Kontributor
          </Link>
        </>
      )}
      <Link href="/redaksi/review" className={cls(current === "review")}>
        Review Tulisan
      </Link>
      <Link href="/redaksi/ulasan" className={cls(current === "ulasan")}>
        Ulasan Pakar
      </Link>
      {isAdmin && (
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
        </>
      )}
      <Link href="/kontributor/dashboard" className="admin-nav__item">
        Dashboard Saya
      </Link>
    </nav>
  );
}
