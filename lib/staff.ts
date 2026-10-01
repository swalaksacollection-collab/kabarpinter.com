import { redirect } from "next/navigation";
import { createServerClient } from "./supabase/server";

export type StaffRole = "contributor" | "editor" | "admin";

// Session + role for the /redaksi pages (signed-out visitors go to login).
// Pages decide what to show; the database (RLS) is the real enforcement.
export async function getStaffContext() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kontributor/masuk");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data?.role ?? null) as StaffRole | null;
  return {
    supabase,
    user,
    role,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "editor",
  };
}
