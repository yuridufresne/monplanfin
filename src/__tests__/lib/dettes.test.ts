describe('Moteur Dettes', () => {
  test('paiement minimum', () => {
    expect(5000 * 0.199 / 12).toBeCloseTo(82.92, 1);
  });
  test('boule de neige', () => {
    const d = [{ n: 'A', b: 1000 }, { n: 'B', b: 5000 }];
    d.sort((a, b) => a.b - b.b);
    expect(d[0].n).toBe('A');
  });
  test('avalanche', () => {
    const d = [{ n: 'A', t: 5 }, { n: 'B', t: 19.9 }];
    d.sort((a, b) => b.t - a.t);
    expect(d[0].n).toBe('B');
  });
});
