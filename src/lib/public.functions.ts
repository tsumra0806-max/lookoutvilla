import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type Accommodation = Database["public"]["Tables"]["accommodations"]["Row"];
export type ResortImage = Database["public"]["Tables"]["resort_images"]["Row"];
export type BookedRange = { accommodation_id: string; check_in: string; check_out: string; status: string };
export type Block = Database["public"]["Tables"]["accommodation_blocks"]["Row"];

export const getAccommodations = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("accommodations")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Accommodation[];
});

export const getResortImages = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("resort_images")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ResortImage[];
});

const rangeSchema = z.object({ from: z.string(), to: z.string() });

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [booked, blocks] = await Promise.all([
      sb.rpc("get_booked_ranges", { _from: data.from, _to: data.to }),
      sb
        .from("accommodation_blocks")
        .select("*")
        .lt("start_date", data.to)
        .gt("end_date", data.from),
    ]);
    if (booked.error) throw new Error(booked.error.message);
    if (blocks.error) throw new Error(blocks.error.message);
    return { booked: (booked.data ?? []) as BookedRange[], blocks: (blocks.data ?? []) as Block[] };
  });

export const accommodationsQuery = queryOptions({
  queryKey: ["accommodations"],
  queryFn: () => getAccommodations(),
});

export const resortImagesQuery = queryOptions({
  queryKey: ["resort-images"],
  queryFn: () => getResortImages(),
});

export const availabilityQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["availability", from, to],
    queryFn: () => getAvailability({ data: { from, to } }),
  });
