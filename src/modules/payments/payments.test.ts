import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "../../app";
import { db } from "../../config/db/index";
import { users, properties, bookings, payments } from "../../config/db/schema";
import { eq } from "drizzle-orm";

describe("Payments Module", () => {
  let app: Awaited<ReturnType<typeof build>>;
  let guestToken: string;
  let guestId: string;
  let hostId: string;
  let propertyId: string;
  let bookingId: string;

  beforeAll(async () => {
    app = await build();

    // Setup host, guest, property, booking
    const hostAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "payment-host@example.com",
        password: "HostPass123",
        firstName: "Payment",
        lastName: "Host",
        role: "host",
      },
    });

    const hostToken = hostAuth.json().token;
    hostId = hostAuth.json().user.id;

    const propertyResponse = await app.inject({
      method: "POST",
      url: "/api/properties",
      headers: { authorization: `Bearer ${hostToken}` },
      payload: {
        title: "Payment Test Property",
        description: "Test property for payments",
        propertyType: "apartment",
        pricePerNight: 100,
        latitude: 18.4,
        longitude: -69.9,
        address: "789 Payment St",
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

    // Verificar que la propiedad se creó correctamente
    if (propertyResponse.statusCode !== 200) {
      console.error("Failed to create property:", propertyResponse.json());
      throw new Error("Property creation failed in test setup");
    }

    const propertyJson = propertyResponse.json();
    if (!propertyJson.property || !propertyJson.property.id) {
      console.error("Invalid property response:", propertyJson);
      throw new Error("Property response missing id");
    }

    propertyId = propertyJson.property.id;

    const guestAuth = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "payment-guest@example.com",
        password: "GuestPass123",
        firstName: "Payment",
        lastName: "Guest",
      },
    });

    guestToken = guestAuth.json().token;
    guestId = guestAuth.json().user.id;

    const bookingResponse = await app.inject({
      method: "POST",
      url: "/api/bookings",
      headers: { authorization: `Bearer ${guestToken}` },
      payload: {
        propertyId,
        checkIn: "2025-11-10",
        checkOut: "2025-11-15",
        guests: 2,
      },
    });

    bookingId = bookingResponse.json().booking.id;

    // Confirmar reserva
    await db
      .update(bookings)
      .set({ status: "confirmed" })
      .where(eq(bookings.id, bookingId));
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(payments).where(eq(payments.bookingId, bookingId));
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(properties).where(eq(properties.id, propertyId));
    await db.delete(users).where(eq(users.id, hostId));
    await db.delete(users).where(eq(users.id, guestId));
    await app.close();
  });

  it("should process payment", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/payments/process",
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
      payload: {
        bookingId,
        paymentMethod: "credit_card",
        transactionId: "tx_123456",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().payment).toHaveProperty("id");
    expect(response.json().payment.paymentStatus).toBe("completed");
  });

  it("should get user payments", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/payments/my-payments",
      headers: {
        authorization: `Bearer ${guestToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().payments).toBeInstanceOf(Array);
  });
});
