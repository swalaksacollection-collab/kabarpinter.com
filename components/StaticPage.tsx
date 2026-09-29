export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">{title}</h1>
      <div className="prose mt-6 max-w-none text-brand-charcoal/80">{children}</div>
    </main>
  );
}
