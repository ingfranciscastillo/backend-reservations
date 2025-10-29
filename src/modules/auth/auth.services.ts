import bcrypt from "bcrypt";
import { db } from "../../config/db/index.js";
import { users, type User, type NewUser } from "../../config/db/schema.js";
import { eq } from "drizzle-orm";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from "./auth.schemas.js";

export class AuthService {
  async register(userData: RegisterInput): Promise<Omit<NewUser, "password">> {
    const { email, password, firstName, lastName, role } = userData;

    // Verificar si el usuario ya existe
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing.length > 0) {
      throw new Error("El email ya está registrado");
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      })
      .returning();

    // Eliminar password del resultado
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(credentials: LoginInput): Promise<Omit<User, "password">> {
    const { email, password } = credentials;

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new Error("Credenciales inválidas");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error("Credenciales inválidas");
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getProfile(
    userId: string
  ): Promise<Omit<User, "password"> | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        verified: users.verified,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    return user;
  }

  async updateProfile(
    userId: string,
    updateData: UpdateProfileInput
  ): Promise<Omit<User, "password">> {
    const [updated] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}
