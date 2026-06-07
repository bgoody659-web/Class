import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "class_active_store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (storeId) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, storeId, { httpOnly: true, sameSite: "lax", path: "/" });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
