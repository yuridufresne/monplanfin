import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { base44 } from "@/api/base44Client";
import { Menu, LogOut, ChevronRight } from "lucide-react";

const publicLinks = [
  { label: "Accueil", path: "/" },
  { label: "Calculatrices", path: "/calculatrices" },
  { label: "Éducation", path: "/education" },
];
const privateLinks = [
  { label: "Tableau de bord", path: "/dashboard" },
  { label: "Analyse ABF", path: "/analyse" },
  { label: "Feuille Résumé", path: "/resume" },
  { label: "Placements", path: "/placements" },
  { label: "Plan financier", path: "/plan" },
  { label: "Studio de décaissement", path: "/studio" },
  { label: "Protection", path: "/protection" },
  { label: "Immobilier", path: "/immobilier" },
];

export default function Navbar() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const deconnexion = async () => { try { await base44.auth.logout(); } catch (e) {} window.location.href = "/"; };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      setIsAuthenticated(authed);
      if (authed) { const me = await base44.auth.me(); setUser(me); }
    });
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const isAgent = user?.type_compte === "agent" || user?.type_compte === "directeur";
  const isAdmin = user?.role === "admin";
  const links = !isAuthenticated
    ? publicLinks
    : [
        ...publicLinks,
        ...privateLinks,
        ...(isAgent ? [{ label: "Mes dossiers", path: "/agent" }] : []),
        ...(isAdmin ? [{ label: "Administration", path: "/admin/dossiers" }] : []),
      ];

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300" style={{
      background: scrolled ? "rgba(5,8,16,0.75)" : "rgba(5,8,16,0.45)",
      backdropFilter: "blur(28px) saturate(180%)",
      WebkitBackdropFilter: "blur(28px) saturate(180%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.05)" : "none",
    }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(201,160,99,0.12)",
              border: "1px solid rgba(201,160,99,0.25)",
            }}>
              <span style={{ fontFamily: "var(--font-urbanist)", fontWeight: 800, fontSize: 12, color: "#C9A063", letterSpacing: "-0.02em" }}>MP</span>
            </div>
            <span style={{ fontFamily: "var(--font-urbanist)", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>MonPlanFin</span>
            <span style={{
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#f59e0b",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              lineHeight: 1.4,
              marginLeft: 2,
            }}>Beta</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(link => (
              <Link key={link.path} to={link.path} style={{
                position: "relative", padding: "8px 14px", fontSize: 13.5, fontWeight: 500,
                color: isActive(link.path) ? "#C9A063" : "rgba(148,163,184,0.75)",
                textDecoration: "none", borderRadius: 10, transition: "color 0.15s",
              }}>
                {link.label}
                {isActive(link.path) && (
                  <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 16, height: 2, borderRadius: 99, background: "#C9A063", boxShadow: "0 0 6px rgba(201,160,99,0.6)" }} />
                )}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {user?.role === "admin" && (
                  <>
                    <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
                    <Link to="/admin/dossiers" style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(148,163,184,0.65)",
                      textDecoration: "none", padding: "6px 10px", borderRadius: 8, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#C9A063"; e.currentTarget.style.background = "rgba(201,160,99,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.65)"; e.currentTarget.style.background = "transparent"; }}>
                      🔒 Dossiers
                    </Link>
                    <Link to="/admin/feedback" style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(148,163,184,0.65)",
                      textDecoration: "none", padding: "6px 10px", borderRadius: 8, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.65)"; e.currentTarget.style.background = "transparent"; }}>
                      💬 Feedback
                    </Link>
                  </>
                )}
                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(148,163,184,0.7)" }}>{user?.full_name?.split(" ")[0] || "Mon compte"}</span>
                <button onClick={deconnexion} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(148,163,184,0.55)", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.55)"; e.currentTarget.style.background = "transparent"; }}>
                  <LogOut style={{ width: 13, height: 13 }} /> Déconnexion
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => base44.auth.redirectToLogin()} style={{ padding: "8px 16px", fontSize: 13.5, fontWeight: 500, color: "rgba(148,163,184,0.75)", background: "none", border: "none", cursor: "pointer", borderRadius: 10 }}>Connexion</button>
                <button onClick={() => base44.auth.redirectToLogin()} style={{
                  padding: "9px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", borderRadius: 12,
                  background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                  color: "#050810", border: "none",
                  boxShadow: "0 4px 14px rgba(201,160,99,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}>Commencer</button>
              </div>
            )}
          </div>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button style={{ padding: 8, borderRadius: 10, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", cursor: "pointer" }}>
                <Menu style={{ width: 18, height: 18 }} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0" style={{ background: "rgba(8,12,24,0.95)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 56, paddingBottom: 32 }}>
                <div style={{ padding: "0 20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #C9A063, #e6c07a)" }}>
                      <span style={{ fontFamily: "var(--font-urbanist)", fontWeight: 800, fontSize: 10, color: "#050810" }}>MP</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-urbanist)", fontWeight: 700, fontSize: 14, color: "#fff" }}>MonPlanFin</span>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.35)",
                      color: "#f59e0b",
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                      lineHeight: 1.4,
                    }}>Beta</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                   {links.map(link => (
                     <Link key={link.path} to={link.path} onClick={() => setOpen(false)} style={{
                       display: "flex", alignItems: "center", justifyContent: "space-between",
                       padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 500,
                       textDecoration: "none", transition: "all 0.15s",
                       ...(isActive(link.path)
                         ? { background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontWeight: 700, boxShadow: "0 4px 12px rgba(201,160,99,0.25)" }
                         : { color: "rgba(148,163,184,0.8)" })
                     }}>
                       {link.label}
                       <ChevronRight style={{ width: 13, height: 13, opacity: 0.4 }} />
                     </Link>
                   ))}
                   {user?.role === "admin" && (
                     <>
                       <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                       <Link to="/admin/dossiers" onClick={() => setOpen(false)} style={{
                         display: "flex", alignItems: "center", justifyContent: "space-between",
                         padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 500,
                         textDecoration: "none", transition: "all 0.15s",
                         ...(isActive("/admin/dossiers")
                           ? { background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontWeight: 700, boxShadow: "0 4px 12px rgba(201,160,99,0.25)" }
                           : { color: "rgba(148,163,184,0.8)" })
                       }}>
                         🔒 Dossiers reçus
                         <ChevronRight style={{ width: 13, height: 13, opacity: 0.4 }} />
                       </Link>
                       <Link to="/admin/feedback" onClick={() => setOpen(false)} style={{
                         display: "flex", alignItems: "center", justifyContent: "space-between",
                         padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 500,
                         textDecoration: "none", transition: "all 0.15s",
                         ...(isActive("/admin/feedback")
                           ? { background: "linear-gradient(135deg, #f59e0b, #e6c07a)", color: "#050810", fontWeight: 700, boxShadow: "0 4px 12px rgba(245,158,11,0.25)" }
                           : { color: "rgba(148,163,184,0.8)" })
                       }}>
                         💬 Feedback Beta
                         <ChevronRight style={{ width: 13, height: 13, opacity: 0.4 }} />
                       </Link>
                     </>
                   )}
                 </div>
                <div style={{ padding: "24px 20px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {isAuthenticated ? (
                    <button onClick={() => { setOpen(false); deconnexion(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 14, borderRadius: 12, color: "rgba(148,163,184,0.7)", background: "none", border: "none", cursor: "pointer" }}>
                      <LogOut style={{ width: 15, height: 15 }} /> Déconnexion
                    </button>
                  ) : (
                    <button onClick={() => { base44.auth.redirectToLogin(); setOpen(false); }} style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700, borderRadius: 14, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(201,160,99,0.3)" }}>
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