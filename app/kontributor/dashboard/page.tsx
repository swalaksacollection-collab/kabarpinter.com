import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function ContributorDashboard() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Dashboard Kontributor</h1>
      <p className="mt-4 text-brand-charcoal/70">
        Halo, {user.email}. Fitur submit &amp; kelola draft artikel akan hadir
        di iterasi berikutnya.
      </p>
    </main>
  );
}
