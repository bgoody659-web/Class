import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role === "employee" || profile?.role === "manager") {
    const { data: employeeRow } = await supabase
      .from("employees")
      .select("store_id")
      .eq("profile_id", user.id)
      .eq("active", true)
      .limit(1)
      .single();

    if (employeeRow?.store_id) {
      redirect(`/store/switch?store_id=${employeeRow.store_id}&next=/dashboard`);
    }

    redirect('/login');
  }

  const { data: stores } = await supabase.from("stores").select("id").eq("owner_id", user.id);
  if (!stores || stores.length === 0) redirect('/onboarding');
  if (stores.length > 1) redirect('/seleccionar-tienda');
  redirect(`/store/switch?store_id=${stores[0].id}&next=/dashboard`);
}
