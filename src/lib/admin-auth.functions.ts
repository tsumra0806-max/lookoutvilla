import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ADMIN_EMAIL = "admin@lockoutvilla.internal";

const schema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

function timingSafeEqualStr(a: string, b: string) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

/**
 * Admin sign-in. The username/password are checked server-side against
 * secrets (never shipped to the browser). On success a session is minted for
 * a dedicated internal admin account that carries the `admin` role.
 */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const expectedUser = process.env["ADMIN_USERNAME"];
    const expectedPass = process.env["ADMIN_PASSWORD"];
    if (!expectedUser || !expectedPass) throw new Error("Admin access is not configured.");

    const ok =
      timingSafeEqualStr(data.username.trim(), expectedUser) &&
      timingSafeEqualStr(data.password, expectedPass);
    if (!ok) throw new Error("Invalid username or password.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find or create the internal admin account.
    let adminUserId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email === ADMIN_EMAIL);
    if (existing) {
      adminUserId = existing.id;
    } else {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: "Resort Admin", is_internal_admin: true },
      });
      if (error || !created.user) throw new Error("Could not prepare admin account.");
      adminUserId = created.user.id;
    }

    // Ensure the admin role exists.
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: adminUserId, role: "admin" }, { onConflict: "user_id,role" });

    // Mint a session via a one-time link.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: ADMIN_EMAIL,
    });
    if (linkErr || !link.properties?.hashed_token) throw new Error("Could not start admin session.");

    const anon = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (verifyErr || !verified.session) throw new Error("Could not start admin session.");

    return {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    };
  });
