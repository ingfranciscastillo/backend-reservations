import { db } from "../../config/db/index.js";
import {
  reviews,
  bookings,
  properties,
  users,
  type Review,
} from "../../config/db/schema.js";
import { eq, and, desc, sql, count } from "drizzle-orm";
import type { CreateReviewInput } from "./reviews.schemas.js";

export interface ReviewWithDetails extends Review {
  reviewerName: string;
  reviewerAvatar: string | null;
  propertyTitle?: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
}

export class ReviewsService {
  async create(
    reviewData: CreateReviewInput,
    reviewerId: string
  ): Promise<Review> {
    const { bookingId, revieweeId, propertyId, rating, comment, reviewType } =
      reviewData;

    // Verificar que la reserva existe y está completada
    const [booking] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        guestId: bookings.guestId,
        hostId: properties.hostId,
      })
      .from(bookings)
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new Error("Reserva no encontrada");
    }

    if (booking.status !== "completed") {
      throw new Error("Solo puedes dejar reviews para reservas completadas");
    }

    // Verificar permisos
    const isGuest = booking.guestId === reviewerId;
    const isHost = booking.hostId === reviewerId;

    if (!isGuest && !isHost) {
      throw new Error("No autorizado para dejar esta review");
    }

    // Verificar que no existe ya una review
    const existingReview = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.bookingId, bookingId),
          eq(reviews.reviewerId, reviewerId),
          eq(reviews.revieweeId, revieweeId)
        )
      );

    if (existingReview.length > 0) {
      throw new Error("Ya dejaste una review para esta reserva");
    }

    // Crear review
    const [review] = await db
      .insert(reviews)
      .values({
        bookingId,
        reviewerId,
        revieweeId,
        propertyId: propertyId,
        rating,
        comment: comment,
        reviewType,
      })
      .returning();

    return review!;
  }

  async getPropertyReviews(propertyId: string): Promise<ReviewWithDetails[]> {
    const result = await db
      .select({
        id: reviews.id,
        bookingId: reviews.bookingId,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        propertyId: reviews.propertyId,
        rating: reviews.rating,
        comment: reviews.comment,
        reviewType: reviews.reviewType,
        createdAt: reviews.createdAt,
        reviewerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        reviewerAvatar: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(
        and(
          eq(reviews.propertyId, propertyId),
          eq(reviews.reviewType, "guest_to_host")
        )
      )
      .orderBy(desc(reviews.createdAt));

    return result;
  }

  async getUserReviews(userId: string): Promise<ReviewWithDetails[]> {
    const result = await db
      .select({
        id: reviews.id,
        bookingId: reviews.bookingId,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        propertyId: reviews.propertyId,
        rating: reviews.rating,
        comment: reviews.comment,
        reviewType: reviews.reviewType,
        createdAt: reviews.createdAt,
        reviewerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        reviewerAvatar: users.avatarUrl,
        propertyTitle: properties.title,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .leftJoin(properties, eq(reviews.propertyId, properties.id))
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));

    return result;
  }

  async getStats(userId: string): Promise<ReviewStats> {
    const result = await db
      .select({
        totalReviews: count(reviews.id),
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        fiveStarCount: sql<number>`COUNT(CASE WHEN ${reviews.rating} = 5 THEN 1 END)`,
        fourStarCount: sql<number>`COUNT(CASE WHEN ${reviews.rating} = 4 THEN 1 END)`,
        threeStarCount: sql<number>`COUNT(CASE WHEN ${reviews.rating} = 3 THEN 1 END)`,
        twoStarCount: sql<number>`COUNT(CASE WHEN ${reviews.rating} = 2 THEN 1 END)`,
        oneStarCount: sql<number>`COUNT(CASE WHEN ${reviews.rating} = 1 THEN 1 END)`,
      })
      .from(reviews)
      .where(eq(reviews.revieweeId, userId));

    return result[0]!;
  }
}
