import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_IMAGE_BY_TYPE } from "@/lib/resort";
import type { Database } from "@/integrations/supabase/types";

type Acc = Database["public"]["Tables"]["accommodations"]["Row"];
const CATEGORIES = ["resort", "rooms", "tents", "halls", "amenities", "gallery"];
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

async function uploadFile(file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("resort-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from("resort-images").createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("Could not create image link");
  return { path, url: data.signedUrl };
}

export function ImagesManager({ accommodations, onChanged }: { accommodations: Acc[]; onChanged: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GalleryUploader onChanged={onChanged} />
      <AccommodationPhotos accommodations={accommodations} onChanged={onChanged} />
    </div>
  );
}

function GalleryUploader({ onChanged }: { onChanged: () => void }) {
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("gallery");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const images = useQuery({
    queryKey: ["admin-images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resort_images").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Choose an image first."); return; }
    setBusy(true);
    try {
      const { path, url } = await uploadFile(file, "gallery");
      const { error } = await supabase.from("resort_images").insert({ url, storage_path: path, caption: caption || null, category });
      if (error) throw error;
      toast.success("Photo added to gallery");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      images.refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, path: string | null) {
    const { error } = await supabase.from("resort_images").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (path) await supabase.storage.from("resort-images").remove([path]);
    images.refetch();
    onChanged();
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <p className="inline-flex items-center gap-2 font-display text-2xl"><ImagePlus className="size-5 text-accent" /> Gallery photos</p>
        <p className="text-sm text-muted-foreground">Uploaded photos appear on the Photos page alongside the built-in set.</p>
      </div>
      <form onSubmit={onUpload} className="space-y-3 p-4">
        <div className="space-y-1"><Label htmlFor="gal-file">Image</Label><Input id="gal-file" ref={fileRef} type="file" accept="image/*" required /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="gal-cap">Caption</Label><Input id="gal-cap" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Sunset by the pool" /></div>
          <div className="space-y-1"><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={busy}><Upload className="size-4" /> {busy ? "Uploading…" : "Upload photo"}</Button>
      </form>
      <div className="grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-3">
        {images.data?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No uploaded photos yet.</p>}
        {images.data?.map((img) => (
          <figure key={img.id} className="group relative overflow-hidden rounded-lg border">
            <img src={img.url} alt={img.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="truncate px-2 py-1 text-xs text-muted-foreground">{img.caption || img.category}</figcaption>
            <Button size="icon" variant="destructive" className="absolute right-2 top-2 size-7 opacity-0 transition group-hover:opacity-100" onClick={() => remove(img.id, img.storage_path)} aria-label="Delete photo"><Trash2 className="size-3.5" /></Button>
          </figure>
        ))}
      </div>
    </div>
  );
}

function AccommodationPhotos({ accommodations, onChanged }: { accommodations: Acc[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function replace(a: Acc, file: File) {
    setBusyId(a.id);
    try {
      const { url } = await uploadFile(file, `accommodations/${a.slug}`);
      const { error } = await supabase.from("accommodations").update({ image_url: url }).eq("id", a.id);
      if (error) throw error;
      toast.success(`${a.name} photo updated`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reset(a: Acc) {
    const { error } = await supabase.from("accommodations").update({ image_url: null }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <p className="font-display text-2xl">Accommodation photos</p>
        <p className="text-sm text-muted-foreground">Replace the cover photo shown for each room, tent or hall.</p>
      </div>
      <ul className="divide-y">
        {accommodations.map((a) => (
          <li key={a.id} className="flex items-center gap-3 p-3">
            <img src={a.image_url || DEFAULT_IMAGE_BY_TYPE[a.type]} alt={a.name} className="size-16 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.image_url ? "Custom photo" : "Using default photo"}</p>
            </div>
            <label className="cursor-pointer">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted">
                <Upload className="size-3.5" /> {busyId === a.id ? "Uploading…" : "Replace"}
              </span>
              <input type="file" accept="image/*" className="sr-only" disabled={busyId === a.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(a, f); e.target.value = ""; }} />
            </label>
            {a.image_url && <Button size="sm" variant="ghost" onClick={() => reset(a)}>Reset</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
