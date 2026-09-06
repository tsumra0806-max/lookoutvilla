import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_IMAGE_BY_TYPE, TYPE_LABEL, formatPrice } from "@/lib/resort";
import type { Accommodation } from "@/lib/public.functions";

export function AccommodationCard({ a }: { a: Accommodation }) {
  const img = a.image_url || DEFAULT_IMAGE_BY_TYPE[a.type];
  return (
    <article className="group overflow-hidden rounded-xl border bg-card shadow-soft transition hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={a.name}
          loading="lazy"
          width={1280}
          height={960}
          className="size-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge className="bg-background/90 text-foreground hover:bg-background">{TYPE_LABEL[a.type]}</Badge>
          {!a.is_available && <Badge variant="destructive">Unavailable</Badge>}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl">{a.name}</h3>
          <p className="text-right">
            <span className="text-lg font-semibold">{formatPrice(a.price_per_night)}</span>
            <span className="block text-xs text-muted-foreground">per night</span>
          </p>
        </div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" /> Up to {a.capacity} guests
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
        <Button asChild className="mt-4 w-full" variant={a.is_available ? "default" : "secondary"} disabled={!a.is_available}>
          <Link to="/booking" search={{ accommodation: a.slug }}>
            {a.is_available ? "Check availability" : "Currently unavailable"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
