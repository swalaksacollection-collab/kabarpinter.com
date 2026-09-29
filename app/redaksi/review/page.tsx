import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function EditorReviewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "editor") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-brand-charcoal/70">
          Halaman ini khusus untuk tim redaksi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Antrian Review</h1>
      <p className="mt-4 text-brand-charcoal/70">
        Antrean artikel kontributor untuk ditinjau akan hadir di iterasi
        berikutnya.
      </p>
    </main>
  );
}
