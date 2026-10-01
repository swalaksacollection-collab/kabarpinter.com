"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { evaluateSubmission, type FilterRule } from "@/lib/filter";
import { isOwnMediaUrl } from "@/lib/media";
import { slugify } from "@/lib/slug";

export type SubmitInput = {
  title: string;
  excerpt: string;
  body: string;
  categorySlug: string;
  imageUrl: string | null;
};

export type SubmitResult =
  | { ok: true; flagged: boolean }
  | { ok: false; error: string; reasons?: string[] };

// Submission path for contributors: validates, runs the admin-managed filter,
// then inserts with the contributor's own session (RLS still requires an
// approved, non-suspended contributor). The editor review stays the final
// gate: nothing a contributor submits can be published without an editor.
export async function submitArticle(input: SubmitInput): Promise<SubmitResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi Anda berakhir. Silakan masuk kembali." };

  const title = (input.title ?? "").trim();
  const excerpt = (input.excerpt ?? "").trim();
  const body = (input.body ?? "").trim();
  const category = (input.categorySlug ?? "").trim();
  const imageUrl = input.imageUrl ? input.imageUrl.trim() : null;

  if (!title) return { ok: false, error: "Judul wajib diisi." };
  if (title.length > 200) return { ok: false, error: "Judul maksimal 200 karakter." };
  if (excerpt.length > 400) return { ok: false, error: "Ringkasan maksimal 400 karakter." };
  if (body.length > 50000) return { ok: false, error: "Isi terlalu panjang (maks 50.000 karakter)." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (imageUrl) {
    // Only a photo this user uploaded to their own folder is acceptable.
    const ownFolder = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/contributor-uploads/${user.id}/`;
    if (!isOwnMediaUrl(imageUrl, supabaseUrl) || !imageUrl.startsWith(ownFolder)) {
      return { ok: false, error: "Alamat foto tidak valid." };
    }
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.suspended) {
    return { ok: false, error: "Akun Anda dinonaktifkan. Hubungi redaksi@kabarpinter.com." };
  }

  // Rules are readable by approved contributors (RLS). If they cannot be
  // loaded we fail open: the editor review still guards publication.
  const { data: rules, error: rulesError } = await supabase
    .from("filter_rules")
    .select("rule_type, value, action, enabled");
  if (rulesError) console.error("filter_rules unavailable:", rulesError.message);

  const verdict = evaluateSubmission((rules ?? []) as FilterRule[], { title, excerpt, body });
  if (verdict.action === "reject") {
    return {
      ok: false,
      error: "Tulisan tidak dapat dikirim karena melanggar pedoman redaksi.",
      reasons: verdict.reasons,
    };
  }

  const payload = {
    source_type: "contributor" as const,
    status: "submitted" as const,
    title,
    excerpt: excerpt || null,
    body: body || null,
    image_url: imageUrl,
    category_slug: category || null,
    contributor_id: user.id,
    filter_flags: verdict.reasons,
  };

  const baseSlug = slugify(title, new Set());
  let { error } = await supabase.from("articles").insert({ ...payload, slug: baseSlug });
  // RLS hides other users' drafts from any pre-check, so a real slug clash only
  // shows up here as a unique violation: retry once with a random suffix.
  if (error?.code === "23505") {
    ({ error } = await supabase
      .from("articles")
      .insert({ ...payload, slug: slugify(title, new Set([baseSlug])) }));
  }
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kontributor/dashboard");
  revalidatePath("/redaksi/review");
  return { ok: true, flagged: verdict.action === "flag" };
}
