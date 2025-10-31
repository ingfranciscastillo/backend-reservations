import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users, properties, bookings } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Bookings Module", () => {
  let app: Awaited<ReturnType<typeof build>>;
  let guestToken: string;
  let hostToken: string;
  let guestId: string;
  let hostId: string;
  let propertyId: string;

  beforeAll(async () => {
    app = await build();

    // Crear host
    const hostAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "booking-host@example.com",
        password: "HostPass123",
        firstName: "Host",
        lastName: "User",
        role: "host",
      },
    });

    const hostJson = hostAuth.json();
    hostToken = hostJson.token;
    hostId = hostJson.user.id;

    // Crear propiedad
    const propertyResponse = await app.inject({
      method: "POST",
      url: "/api/properties",
      headers: {
        authorization: `Bearer ${hostToken}`,
      },
      payload: {
        title: "Test Property for Booking",
        description: "A nice place to stay",
        propertyType: "apartment",
        pricePerNight: 100,
        latitude: 18.4861,
        longitude: -69.9312,
        address: "123 Test St",
        city: "Santo Domingo",
        country: "Dominican Republic",
        guests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        amenities: ["wifi", "kitchen"],
        images: ["https://example.com/image1.jpg"],
      },
    });

    propertyId = propertyResponse.json().property.id;

    // Crear guest
    const guestAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "booking-guest@example.com",
        password: "GuestPass123",
        firstName: "Guest",
        lastName: "User",
      },
    });

    const guestJson = guestAuth.json();
    guestToken = guestJson.token;
    guestId = guestJson.user.id;
  });

  afterAll(async () => {
    await db.delete(bookings).where(eq(bookings.guestId, guestId));
    await db.delete(properties).where(eq(properties.id, propertyId));
    await db.delete(users).where(eq(users.id, hostId));
    await db.delete(users).where(eq(users.id, guestId));
    await app.close();
  });

  it("should create a booking", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/bookings",
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
      payload: {
        propertyId,
        checkIn: "2025-12-01",
        checkOut: "2025-12-05",
        guests: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().booking).toHaveProperty("id");
    expect(response.json().booking.status).toBe("pending");
  });

  it("should get user bookings", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/bookings/my-bookings",
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().bookings).toBeInstanceOf(Array);
  });

  it("should fail with invalid dates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/bookings",
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
      payload: {
        propertyId,
        checkIn: "2025-12-10",
        checkOut: "2025-12-05", // Checkout antes de checkin
        guests: 2,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should fail booking own property", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/bookings",
      headers: {
        authorization: `Bearer ${hostToken}`, // Host intenta reservar su propia propiedad
      },
      payload: {
        propertyId,
        checkIn: "2025-12-15",
        checkOut: "2025-12-20",
        guests: 2,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
