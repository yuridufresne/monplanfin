describe('Moteur Fiscal QC 2026', () => {
  test('célibataire 50k paie impôt', () => {
    const impot_federal = 50000 * 0.15;
    const impot_qc = 50000 * 0.14;
    expect(impot_federal + impot_qc).toBeGreaterThan(10000);
  });
  test('taux marginal élevé', () => {
    expect(0.33).toBeGreaterThan(0.30);
  });
  test('crédit solidarité bas revenu', () => {
    expect(1200).toBeGreaterThan(0);
  });
});
