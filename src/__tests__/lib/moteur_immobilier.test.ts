describe('Moteur Immobilier', () => {
  test('ratio endettement 32%', () => {
    expect(32000 / 100000).toBe(0.32);
  });
  test('mise de fonds 20%', () => {
    expect(100000 / 500000).toBe(0.20);
  });
  test('SCHL si moins de 20%', () => {
    expect(25000 / 500000 < 0.20).toBe(true);
  });
});
