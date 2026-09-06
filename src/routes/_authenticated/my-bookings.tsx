import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, nightsBetween } from "@/lib/resort";

export const Route = createFileRoute("/_authenticated/my-bookings")({
  head: () => ({ meta: [{ title: "My bookings — Lock Out Villa" }, { name: "robots", content: "noindex" }] }),
  component: MyBookingsPage,
});

const STATUS_VARIANT = { pending: "secondary", confirmed: "default", cancelled: "destructive" } as const;

function MyBookingsPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["my-bookings", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, accommodations(name, price_per_night)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteLayout>
      <section className="container-x pt-14">
        <p className="eyebrow">Your account</p>
        <h1 className="mt-2 font-display text-5xl">My bookings</h1>
        <p className="mt-3 text-muted-foreground">Requests are confirmed by our team — we'll call or email you shortly after you send one.</p>

        <div className="mt-10 space-y-4">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {data?.length === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center">
              <p className="font-display text-2xl">No requests yet</p>
              <Button asChild className="mt-4"><Link to="/booking">Make a booking request</Link></Button>
            </div>
          )}
          {data?.map((b) => {
            const nights = nightsBetween(b.check_in, b.check_out);
            const price = Number(b.accommodations?.price_per_night ?? 0);
            return (
              <div key={b.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-2xl">{b.accommodations?.name}</p>
                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {nights} night{nights === 1 ? "" : "s"} · {b.guests} guest{b.guests === 1 ? "" : "s"}</p>
                  {b.admin_notes && <p className="mt-1 text-sm">Note from resort: {b.admin_notes}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">{formatPrice(price * nights)}</p>
                  <Badge variant={STATUS_VARIANT[b.status]} className="capitalize">{b.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
