import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminLogin } from "@/lib/admin-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Staff login — Lock Out Villa" },
      { name: "description", content: "Staff access to the Lock Out Villa booking dashboard." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff login — Lock Out Villa" },
      { property: "og:description", content: "Staff access to the Lock Out Villa booking dashboard." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const tokens = await login({ data: { username: String(fd.get("username")), password: String(fd.get("password")) } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 text-sidebar-foreground">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-8 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="font-display text-2xl">Staff login</p>
            <p className="text-xs text-sidebar-foreground/60">Lock Out Villa admin</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required autoComplete="username" className="bg-background text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" className="bg-background text-foreground" />
          </div>
          <Button type="submit" className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" disabled={busy}>
            {busy ? "Signing in…" : "Open dashboard"}
          </Button>
        </div>
      </form>
    </div>
  );
}
