import { db } from "../../config/db/index.js";
import {
  verifications,
  users,
  type Verification,
} from "../../config/db/schema.js";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import type {
  SubmitVerificationInput,
  RejectVerificationInput,
} from "./verification.schemas.js";

export interface VerificationWithUser extends Verification {
  email: string;
  userName: string;
}

export class VerificationService {
  async submitVerification(
    verificationData: SubmitVerificationInput,
    userId: string
  ): Promise<Verification> {
    const {
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
    } = verificationData;

    // Verificar si ya existe una verificación pendiente
    const existing = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.userId, userId),
          inArray(verifications.status, ["pending", "in_review"])
        )
      );

    if (existing.length > 0) {
      throw new Error("Ya tienes una verificación en proceso");
    }

    const [verification] = await db
      .insert(verifications)
      .values({
        userId,
        documentType,
        documentNumber: documentNumber || null,
        documentFrontUrl,
        documentBackUrl: documentBackUrl || null,
        selfieUrl,
        status: "pending",
      })
      .returning();

    return verification!;
  }

  async getVerificationStatus(
    userId: string
  ): Promise<Verification | { status: string }> {
    const result = await db
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userId))
      .orderBy(desc(verifications.createdAt))
      .limit(1);

    return result[0] || { status: "not_started" };
  }

  async approveVerification(
    verificationId: string,
    adminId: string
  ): Promise<Verification> {
    const [verification] = await db
      .update(verifications)
      .set({
        status: "approved",
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verifications.id, verificationId))
      .returning();

    if (!verification) {
      throw new Error("Verificación no encontrada");
    }

    // Actualizar usuario como verificado
    await db
      .update(users)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(users.id, verification.userId));

    return verification;
  }

  async rejectVerification(
    verificationId: string,
    rejectData: RejectVerificationInput
  ): Promise<Verification> {
    const [verification] = await db
      .update(verifications)
      .set({
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(verifications.id, verificationId))
      .returning();

    if (!verification) {
      throw new Error("Verificación no encontrada");
    }

    return verification;
  }

  async getPendingVerifications(): Promise<VerificationWithUser[]> {
    const result = await db
      .select({
        id: verifications.id,
        userId: verifications.userId,
        documentType: verifications.documentType,
        documentNumber: verifications.documentNumber,
        documentFrontUrl: verifications.documentFrontUrl,
        documentBackUrl: verifications.documentBackUrl,
        selfieUrl: verifications.selfieUrl,
        status: verifications.status,
        verifiedAt: verifications.verifiedAt,
        createdAt: verifications.createdAt,
        updatedAt: verifications.updatedAt,
        email: users.email,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(verifications)
      .leftJoin(users, eq(verifications.userId, users.id))
      .where(eq(verifications.status, "pending"))
      .orderBy(asc(verifications.createdAt));

    return result;
  }
}
