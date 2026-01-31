import { z } from 'zod';

/**
 * Validation Schemas (Zod)
 * Used for API input validation
 */

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const SendOTPSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  type: z.enum(['email', 'phone']),
});

export const VerifyOTPSchema = z.object({
  identifier: z.string().min(1),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const RegisterSchema = z.object({
  identifier: z.string().min(1),
  code: z.string().length(6),
  referralCode: z.string().optional(),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  birthDate: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().url().optional(),
});

export const AddPayoutMethodSchema = z.object({
  type: z.enum(['card', 'paypal', 'crypto', 'bank_account']),
  details: z.record(z.any()),
  isDefault: z.boolean().optional(),
});

// ============================================================================
// OFFER SCHEMAS
// ============================================================================

export const CreateOfferSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum([
    'FINANCE',
    'SURVEYS',
    'APPS',
    'E_COMMERCE',
    'INSURANCE',
    'EDUCATION',
    'OTHER',
  ]),
  imageUrl: z.string().url().optional(),
  rewardAmount: z.number().positive('Reward must be positive'),
  rewardCurrency: z.string().default('RUB'),
  difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  estimatedTime: z.number().int().positive().default(10),
  requiresVerification: z.boolean().default(false),
  reimbursementEnabled: z.boolean().default(false),
  reimbursementRules: z.record(z.any()).optional(),
  termsAndConditions: z.string().min(10),
  disclaimers: z.array(z.string()).default([]),
  limits: z.record(z.any()).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const UpdateOfferSchema = CreateOfferSchema.partial();

export const CreateOfferStepSchema = z.object({
  offerId: z.string().uuid(),
  order: z.number().int().min(0),
  type: z.enum(['INFO', 'FORM', 'UPLOAD', 'CONFIRM', 'QUIZ']),
  title: z.string().min(1),
  description: z.string(),
  schema: z.record(z.any()),
  validationRules: z.record(z.any()).optional(),
  isRequired: z.boolean().default(true),
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const StartTaskSchema = z.object({
  offerId: z.string().uuid('Invalid offer ID'),
});

export const SubmitTaskStepSchema = z.object({
  taskId: z.string().uuid(),
  stepId: z.string().uuid(),
  payload: z.record(z.any()),
  files: z.array(z.string()).optional(),
});

export const SubmitTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const ReviewTaskSchema = z.object({
  taskId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// ============================================================================
// PAYOUT SCHEMAS
// ============================================================================

export const CreatePayoutRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  methodType: z.enum(['card', 'paypal', 'crypto', 'bank_account']),
  methodDetails: z.record(z.any()),
});

export const ReviewPayoutSchema = z.object({
  payoutId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'mark_paid']),
  rejectionReason: z.string().optional(),
  transactionId: z.string().optional(),
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const SendMessageSchema = z.object({
  chatId: z.string().uuid(),
  body: z.string().min(1, 'Message cannot be empty'),
  attachments: z.array(
    z.object({
      url: z.string().url(),
      type: z.string(),
      name: z.string(),
      size: z.number(),
    })
  ).optional(),
});

export const CreateChatSchema = z.object({
  type: z.enum(['SUPPORT', 'TASK']),
  taskId: z.string().uuid().optional(),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const CreateTenantSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  hostnames: z.array(z.string()),
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  themeConfig: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  referralConfig: z.record(z.any()).optional(),
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export const ManualAdjustmentSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number(),
  type: z.enum(['CREDIT', 'DEBIT']),
  description: z.string().min(1),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export type SendOTPInput = z.infer<typeof SendOTPSchema>;
export type VerifyOTPInput = z.infer<typeof VerifyOTPSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AddPayoutMethodInput = z.infer<typeof AddPayoutMethodSchema>;
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
export type CreateOfferStepInput = z.infer<typeof CreateOfferStepSchema>;
export type StartTaskInput = z.infer<typeof StartTaskSchema>;
export type SubmitTaskStepInput = z.infer<typeof SubmitTaskStepSchema>;
export type SubmitTaskInput = z.infer<typeof SubmitTaskSchema>;
export type ReviewTaskInput = z.infer<typeof ReviewTaskSchema>;
export type CreatePayoutRequestInput = z.infer<typeof CreatePayoutRequestSchema>;
export type ReviewPayoutInput = z.infer<typeof ReviewPayoutSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateChatInput = z.infer<typeof CreateChatSchema>;
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
export type ManualAdjustmentInput = z.infer<typeof ManualAdjustmentSchema>;

/**
 * Validate and parse input with Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns result
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
