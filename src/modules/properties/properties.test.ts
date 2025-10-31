// ============================================
// src/modules/properties/properties.test.ts
// ============================================
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users, properties } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Properties Module", () => {
  let app: Awaited<ReturnType<typeof build>>;
  let hostToken: string;
  let hostId: string;
  let guestToken: string;
  let guestId: string;
  let propertyId: string;

  beforeAll(async () => {
    app = await build();

    // Crear host
    const hostAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "property-host@example.com",
        password: "HostPass123",
        firstName: "Property",
        lastName: "Host",
        role: "host",
      },
    });

    const hostJson = hostAuth.json();
    hostToken = hostJson.token;
    hostId = hostJson.user.id;

    // Crear guest
    const guestAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "property-guest@example.com",
        password: "GuestPass123",
        firstName: "Property",
        lastName: "Guest",
      },
    });

    const guestJson = guestAuth.json();
    guestToken = guestJson.token;
    guestId = guestJson.user.id;
  });

  afterAll(async () => {
    // Cleanup
    if (propertyId) {
      await db.delete(properties).where(eq(properties.id, propertyId));
    }
    await db.delete(users).where(eq(users.id, hostId));
    await db.delete(users).where(eq(users.id, guestId));
    await app.close();
  });

  describe("POST /api/properties", () => {
    it("should create a property as host", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Beautiful Beach House",
          description: "Amazing ocean view with private beach access",
          propertyType: "house",
          pricePerNight: 150,
          latitude: 18.4861,
          longitude: -69.9312,
          address: "123 Beach Street",
          city: "Santo Domingo",
          country: "Dominican Republic",
          guests: 6,
          bedrooms: 3,
          beds: 4,
          bathrooms: 2,
          amenities: ["wifi", "pool", "kitchen", "parking"],
          images: [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg",
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.property).toHaveProperty("id");
      expect(json.property.title).toBe("Beautiful Beach House");
      expect(json.property.pricePerNight).toBe("150.00");
      expect(json.property.hostId).toBe(hostId);

      propertyId = json.property.id;
    });

    it("should fail without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        payload: {
          title: "Test Property",
          propertyType: "apartment",
          pricePerNight: 100,
          latitude: 18.5,
          longitude: -69.9,
          address: "456 Test St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: ["https://example.com/img.jpg"],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should fail with invalid title (too short)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Short", // Menos de 10 caracteres
          propertyType: "apartment",
          pricePerNight: 100,
          latitude: 18.5,
          longitude: -69.9,
          address: "456 Test St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: ["https://example.com/img.jpg"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail with negative price", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Test Property Title",
          propertyType: "apartment",
          pricePerNight: -50, // Precio negativo
          latitude: 18.5,
          longitude: -69.9,
          address: "456 Test St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: ["https://example.com/img.jpg"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail with invalid coordinates", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Test Property Title",
          propertyType: "apartment",
          pricePerNight: 100,
          latitude: 91, // Fuera de rango (-90 a 90)
          longitude: -69.9,
          address: "456 Test St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: ["https://example.com/img.jpg"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail without images", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Test Property Title",
          propertyType: "apartment",
          pricePerNight: 100,
          latitude: 18.5,
          longitude: -69.9,
          address: "456 Test St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: [], // Sin imágenes
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/properties/search", () => {
    it("should search properties by location", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/search?latitude=18.4861&longitude=-69.9312&radius=50",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.properties).toBeInstanceOf(Array);
      expect(json).toHaveProperty("count");
    });

    it("should filter by price range", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/search?latitude=18.4861&longitude=-69.9312&minPrice=100&maxPrice=200",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();

      // Verificar que todas las propiedades están en el rango de precio
      json.properties.forEach((property: any) => {
        const price = parseFloat(property.pricePerNight);
        expect(price).toBeGreaterThanOrEqual(100);
        expect(price).toBeLessThanOrEqual(200);
      });
    });

    it("should filter by guests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/search?latitude=18.4861&longitude=-69.9312&guests=4",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();

      json.properties.forEach((property: any) => {
        expect(property.guests).toBeGreaterThanOrEqual(4);
      });
    });

    it("should filter by property type", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/search?latitude=18.4861&longitude=-69.9312&propertyType=house",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();

      json.properties.forEach((property: any) => {
        expect(property.propertyType).toBe("house");
      });
    });

    it("should fail without coordinates", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/search",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/properties/:id", () => {
    it("should get property details", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/properties/${propertyId}`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.property.id).toBe(propertyId);
      expect(json.property).toHaveProperty("hostName");
      expect(json.property).toHaveProperty("avgRating");
      expect(json.property).toHaveProperty("reviewCount");
    });

    it("should return 404 for non-existent property", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/00000000-0000-0000-0000-000000000000",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PUT /api/properties/:id", () => {
    it("should update property as owner", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Updated Beach House Title",
          pricePerNight: 175,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.property.title).toBe("Updated Beach House Title");
      expect(json.property.pricePerNight).toBe("175.00");
    });

    it("should fail to update as non-owner", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${guestToken}`, // Usuario diferente
        },
        payload: {
          title: "Hacked Title",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should fail without authentication", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/properties/${propertyId}`,
        payload: {
          title: "New Title",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/properties/:id", () => {
    let propertyToDelete: string;

    beforeEach(async () => {
      // Crear propiedad para eliminar
      const response = await app.inject({
        method: "POST",
        url: "/api/properties",
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
        payload: {
          title: "Property to Delete",
          propertyType: "apartment",
          pricePerNight: 80,
          latitude: 18.5,
          longitude: -69.9,
          address: "789 Delete St",
          city: "Santo Domingo",
          country: "DR",
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ["wifi"],
          images: ["https://example.com/img.jpg"],
        },
      });

      propertyToDelete = response.json().property.id;
    });

    it("should delete property as owner", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/properties/${propertyToDelete}`,
        headers: {
          authorization: `Bearer ${hostToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Verificar que fue eliminada
      const checkResponse = await app.inject({
        method: "GET",
        url: `/api/properties/${propertyToDelete}`,
      });

      expect(checkResponse.statusCode).toBe(404);
    });

    it("should fail to delete as non-owner", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/properties/${propertyToDelete}`,
        headers: {
          authorization: `Bearer ${guestToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
