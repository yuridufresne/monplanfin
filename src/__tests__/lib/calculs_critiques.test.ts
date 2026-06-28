import { paiementHypoMensuel } from "@/lib/calcRevenuNet";
import { calculateFullTax } from "@/lib/moteurFiscal2026";

/** Paiement hypothécaire : M = P·r(1+r)^n / ((1+r)^n − 1). */
describe("paiementHypoMensuel", () => {
  test("300 000 $ à 5 % sur 25 ans ≈ 1 750 $/mois", () => {
    const m = paiementHypoMensuel({ solde: 300000, taux: 5, amortissement_restant: 25 });
    expect(m).toBeGreaterThan(1700);
    expect(m).toBeLessThan(1800);
  });

  test("solde nul → paiement nul", () => {
    expect(paiementHypoMensuel({ solde: 0, taux: 5, amortissement_restant: 25 })).toBe(0);
  });

  test("plus le taux est élevé, plus le paiement augmente", () => {
    const bas = paiementHypoMensuel({ solde: 300000, taux: 3, amortissement_restant: 25 });
    const haut = paiementHypoMensuel({ solde: 300000, taux: 7, amortissement_restant: 25 });
    expect(haut).toBeGreaterThan(bas);
  });
});

/** Moteur fiscal QC 2026 — tests de PROPRIÉTÉS (robustes aux ajustements de tables). */
describe("calculateFullTax (Québec)", () => {
  test("revenu nul → impôt nul, net nul", () => {
    const r = calculateFullTax({ grossIncome: 0 });
    expect(r.totalTax).toBe(0);
    expect(r.netIncomeAfterTax).toBe(0);
  });

  test("revenu de 80 000 $ : impôt positif et net inférieur au brut", () => {
    const r = calculateFullTax({ grossIncome: 80000 });
    expect(r.totalTax).toBeGreaterThan(0);
    expect(r.netIncomeAfterTax).toBeLessThan(80000);
    expect(r.netIncomeAfterTax).toBeGreaterThan(0);
  });

  test("net ≈ brut − impôt total (cohérence interne)", () => {
    const r = calculateFullTax({ grossIncome: 80000 });
    expect(Math.abs(r.netIncomeAfterTax - (r.gross - r.totalTax))).toBeLessThan(1);
  });

  test("taux effectif raisonnable (entre 10 % et 40 %) à 80 000 $", () => {
    const r = calculateFullTax({ grossIncome: 80000 });
    // effectiveRate est exprimé en pourcentage (ex. 22.56 = 22,56 %)
    expect(r.effectiveRate).toBeGreaterThan(10);
    expect(r.effectiveRate).toBeLessThan(40);
  });

  test("progressivité : un revenu plus élevé paie un taux effectif plus élevé", () => {
    const bas = calculateFullTax({ grossIncome: 45000 });
    const haut = calculateFullTax({ grossIncome: 150000 });
    expect(haut.effectiveRate).toBeGreaterThan(bas.effectiveRate);
  });

  test("une déduction REER réduit l'impôt", () => {
    const sans = calculateFullTax({ grossIncome: 90000 });
    const avec = calculateFullTax({ grossIncome: 90000, reerDeduction: 10000 });
    expect(avec.totalTax).toBeLessThan(sans.totalTax);
  });
});
