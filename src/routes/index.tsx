import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Flower2, Waves, Baby, Tent, BedDouble, PartyPopper, Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AccommodationCard } from "@/components/site/AccommodationCard";
import { Button } from "@/components/ui/button";
import { AMENITIES, IMAGES, RESORT } from "@/lib/resort";
import { accommodationsQuery } from "@/lib/public.functions";

const TITLE = "Lock Out Villa — Garden Resort, Rooms, Tents & Halls";
const DESC = "Book rooms, luxury tents and event halls at Lock Out Villa: a private garden resort with a swimming pool, children's park and lush gardens.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accommodationsQuery),
  errorComponent: () => <SiteLayout><p className="container-x py-20 text-center">Could not load the resort right now.</p></SiteLayout>,
  component: HomePage,
});

function HomePage() {
  const { data: accommodations } = useSuspenseQuery(accommodationsQuery);
  const rooms = accommodations.filter((a) => a.type === "room");
  const tents = accommodations.filter((a) => a.type === "tent");
  const halls = accommodations.filter((a) => a.type === "hall");

  return (
    <SiteLayout transparentHeader>
      {/* Hero */}
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <img src={IMAGES.hero} alt="Lock Out Villa pool at sunset" width={1920} height={1080} className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/60 via-foreground/20 to-foreground/70" />
        <div className="container-x flex min-h-[92vh] flex-col justify-end pb-20 pt-40 text-primary-foreground">
          <p className="eyebrow text-warning">Private garden resort</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">
            Lock the world out. <em className="font-normal italic">Let the garden in.</em>
          </h1>
          <p className="mt-6 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
            Four cosy rooms, two luxury tents and two celebration halls set around a pool, a children's park and gardens that hum with birdsong.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/booking">Check availability <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/photos">View photos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="border-b bg-card">
        <div className="container-x grid grid-cols-2 divide-x divide-border md:grid-cols-4">
          {[
            { icon: BedDouble, label: "4 Rooms", sub: "4 guests each" },
            { icon: Tent, label: "2 Luxury Tents", sub: "4 guests each" },
            { icon: PartyPopper, label: "2 Halls", sub: "up to 16 & 10 guests" },
            { icon: Waves, label: "Pool · Garden · Park", sub: "open to all guests" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-6 first:pl-0">
              <f.icon className="size-6 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accommodations */}
      <section className="container-x py-20">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Stay</p>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">Rooms & Tents</h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">Every room and tent sleeps four. Prices are per night; final confirmation comes from our team after you send a request.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...rooms, ...tents].map((a) => <AccommodationCard key={a.id} a={a} />)}
        </div>
      </section>

      {/* Halls */}
      <section className="bg-secondary/60 py-20">
        <div className="container-x">
          <div className="mb-10">
            <p className="eyebrow">Celebrate</p>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">Halls for gatherings</h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">Birthdays, reunions, retreats and small weddings — Hall 1 hosts up to 16 guests, Hall 2 up to 10.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {halls.map((a) => <AccommodationCard key={a.id} a={a} />)}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="container-x py-20">
        <p className="eyebrow">Amenities</p>
        <h2 className="mt-2 font-display text-4xl sm:text-5xl">Garden, park & pool</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {AMENITIES.map((am, i) => {
            const Icon = [Waves, Flower2, Baby][i]!;
            return (
              <figure key={am.key} className="group">
                <div className="overflow-hidden rounded-xl">
                  <img src={am.image} alt={am.title} loading="lazy" width={1280} height={960} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <figcaption className="mt-4">
                  <p className="inline-flex items-center gap-2 font-display text-2xl"><Icon className="size-5 text-accent" /> {am.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{am.text}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-14 text-primary-foreground sm:px-14">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-4xl">Ready for a slow weekend?</h2>
              <p className="mt-2 max-w-md text-primary-foreground/80">Send a booking request online, or call us and we'll hold your dates.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/booking">Request a booking</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href={`tel:${RESORT.phone.replace(/\s/g, "")}`}><Phone className="size-4" /> {RESORT.phone}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
