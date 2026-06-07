"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { resolveActiveStoreId } from "@/lib/server/store";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  await supabase.from("profiles").update({ full_name: fullName, avatar_url: avatarUrl || null }).eq("id", user.id);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function updatePassword(formData: FormData) {
  const { user } = await requireUser();
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return;
  const admin = getSupabaseAdmin();
  await admin.auth.admin.updateUserById(user.id, { password });
  revalidatePath('/settings');
}

export async function updateStoreBranding(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase
    .from("stores")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      logo_url: String(formData.get("logo_url") ?? "").trim() || null
    })
    .eq("id", storeId);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function createManager(formData: FormData) {
  const { storeId, role } = await resolveActiveStoreId();
  if (role !== "owner") return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const temporaryPassword = String(formData.get("temporary_password") ?? "");
  if (!email || !name || !temporaryPassword) return;
  const admin = getSupabaseAdmin();
  const { data: existingProfile } = await admin.from("profiles").select("id,role").eq("email", email).maybeSingle();
  if (existingProfile?.role === "owner") return;
  let userId = existingProfile?.id as string | undefined;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true, user_metadata: { role: "manager", full_name: name, store_id: storeId } });
    if (error || !created?.user) return;
    userId = created.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, { password: temporaryPassword, user_metadata: { role: "manager", full_name: name, store_id: storeId } });
  }
  await admin.auth.admin.updateUserById(userId, { user_metadata: { role: "manager", full_name: name, store_id: storeId } });
  await admin.from("profiles").upsert({ id: userId, email, full_name: name, role: "manager" }, { onConflict: "id" });
  await admin.from("employees").delete().eq("profile_id", userId);
  await admin.from("employees").insert({ store_id: storeId, profile_id: userId, name, email, role: "manager", active: true });
  revalidatePath('/managers');
  revalidatePath('/dashboard');
}

export async function updateManager(formData: FormData) {
  const { storeId, role } = await resolveActiveStoreId();
  if (role !== "owner") return;
  const id = String(formData.get("manager_id") ?? "");
  const admin = getSupabaseAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const { data: manager } = await admin.from("employees").select("profile_id").eq("id", id).eq("store_id", storeId).eq("role", "manager").single();
  await admin.from("employees").update({ name, active: formData.get("active") === "true" }).eq("id", id).eq("store_id", storeId).eq("role", "manager");
  if (manager?.profile_id) await admin.from("profiles").update({ full_name: name, role: "manager" }).eq("id", manager.profile_id);
  revalidatePath('/managers');
  revalidatePath('/dashboard');
}

export async function removeManager(formData: FormData) {
  const { storeId, role } = await resolveActiveStoreId();
  if (role !== "owner") return;
  const id = String(formData.get("manager_id") ?? "");
  const admin = getSupabaseAdmin();
  const { data: manager } = await admin.from("employees").select("profile_id").eq("id", id).eq("store_id", storeId).eq("role", "manager").single();
  await admin.from("employees").delete().eq("id", id).eq("store_id", storeId).eq("role", "manager");
  if (manager?.profile_id) await admin.auth.admin.deleteUser(manager.profile_id);
  revalidatePath('/managers');
  revalidatePath('/dashboard');
}

export async function createEncargado(formData: FormData) { return createManager(formData); }
export async function updateEncargado(formData: FormData) { return updateManager(formData); }
export async function removeEncargado(formData: FormData) { return removeManager(formData); }
