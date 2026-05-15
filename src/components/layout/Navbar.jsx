import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { base44 } from "@/api/base44Client";
import { Menu, LogOut, ChevronRight } from "lucide-react";

const publicLinks = [
  { label: "Accueil", path: "/" },
  { label: "Calculatrices", path: "/calculatrices" },
];

const privateLinks = [
  { label: "Tableau de bord", path: "/dashboard" },
  { label: "Budget", path: "/budget" },
  { label: "Placements", path: "/placements" },
  { label: "Plan financier", path: "/plan" },
];

export default function Navbar() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      setIsAuthenticated(authed);
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
    });
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const links = isAuthenticated ? [...publicLinks, ...privateLinks] : publicLinks;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-float-sm border-b border-border/60"
          : "bg-white border-b border-border/40"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs tracking-tight">MP</span>
            </div>
            <span className="font-sans text-[15px] font-700 tracking-tight text-foreground">
              MonPlanFin
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 rounded-lg ${
                  isActive(link.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-accent" />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-[1px] bg-border" />
                <span className="text-[13px] text-muted-foreground font-medium">
                  {user?.full_name?.split(" ")[0] || "Mon compte"}
                </span>
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="px-4 py-2 text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Connexion
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="px-5 py-2 text-[13.5px] font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Commencer
                </button>
              </div>
            )}
          </div>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 border-border/60">
              <div className="flex flex-col h-full pt-14 pb-8">
                <div className="px-5 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">MP</span>
                    </div>
                    <span className="font-semibold text-sm tracking-tight">MonPlanFin</span>
                  </div>
                </div>
                <div className="flex-1 px-3 space-y-0.5">
                  {links.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-[13.5px] font-medium transition-all ${
                        isActive(link.path)
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {link.label}
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                  ))}
                </div>
                <div className="px-5 pt-6 border-t border-border/60">
                  {isAuthenticated ? (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                      onClick={() => { base44.auth.logout(); setOpen(false); }}
                    >
                      <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                  ) : (
                    <button
                      className="w-full py-2.5 text-sm font-semibold bg-primary text-white rounded-lg"
                      onClick={() => { base44.auth.redirectToLogin(); setOpen(false); }}
                    >
                      Connexion / Inscription
                    </button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}