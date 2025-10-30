import { db } from "./index.js";
import { users, properties } from "./schema.js";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create users
    const [host] = await db
      .insert(users)
      .values({
        email: "host@example.com",
        password: hashedPassword,
        firstName: "John",
        lastName: "Host",
        role: "host",
        verified: true,
      })
      .returning();

    const [guest] = await db
      .insert(users)
      .values({
        email: "guest@example.com",
        password: hashedPassword,
        firstName: "Jane",
        lastName: "Guest",
        role: "guest",
        verified: true,
      })
      .returning();

    // Create properties
    await db.insert(properties).values([
      {
        hostId: host.id,
        title: "Beach House Paradise",
        description: "Beautiful beach house with ocean view",
        propertyType: "house",
        pricePerNight: "150.00",
        latitude: "18.4861",
        longitude: "-69.9312",
        address: "123 Beach St",
        city: "Santo Domingo",
        country: "Dominican Republic",
        guests: 6,
        bedrooms: 3,
        beds: 4,
        bathrooms: "2.0",
        amenities: ["wifi", "pool", "kitchen"],
        images: ["beach1.jpg", "beach2.jpg"],
      },
      {
        hostId: host.id,
        title: "Downtown Apartment",
        description: "Modern apartment in the heart of the city",
        propertyType: "apartment",
        pricePerNight: "80.00",
        latitude: "18.4700",
        longitude: "-69.9000",
        address: "456 City Ave",
        city: "Santo Domingo",
        country: "Dominican Republic",
        guests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: "1.0",
        amenities: ["wifi", "gym", "parking"],
        images: ["apt1.jpg", "apt2.jpg"],
      },
    ]);

    console.log("✅ Database seeded successfully!");
    console.log("📧 Host: host@example.com / password123");
    console.log("📧 Guest: guest@example.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
