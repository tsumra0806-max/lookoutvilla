import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Home, Images, LogOut, BedDouble, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable, type AdminBooking } from "@/components/admin/BookingsTable";
import { AccommodationsManager } from "@/components/admin/AccommodationsManager";
import { ImagesManager } from "@/components/admin/ImagesManager";
import { toISODate, addDays } from "@/lib/resort";
import { signOut } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/admin-login" });
  },
  head: () => ({ meta: [{ title: "Admin dashboard — Lock Out Villa" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, accommodations(name, price_per_night, capacity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminBooking[];
    },
  });

  const accommodations = useQuery({
    queryKey: ["admin-accommodations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accommodations").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const blocks = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accommodation_blocks").select("*").gte("end_date", toISODate(new Date())).order("start_date");
      if (error) throw error;
      return data;
    },
  });

  const today = toISODate(new Date());
  const tomorrow = toISODate(addDays(new Date(), 1));
  const all = bookings.data ?? [];
  const pending = all.filter((b) => b.status === "pending").length;
  const confirmed = all.filter((b) => b.status === "confirmed").length;
  const occupiedToday = new Set(
    all.filter((b) => b.status !== "cancelled" && b.check_in < tomorrow && b.check_out > today).map((b) => b.accommodation_id),
  );
  (blocks.data ?? []).forEach((bl) => { if (bl.start_date < tomorrow && bl.end_date > today) occupiedToday.add(bl.accommodation_id); });
  const accs = accommodations.data ?? [];
  const openAccs = accs.filter((a) => a.is_available);
  const freeToday = openAccs.filter((a) => !occupiedToday.has(a.id)).length;

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/admin-login", replace: true });
  }

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-accommodations"] });
    qc.invalidateQueries({ queryKey: ["admin-blocks"] });
    qc.invalidateQueries({ queryKey: ["accommodations"] });
    qc.invalidateQueries({ queryKey: ["availability"] });
    qc.invalidateQueries({ queryKey: ["resort-images"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground">
        <div className="container-x flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl">Lock Out Villa</span>
            <span className="rounded-full bg-sidebar-primary/20 px-2.5 py-0.5 text-xs font-medium text-sidebar-primary">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hover:bg-sidebar-accent hover:text-sidebar-foreground"><Link to="/"><Home className="size-4" /> View site</Link></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="size-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container-x py-8">
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Booking requests, availability, prices and photos — all in one place.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={CalendarClock} label="Pending requests" value={pending} tone="accent" />
          <Stat icon={CheckCircle2} label="Confirmed bookings" value={confirmed} tone="success" />
          <Stat icon={ListChecks} label="Total requests" value={all.length} />
          <Stat icon={BedDouble} label="Free tonight" value={`${freeToday} / ${openAccs.length}`} sub={`${accs.length - openAccs.length} closed`} />
        </div>

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">
            <TabsTrigger value="bookings"><CalendarClock className="size-4" /> Bookings</TabsTrigger>
            <TabsTrigger value="rooms"><BedDouble className="size-4" /> Accommodations & availability</TabsTrigger>
            <TabsTrigger value="images"><Images className="size-4" /> Photos</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-4">
            <BookingsTable bookings={all} loading={bookings.isLoading} onChanged={refreshAll} />
          </TabsContent>
          <TabsContent value="rooms" className="mt-4">
            <AccommodationsManager
              accommodations={accs}
              blocks={blocks.data ?? []}
              bookings={all}
              occupiedToday={occupiedToday}
              onChanged={refreshAll}
            />
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            <ImagesManager accommodations={accs} onChanged={refreshAll} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof Home; label: string; value: number | string; sub?: string; tone?: "accent" | "success" }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={tone === "accent" ? "size-5 text-accent" : tone === "success" ? "size-5 text-success" : "size-5 text-muted-foreground"} />
      </div>
      <p className="mt-2 font-display text-4xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
