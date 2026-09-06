import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { accommodationsQuery, availabilityQuery, type Accommodation } from "@/lib/public.functions";
import { DEFAULT_IMAGE_BY_TYPE, TYPE_LABEL, addDays, formatPrice, nightsBetween, rangesOverlap, toISODate } from "@/lib/resort";
import { cn } from "@/lib/utils";

const TITLE = "Booking & Availability — Lock Out Villa";
const DESC = "Check live availability and rates for rooms, tents and halls at Lock Out Villa, then send a booking request.";

const searchSchema = z.object({ accommodation: z.string().optional() });

export const Route = createFileRoute("/booking")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accommodationsQuery),
  errorComponent: () => <SiteLayout><p className="container-x py-20 text-center">Could not load availability right now.</p></SiteLayout>,
  component: BookingPage,
});

const DAYS_SHOWN = 14;

function BookingPage() {
  const { accommodation: slugParam } = Route.useSearch();
  const { data: accommodations } = useSuspenseQuery(accommodationsQuery);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string>(() => accommodations.find((a) => a.slug === slugParam)?.id ?? accommodations[0]?.id ?? "");
  useEffect(() => {
    const m = accommodations.find((a) => a.slug === slugParam);
    if (m) setSelectedId(m.id);
  }, [slugParam, accommodations]);

  const today = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const [checkIn, setCheckIn] = useState(toISODate(addDays(today, 1)));
  const [checkOut, setCheckOut] = useState(toISODate(addDays(today, 2)));
  const [guests, setGuests] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const gridFrom = toISODate(today);
  const gridTo = toISODate(addDays(today, DAYS_SHOWN));
  const availability = useQuery(availabilityQuery(gridFrom, gridTo));

  const rangeFrom = checkIn < gridFrom ? checkIn : gridFrom;
  const rangeTo = checkOut > gridTo ? checkOut : gridTo;
  const rangeAvail = useQuery({ ...availabilityQuery(rangeFrom, rangeTo), enabled: checkIn < checkOut });

  const selected = accommodations.find((a) => a.id === selectedId);
  const nights = nightsBetween(checkIn, checkOut);

  function isBusy(accId: string, dayStart: string, dayEnd: string, data = availability.data) {
    if (!data) return false;
    return (
      data.booked.some((b) => b.accommodation_id === accId && rangesOverlap(dayStart, dayEnd, b.check_in, b.check_out)) ||
      data.blocks.some((b) => b.accommodation_id === accId && rangesOverlap(dayStart, dayEnd, b.start_date, b.end_date))
    );
  }

  const conflict = selected && checkIn < checkOut ? isBusy(selected.id, checkIn, checkOut, rangeAvail.data) : false;
  const tooMany = selected ? guests > selected.capacity : false;
  const dateInvalid = !(checkIn < checkOut) || checkIn < gridFrom;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !selected) return;
    if (dateInvalid) { toast.error("Please choose a valid date range."); return; }
    if (tooMany) { toast.error(`${selected.name} sleeps up to ${selected.capacity} guests.`); return; }
    if (conflict) { toast.error("Those dates are already taken — please pick different dates."); return; }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      accommodation_id: selected.id,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      guest_name: String(fd.get("name")),
      guest_email: String(fd.get("email")),
      guest_phone: String(fd.get("phone")),
      message: String(fd.get("message") || "") || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").upsert({ id: user.id, full_name: String(fd.get("name")), phone: String(fd.get("phone")), email: String(fd.get("email")) });
    qc.invalidateQueries({ queryKey: ["availability"] });
    setSubmitted(true);
  }

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));

  return (
    <SiteLayout>
      <section className="container-x pt-14">
        <p className="eyebrow">Plan your stay</p>
        <h1 className="mt-2 font-display text-5xl">Booking & availability</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Pick an accommodation, choose your dates and send us a request. We confirm every booking personally by phone or email.</p>
      </section>

      {/* Availability grid */}
      <section className="container-x mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Next {DAYS_SHOWN} days</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-success/70" /> Free</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-destructive/60" /> Taken</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-muted-foreground/40" /> Closed</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium">Accommodation</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="px-1 py-2 text-center font-normal text-muted-foreground">
                    <span className="block text-[10px] uppercase">{d.toLocaleDateString("en", { weekday: "short" })}</span>
                    <span className="text-sm font-medium text-foreground">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accommodations.map((a) => (
                <tr key={a.id} className={cn("border-b last:border-0", a.id === selectedId && "bg-secondary/50")}>
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">
                    <button onClick={() => setSelectedId(a.id)} className="text-left font-medium hover:text-primary">{a.name}</button>
                    <span className="block text-xs text-muted-foreground">{formatPrice(a.price_per_night)}/night</span>
                  </td>
                  {days.map((d) => {
                    const ds = toISODate(d);
                    const de = toISODate(addDays(d, 1));
                    const state = !a.is_available ? "closed" : isBusy(a.id, ds, de) ? "busy" : "free";
                    return (
                      <td key={ds} className="px-1 py-2">
                        <div
                          title={`${a.name} · ${ds}`}
                          className={cn("mx-auto h-7 w-full rounded-sm", state === "free" && "bg-success/70", state === "busy" && "bg-destructive/60", state === "closed" && "bg-muted-foreground/40")}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Request form */}
      <section className="container-x mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-display text-3xl">Choose your accommodation</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {accommodations.map((a) => (
              <AccommodationPick key={a.id} a={a} selected={a.id === selectedId} onSelect={() => setSelectedId(a.id)} />
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            {submitted ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto size-12 text-success" />
                <p className="mt-4 font-display text-3xl">Request sent!</p>
                <p className="mt-2 text-sm text-muted-foreground">Thank you. Our team will call or email you shortly to confirm your stay.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button asChild variant="outline"><Link to="/my-bookings">View my bookings</Link></Button>
                  <Button onClick={() => setSubmitted(false)}>Make another request</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <p className="eyebrow">Your request</p>
                  <p className="mt-1 font-display text-3xl">{selected?.name ?? "Select an option"}</p>
                  {selected && <p className="text-sm text-muted-foreground">{TYPE_LABEL[selected.type]} · up to {selected.capacity} guests · {formatPrice(selected.price_per_night)}/night</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="checkin">Check-in</Label>
                    <Input id="checkin" type="date" min={gridFrom} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(toISODate(addDays(new Date(e.target.value + "T00:00:00"), 1))); }} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="checkout">Check-out</Label>
                    <Input id="checkout" type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guests">Guests</Label>
                  <Input id="guests" type="number" min={1} max={selected?.capacity ?? 16} value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
                  {tooMany && <p className="text-xs text-destructive">Maximum {selected?.capacity} guests for {selected?.name}.</p>}
                </div>

                <div className={cn("rounded-lg border px-4 py-3 text-sm", conflict ? "border-destructive/40 bg-destructive/10 text-destructive" : "bg-secondary/60")}>
                  {dateInvalid ? "Choose a valid date range." : conflict ? "Those dates are already taken for this accommodation." : (
                    <div className="flex items-center justify-between">
                      <span>{nights} night{nights === 1 ? "" : "s"} × {formatPrice(selected?.price_per_night ?? 0)}</span>
                      <span className="font-semibold">{formatPrice(Number(selected?.price_per_night ?? 0) * nights)}</span>
                    </div>
                  )}
                </div>

                {user ? (
                  <>
                    <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" name="name" defaultValue={meta.full_name ?? ""} required /></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" defaultValue={meta.phone ?? ""} required /></div>
                      <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={user.email ?? ""} required /></div>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="message">Anything we should know?</Label><Textarea id="message" name="message" rows={3} placeholder="Arrival time, celebrations, dietary needs…" /></div>
                    <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={busy || !selected || !selected.is_available || dateInvalid || conflict || tooMany}>
                      {busy ? "Sending…" : "Send booking request"}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center">
                    <p className="font-medium">Sign in to send your request</p>
                    <p className="mt-1 text-sm text-muted-foreground">It takes a minute and lets you track your booking.</p>
                    <Button asChild className="mt-4"><Link to="/auth" search={{ redirect: `/booking${selected ? `?accommodation=${selected.slug}` : ""}` }}>Sign in or create account</Link></Button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function AccommodationPick({ a, selected, onSelect }: { a: Accommodation; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!a.is_available}
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3 text-left transition disabled:opacity-50",
        selected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40",
      )}
    >
      <img src={a.image_url || DEFAULT_IMAGE_BY_TYPE[a.type]} alt={a.name} loading="lazy" width={1280} height={960} className="size-20 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{a.name}</p>
          {!a.is_available && <Badge variant="destructive" className="text-[10px]">Closed</Badge>}
        </div>
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" /> {a.capacity} guests · {TYPE_LABEL[a.type]}</p>
        <p className="mt-1 text-sm font-medium">{formatPrice(a.price_per_night)} <span className="text-xs font-normal text-muted-foreground">/ night</span></p>
      </div>
    </button>
  );
}
