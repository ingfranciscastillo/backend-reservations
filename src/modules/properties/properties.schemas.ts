import { z } from "zod";

export const createPropertySchema = z.object({
  title: z
    .string()
    .min(10, "El título debe tener al menos 10 caracteres")
    .max(255),
  description: z
    .string()
    .min(20, "La descripción debe tener al menos 20 caracteres")
    .optional(),
  propertyType: z.enum(["house", "apartment", "room", "villa"]),
  pricePerNight: z.number().positive("El precio debe ser positivo"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5),
  city: z.string().min(2),
  country: z.string().min(2),
  guests: z.number().int().positive().min(1),
  bedrooms: z.number().int().min(0),
  beds: z.number().int().min(1),
  bathrooms: z.number().positive().min(0.5),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.url()).min(1, "Debe tener al menos una imagen"),
  rules: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const searchPropertiesSchema = z.object({
  latitude: z.string().transform(Number),
  longitude: z.string().transform(Number),
  radius: z.string().transform(Number).default(50),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  guests: z.string().transform(Number).optional(),
  propertyType: z.enum(["house", "apartment", "room", "villa"]).optional(),
});

export const availabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type SearchPropertiesInput = z.infer<typeof searchPropertiesSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
