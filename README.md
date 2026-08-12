# SkillBridge — Frontend

Aplicación web (SPA) del proyecto **SkillBridge**, una plataforma para **medir y fortalecer *power skills*** (habilidades blandas como Pensamiento Crítico, Adaptabilidad, Comunicación, etc.) en estudiantes de ingeniería de la Universidad de Antioquia (UdeA).

Este repositorio contiene **únicamente el frontend** (Angular 21). La API REST vive en un repositorio aparte: [`skillbridge_backend`](https://github.com/DuvanR0598/skillbridge_backend).

> Desarrollado como proyecto de **práctica social** de la Facultad de Ingeniería (UdeA).

---

## 📑 Tabla de contenido

- [¿Qué hace este frontend?](#-qué-hace-este-frontend)
- [Stack tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Cómo ejecutarlo](#-cómo-ejecutarlo)
- [Conexión con el backend (importante)](#-conexión-con-el-backend-importante)
- [Configuración de entornos](#-configuración-de-entornos)
- [Compilar para producción](#-compilar-para-producción)
- [Pruebas](#-pruebas)
- [Despliegue (Netlify)](#-despliegue-netlify)
- [Comandos útiles](#-comandos-útiles)
- [Solución de problemas](#-solución-de-problemas)

---

## 🎯 ¿Qué hace este frontend?

Es la interfaz de usuario que consume la API de SkillBridge. Ofrece, según el rol:

- **Autenticación:** registro, login por correo/contraseña (JWT), login con **Google (OAuth2)** y completar perfil (datos personales, académicos, avatar, sede/seccional).
- **Estudiante:** realizar evaluaciones **PRE_TEST / POST_TEST**, ver su progreso, resultados y planes de fortalecimiento.
- **Coordinador (docente):** gestión de cuestionarios, banco de preguntas, dimensiones, matriz de puntuación, listado de estudiantes y analítica de grupo.
- **Administrador:** gestión de usuarios, exportación a Excel, y todo lo anterior.
- **Analítica:** dashboard con gráficas (radar de skills, comparativas, tablas de análisis por dimensión).

Todas las respuestas del backend siguen el contrato uniforme `ApiResponse<T>`.

---

## 🛠 Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | **Angular 21.2** (standalone components, **signals**, control flow `@if/@for/@switch`, `input()/output()`, `inject()`, `OnPush`) |
| Lenguaje | **TypeScript 5.9** (modo estricto) |
| UI principal | **Angular Material v21** (tema M2, primario teal `#1a5c38`) |
| UI complementaria | **PrimeNG v21** (toasts `MessageService` + `<p-toast/>`, `p-dialog`, `p-confirmdialog`) |
| Gráficas | **Chart.js 4** + **ng2-charts 10** |
| Iconos | **@tabler/icons-angular** + **primeicons** |
| Utilidades | **date-fns**, **@auth0/angular-jwt** |
| Formularios | **Reactive Forms** |
| Testing | **Vitest 4** (vía `@angular/build:unit-test`) |
| Gestor de paquetes | **npm** |

---

## 🏗 Arquitectura

**Patrón de dos layouts** (definido en `app.routes.ts`), con lazy loading de features:

- **`AuthLayout`** (`/`) — páginas sin autenticar: login, registro, completar perfil.
- **`MainLayout`** (`/app/*`) — páginas autenticadas con sidebar: dashboard, cuestionarios, evaluación, analítica, perfil, usuarios, etc.

**Autenticación:** `AuthService` mantiene el estado reactivo con **signals** y persiste los tokens JWT en `localStorage` (`accessToken`, `refreshToken`, `currentUser`).

**Guards (tres capas):**
1. `authGuard` — verifica presencia de token; redirige a `/login`.
2. `perfilGuard` — verifica `localStorage.profileCompleted`; redirige a `/complete-profile`.
3. `rolGuard` — lee `route.data.roles`; redirige a `/app/dashboard` si el rol no coincide.

**Interceptors:**
- Interceptor de **auth**: adjunta el header `Authorization: Bearer <token>`.
- Interceptor de **errores**: ante un 401 intenta refrescar el token (`/auth/refresh`) y reintenta; cierra sesión si vuelve a fallar.

**Roles:** `ROLE_ADMIN`, `ROLE_COORDINADOR` (docente), `ROLE_ESTUDIANTE` (estudiante). Verificados con `AuthService.hasRole()` / `hasAnyRole()`.

---

## 📂 Estructura del proyecto

```
skillbridge_frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/         # AuthService, guards, interceptors
│   │   │   ├── models/       # Modelos/DTOs (ApiResponse, dimension, perfil, auth…)
│   │   │   └── utils/        # resolveMediaUrl() para rutas /uploads
│   │   ├── features/         # Features con lazy loading
│   │   │   ├── auth/         #   login, register, completar-perfil
│   │   │   ├── dashboard/
│   │   │   ├── assessment/   #   flujo de examen del estudiante
│   │   │   ├── analytics/
│   │   │   ├── profile/
│   │   │   ├── questionnaires/  # cuestionarios, banco de preguntas, builder
│   │   │   ├── dimensions/
│   │   │   ├── score-matrix/
│   │   │   ├── teacher/
│   │   │   ├── students/
│   │   │   └── admin/users/
│   │   ├── shared/components/  # sidebar, topbar, avatar-viewer
│   │   ├── layouts/            # main-layout (shell autenticado)
│   │   ├── app.routes.ts       # rutas (AuthLayout / MainLayout)
│   │   └── app.config.ts       # providers (MessageService, interceptors…)
│   ├── environments/
│   │   ├── environment.ts       # DEV  (apiUrl local :8083)
│   │   └── environment.prod.ts  # PROD (apiUrl Render)
│   └── styles.scss             # estilos globales + tema Material M2 + overrides PrimeNG
├── angular.json                # config del build (fileReplacements, budgets…)
├── netlify.toml                # config de despliegue en Netlify (SPA)
├── package.json
└── README.md
```

---

## ✅ Requisitos previos

- **Git**
- **Node.js 20.19+** (o 22+) — Angular 21 lo requiere. Verifica con `node -v`.
- **npm** (viene con Node).
- **El backend corriendo** (por defecto en `http://localhost:8083`). Ver el repo [`skillbridge_backend`](https://github.com/DuvanR0598/skillbridge_backend) — puedes levantarlo fácilmente con `docker compose up --build`.

> No necesitas instalar Angular CLI globalmente: se usa a través de `npx` / los scripts de npm.

---

## 🚀 Cómo ejecutarlo

**1. Clonar el repositorio:**

```bash
git clone https://github.com/DuvanR0598/skillbridge_frontend.git
cd skillbridge_frontend
```

**2. Instalar dependencias:**

```bash
npm install
```

**3. Arrancar el servidor de desarrollo:**

```bash
npm start
```

Esto ejecuta `ng serve`. La aplicación queda disponible en:

```
http://localhost:4200
```

El servidor recarga automáticamente cada vez que modificas un archivo fuente.

> ℹ️ Asegúrate de tener el **backend corriendo** antes de iniciar sesión (ver la sección siguiente).

---

## 🔌 Conexión con el backend (importante)

En desarrollo, el frontend apunta a la API local definida en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8083',
  googleClientId: '...'
};
```

Para que la app funcione end-to-end necesitas el backend activo en ese puerto. La forma más rápida (desde el repo del backend):

```bash
docker compose up --build
```

Si tu backend corre en otra URL/puerto, edita `apiUrl` en `environment.ts`.

> **CORS:** el backend permite orígenes vía `APP_CORS_ALLOWED_ORIGINS` (por defecto `http://localhost:4200`). Si cambias el puerto del frontend, añádelo allí.

---

## ⚙️ Configuración de entornos

Angular selecciona el archivo de entorno mediante `fileReplacements` en `angular.json`:

| Entorno | Archivo | `apiUrl` |
|---|---|---|
| Desarrollo | `src/environments/environment.ts` | `http://localhost:8083` |
| Producción | `src/environments/environment.prod.ts` | `https://skillbridge-backend-yjbu.onrender.com` |

- `npm start` / `ng serve` → usa **development**.
- `npm run build` / `ng build` → usa **production** por defecto (reemplaza por `environment.prod.ts`).

---

## 📦 Compilar para producción

```bash
npm run build
```

Los artefactos se generan en `dist/skillbridge_frontend/browser`. La build de producción optimiza la aplicación (minificación, tree-shaking, etc.).

Para **verificar la compilación** con la configuración de desarrollo (útil como chequeo rápido sin optimizaciones):

```bash
npx ng build --configuration development
```

> No hay un script de lint separado: el **modo estricto de TypeScript** y las comprobaciones estrictas de plantillas de Angular capturan la mayoría de errores en tiempo de compilación.

---

## 🧪 Pruebas

Las pruebas unitarias usan **Vitest** (vía `@angular/build:unit-test`):

```bash
npm test
```

Para ejecutar las pruebas de una feature específica:

```bash
npx ng test --include="src/app/features/auth/**/*.spec.ts"
```

---

## ☁️ Despliegue (Netlify)

El despliegue está configurado en `netlify.toml`:

- **Comando de build:** `npm run build`
- **Carpeta publicada:** `dist/skillbridge_frontend/browser`
- **Node:** 20 (fijado en `NODE_VERSION`)
- **Redirect SPA:** cualquier ruta (`/*`) sirve `index.html` con status `200` — evita errores 404 al recargar en rutas del router (p. ej. `/app/dashboard`).

**Entorno LIVE actual:**
- Frontend (Netlify): https://effulgent-beijinho-dcc4fe.netlify.app
- Backend (Render): https://skillbridge-backend-yjbu.onrender.com

> ⚠️ El backend en Render (plan gratuito) **se duerme tras ~15 min** de inactividad; el primer request puede tardar ~30–60 s (cold start).

---

## 🧰 Comandos útiles

```bash
npm install                                   # instalar dependencias
npm start                                      # servidor de desarrollo (http://localhost:4200)
npm run build                                  # build de producción
npm run watch                                  # build incremental en modo desarrollo
npm test                                       # pruebas unitarias (Vitest)
npx ng build --configuration development        # verificar compilación (dev)
npx ng generate component features/mi-feature/mi-componente   # generar componente
```

---

## 🩺 Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Errores de red / login falla | El backend no está corriendo | Levanta el backend en `http://localhost:8083` (`docker compose up --build`) |
| Errores **CORS** en consola | Origen del frontend no permitido | Añade `http://localhost:4200` (o tu puerto) a `APP_CORS_ALLOWED_ORIGINS` en el backend |
| `ng: command not found` | Angular CLI no está global | Usa `npm start` / `npx ng ...` en vez de `ng` directo |
| El build falla por versión de Node | Node < 20.19 | Actualiza a Node 20.19+ o 22+ |
| El puerto **4200** está ocupado | Otra instancia de `ng serve` | Ciérrala o usa `ng serve --port 4300` |
| 404 al recargar en `/app/...` en producción | Falta el fallback SPA | Ya resuelto por el redirect en `netlify.toml`; si usas otro hosting, configura el mismo fallback a `index.html` |
| Las imágenes/avatares no cargan | Ruta relativa `/uploads` | El frontend usa `resolveMediaUrl()` para prefijar `apiUrl`; verifica que el backend sirva `/uploads/**` |

---

## 📄 Licencia y propiedad intelectual

- El **código de la plataforma** es propiedad del autor (Duván Ferney Ruiz Ocampo) para usufructo comercial.
- El **modelo y contenido de *power skills*** (preguntas, dimensiones) es de la Universidad de Antioquia, para uso académico.

---

**Autor:** Duván Ferney Ruiz Ocampo — Ingeniería de Sistemas, Universidad de Antioquia.
