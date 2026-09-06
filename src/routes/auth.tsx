import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IMAGES } from "@/lib/resort";

const TITLE = "Sign in — Lock Out Villa";
const DESC = "Sign in or create a guest account to send booking requests to Lock Out Villa.";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/booking";
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: safePath(redirect), replace: true });
      }
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) navigate({ to: safePath(redirect), replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, redirect]);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: String(fd.get("name")), phone: String(fd.get("phone")) },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) setCheckEmail(true);
  }

  return (
    <SiteLayout>
      <section className="container-x grid gap-10 pt-14 lg:grid-cols-2 lg:items-center">
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow">Guests</p>
          <h1 className="mt-2 font-display text-5xl">Welcome</h1>
          <p className="mt-3 text-muted-foreground">Create a free account to send booking requests and track their status.</p>

          {checkEmail ? (
            <div className="mt-8 rounded-xl border bg-card p-6">
              <p className="font-display text-2xl">Check your inbox</p>
              <p className="mt-2 text-sm text-muted-foreground">We've sent a confirmation link to your email. Click it, then come back and sign in.</p>
              <Button className="mt-4" variant="outline" onClick={() => setCheckEmail(false)}>Back to sign in</Button>
            </div>
          ) : (
            <Tabs defaultValue="login" className="mt-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={onLogin} className="mt-4 space-y-4 rounded-xl border bg-card p-6">
                  <div className="space-y-1.5"><Label htmlFor="li-email">Email</Label><Input id="li-email" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-1.5"><Label htmlFor="li-pass">Password</Label><Input id="li-pass" name="password" type="password" required autoComplete="current-password" /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignup} className="mt-4 space-y-4 rounded-xl border bg-card p-6">
                  <div className="space-y-1.5"><Label htmlFor="su-name">Full name</Label><Input id="su-name" name="name" required autoComplete="name" /></div>
                  <div className="space-y-1.5"><Label htmlFor="su-phone">Phone</Label><Input id="su-phone" name="phone" type="tel" required autoComplete="tel" /></div>
                  <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-1.5"><Label htmlFor="su-pass">Password</Label><Input id="su-pass" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">Resort staff? <Link to="/admin-login" className="underline">Staff login</Link></p>
        </div>
        <div className="hidden overflow-hidden rounded-2xl lg:block">
          <img src={IMAGES.tent} alt="Luxury tent at Lock Out Villa" loading="lazy" width={1280} height={960} className="size-full object-cover" />
        </div>
      </section>
    </SiteLayout>
  );
}
