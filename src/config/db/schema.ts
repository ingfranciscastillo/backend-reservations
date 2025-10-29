import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    role: varchar("role", { length: 20 })
      .$type<"guest" | "host" | "admin">()
      .default("guest")
      .notNull(),
    verified: boolean("verified").default(false),
    phone: varchar("phone", { length: 20 }),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  })
);

// Properties table
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: uuid("host_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    propertyType: varchar("property_type", { length: 50 })
      .$type<"house" | "apartment" | "room" | "villa">()
      .notNull(),
    pricePerNight: decimal("price_per_night", {
      precision: 10,
      scale: 2,
    }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    guests: integer("guests").notNull(),
    bedrooms: integer("bedrooms").notNull(),
    beds: integer("beds").notNull(),
    bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
    amenities: jsonb("amenities").$type<string[]>().default([]),
    images: jsonb("images").$type<string[]>().default([]),
    rules: text("rules"),
    status: varchar("status", { length: 20 })
      .$type<"active" | "inactive" | "pending">()
      .default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    hostIdx: index("properties_host_idx").on(table.hostId),
    locationIdx: index("properties_location_idx").on(
      table.latitude,
      table.longitude
    ),
    statusIdx: index("properties_status_idx").on(table.status),
  })
);

// Bookings table
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    guestId: uuid("guest_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    guests: integer("guests").notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 })
      .$type<"pending" | "confirmed" | "cancelled" | "completed" | "paid">()
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("bookings_property_idx").on(table.propertyId),
    guestIdx: index("bookings_guest_idx").on(table.guestId),
    datesIdx: index("bookings_dates_idx").on(table.checkIn, table.checkOut),
  })
);

// Reviews table
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    reviewerId: uuid("reviewer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    revieweeId: uuid("reviewee_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "cascade",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    reviewType: varchar("review_type", { length: 20 })
      .$type<"guest_to_host" | "host_to_guest">()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("reviews_property_idx").on(table.propertyId),
    revieweeIdx: index("reviews_reviewee_idx").on(table.revieweeId),
  })
);

// Messages table
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    receiverId: uuid("receiver_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    read: boolean("read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(
      table.senderId,
      table.receiverId
    ),
  })
);

// Payments table
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    payerId: uuid("payer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
    hostAmount: decimal("host_amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 20 })
      .$type<"pending" | "completed" | "failed" | "refunded">()
      .default("pending"),
    transactionId: varchar("transaction_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index("payments_booking_idx").on(table.bookingId),
  })
);

// Verifications table
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    documentType: varchar("document_type", { length: 50 }).notNull(),
    documentNumber: varchar("document_number", { length: 100 }),
    documentFrontUrl: text("document_front_url"),
    documentBackUrl: text("document_back_url"),
    selfieUrl: text("selfie_url"),
    status: varchar("status", { length: 20 })
      .$type<"pending" | "approved" | "rejected" | "in_review">()
      .default("pending"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("verifications_user_idx").on(table.userId),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  bookings: many(bookings),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  host: one(users, {
    fields: [properties.hostId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  guest: one(users, {
    fields: [bookings.guestId],
    references: [users.id],
  }),
  reviews: many(reviews),
  messages: many(messages),
  payments: many(payments),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
