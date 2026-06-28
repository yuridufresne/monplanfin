import { calcDepensesMensuelles } from "@/lib/calcRevenuNet";

/**
 * Verrouille les décisions produit sur les dépenses injectées :
 * - paiement hypothécaire + paiements de dettes + frais immobiliers = COMPTÉS
 * - cotisations d'épargne = AFFICHÉES mais HORS total (mise de côté, pas une dépense)
 * Garde-fou anti double-comptage du moteur calcDepensesMensuelles.
 */
describe("calcDepensesMensuelles — lignes ABF injectées", () => {
  const profiles = [
    {
      section: "immobilier",
      data: {
        hypotheques: [
          { solde: 300000, taux: 5, amortissement_restant: 25, taxe_municipale: 4000, taxe_scolaire: 800, assurance_habitation: 1200 },
        ],
      },
    },
    { section: "dettes", data: { dettes: [{ paiement_min: 250 }] } },
    { section: "epargne", data: { comptes: { reer: [{ cotisation_mensuelle: 300 }], celi: [{ cotisation_mensuelle: 200 }] } } },
  ];
  const dep = calcDepensesMensuelles([], profiles);

  test("frais immobiliers = (taxes municipale + scolaire + assurance) / 12", () => {
    expect(Math.round(dep.fraisImmo)).toBe(500); // (4000 + 800 + 1200) / 12
  });

  test("paiements de dettes injectés depuis la section Dettes", () => {
    expect(Math.round(dep.servicePrets)).toBe(250);
  });

  test("paiement hypothécaire calculé (> 0)", () => {
    expect(dep.serviceHypo).toBeGreaterThan(0);
  });

  test("cotisations d'épargne exposées pour affichage", () => {
    expect(Math.round(dep.cotisationsEpargne)).toBe(500); // 300 + 200
  });

  test("total = hypothèque + dettes + frais immo (épargne EXCLUE)", () => {
    expect(Math.round(dep.total)).toBe(Math.round(dep.serviceHypo + dep.servicePrets + dep.fraisImmo));
  });

  test("l'épargne ne gonfle PAS le total (anti double-comptage)", () => {
    const totalAvecEpargne = dep.serviceHypo + dep.servicePrets + dep.fraisImmo + dep.cotisationsEpargne;
    expect(dep.total).toBeLessThan(totalAvecEpargne);
  });

  test("les lignes manuelles taguées (ABF) sont ignorées du total (pas de doublon)", () => {
    const entries = [{ type: "depense", label: "Hypothèque (ABF)", amount: 9999, frequency: "mensuel" }];
    const d2 = calcDepensesMensuelles(entries, profiles);
    expect(d2.depensesVie).toBe(0);
  });
});
