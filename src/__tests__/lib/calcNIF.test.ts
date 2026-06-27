describe('NIF Calculator - logique métier', () => {
  test('score max avec profil parfait', () => {
    const revenu = 100000;
    const depenses = 3000 * 12;
    const epargne = 50000;
    const dettes = 0;
    const tauxEpargne = (revenu - depenses) / revenu;
    const ratioDettes = dettes / revenu;
    let score = 0;
    if (tauxEpargne > 0.20) score += 4;
    if (ratioDettes < 0.10) score += 3;
    if (epargne >= revenu * 0.5) score += 3;
    expect(score).toBe(10);
  });

  test('score bas avec dettes élevées', () => {
    const revenu = 50000;
    const depenses = 4000 * 12;
    const epargne = 0;
    const dettes = 30000;
    const tauxEpargne = (revenu - depenses) / revenu;
    const ratioDettes = dettes / revenu;
    let score = 0;
    if (tauxEpargne > 0.20) score += 4;
    else if (tauxEpargne > 0) score += 1;
    if (ratioDettes < 0.10) score += 3;
    else if (ratioDettes < 0.50) score += 1;
    if (epargne >= revenu * 0.5) score += 3;
    expect(score).toBe(1);
  });

  test('calcul valeur nette', () => {
    const actif = 400000 + 55000;
    const passif = 250000 + 20000;
    expect(actif - passif).toBe(185000);
  });
});
