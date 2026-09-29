import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold tracking-tight">
      <span className="text-brand-charcoal">Kabar</span>
      <span className="text-brand-amber">Pinter</span>
    </Link>
  );
}
