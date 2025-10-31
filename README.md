# 🏠 Reservation Backend - Guía Completa

## ✅ Checklist de Implementación

### Módulos Completos con TypeScript + Zod

- ✅ **Auth** - Registro, login, perfil
- ✅ **Properties** - CRUD, búsqueda geográfica
- ✅ **Bookings** - Crear, listar, actualizar estado
- ✅ **Reviews** - Sistema bidireccional
- ✅ **Payments** - Procesar pagos, ganancias
- ✅ **Chat** - Mensajería + WebSockets
- ✅ **Verification** - Sistema de verificación

### Cada Módulo Incluye

- ✅ `*.schemas.ts` - Validaciones Zod
- ✅ `*.service.ts` - Lógica de negocio
- ✅ `*.controller.ts` - Controllers HTTP
- ✅ `*.routes.ts` - Definición de rutas
- ✅ `*.test.ts` - Tests completos

## 🚀 Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/ingfranciscastillo/backend-reservations
cd airbnb-backend
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar DATABASE_URL y JWT_SECRET

# 3. Base de datos
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Iniciar desarrollo
npm run dev

# 5. Verificar
curl http://localhost:3000/health
```

## 📋 API Endpoints Completa

### 🔐 Autenticación

```bash
# Registro
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "guest"
}

# Login
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePass123"
}

# Obtener perfil
GET /api/auth/profile
Headers: Authorization: Bearer <token>

# Actualizar perfil
PATCH /api/auth/profile
Headers: Authorization: Bearer <token>
Body: {
  "firstName": "Jane",
  "phone": "+18091234567"
}
```

### 🏠 Propiedades

```bash
# Búsqueda geográfica
GET /api/properties/search?latitude=18.4861&longitude=-69.9312&radius=50&guests=2&minPrice=50&maxPrice=200

# Obtener detalles
GET /api/properties/:id

# Crear propiedad (requiere auth)
POST /api/properties
Headers: Authorization: Bearer <token>
Body: {
  "title": "Beautiful Beach House",
  "description": "Amazing ocean view",
  "propertyType": "house",
  "pricePerNight": 150,
  "latitude": 18.4861,
  "longitude": -69.9312,
  "address": "123 Beach St",
  "city": "Santo Domingo",
  "country": "Dominican Republic",
  "guests": 6,
  "bedrooms": 3,
  "beds": 4,
  "bathrooms": 2,
  "amenities": ["wifi", "pool", "kitchen"],
  "images": ["https://example.com/img1.jpg"]
}

# Actualizar propiedad
PUT /api/properties/:id
Headers: Authorization: Bearer <token>
Body: { "pricePerNight": 175 }

# Eliminar propiedad
DELETE /api/properties/:id
Headers: Authorization: Bearer <token>
```

### 📅 Reservas

```bash
# Crear reserva
POST /api/bookings
Headers: Authorization: Bearer <token>
Body: {
  "propertyId": "uuid",
  "checkIn": "2025-12-01",
  "checkOut": "2025-12-05",
  "guests": 2
}

# Mis reservas
GET /api/bookings/my-bookings
Headers: Authorization: Bearer <token>

# Detalles de reserva
GET /api/bookings/:id
Headers: Authorization: Bearer <token>

# Actualizar estado
PATCH /api/bookings/:id/status
Headers: Authorization: Bearer <token>
Body: {
  "status": "confirmed"
}
```

### ⭐ Reviews

```bash
# Crear review
POST /api/reviews
Headers: Authorization: Bearer <token>
Body: {
  "bookingId": "uuid",
  "revieweeId": "uuid",
  "propertyId": "uuid",
  "rating": 5,
  "comment": "Excelente estadía!",
  "reviewType": "guest_to_host"
}

# Reviews de propiedad
GET /api/reviews/property/:propertyId

# Reviews de usuario
GET /api/reviews/user/:userId

# Estadísticas
GET /api/reviews/user/:userId/stats
```

### 💰 Pagos

```bash
# Procesar pago
POST /api/payments/process
Headers: Authorization: Bearer <token>
Body: {
  "bookingId": "uuid",
  "paymentMethod": "credit_card",
  "transactionId": "tx_123"
}

# Mis pagos
GET /api/payments/my-payments
Headers: Authorization: Bearer <token>

# Ganancias (para hosts)
GET /api/payments/earnings?startDate=2025-01-01&endDate=2025-12-31
Headers: Authorization: Bearer <token>

# Detalles de pago
GET /api/payments/:id
Headers: Authorization: Bearer <token>
```

### 💬 Chat

```bash
# Enviar mensaje
POST /api/chat/messages
Headers: Authorization: Bearer <token>
Body: {
  "receiverId": "uuid",
  "bookingId": "uuid",
  "content": "¡Hola! ¿Cómo estás?"
}

# Ver conversación
GET /api/chat/conversation?otherUserId=uuid&bookingId=uuid
Headers: Authorization: Bearer <token>

# Listar conversaciones
GET /api/chat/conversations
Headers: Authorization: Bearer <token>

# WebSocket
WS /api/chat/ws?token=<jwt>
```

### 🔐 Verificación

```bash
# Enviar verificación
POST /api/verification/submit
Headers: Authorization: Bearer <token>
Body: {
  "documentType": "passport",
  "documentNumber": "ABC123456",
  "documentFrontUrl": "https://example.com/front.jpg",
  "documentBackUrl": "https://example.com/back.jpg",
  "selfieUrl": "https://example.com/selfie.jpg"
}

# Ver estado
GET /api/verification/status
Headers: Authorization: Bearer <token>

# Verificaciones pendientes (admin)
GET /api/verification/pending
Headers: Authorization: Bearer <admin-token>

# Aprobar (admin)
POST /api/verification/:id/approve
Headers: Authorization: Bearer <admin-token>

# Rechazar (admin)
POST /api/verification/:id/reject
Headers: Authorization: Bearer <admin-token>
Body: {
  "reason": "Documento no legible"
}
```

## 🧪 Ejecutar Tests

```bash
# Todos los tests
npm test

# Con UI interactiva
npm run test:ui

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch

# Tests específicos
npm run test:auth
npm run test:properties
npm run test:bookings
npm run test:reviews
npm run test:payments
npm run test:chat
npm run test:verification

# Un solo test
npm test -- bookings.test.ts
```

## 💡 Ejemplos de Código

### Validación con Zod

```typescript
// Schema
const createPropertySchema = z.object({
  title: z.string().min(10).max(255),
  pricePerNight: z.number().positive(),
  latitude: z.number().min(-90).max(90),
  images: z.array(z.string().url()).min(1),
});

// Tipo inferido automáticamente
type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// En la ruta
server.post(
  "/",
  {
    schema: { body: createPropertySchema },
  },
  handler
);
```

### Queries con Drizzle

```typescript
// Select con joins
const result = await db
  .select({
    id: properties.id,
    title: properties.title,
    hostName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
    avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
  })
  .from(properties)
  .leftJoin(users, eq(properties.hostId, users.id))
  .leftJoin(reviews, eq(properties.id, reviews.propertyId))
  .where(eq(properties.status, "active"))
  .groupBy(properties.id, users.id);
```

### Controller Type-Safe

```typescript
async create(
  request: FastifyRequest<{ Body: CreateBookingInput }>,
  reply: FastifyReply
) {
  // request.body es completamente tipado
  const booking = await this.service.create(
    request.body,
    request.user.id
  );

  return { booking };
}
```

## 🔒 Seguridad

### Variables de Entorno

```env
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/airbnb_db
JWT_SECRET=super-secreto-aleatorio-minimo-32-caracteres
PLATFORM_FEE_PERCENTAGE=15
```

### Validación en Zod

```typescript
const envSchema = z.object({
  JWT_SECRET: z.string().min(32), // Mínimo 32 caracteres
  DATABASE_URL: z.string().url(),
});

// Error en desarrollo si no cumple
export const config = envSchema.parse(process.env);
```

## 📊 Estructura de Respuestas

### Éxito

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error de Validación

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
  "issues": [
    {
      "path": ["email"],
      "message": "Email inválido"
    }
  ]
}
```

### Error de Negocio

```json
{
  "error": "La propiedad no está disponible en esas fechas"
}
```

## 🚀 Deploy

### Build

```bash
npm run build
# Archivos en dist/
node dist/server.js
```

### Docker

```bash
# Build
docker build -t airbnb-backend .

# Run
docker-compose up -d

# Logs
docker-compose logs -f app
```

### Variables Producción

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@host:5432/db_prod
JWT_SECRET=super-secreto-produccion-64-caracteres-minimo
PLATFORM_FEE_PERCENTAGE=15
```

## 📈 Monitoreo

### Health Check

```bash
curl http://localhost:3000/health
```

### Drizzle Studio

```bash
npm run db:studio
# Abre en http://localhost:4983
```

### Logs

```typescript
// El servidor usa Pino para logs
fastify.log.info("Message");
fastify.log.error(error);
```

## 🎯 Mejores Prácticas

### 1. Type Safety

✅ Usar Zod para validación  
✅ Inferir tipos desde schemas  
✅ No usar `any` nunca  
✅ Verificar con `npm run type-check`

### 2. Testing

✅ Test por cada módulo  
✅ Cleanup después de tests  
✅ Usar datos realistas  
✅ Cobertura > 80%

### 3. Base de Datos

✅ Usar transacciones cuando sea necesario  
✅ Índices en columnas frecuentes  
✅ Migraciones versionadas  
✅ Seeds para desarrollo

### 4. Seguridad

✅ Validar TODO input  
✅ JWT con expiración  
✅ HTTPS en producción  
✅ Rate limiting

## 🐛 Troubleshooting

### Error: Can't connect to database

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar DATABASE_URL
echo $DATABASE_URL
```

### Error: JWT secret must be at least 32 characters

```bash
# Generar secreto seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: Validation failed

```bash
# Ver detalles del error
# Los errores de Zod son descriptivos
# Verificar el schema en *.schemas.ts
```

## 📚 Recursos Útiles

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [Fastify Documentation](https://www.fastify.io/)
- [Vitest Guide](https://vitest.dev/)

## 🎓 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Hot reload
npm run type-check       # Verificar tipos
npm run build           # Compilar

# Base de datos
npm run db:generate     # Generar migraciones
npm run db:migrate      # Ejecutar migraciones
npm run db:push         # Push directo (dev)
npm run db:studio       # GUI
npm run db:seed         # Datos de prueba

# Tests
npm test                # Ejecutar tests
npm run test:coverage   # Con cobertura
npm run test:watch      # Watch mode
npm run test:ui         # UI interactiva

# Producción
npm start               # Servidor producción
```

## 🎉 Features Completas

✅ TypeScript estricto  
✅ Validación con Zod  
✅ ORM type-safe (Drizzle)  
✅ Tests completos (Vitest)  
✅ WebSockets  
✅ Docker ready  
✅ Migraciones automáticas  
✅ Hot reload  
✅ Error handling  
✅ JWT authentication  
✅ Role-based access  
✅ Búsqueda geográfica  
✅ Sistema de pagos  
✅ Chat en tiempo real  
✅ Reviews bidireccionales  
✅ Verificación de identidad

---

**🚀 ¡Todo listo para desarrollo y producción!**
