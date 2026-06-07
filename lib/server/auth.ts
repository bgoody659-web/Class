import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase";

export async function requireUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}
