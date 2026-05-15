import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { base44 } from "@/api/base44Client";
import { 
  Menu, X, Calculator, LayoutDashboard, Wallet, 
  TrendingUp, Target, LogOut, User
} from "lucide-react";

const publicLinks = [
  { label: "Accueil", path: "/" },
  { label: "Calculatrices", path: "/calculatrices" },
];

const privateLinks = [
  { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
  { label: "Budget", path: "/budget", icon: Wallet },
  { label: "Placements", path: "/placements", icon: TrendingUp },
  { label: "Plan financier", path: "/plan", icon: Target },
];

export default function Navbar() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      setIsAuthenticated(authed);
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
    });
  }, []);

  const isActive = (path) => location.pathname === path;
  const links = isAuthenticated ? [...publicLinks, ...privateLinks] : publicLinks;

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">MP</span>
            </div>
            <span className="font-serif text-xl font-semibold text-foreground tracking-tight">
              MonPlanFin
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{user?.full_name || "Mon compte"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => base44.auth.logout()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="text-sm"
                >
                  Connexion
                </Button>
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="text-sm bg-primary hover:bg-primary/90"
                >
                  Créer un compte
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col h-full pt-12 pb-6">
                <div className="flex-1 px-4 space-y-1">
                  {links.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {link.icon && <link.icon className="w-4 h-4" />}
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="px-4 pt-4 border-t">
                  {isAuthenticated ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { base44.auth.logout(); setOpen(false); }}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => { base44.auth.redirectToLogin(); setOpen(false); }}
                    >
                      Connexion / Inscription
                    </Button>
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