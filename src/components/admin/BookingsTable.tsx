import { useState } from "react";
import { Phone, Mail, MessageCircle, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, nightsBetween } from "@/lib/resort";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export type AdminBooking = Database["public"]["Tables"]["bookings"]["Row"] & {
  accommodations: { name: string; price_per_night: number; capacity: number } | null;
};

type Status = Database["public"]["Enums"]["booking_status"];
const STATUS_VARIANT: Record<Status, "secondary" | "default" | "destructive"> = { pending: "secondary", confirmed: "default", cancelled: "destructive" };

export function BookingsTable({ bookings, loading, onChanged }: { bookings: AdminBooking[]; loading: boolean; onChanged: () => void }) {
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const shown = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Booking ${status}`);
    onChanged();
  }

  async function saveNote(id: string) {
    const { error } = await supabase.from("bookings").update({ admin_notes: note }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Note saved");
    setNoteFor(null);
    onChanged();
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        {(["pending", "confirmed", "cancelled", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-sm capitalize", filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {f} {f !== "all" && <span className="opacity-70">({bookings.filter((b) => b.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
      {!loading && shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No {filter === "all" ? "" : filter} bookings.</p>}

      <ul className="divide-y">
        {shown.map((b) => {
          const nights = nightsBetween(b.check_in, b.check_out);
          const total = Number(b.accommodations?.price_per_night ?? 0) * nights;
          const phone = b.guest_phone.replace(/[^\d+]/g, "");
          return (
            <li key={b.id} className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl">{b.accommodations?.name}</p>
                  <Badge variant={STATUS_VARIANT[b.status]} className="capitalize">{b.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {nights} night{nights === 1 ? "" : "s"} · {b.guests} guests · <span className="font-medium text-foreground">{formatPrice(total)}</span></p>
                {b.message && <p className="mt-2 rounded-md bg-muted/60 p-2 text-sm italic">“{b.message}”</p>}
                <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(b.created_at).toLocaleString()}</p>
              </div>

              <div>
                <p className="font-semibold">{b.guest_name}</p>
                <p className="text-sm text-muted-foreground">{b.guest_phone}</p>
                <p className="text-sm text-muted-foreground">{b.guest_email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`tel:${phone}`}><Phone className="size-4" /> Call</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(`Hello ${b.guest_name}, this is Lock Out Villa regarding your booking request for ${b.accommodations?.name} (${b.check_in} to ${b.check_out}).`)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={`mailto:${b.guest_email}?subject=${encodeURIComponent("Your Lock Out Villa booking request")}`}><Mail className="size-4" /> Email</a></Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:items-end">
                <div className="flex gap-2">
                  {b.status !== "confirmed" && <Button size="sm" onClick={() => setStatus(b.id, "confirmed")} className="bg-success text-success-foreground hover:bg-success/90"><Check className="size-4" /> Confirm</Button>}
                  {b.status !== "cancelled" && <Button size="sm" variant="destructive" onClick={() => setStatus(b.id, "cancelled")}><X className="size-4" /> Cancel</Button>}
                  {b.status !== "pending" && <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "pending")}><RotateCcw className="size-4" /> Pending</Button>}
                </div>
                {noteFor === b.id ? (
                  <div className="flex w-full gap-2 lg:w-72">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note visible to guest" />
                    <Button size="sm" onClick={() => saveNote(b.id)}>Save</Button>
                  </div>
                ) : (
                  <button className="text-xs text-muted-foreground underline" onClick={() => { setNoteFor(b.id); setNote(b.admin_notes ?? ""); }}>
                    {b.admin_notes ? `Note: ${b.admin_notes}` : "Add a note for guest"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
