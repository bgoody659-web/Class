import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";

const COOKIE_NAME = "class_active_store";
type Role = "owner" | "manager" | "employee";
type StoreSummary = { id: string; name: string; logo_url?: string | null };
type StoreContext = {
  supabase: any;
  user: any;
  storeId: string;
  stores: StoreSummary[];
  role: Role;
  activeStoreName?: string | null;
  activeStoreLogo?: string | null;
};

export async function resolveActiveStoreId(): Promise<StoreContext> {
  const { supabase, user } = await requireUser();
  const cookieStore = await cookies();
  const storeCookie = cookieStore.get(COOKIE_NAME)?.value;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role === "employee" || profile?.role === "manager") {
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("store_id,created_at")
      .eq("profile_id", user.id)
      .eq("role", profile.role)
      .eq("active", true)
      .order("created_at", { ascending: false });

    const assignedStores = (employeeRows ?? []) as { store_id: string; created_at?: string }[];
    if (assignedStores.length === 0) return redirect('/login');
    const assignedStore = assignedStores.find((row) => row.store_id === storeCookie) ?? assignedStores[0];
    const employeeStoreId = assignedStore.store_id;
    if (storeCookie !== employeeStoreId) return redirect(`/store/switch?store_id=${employeeStoreId}&next=/dashboard`);
    const { data: st } = await supabase.from("stores").select("name,logo_url").eq("id", employeeStoreId).single();
    return { supabase, user, storeId: employeeStoreId, stores: [], role: profile.role as "employee" | "manager", activeStoreName: st?.name, activeStoreLogo: st?.logo_url };
  }

  const { data: stores } = await supabase.from("stores").select("id,name,logo_url").eq("owner_id", user.id).order("created_at");
  const ownedStores = (stores ?? []) as StoreSummary[];

  if (ownedStores.length === 0) return redirect('/onboarding');
  if (storeCookie && ownedStores.some((store: StoreSummary) => store.id === storeCookie)) {
    const active = ownedStores.find((store: StoreSummary) => store.id === storeCookie);
    return { supabase, user, storeId: storeCookie, stores: ownedStores, role: "owner", activeStoreName: active?.name, activeStoreLogo: active?.logo_url };
  }

  if (ownedStores.length > 1) return redirect('/seleccionar-tienda');
  return redirect(`/store/switch?store_id=${ownedStores[0].id}&next=/dashboard`);
}

export async function setActiveStoreCookie(storeId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, storeId, { httpOnly: true, sameSite: 'lax', path: '/' });
}
