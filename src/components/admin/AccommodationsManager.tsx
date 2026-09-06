import { useState } from "react";
import { Trash2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_LABEL, formatPrice, toISODate, addDays } from "@/lib/resort";
import type { Database } from "@/integrations/supabase/types";
import type { AdminBooking } from "./BookingsTable";

type Acc = Database["public"]["Tables"]["accommodations"]["Row"];
type Block = Database["public"]["Tables"]["accommodation_blocks"]["Row"];

export function AccommodationsManager({
  accommodations, blocks, bookings, occupiedToday, onChanged,
}: { accommodations: Acc[]; blocks: Block[]; bookings: AdminBooking[]; occupiedToday: Set<string>; onChanged: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <p className="font-display text-2xl">Accommodations</p>
          <p className="text-sm text-muted-foreground">Edit nightly prices, capacity and open/closed status.</p>
        </div>
        <ul className="divide-y">
          {accommodations.map((a) => (
            <AccommodationRow key={a.id} a={a} busyToday={occupiedToday.has(a.id)} upcoming={bookings.filter((b) => b.accommodation_id === a.id && b.status !== "cancelled" && b.check_out >= toISODate(new Date())).length} onChanged={onChanged} />
          ))}
        </ul>
      </div>
      <BlocksPanel accommodations={accommodations} blocks={blocks} onChanged={onChanged} />
    </div>
  );
}

function AccommodationRow({ a, busyToday, upcoming, onChanged }: { a: Acc; busyToday: boolean; upcoming: number; onChanged: () => void }) {
  const [price, setPrice] = useState(String(a.price_per_night));
  const [capacity, setCapacity] = useState(String(a.capacity));
  const [saving, setSaving] = useState(false);
  const dirty = price !== String(a.price_per_night) || capacity !== String(a.capacity);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("accommodations").update({ price_per_night: Number(price), capacity: Number(capacity) }).eq("id", a.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${a.name} updated`);
    onChanged();
  }

  async function toggle(v: boolean) {
    const { error } = await supabase.from("accommodations").update({ is_available: v }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(v ? `${a.name} is now open for booking` : `${a.name} closed`);
    onChanged();
  }

  return (
    <li className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{a.name}</p>
          <Badge variant="outline">{TYPE_LABEL[a.type]}</Badge>
          {a.is_available ? (
            busyToday ? <Badge variant="destructive">Occupied tonight</Badge> : <Badge className="bg-success text-success-foreground hover:bg-success">Free tonight</Badge>
          ) : <Badge variant="secondary">Closed</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{upcoming} upcoming booking{upcoming === 1 ? "" : "s"} · currently {formatPrice(a.price_per_night)}/night</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="space-y-1"><Label className="text-xs">Price / night</Label><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 w-32" /></div>
          <div className="space-y-1"><Label className="text-xs">Capacity</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="h-9 w-24" /></div>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 md:flex-col md:items-end">
        <Label htmlFor={`avail-${a.id}`} className="text-xs text-muted-foreground">{a.is_available ? "Open" : "Closed"}</Label>
        <Switch id={`avail-${a.id}`} checked={a.is_available} onCheckedChange={toggle} />
      </div>
    </li>
  );
}

function BlocksPanel({ accommodations, blocks, onChanged }: { accommodations: Acc[]; blocks: Block[]; onChanged: () => void }) {
  const [accId, setAccId] = useState(accommodations[0]?.id ?? "");
  const [start, setStart] = useState(toISODate(new Date()));
  const [end, setEnd] = useState(toISODate(addDays(new Date(), 1)));
  const [reason, setReason] = useState("");

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!accId || !(start < end)) { toast.error("Choose a valid date range."); return; }
    const { error } = await supabase.from("accommodation_blocks").insert({ accommodation_id: accId, start_date: start, end_date: end, reason: reason || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Dates blocked");
    setReason("");
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("accommodation_blocks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  const nameOf = (id: string) => accommodations.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <p className="inline-flex items-center gap-2 font-display text-2xl"><CalendarOff className="size-5 text-accent" /> Block dates</p>
        <p className="text-sm text-muted-foreground">Mark an accommodation unavailable for maintenance, private use or offline bookings.</p>
      </div>
      <form onSubmit={addBlock} className="space-y-3 p-4">
        <div className="space-y-1"><Label>Accommodation</Label>
          <Select value={accId} onValueChange={setAccId}>
            <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{accommodations.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label>From</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="space-y-1"><Label>Until (exclusive)</Label><Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maintenance, walk-in guest…" /></div>
        <Button type="submit" className="w-full">Block these dates</Button>
      </form>
      <ul className="divide-y border-t">
        {blocks.length === 0 && <li className="p-4 text-sm text-muted-foreground">No upcoming blocked dates.</li>}
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{nameOf(b.accommodation_id)}</p>
              <p className="text-muted-foreground">{b.start_date} → {b.end_date}{b.reason ? ` · ${b.reason}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(b.id)} aria-label="Remove block"><Trash2 className="size-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
