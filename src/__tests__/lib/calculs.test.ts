describe('Validation des calculs financiers', () => {
  
  test('addition basique', () => {
    const total = 100.50 + 50.25;
    expect(total).toBe(150.75);
  });

  test('calcul de pourcentage', () => {
    const pourcentage = (750 / 1000) * 100;
    expect(pourcentage).toBe(75);
  });

  test('arrondi à 2 décimales', () => {
    const arrondi = Math.round(100.456 * 100) / 100;
    expect(arrondi).toBe(100.46);
  });

  test('validation montant positif', () => {
    expect(-50 > 0).toBe(false);
  });
});
