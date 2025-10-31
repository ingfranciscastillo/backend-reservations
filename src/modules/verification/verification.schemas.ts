import { z } from "zod";

export const submitVerificationSchema = z.object({
  documentType: z.string().min(1, "Tipo de documento requerido"),
  documentNumber: z.string().optional(),
  documentFrontUrl: z.url("URL de imagen frontal inválida"),
  documentBackUrl: z.url("URL de imagen trasera inválida").optional(),
  selfieUrl: z.string().url("URL de selfie inválida"),
});

export const approveVerificationSchema = z.object({
  notes: z.string().optional(),
});

export const rejectVerificationSchema = z.object({
  reason: z
    .string()
    .min(10, "Debe especificar una razón de al menos 10 caracteres"),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type ApproveVerificationInput = z.infer<
  typeof approveVerificationSchema
>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
