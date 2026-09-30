import Link from "next/link";

// Small tab bar shared by the staff-only pages under /redaksi.
export function AdminNav({
  current,
  isAdmin,
}: {
  current: "pelamar" | "review";
  isAdmin: boolean;
}) {
  const cls = (active: boolean) =>
    active ? "admin-nav__item admin-nav__item--active" : "admin-nav__item";

  return (
    <nav className="admin-nav" aria-label="Menu redaksi">
      {isAdmin && (
        <Link href="/redaksi/pelamar" className={cls(current === "pelamar")}>
          Pelamar Kontributor
        </Link>
      )}
      <Link href="/redaksi/review" className={cls(current === "review")}>
        Review Tulisan
      </Link>
      <Link href="/kontributor/dashboard" className="admin-nav__item">
        Dashboard Saya
      </Link>
    </nav>
  );
}
