# Flotapp — Instrucciones de Configuración

## PASO 1 — Instalar Node.js
1. Ir a nodejs.org
2. Descargar versión LTS
3. Instalar con opciones por defecto
4. Reiniciar el terminal

## PASO 2 — Crear cuenta en Supabase
1. Ir a supabase.com → "Start your project" → registrarse con GitHub
2. Crear nuevo proyecto: nombre `construserv-app`, región `South America (São Paulo)`
3. Guardar la contraseña del proyecto en un lugar seguro

### Configurar la base de datos:
1. En Supabase → "SQL Editor" → "New query"
2. Copiar TODO el contenido del archivo `supabase/schema.sql`
3. Pegarlo en el editor y presionar "Run"

### Obtener las credenciales:
1. En Supabase → "Project Settings" → "API"
2. Copiar:
   - "Project URL" → va en `NEXT_PUBLIC_SUPABASE_URL`
   - "anon public" key → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## PASO 3 — Configurar variables de entorno
1. Abrir el archivo `.env.local` en esta carpeta
2. Reemplazar los valores con los obtenidos en Supabase

## PASO 4 — Instalar dependencias y arrancar
Abrir terminal en esta carpeta y ejecutar:
```
npm install
npm run dev
```
Luego abrir en el navegador: http://localhost:3000

## PASO 5 — Crear el primer usuario administrador
1. En Supabase → "Authentication" → "Users" → "Invite user"
2. Ingresar tu email
3. Revisar el email y seguir el enlace para crear contraseña
4. En Supabase → "SQL Editor", ejecutar:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'TU_EMAIL@aqui.com';
   ```

## PASO 6 — Publicar en internet (Vercel)
1. Subir el código a GitHub (crear repositorio nuevo)
2. Ir a vercel.com → "New Project" → conectar con el repositorio
3. En Vercel → "Environment Variables" → agregar las mismas variables de `.env.local`
4. Vercel desplegará automáticamente la app con una URL pública
