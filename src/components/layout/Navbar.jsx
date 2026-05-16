import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  { label: "Analyse ABF", path: "/analyse" },
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
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(5,8,16,0.85)"
          : "rgba(5,8,16,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #C9A063 0%, #a87c3e 100%)" }}
            >
              <span className="font-urbanist font-bold text-[11px] tracking-tight" style={{ color: "#050810" }}>MP</span>
            </div>
            <span className="font-urbanist text-[15px] font-bold tracking-tight text-white">
              MonPlanFin
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 rounded-lg"
                style={{
                  color: isActive(link.path) ? "#C9A063" : "rgba(148,163,184,0.8)",
                }}
              >
                {link.label}
                {isActive(link.path) && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{ background: "#C9A063" }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-[1px]" style={{ background: "rgba(255,255,255,0.1)" }} />
                <span className="text-[13px] font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>
                  {user?.full_name?.split(" ")[0] || "Mon compte"}
                </span>
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center gap-1.5 text-[13px] transition-colors"
                  style={{ color: "rgba(148,163,184,0.6)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.6)"}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="px-4 py-2 text-[13.5px] font-medium transition-colors"
                  style={{ color: "rgba(148,163,184,0.7)" }}
                >
                  Connexion
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="px-5 py-2 text-[13.5px] font-semibold rounded-xl transition-all duration-200"
                  style={{ background: "#C9A063", color: "#050810" }}
                >
                  Commencer
                </button>
              </div>
            )}
          </div>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0" style={{ background: "#0A0F1E", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex flex-col h-full pt-14 pb-8">
                <div className="px-5 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#C9A063" }}>
                      <span className="font-urbanist font-bold text-[10px]" style={{ color: "#050810" }}>MP</span>
                    </div>
                    <span className="font-urbanist font-semibold text-sm text-white tracking-tight">MonPlanFin</span>
                  </div>
                </div>
                <div className="flex-1 px-3 space-y-0.5">
                  {links.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-[13.5px] font-medium transition-all"
                      style={
                        isActive(link.path)
                          ? { background: "#C9A063", color: "#050810" }
                          : { color: "rgba(148,163,184,0.8)" }
                      }
                    >
                      {link.label}
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                  ))}
                </div>
                <div className="px-5 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {isAuthenticated ? (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors"
                      style={{ color: "rgba(148,163,184,0.7)" }}
                      onClick={() => { base44.auth.logout(); setOpen(false); }}
                    >
                      <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                  ) : (
                    <button
                      className="w-full py-2.5 text-sm font-semibold rounded-xl"
                      style={{ background: "#C9A063", color: "#050810" }}
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