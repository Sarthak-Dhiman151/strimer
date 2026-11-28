"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Mark every unread notification of the viewer as read (RLS scopes to own). */
export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (!error) revalidatePath("/notifications");
}
