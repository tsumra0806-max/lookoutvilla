import heroImg from "@/assets/hero.jpg";
import roomImg from "@/assets/room.jpg";
import tentImg from "@/assets/tent.jpg";
import hallImg from "@/assets/hall.jpg";
import gardenImg from "@/assets/garden.jpg";
import parkImg from "@/assets/park.jpg";
import poolImg from "@/assets/pool.jpg";

export const RESORT = {
  name: "Lock Out Villa",
  tagline: "A private garden resort where time slows down",
  // Placeholder contact details — replace with the real ones.
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  email: "stay@lockoutvilla.com",
  address: "Lock Out Villa, Hillside Road, Near the Lake",
  hours: "Check-in 1:00 PM · Check-out 11:00 AM",
  currency: "₹",
};

/**
 * Built-in placeholder imagery. To replace a photo, drop a new file into
 * src/assets with the same name — or upload new photos from the admin dashboard.
 */
export const IMAGES = {
  hero: heroImg,
  room: roomImg,
  tent: tentImg,
  hall: hallImg,
  garden: gardenImg,
  park: parkImg,
  pool: poolImg,
};

export type AccommodationType = "room" | "tent" | "hall";

export const DEFAULT_IMAGE_BY_TYPE: Record<AccommodationType, string> = {
  room: roomImg,
  tent: tentImg,
  hall: hallImg,
};

export const TYPE_LABEL: Record<AccommodationType, string> = {
  room: "Room",
  tent: "Luxury Tent",
  hall: "Hall",
};

export const BUILTIN_GALLERY = [
  { url: heroImg, caption: "The villa at golden hour", category: "resort" },
  { url: poolImg, caption: "Swimming pool", category: "amenities" },
  { url: roomImg, caption: "Garden-view room", category: "rooms" },
  { url: tentImg, caption: "Luxury tent under the mango trees", category: "tents" },
  { url: hallImg, caption: "Hall 1 set for a family gathering", category: "halls" },
  { url: gardenImg, caption: "The garden", category: "amenities" },
  { url: parkImg, caption: "Children's park", category: "amenities" },
];

export const AMENITIES = [
  { key: "pool", title: "Swimming Pool", image: poolImg, text: "A sparkling outdoor pool with loungers and shade, open sunrise to sunset." },
  { key: "garden", title: "Landscaped Garden", image: gardenImg, text: "Winding stone paths, hibiscus hedges and quiet pergolas for slow mornings." },
  { key: "park", title: "Children's Park", image: parkImg, text: "Swings, slides and soft lawns — a safe corner where little guests run free." },
];

export function formatPrice(n: number | string) {
  const v = typeof n === "string" ? Number(n) : n;
  return `${RESORT.currency}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Half-open [start, end) range overlap check on ISO dates. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}
