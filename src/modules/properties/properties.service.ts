import { db } from "../../config/db/index.js";
import {
  properties,
  users,
  reviews,
  type Property,
  type NewProperty,
} from "../../config/db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  SearchPropertiesInput,
} from "./properties.schemas.js";

interface PropertyWithDetails extends Property {
  hostName: string;
  hostAvatar: string | null;
  hostVerified: boolean | null;
  avgRating: number;
  reviewCount: number;
  distanceKm?: number;
}

export class PropertiesService {
  async create(
    propertyData: CreatePropertyInput,
    hostId: string
  ): Promise<NewProperty> {
    const [property] = await db
      .insert(properties)
      .values({
        ...propertyData,
        hostId,
        latitude: propertyData.latitude.toString(),
        longitude: propertyData.longitude.toString(),
        pricePerNight: propertyData.pricePerNight.toString(),
        bathrooms: propertyData.bathrooms.toString(),
      })
      .returning();

    return property;
  }

  async searchNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    filters: Omit<SearchPropertiesInput, "latitude" | "longitude" | "radius">
  ): Promise<PropertyWithDetails[]> {
    const { minPrice, maxPrice, guests, propertyType } = filters;

    const conditions = [eq(properties.status, "active")];

    if (minPrice !== undefined) {
      conditions.push(gte(properties.pricePerNight, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(properties.pricePerNight, maxPrice.toString()));
    }

    if (guests !== undefined) {
      conditions.push(gte(properties.guests, guests));
    }

    if (propertyType) {
      conditions.push(eq(properties.propertyType, propertyType));
    }

    const result = await db
      .select({
        id: properties.id,
        hostId: properties.hostId,
        title: properties.title,
        description: properties.description,
        propertyType: properties.propertyType,
        pricePerNight: properties.pricePerNight,
        latitude: properties.latitude,
        longitude: properties.longitude,
        address: properties.address,
        city: properties.city,
        country: properties.country,
        guests: properties.guests,
        bedrooms: properties.bedrooms,
        beds: properties.beds,
        bathrooms: properties.bathrooms,
        amenities: properties.amenities,
        images: properties.images,
        rules: properties.rules,
        status: properties.status,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
        hostName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        hostAvatar: users.avatarUrl,
        hostVerified: users.verified,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`,
        distanceKm: sql<number>`
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(${properties.latitude}::float)) * 
            cos(radians(${properties.longitude}::float) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(${properties.latitude}::float))
          )
        `,
      })
      .from(properties)
      .leftJoin(users, eq(properties.hostId, users.id))
      .leftJoin(reviews, eq(properties.id, reviews.propertyId))
      .where(and(...conditions))
      .groupBy(properties.id, users.id)
      .limit(50);

    return result.filter((p) => p.distanceKm && p.distanceKm <= radiusKm);
  }

  async getById(propertyId: string): Promise<PropertyWithDetails | undefined> {
    // Subquery para reviews
    const reviewsAgg = db
      .select({
        propertyId: reviews.propertyId,
        avgRating: sql<number>`AVG(${reviews.rating})`.as("avgRating"),
        reviewCount: sql<number>`COUNT(*)`.as("reviewCount"),
      })
      .from(reviews)
      .groupBy(reviews.propertyId)
      .as("r");

    const result = await db
      .select({
        id: properties.id,
        hostId: properties.hostId,
        title: properties.title,
        description: properties.description,
        propertyType: properties.propertyType,
        pricePerNight: properties.pricePerNight,
        latitude: properties.latitude,
        longitude: properties.longitude,
        address: properties.address,
        city: properties.city,
        country: properties.country,
        guests: properties.guests,
        bedrooms: properties.bedrooms,
        beds: properties.beds,
        bathrooms: properties.bathrooms,
        amenities: properties.amenities,
        images: properties.images,
        rules: properties.rules,
        status: properties.status,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
        hostName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        hostAvatar: users.avatarUrl,
        hostVerified: users.verified,
        avgRating: sql<number>`COALESCE(${reviewsAgg.avgRating}, 0)`,
        reviewCount: sql<number>`COALESCE(${reviewsAgg.reviewCount}, 0)`,
      })
      .from(properties)
      .leftJoin(users, eq(properties.hostId, users.id))
      .leftJoin(reviewsAgg, eq(properties.id, reviewsAgg.propertyId))
      .where(eq(properties.id, propertyId));

    return result[0];
  }

  async update(
    propertyId: string,
    hostId: string,
    updateData: UpdatePropertyInput
  ): Promise<Property> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!property) {
      throw new Error("Propiedad no encontrada");
    }

    if (property.hostId !== hostId) {
      throw new Error("No autorizado para editar esta propiedad");
    }

    const [updated] = await db
      .update(properties)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, propertyId))
      .returning();

    return updated;
  }

  async delete(propertyId: string, hostId: string): Promise<void> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!property) {
      throw new Error("Propiedad no encontrada");
    }

    if (property.hostId !== hostId) {
      throw new Error("No autorizado para eliminar esta propiedad");
    }

    await db.delete(properties).where(eq(properties.id, propertyId));
  }
}
