import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BUILTIN_GALLERY } from "@/lib/resort";
import { resortImagesQuery } from "@/lib/public.functions";
import { cn } from "@/lib/utils";

const TITLE = "Photos — Lock Out Villa";
const DESC = "Browse photos of Lock Out Villa: rooms, luxury tents, halls, the swimming pool, gardens and the children's park.";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resortImagesQuery),
  errorComponent: () => <SiteLayout><p className="container-x py-20 text-center">Could not load photos right now.</p></SiteLayout>,
  component: PhotosPage,
});

function PhotosPage() {
  const { data: uploaded } = useSuspenseQuery(resortImagesQuery);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<{ url: string; caption: string } | null>(null);

  const all = [
    ...uploaded.map((i) => ({ url: i.url, caption: i.caption ?? "", category: i.category })),
    ...BUILTIN_GALLERY,
  ];
  const categories = ["all", ...Array.from(new Set(all.map((i) => i.category)))];
  const shown = filter === "all" ? all : all.filter((i) => i.category === filter);

  return (
    <SiteLayout>
      <section className="container-x pt-14">
        <p className="eyebrow">Gallery</p>
        <h1 className="mt-2 font-display text-5xl">Photos</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">A glimpse of the villa, the grounds and the little corners guests love most.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm capitalize transition",
                filter === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="container-x mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((img, i) => (
          <button
            key={img.url + i}
            onClick={() => setActive(img)}
            className="group mb-4 block w-full overflow-hidden rounded-xl bg-muted text-left"
          >
            <img src={img.url} alt={img.caption || "Lock Out Villa"} loading="lazy" className="w-full object-cover transition duration-700 group-hover:scale-105" />
            {img.caption && <p className="px-3 py-2 text-sm text-muted-foreground">{img.caption}</p>}
          </button>
        ))}
      </section>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4" onClick={() => setActive(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-background/20 p-2 text-primary-foreground" aria-label="Close"><X /></button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={active.url} alt={active.caption} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            {active.caption && <figcaption className="mt-3 text-center text-sm text-primary-foreground/80">{active.caption}</figcaption>}
          </figure>
        </div>
      )}
    </SiteLayout>
  );
}
