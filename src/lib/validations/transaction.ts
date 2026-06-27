import { z } from 'zod';

export const transactionSchema = z.object({
  description: z
    .string()
    .min(1, 'Description requise')
    .max(200, 'Maximum 200 caractères'),
    
  amount: z
    .number()
    .refine((val) => val !== 0, 'Le montant ne peut pas être 0')
    .refine((val) => isFinite(val), 'Montant invalide'),
    
  date: z
    .string()
    .datetime('Format de date invalide'),
    
  accountId: z
    .string()
    .uuid('ID de compte invalide'),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export function validateTransaction(data: unknown) {
  try {
    const validData = transactionSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
    }
    throw error;
  }
}
