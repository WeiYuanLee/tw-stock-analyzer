import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少需要 6 個字元'),
  name: z.string().min(1, '請輸入名稱').max(100, '名稱最多 100 個字元').optional()
});

export const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '請輸入密碼')
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, '請輸入名稱').max(100, '名稱最多 100 個字元').optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入當前密碼'),
  newPassword: z.string().min(6, '新密碼至少需要 6 個字元')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的 Email')
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, '新密碼至少需要 6 個字元'),
  token: z.string().min(1, '請提供重設 token')
});

export const watchlistSchema = z.object({
  stockCode: z.string().min(1, '請輸入股票代碼').max(10, '股票代碼過長')
});

export const bookmarkSchema = z.object({
  name: z.string().min(1, '請輸入書籤名稱').max(100, '名稱最多 100 個字元'),
  filters: z.record(z.any())
});

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: { message: messages } });
      }
      next(error);
    }
  };
}
