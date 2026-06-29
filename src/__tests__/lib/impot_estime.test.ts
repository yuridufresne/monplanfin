import { calcNetPersonne } from "@/lib/calcRevenuNet";

// Garantit que l'estimation automatique de l'impot retenu (placeholder du champ
// « Impot retenu / mois » de l'ABF) est bien exposee par le moteur et coherente.
describe("calcNetPersonne — impot estime auto", () => {
  it("expose l'impot total annuel et respecte net = brut - impot", () => {
    const r = calcNetPersonne(125000);
    expect(r.impot).toBeGreaterThan(0);
    // Invariant du moteur fiscal : le net est le brut moins l'impot total.
    expect(Math.round(125000 - r.net)).toBe(Math.round(r.impot));
  });

  it("donne une estimation mensuelle plausible pour 125 000 $ (1500-4500 $/mois)", () => {
    const mensuel = calcNetPersonne(125000).impot / 12;
    expect(mensuel).toBeGreaterThan(1500);
    expect(mensuel).toBeLessThan(4500);
  });

  it("retourne 0 pour un revenu nul", () => {
    expect(calcNetPersonne(0).impot).toBe(0);
  });
});
