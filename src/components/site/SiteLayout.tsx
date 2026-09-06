import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Phone, X, LogOut, CalendarCheck, LayoutDashboard } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RESORT } from "@/lib/resort";
import { useAuth, signOut } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/photos", label: "Photos" },
  { to: "/booking", label: "Booking" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteLayout({ children, transparentHeader = false }: { children: ReactNode; transparentHeader?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header transparent={transparentHeader} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Header({ transparent }: { transparent: boolean }) {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-40 text-primary-foreground"
          : "sticky top-0 z-40 border-b bg-background/90 backdrop-blur"
      }
    >
      <div className="container-x flex h-18 items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold tracking-wide">Lock Out Villa</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium tracking-wide opacity-80 transition hover:opacity-100"
              activeProps={{ className: "opacity-100 underline underline-offset-8 decoration-accent decoration-2" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isAdmin ? (
                <Button asChild size="sm" variant={transparent ? "secondary" : "outline"}>
                  <Link to="/admin"><LayoutDashboard className="size-4" /> Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant={transparent ? "secondary" : "outline"}>
                  <Link to="/my-bookings"><CalendarCheck className="size-4" /> My bookings</Link>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleSignOut} className={transparent ? "hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className={transparent ? "hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/booking">Book a stay</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-background text-foreground md:hidden">
          <nav className="container-x flex flex-col gap-1 py-4">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted" activeProps={{ className: "bg-muted" }} activeOptions={{ exact: n.to === "/" }}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t pt-4">
              {user ? (
                <>
                  <Button asChild variant="outline"><Link to={isAdmin ? "/admin" : "/my-bookings"} onClick={() => setOpen(false)}>{isAdmin ? "Dashboard" : "My bookings"}</Link></Button>
                  <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/booking" onClick={() => setOpen(false)}>Book a stay</Link></Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-sidebar text-sidebar-foreground">
      <div className="container-x grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">Lock Out Villa</p>
          <p className="mt-3 max-w-xs text-sm text-sidebar-foreground/70">{RESORT.tagline}. Rooms, luxury tents, halls, a garden, a children's park and a pool.</p>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-sidebar-primary">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Contact</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href={`tel:${RESORT.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-sidebar-primary"><Phone className="size-4" /> {RESORT.phone}</a></li>
            <li><a href={`mailto:${RESORT.email}`} className="hover:text-sidebar-primary">{RESORT.email}</a></li>
            <li className="text-sidebar-foreground/70">{RESORT.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-sidebar-foreground/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Lock Out Villa. All rights reserved.</span>
          <Link to="/admin-login" className="hover:text-sidebar-foreground">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
