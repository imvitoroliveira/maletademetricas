import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin user management. Migrated from supabase/functions/admin-create-user
// and admin-delete-user into a single TanStack module.

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("Forbidden: Admin access required");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { source: "admin_dashboard" },
    });
    if (createError) throw new Error(createError.message);
    return { user: created.user };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Authorization: MASTER_ADMIN_EMAIL if configured, otherwise any admin.
    const callerEmail = (context.claims as { email?: string } | undefined)?.email;
    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    if (masterEmail) {
      if (callerEmail !== masterEmail) throw new Error("Forbidden: insufficient privileges to delete users.");
    } else {
      await assertAdmin(context);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ON DELETE CASCADE from auth.users -> profiles -> all app tables cleans everything up atomically.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { message: "User and all related data deleted successfully" };
  });
