import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { IMAGES, RESORT } from "@/lib/resort";

const TITLE = "Contact — Lock Out Villa";
const DESC = "Call, WhatsApp or email Lock Out Villa to plan your stay, ask about rates or arrange a celebration in our halls.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const tel = RESORT.phone.replace(/\s/g, "");
  const items = [
    { icon: Phone, label: "Phone", value: RESORT.phone, href: `tel:${tel}` },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: `https://wa.me/${RESORT.whatsapp}` },
    { icon: Mail, label: "Email", value: RESORT.email, href: `mailto:${RESORT.email}` },
    { icon: MapPin, label: "Address", value: RESORT.address },
    { icon: Clock, label: "Hours", value: RESORT.hours },
  ];

  return (
    <SiteLayout>
      <section className="container-x grid gap-12 pt-14 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="mt-2 font-display text-5xl">Contact</h1>
          <p className="mt-3 max-w-md text-muted-foreground">We're a small family-run resort and happy to answer questions about rooms, tents, halls or group stays.</p>
          <ul className="mt-10 space-y-6">
            {items.map((it) => (
              <li key={it.label} className="flex items-start gap-4">
                <span className="mt-0.5 grid size-10 place-items-center rounded-full bg-secondary text-accent"><it.icon className="size-5" /></span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{it.label}</p>
                  {it.href ? (
                    <a href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-lg font-medium hover:text-primary">{it.value}</a>
                  ) : (
                    <p className="text-lg font-medium">{it.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><a href={`tel:${tel}`}><Phone className="size-4" /> Call now</a></Button>
            <Button asChild size="lg" variant="outline"><Link to="/booking">Request a booking</Link></Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl">
          <img src={IMAGES.garden} alt="Lock Out Villa garden" loading="lazy" width={1280} height={960} className="size-full object-cover" />
        </div>
      </section>
    </SiteLayout>
  );
}
