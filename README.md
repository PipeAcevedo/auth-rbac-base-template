# Plantilla de autenticación y RBAC

Base reutilizable para autenticación de usuarios y autorización por roles con Node.js, Express, PostgreSQL, React 18 y Tailwind CSS.

## Requisitos

- Node.js 20 o superior y npm
- PostgreSQL 13 o superior
- SMTP configurado para habilitar el envío del enlace de recuperación

## Inicio rápido

1. Crea una base de datos PostgreSQL, por ejemplo `auth_rbac`.
2. Ejecuta el esquema (sustituye la URL por tus credenciales): `psql "postgresql://postgres:postgres@localhost:5432/auth_rbac" -f backend/database/schema.sql`. El esquema habilita `pgcrypto` para generar UUID.
3. Copia `backend/.env.example` a `backend/.env` y configura la base de datos, secretos JWT distintos y las opciones de cookie.
4. Copia `frontend/.env.example` a `frontend/.env` si la API no está en `http://localhost:4000/api/v1`.
5. Instala y ejecuta los proyectos en terminales separadas:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

La API estará disponible en `http://localhost:4000` y la aplicación en `http://localhost:5173`.

## Flujo de autenticación

- El registro y el inicio de sesión validan las credenciales, guardan las contraseñas mediante bcrypt (12 rondas) y emiten un access JWT de corta duración.
- El access token permanece en memoria en el cliente y se envía como `Authorization: Bearer`. No se guarda en `localStorage`.
- El refresh JWT se entrega exclusivamente en una cookie `HttpOnly`, `SameSite` configurable y `Secure` en producción. Su identificador se registra en PostgreSQL.
- Al recargar la aplicación, `AuthContext` solicita una renovación con la cookie. Axios también reintenta una petición una vez tras un 401, renovando el access token. La rotación invalida el refresh anterior.
- El cierre de sesión revoca el refresh token y elimina la cookie. El cambio de contraseña también revoca las sesiones de refresh existentes.
- `authenticateToken` protege recursos; `authorizeRoles('admin')` verifica los roles firmados en el access token. El perfil acepta usuarios autenticados y el dashboard de administración requiere el rol `admin`.
- Las rutas de autenticación rechazan solicitudes de navegador con un `Origin` distinto al frontend configurado. En producción `Secure` se activa automáticamente para la cookie; `SameSite` se puede ajustar según los dominios.

Para conceder el rol administrativo, registra el usuario y asigna `admin` desde una consola de base de datos con acceso restringido, por ejemplo:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'admin@example.com' AND r.name = 'admin'
ON CONFLICT DO NOTHING;
```

Los registros nuevos sólo reciben el rol `user`.

## Recuperación de contraseña

Configura las variables `SMTP_*`, `SMTP_FROM` y `PASSWORD_RESET_URL` en `backend/.env`. El enlace usa un token aleatorio de un solo uso, almacenado como hash y con caducidad; el token viaja en el fragmento URL para no enviarse al servidor al cargar la página. Sin SMTP configurado, la recuperación responde con `503` para cualquier correo y no revela si existe una cuenta.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/v1/auth/register` | Público |
| POST | `/api/v1/auth/login` | Público |
| POST | `/api/v1/auth/refresh-token` | Cookie de refresh |
| POST | `/api/v1/auth/logout` | Cookie de refresh |
| POST | `/api/v1/auth/forgot-password` | Público |
| POST | `/api/v1/auth/reset-password` | Token de restablecimiento |
| GET | `/api/v1/profile` | Access JWT |
| GET | `/api/v1/admin/dashboard` | Access JWT + rol `admin` |
| GET | `/health` | Público |

## Configuración de producción

Usa secretos generados aleatoriamente, TLS, `COOKIE_SECURE=true` y un `COOKIE_SAME_SITE` adecuado a los dominios de despliegue. Mantén frontend y API bajo una política de origen/cookies bien definida, configura copias de seguridad de PostgreSQL, y agrega monitoreo y pruebas de integración antes de producción. Esta plantilla limita las peticiones de autenticación; adapta el límite y la política de orígenes a tu infraestructura.
