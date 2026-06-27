import { validateTransaction } from '@/lib/validations/transaction';

describe('Validation des transactions', () => {
  
  const transactionValide = {
    description: 'Courses supermarché',
    amount: -85.50,
    date: '2026-06-26T10:00:00Z',
    accountId: '123e4567-e89b-12d3-a456-426614174000'
  };

  test('valide une transaction correcte', () => {
    const result = validateTransaction(transactionValide);
    expect(result.success).toBe(true);
  });

  test('rejette une description vide', () => {
    const result = validateTransaction({
      ...transactionValide,
      description: ''
    });
    expect(result.success).toBe(false);
  });

  test('rejette un montant à zéro', () => {
    const result = validateTransaction({
      ...transactionValide,
      amount: 0
    });
    expect(result.success).toBe(false);
  });

  test('rejette une date invalide', () => {
    const result = validateTransaction({
      ...transactionValide,
      date: 'pas-une-date'
    });
    expect(result.success).toBe(false);
  });
});
