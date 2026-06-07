"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { resolveActiveStoreId, setActiveStoreCookie } from "@/lib/server/store";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ACTIVE_STORE_COOKIE = "class_active_store";

async function getActionSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      }
    }
  );
}

export async function logout() {
  const supabase = await getActionSupabase();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_STORE_COOKIE);
  redirect('/login');
}

export async function registerOwner(_: { ok: boolean; message: string }, formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const store_name = String(formData.get("store_name") ?? "").trim();
  const store_address = String(formData.get("store_address") ?? "").trim();
  if (!full_name || !email || !password || !store_name || !store_address) return { ok: false, message: "Completá todos los campos obligatorios." };
  const supabase = await getActionSupabase();
  const admin = getSupabaseAdmin();
  const { data: signUp, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { role: "owner", full_name } } });
  if (signUpError || !signUp.user) return { ok: false, message: "No se pudo crear la cuenta." };
  const userId = signUp.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({ id: userId, email, full_name, role: "owner" }, { onConflict: "id" });
  if (profileError) { await admin.auth.admin.deleteUser(userId); return { ok: false, message: "No se pudo inicializar el perfil owner." }; }
  const { data: store, error: storeError } = await admin.from("stores").insert({ owner_id: userId, name: store_name, address: store_address }).select("id").single();
  if (storeError || !store?.id) { await admin.from("profiles").delete().eq("id", userId); await admin.auth.admin.deleteUser(userId); return { ok: false, message: "No se pudo crear la tienda inicial." }; }
  await setActiveStoreCookie(store.id);
  return { ok: true, message: "Cuenta creada correctamente." };
}

export async function loginWithPassword(_: { ok: boolean; message: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "owner");
  const supabase = await getActionSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !authData.user) return { ok: false, message: "Credenciales inválidas." };
  const { data: profile } = await supabase.from("profiles").select("id,role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== role) return { ok: false, message: "El rol seleccionado no coincide con la cuenta." };
  if (role === "employee" || role === "manager") {
    const { data: memberships } = await supabase.from("employees").select("store_id,created_at").eq("profile_id", profile.id).eq("role", role).eq("active", true).order("created_at", { ascending: false });
    const assignedStoreId = memberships?.[0]?.store_id;
    if (!assignedStoreId) return { ok: false, message: "Usuario sin tienda asignada." };
    await setActiveStoreCookie(assignedStoreId);
  }
  return { ok: true, message: "Login correcto." };
}

export async function createStore(formData: FormData) { const { supabase, user } = await requireUser(); const name = String(formData.get("name") ?? "").trim(); const address = String(formData.get("address") ?? "").trim(); const description = String(formData.get("description") ?? "").trim(); if (!name || !address) return; const { data } = await supabase.from("stores").insert({ owner_id: user.id, name, address, description }).select("id").single(); if (data?.id) await setActiveStoreCookie(data.id); redirect('/dashboard'); }
export async function selectStore(formData: FormData) { await setActiveStoreCookie(String(formData.get("store_id"))); redirect('/dashboard'); }
export async function createTask(formData: FormData) { const { supabase, user, storeId } = await resolveActiveStoreId(); await supabase.from("tasks").insert({ store_id: storeId, title: String(formData.get("title")), description: String(formData.get("description") ?? ""), status: String(formData.get("status") ?? "todo"), completed: String(formData.get("status") ?? "todo") === "completed", created_by: user.id }); revalidatePath('/dashboard'); revalidatePath('/tasks'); }
export async function toggleTask(formData: FormData) { const { supabase, storeId } = await resolveActiveStoreId(); const completed = formData.get("completed") === "true"; await supabase.from("tasks").update({ completed, status: completed ? "completed" : "todo" }).eq("id", String(formData.get("task_id"))).eq("store_id", storeId); revalidatePath('/dashboard'); revalidatePath('/tasks'); }
export async function deleteTask(formData: FormData) { const { supabase, storeId } = await resolveActiveStoreId(); await supabase.from("tasks").delete().eq("id", String(formData.get("task_id"))).eq("store_id", storeId); revalidatePath('/dashboard'); revalidatePath('/tasks'); }
export async function createEmployee(formData: FormData) {
  const { storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;

  const requestedRole = String(formData.get("member_role") ?? "employee");
  const memberRole = requestedRole === "manager" ? "manager" : "employee";
  if (memberRole === "manager" && role !== "owner") return;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const tempPassword = String(formData.get("temporary_password") ?? "");
  if (!name || !email || !tempPassword) return;

  const admin = getSupabaseAdmin();
  const { data: existingProfile } = await admin.from("profiles").select("id,role").eq("email", email).maybeSingle();
  if (existingProfile?.role === "owner") return;
  let userId = existingProfile?.id as string | undefined;
  let createdNewUser = false;

  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: memberRole, full_name: name, store_id: storeId }
    });
    if (error || !created.user) return;
    userId = created.user.id;
    createdNewUser = true;
  } else {
    await admin.auth.admin.updateUserById(userId, { password: tempPassword, user_metadata: { role: memberRole, full_name: name, store_id: storeId } });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name: name, role: memberRole }, { onConflict: "id" });
  if (profileError) {
    if (createdNewUser && userId) await admin.auth.admin.deleteUser(userId);
    return;
  }

  await admin.auth.admin.updateUserById(userId, { user_metadata: { role: memberRole, full_name: name, store_id: storeId } });
  await admin.from("employees").delete().eq("profile_id", userId);
  const { error: memberError } = await admin
    .from("employees")
    .insert({ store_id: storeId, profile_id: userId, name, email, role: memberRole, active: true });
  if (memberError) {
    await admin.from("profiles").delete().eq("id", userId);
    if (createdNewUser) await admin.auth.admin.deleteUser(userId);
    return;
  }

  revalidatePath('/dashboard');
  revalidatePath('/employees');
  revalidatePath('/managers');
}
export async function toggleEmployee(formData: FormData) { const { supabase, storeId } = await resolveActiveStoreId(); await supabase.from("employees").update({ active: formData.get("active") === "true" }).eq("id", String(formData.get("employee_id"))).eq("store_id", storeId); revalidatePath('/dashboard'); revalidatePath('/employees'); revalidatePath('/managers'); }
export async function createProduct(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  const salePrice = Number(formData.get("sale_price") || 0);
  const purchasePrice = Number(formData.get("purchase_price") || 0);
  if (!name || salePrice <= 0) return;
  await supabase.from("stock_products").insert({ store_id: storeId, name, category, description: String(formData.get("description") ?? ""), icon: String(formData.get("icon") || "package"), quantity: Number(formData.get("quantity") || 0), purchase_price: purchasePrice, sale_price: salePrice, ideal_stock: Number(formData.get("ideal_stock") || 0) });
  revalidatePath('/dashboard');
  revalidatePath('/stock');
}
export async function registerStockMovement(formData: FormData) { const { supabase, user, storeId } = await resolveActiveStoreId(); await supabase.from("stock_movements").insert({ store_id: storeId, product_id: String(formData.get("product_id")), employee_id: user.id, type: String(formData.get("type")), quantity: Number(formData.get("quantity") || 1) }); revalidatePath('/dashboard'); }
export async function createEvent(formData: FormData) { const { supabase, user, storeId } = await resolveActiveStoreId(); await supabase.from("events").insert({ store_id: storeId, title: String(formData.get("title")), description: String(formData.get("description") || ""), date: String(formData.get("date")), created_by: user.id }); revalidatePath('/dashboard'); }
export async function deleteEvent(formData: FormData) { const { supabase, storeId } = await resolveActiveStoreId(); await supabase.from("events").delete().eq("id", String(formData.get("event_id"))).eq("store_id", storeId); revalidatePath('/dashboard'); }
export async function createReport(formData: FormData) {
  const { supabase, user, storeId } = await resolveActiveStoreId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await supabase.from("reports").insert({
    store_id: storeId,
    created_by: user.id,
    title,
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? "other"),
    priority: String(formData.get("priority") ?? "medium")
  });
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

export async function updateReportStatus(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("reports").update({ status: String(formData.get("status") ?? "in_review"), updated_at: new Date().toISOString() }).eq("id", String(formData.get("report_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase, user, storeId } = await resolveActiveStoreId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const { data: order } = await supabase.from("purchase_orders").insert({
    store_id: storeId,
    created_by: user.id,
    title,
    order_type: String(formData.get("order_type") ?? "weekly"),
    status: String(formData.get("status") ?? "draft"),
    supplier_name: String(formData.get("supplier_name") ?? ""),
    supplier_notes: String(formData.get("supplier_notes") ?? ""),
    internal_notes: String(formData.get("internal_notes") ?? "")
  }).select("id").single();
  const productIds = formData.getAll("product_id").map(String);
  const categories = formData.getAll("item_category").map(String);
  const productNames = formData.getAll("product_name").map(String);
  const quantities = formData.getAll("quantity_requested").map(String);
  const notes = formData.getAll("item_notes").map(String);
  const items = productNames.map((productName, index) => ({
    purchase_order_id: order?.id,
    store_id: storeId,
    product_id: productIds[index] || null,
    category: categories[index] || "other",
    product_name: productName,
    quantity_requested: Number(quantities[index] || 0),
    notes: notes[index] || ""
  })).filter((item) => order?.id && item.product_name && item.quantity_requested > 0);
  if (items.length) await supabase.from("purchase_order_items").insert(items);
  revalidatePath('/dashboard');
  revalidatePath('/purchase-orders');
}

export async function updateTaskStatus(formData: FormData) {
  const { supabase, storeId } = await resolveActiveStoreId();
  const status = String(formData.get("status") ?? "todo");
  await supabase.from("tasks").update({ status, completed: status === "completed" }).eq("id", String(formData.get("task_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
}

export async function updateProduct(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("stock_products").update({ name: String(formData.get("name") ?? ""), category: String(formData.get("category") ?? "General"), description: String(formData.get("description") ?? ""), icon: String(formData.get("icon") || "package"), quantity: Number(formData.get("quantity") || 0), purchase_price: Number(formData.get("purchase_price") || 0), sale_price: Number(formData.get("sale_price") || 0), ideal_stock: Number(formData.get("ideal_stock") || 0) }).eq("id", String(formData.get("product_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/stock');
}

export async function deleteProduct(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("stock_products").delete().eq("id", String(formData.get("product_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/stock');
}

export async function updateEvent(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("events").update({ title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? ""), date: String(formData.get("date") ?? "") }).eq("id", String(formData.get("event_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/events');
}

export async function updatePurchaseOrderDetails(formData: FormData) {
  const { supabase, storeId } = await resolveActiveStoreId();
  const orderId = String(formData.get("order_id") ?? "");
  const { data: order } = await supabase.from("purchase_orders").select("status").eq("id", orderId).eq("store_id", storeId).single();
  if (order?.status === "completed") return;
  await supabase.from("purchase_orders").update({ title: String(formData.get("title") ?? ""), supplier_name: String(formData.get("supplier_name") ?? ""), supplier_notes: String(formData.get("supplier_notes") ?? ""), updated_at: new Date().toISOString() }).eq("id", orderId).eq("store_id", storeId);
  revalidatePath('/purchase-orders');
}

export async function createDailyChecklist(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  const { count } = await supabase.from("daily_checklists").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  if ((count ?? 0) >= 3) return;
  const days = formData.getAll("business_days").map((day) => Number(day));
  const { data: checklist } = await supabase.from("daily_checklists").insert({ store_id: storeId, created_by: user.id, name: String(formData.get("name") ?? ""), reset_time: String(formData.get("reset_time") ?? "08:00"), business_days: days.length ? days : [1,2,3,4,5] }).select("id").single();
  const titles = String(formData.get("items") ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  if (checklist?.id && titles.length) await supabase.from("daily_checklist_items").insert(titles.map((title, index) => ({ checklist_id: checklist.id, store_id: storeId, title, position: index })));
  revalidatePath('/tasks');
}

export async function toggleChecklistItem(formData: FormData) {
  const { supabase, user, storeId } = await resolveActiveStoreId();
  const completed = formData.get("completed") === "true";
  await supabase.from("daily_checklist_run_items").update({ completed, completed_by: completed ? user.id : null, completed_at: completed ? new Date().toISOString() : null }).eq("id", String(formData.get("item_id"))).eq("store_id", storeId);
  revalidatePath('/tasks');
}


export async function updatePurchaseOrderStatus(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  const status = String(formData.get("status") ?? "pending_review");
  const payload: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
  if (status === "approved") { payload.approved_by = user.id; payload.approved_at = new Date().toISOString(); }
  if (status === "completed" || status === "cancelled") payload.archived_at = new Date().toISOString();
  if (role === "employee" && !["draft", "pending_review"].includes(status)) return;
  await supabase.from("purchase_orders").update(payload).eq("id", String(formData.get("order_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/purchase-orders');
}
export async function createBookmark(formData: FormData) {
  const { supabase, user, storeId } = await resolveActiveStoreId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await supabase.from("bookmarks").insert({
    store_id: storeId,
    created_by: user.id,
    title,
    type: String(formData.get("type") ?? "link"),
    url: String(formData.get("url") ?? ""),
    content: String(formData.get("content") ?? ""),
    icon: String(formData.get("icon") ?? "bookmark")
  });
  revalidatePath('/dashboard');
}

export async function deleteBookmark(formData: FormData) {
  const { supabase, storeId } = await resolveActiveStoreId();
  await supabase.from("bookmarks").delete().eq("id", String(formData.get("bookmark_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
}

export async function createQuickAccess(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  const label = String(formData.get("label") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  if (!label || !destination) return;
  await supabase.from("quick_access_links").insert({ store_id: storeId, created_by: user.id, label, destination, icon: String(formData.get("icon") ?? "link") });
  revalidatePath('/dashboard');
}

export async function deleteQuickAccess(formData: FormData) {
  const { supabase, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("quick_access_links").delete().eq("id", String(formData.get("quick_access_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
}

export async function createExpense(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") || 0);
  if (!name || amount <= 0) return;
  await supabase.from("accounting_records").insert({
    store_id: storeId,
    employee_id: user.id,
    type: "expense",
    quantity: 1,
    purchase_price: amount,
    sale_price: 0,
    profit: -amount,
    description: name
  });
  revalidatePath('/dashboard');
  revalidatePath('/accounting');
}

export async function createEmployeeSchedule(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  const employeeId = String(formData.get("employee_id") ?? "");
  const { data: employee } = await supabase.from("employees").select("id,profile_id").eq("id", employeeId).eq("store_id", storeId).single();
  if (!employee?.id) return;
  await supabase.from("employee_schedules").insert({
    store_id: storeId,
    employee_id: employee.id,
    profile_id: employee.profile_id,
    shift_name: String(formData.get("shift_name") ?? "Turno"),
    starts_at: String(formData.get("starts_at") ?? ""),
    ends_at: String(formData.get("ends_at") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    created_by: user.id
  });
  revalidatePath('/employees');
  revalidatePath('/dashboard');
}

export async function createScheduleRequest(formData: FormData) {
  const { supabase, user, storeId } = await resolveActiveStoreId();
  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user.id).eq("store_id", storeId).eq("active", true).single();
  await supabase.from("employee_schedule_requests").insert({
    store_id: storeId,
    employee_id: employee?.id ?? null,
    profile_id: user.id,
    request_type: String(formData.get("request_type") ?? "day_off"),
    requested_date: String(formData.get("requested_date") ?? "") || null,
    title: String(formData.get("title") ?? "Solicitud de horario"),
    details: String(formData.get("details") ?? "")
  });
  revalidatePath('/dashboard');
  revalidatePath('/employees');
}

export async function updateScheduleRequestStatus(formData: FormData) {
  const { supabase, user, storeId, role } = await resolveActiveStoreId();
  if (role === "employee") return;
  await supabase.from("employee_schedule_requests").update({
    status: String(formData.get("status") ?? "approved"),
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", String(formData.get("request_id"))).eq("store_id", storeId);
  revalidatePath('/dashboard');
  revalidatePath('/employees');
}
