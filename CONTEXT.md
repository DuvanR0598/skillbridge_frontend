# CONTEXT.md — Documento de transferencia de sesión
**Última actualización:** 22/06/2026

---

# PROYECTO

- **Nombre:** SkillBridge
- **Descripción general:** SPA (Angular 21) + API REST (Spring Boot 3) para la evaluación de **competencias blandas (Power Skills)** de estudiantes de la Facultad de Ingeniería (UdeA). Mide dos skills: **PENSAMIENTO_CRITICO** (chip "PC", azul) y **ADAPTABILIDAD** (chip "AD", naranja), descompuestas en **dimensiones**. Las evaluaciones se aplican como PRE_TEST y POST_TEST y se puntúan por **peso** (no por respuesta correcta/incorrecta).
- **Objetivo principal:** Que coordinadores/admins creen cuestionarios (banco de preguntas + matriz de puntuación + planes de fortalecimiento + ramificación), los publiquen (general o por programa), y que los estudiantes los respondan y vean su progreso.
- **Estado actual:** ~90%. Núcleo funcional completo. Las últimas sesiones fueron mejoras incrementales (UI, toasts, paginadores, buscadores, identificación de usuario, publicación por programa, exportación XLSX, vista de estudiantes para coordinador, imágenes en preguntas).

---

# ARQUITECTURA Y TECNOLOGÍAS

## Frontend
- **Framework:** Angular **21** (standalone components, signals, `computed()`, control flow `@if/@for/@switch`, `input()/output()`, `inject()`, OnPush donde aplica).
- **Librerías:** Angular Material v21 (M2, primary **teal-700**), **PrimeNG v21** (toasts `MessageService`, `p-dialog` con `maskStyleClass="bank-dialog-mask"`, `p-confirmdialog` `ConfirmationService`), `@tabler/icons-angular`, `chart.js` + `ng2-charts`, `date-fns`, `@auth0/angular-jwt`.
- **Estructura relevante:**
  - `src/app/core/` → `auth/` (AuthService, guards, interceptors), `models/`, `utils/media-url.ts`.
  - `src/app/features/` → `auth/` (login, register, completar-perfil), `dashboard/`, `questionnaires/` (questionnaire-list, questionnaire-form, question-bank, question-form, branching-editor, questionnaire-preview), `score-matrix/` (+ entry-plans), `dimensions/`, `assessment/` (assessment-list, assessment-player, assessment-result), `analytics/student-progress/`, `teacher/` (dashboard/group-report + components), `admin/users/`, `students/` (NUEVO: vista solo lectura coordinador), `profile/` (+ components: profile-info, profile-academic, profile-security).
  - `src/app/shared/components/` → `sidebar/`, `topbar/`, `avatar-viewer/` (NUEVO lightbox).
  - `src/app/layouts/` → `auth-layout/`, `main-layout/` (sidebar + topbar + `<main class="content-area">` que es el **contenedor scrolleable**).
- **Configuraciones importantes:**
  - `src/environments/environment.ts`: `apiUrl: 'http://localhost:8083'`, `googleClientId`, `production:false`.
  - `app.config.ts`: `provideRouter(routes, withComponentInputBinding())`, `providePrimeNG({ theme: { preset: Aura } })`, `MessageService` provisto global, interceptors (auth + error).
  - `app.html`: `<p-toast />` global + `<router-outlet />`.
  - `styles.scss`: variables CSS (`--primary:#1a5c38`, `--primary-dark:#0a3a1f`, `--bg-app`, `--bg-card`, `--border`, `--danger:#d32f2f`, `--radius-sm:6px`, etc.), tema Material M2, `.bank-dialog-mask` (blur), `.btn-action-primary`, bloques `@media print` (`body.print-preview`, `.print-group-report`, `.print-progress`, `.print-result`), y `.program-search-panel` (estilos del buscador dentro de mat-select).

## Backend
- **Framework:** Spring Boot 3 (Java 17+). **IMPORTANTE: compila solo en STS/Eclipse**; `mvnw` falla por el procesador de anotaciones (MapStruct/Lombok). Puerto **8083**, sin context-path.
- **Dependencias clave (`pom.xml`):** spring-boot-starter-web, data-jpa, validation, security, oauth2-client, mysql-connector-j, mapstruct + lombok + lombok-mapstruct-binding, jjwt (api/impl/jackson), devtools, **apache poi-ooxml 5.3.0** (NUEVO, para XLSX).
- **Arquitectura:** Controller → Service (interfaz + impl) → Repository (Spring Data JPA) → Entity. DTOs request/response. Mappers MapStruct. Respuesta uniforme `ApiResponse<T>` = `{ success, message?, data, errorCode?, timestamp }`. Validadores de pregunta por tipo (Strategy + Factory). `JpaSpecificationExecutor` + `PreguntaSpec` para filtros dinámicos del banco. `MotorDePuntuacion` calcula puntajes por peso.
- **Paquetes:** `com.udea.skillbridge` con subpaquetes `controller`, `service(.impl)`, `repository`, `entity`, `dto(.request/.response)`, `mapper`, `enums`, `validation`, `config` (`WebStaticResourceConfig`), y `seguridad` (que tiene su propio `controller/service/repository/entity/dto/enums/config/oauth2/mapper/filter`).
- **Configuraciones (`application.properties`):**
  ```properties
  server.port=8083
  spring.datasource.url=jdbc:mysql://localhost:3306/skill_bridge
  spring.datasource.username=root
  spring.datasource.password=admin
  spring.jpa.hibernate.ddl-auto=update
  # multipart (avatares e imágenes de preguntas)
  spring.servlet.multipart.max-file-size=5MB
  spring.servlet.multipart.max-request-size=5MB
  # OAuth2 Google con ${GOOGLE_CLIENT_ID}/${GOOGLE_CLIENT_SECRET}
  # JWT: security.jwt.secret-key=${JWT_SECRET_KEY}, access 900000ms, refresh 7 días
  ```

## Base de datos
- **Motor:** MySQL 8.0. BD: **skill_bridge** (root / admin). CLI: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`.
- **Modelo general:** usuarios + perfil (1-1), roles (N-N), cuestionarios → preguntas (N-N vía `pregunta_cuestionario`) con opciones, dimensiones, matriz de puntuación + planes de fortalecimiento, condiciones de ramificación, evaluaciones de estudiante + detalle de respuestas + resultados.
- **Tablas principales:** `usuarios`, `usuario_perfil`, `roles`, `usuario_roles`, `permisos`, `cuestionario`, `pregunta`, `opcion_pregunta`, `pregunta_cuestionario`, `dimensiones`, `condicion_pregunta`, `puntuacion_matrix`, `plan_fortalecimiento`, `evaluacion_estudiante`, `detalle_respuesta`, `puntuacion_resultado`, `refresh_token`.

---

# DECISIONES TÉCNICAS IMPORTANTES

1. **Soft skills se miden por PESO, no por "opción correcta".**
   - Se **eliminó** el campo `isCorrecta`/`is_correcta` de entidad, DTOs, validadores y BD (`ALTER TABLE opcion_pregunta DROP COLUMN is_correcta`). `MotorDePuntuacion.calcularPuntuacionMaxima` ahora: OPCION_UNICA/VERDADERO_FALSO/LIKERT = mayor peso; OPCION_MULTIPLE = suma de los N pesos más altos (N=maxOpciones, o todos).
   - Validadores simplificados (solo cuentan opciones mínimas, sin reglas de "correcta").

2. **Programa de ingeniería: un solo enum con `codigo`+`displayName`** (no dos enums).
   - 33 programas oficiales de la Facultad (códigos 501–552). El código se deriva del enum (no se persiste por separado — fuente única de verdad).

3. **ID de usuario sigue siendo autoincremental (clave subrogada).** Se agregaron `tipoIdentificacion` (enum CC/TI/CE/PA) y `numeroIdentificacion` (String, único). **Alternativa descartada:** usar la identificación como PK (rechazada porque pasaportes/CE son alfanuméricos y rompería FKs/JWT/datos).

4. **Filtros dinámicos del banco con Criteria API** (`JpaSpecificationExecutor` + `PreguntaSpec`) en lugar de JPQL — el JPQL fallaba silenciosamente con enums nulos en Hibernate.

5. **Servir archivos subidos:** `WebStaticResourceConfig` mapea `/uploads/**` → `file:uploads/`, y SecurityConfig permite `GET /uploads/**` (las `<img>` no envían token). El frontend resuelve URLs relativas a absolutas con `resolveMediaUrl()` (helper en `core/utils/media-url.ts`).

6. **Notificaciones unificadas en toasts PrimeNG** (`MessageService` global). Se migraron MatSnackBar/alertas inline a toasts en varios módulos.

7. **Publicación de cuestionarios por programa:** campo `programaObjetivo` en cuestionario (null = general). Filtrado por programa al listar (estudiante) y validación al iniciar evaluación (seguridad anti acceso directo por ID).

8. **Restauración de estado al volver atrás:** query param `?cuestionario=<id>` en "Mi Progreso" y "Panel Coordinador"; `history.scrollRestoration='manual'` + captura/restauración de scroll en `.content-area`.

9. **Alineación de iconos:** patrón recurrente — `mat-icon` mantiene caja 24×24 aunque el `font-size` sea menor; se corrige con `width/height/line-height` iguales al font-size.

10. **Botones de acción circulares suaves** (editar/eliminar) consistentes en Dimensiones, Cuestionarios, Banco de Preguntas, Matriz y planes: fondo `rgba(0,0,0,0.04)`, hover verde primario / rojo peligro; `align-items: flex-start` para uniformidad.

---

# FUNCIONALIDADES IMPLEMENTADAS

> Estado: ✅ completa. ⚠️ requiere reiniciar backend en STS para cambios Java.

### Autenticación / Identidad
- **Registro con tipo+número de identificación** ✅ — `RegisterComponent`, `RegistrarRequest`, `AuthService.register`, BD migrada (`tipo_identificacion`, `numero_identificacion` único). Admin `DataInitializer` con CC/0000000000.
- **Pedir documento a usuarios Google al completar perfil** ✅ — `CompletarPerfilRequest` (campos opcionales), `UsuarioPerfilService.actualizarMyPerfil` (asigna solo si el usuario no tiene), `completar-perfil` muestra campos si `needsIdentification`.
- **Cambio de contraseña** ✅ — `PATCH /usuarios/me/cambiar-contrasena`, `CambiarContrasenaRequest`, `UsuarioService.cambiarContrasena`, `ProfileSecurity` (tab Seguridad, toasts, campo username oculto para accesibilidad).

### Perfil
- **Avatar:** subida, sincronización usuarios↔perfil, visor a pantalla completa (`AvatarViewer`), fix Google avatar (no borra URL remota), fix 401/404 (servir uploads), actualización instantánea en sidebar/topbar (`AuthService.updateCurrentUser`). ✅
- **Programa con código (solo lectura)** en completar-perfil/profile-academic y diálogo admin. Buscador dentro del selector de programa (`.program-search-panel`). ✅

### Cuestionarios
- **Duplicar cuestionario** ✅ — `POST /cuestionario/{id}/duplicar`, copia preguntas + ramificaciones, queda BORRADOR con nombre "… COPIA".
- **Publicación por programa ("Dirigido a")** ✅ — `programaObjetivo`, selector con buscador en `questionnaire-form`, filtrado por programa, validación al iniciar evaluación.
- **Paginador** en lista de cuestionarios ✅.
- **Vista previa/impresión** con chip de skill ✅.

### Banco de Preguntas
- **Quitar "opción correcta"** ✅.
- **Chips (PC/AD + dimensión), filtros (tipo/skill/dimensión), paginación, buscador** ✅.
- **Imágenes en preguntas** ✅ (NUEVO/última): subir al crear (`question-form`), `POST /preguntas/subir_imagen`, se guarda en `uploads/preguntas/`, el estudiante la ve en `assessment-player` (con `imageSrc`/`resolveMediaUrl`), miniatura en el banco. **Editar inline: reemplazar/quitar imagen** ✅ — `PATCH /preguntas/{id}/imagen`, `updateQuestionImage`.

### Matriz de Puntuación / Planes
- Confirmación PrimeNG antes de eliminar entrada y plan ✅; toasts en planes ✅; botones circulares suaves ✅.

### Ramificación
- Crear/eliminar/editar con toasts PrimeNG; bloque "Nueva condición" movido arriba ✅.

### Estudiante
- **Mi Progreso:** PDF (print), restauración de cuestionario+scroll al volver, etiqueta del cuestionario fuente, historial con chips (skill, dimensión NUEVA, %, nivel) alineados + "Completado" sobre "Ver resultado" ✅.
- **Resultado de evaluación:** botón "Descargar PDF" (reemplazó "Ir al Dashboard") ✅.
- **Mis Evaluaciones:** paginador + buscador por coincidencia de palabras ✅.
- **Dashboard "Progreso por dimensión":** muestra PRE/POST del último cuestionario completado (NO promedio); etiqueta con nombre del cuestionario fuente ✅.

### Coordinador
- **Panel Coordinador:** restauración de cuestionario al volver; fix selector (`[ngModel]`/`[ngValue]`); iconos de tags alineados ✅.
- **Vista "Usuarios" (solo lectura de estudiantes)** ✅ (NUEVO) — `students/` (StudentsList), `GET /usuarios/estudiantes`, búsqueda por nombre, filtro por programa (con buscador), paginador, diálogo "ver perfil" de solo lectura, visor de avatar, exportar XLSX filtrado (`GET /usuarios/estudiantes/exportar`). En sidebar grupo "Otros".

### Admin → Usuarios
- Ver perfil (diálogo), tipo+número identificación en diálogo, **exportar todos a XLSX** (`GET /usuarios/exportar`) ✅, visor de avatar en tabla y diálogo.

### Sidebar
- Reestructurado: Dashboard / Gestión académica (Dimensiones, Banco de Preguntas, Cuestionarios, Matriz de Puntuación) / Análisis (Panel Coordinador) / Otros (Usuarios — solo coordinador) / Administración (Usuarios — solo admin). Espaciado de iconos colapsado mejorado ✅.

---

# CÓDIGO IMPORTANTE

## Endpoints clave (backend)
```
# Auth (público)
POST   /auth/register | /auth/login | /auth/refresh | /auth/logout
# Usuarios
GET    /usuarios/me                         (autenticado)
PATCH  /usuarios/me/cambiar-contrasena      (autenticado)  body {currentPassword,newPassword}? -> en realidad DTO usa contrasenaActual/contrasenaNueva
GET    /usuarios/listar                     (ADMIN)
GET    /usuarios/exportar                   (ADMIN)  -> XLSX
GET    /usuarios/estudiantes                (ADMIN,COORDINADOR)
GET    /usuarios/estudiantes/exportar?search=&programa=  (ADMIN,COORDINADOR) -> XLSX
GET    /usuarios/{id}/perfil                (ADMIN,COORDINADOR)
PUT    /usuarios/{id}/roles                 (ADMIN)
PATCH  /usuarios/{id}/toggle-enabled        (ADMIN)
# Perfil
GET    /perfil/programas                    (público) -> [{value, codigo, displayName}]
GET/PATCH /usuarios/me/perfil  ; GET /usuarios/me/perfil/estado ; POST /usuarios/me/perfil/avatar
# Preguntas (ADMIN,COORDINADOR)
POST   /preguntas/crear_pregunta            (body incluye imagenUrl opcional)
POST   /preguntas/subir_imagen              (multipart "file") -> { imagenUrl }
PATCH  /preguntas/{id}/imagen?imagenUrl=     (omitir = quitar)
PATCH  /preguntas/{id}/dimension?idDimension=
PATCH  /preguntas/{id}/opcion_peso
GET    /preguntas/paginado?page&size&tipoPregunta&search&skill&idDimension
DELETE /preguntas/eliminar_pregunta/{id}
# Cuestionario
POST   /cuestionario/crear_cuestionario  ; PATCH /cuestionario/{id}/actualizar
POST   /cuestionario/{id}/duplicar
GET    /cuestionario/listar_cuestionarios | /listar_cuestionarios_activos (filtra por programa si estudiante)
PATCH  /cuestionario/{id}/completo|publicar|archivar ; DELETE /cuestionario/borrado_logico/{id}
GET    /cuestionario/{id}/preguntas ; POST/DELETE /cuestionario/{id}/pregunta...
GET    /cuestionario/{id}/entregar_cuestionario
# Evaluación (ESTUDIANTE)
POST   /evaluacion/cuestionario/{id}/iniciar  (valida programaObjetivo)
# Estáticos
GET    /uploads/**                          (público)
```

## Configuración Spring Security (resumen `SecurityConfig`)
- STATELESS, JWT filter, `JwtAuthenticationEntryPoint` (401 JSON).
- permitAll: `/auth/**`, `/oauth2/**`, `/login/oauth2/**`, swagger, `GET /uploads/**`, `GET /perfil/programas`.
- `/preguntas/**` → ADMIN/COORDINADOR. `/cuestionario` POST/PATCH/DELETE → ADMIN/COORDINADOR; `GET /cuestionario/**` → los 3 roles; `GET /cuestionario/*/entregar` → ESTUDIANTE.
- `/usuarios` GET → ADMIN; `/usuarios/me*` → autenticado; `/usuarios/*/perfil` GET → ADMIN/COORDINADOR.
- `@EnableMethodSecurity` activo (`@PreAuthorize` en varios endpoints). `.anyRequest().authenticated()`.

## Interceptors / Guards (frontend)
- `authInterceptor`: agrega `Authorization: Bearer <accessToken>` a cada request.
- `errorInterceptor`: en 401 (no /auth/refresh) intenta refresh y reintenta; en 403 navega a /app/dashboard.
- Guards: `authGuard` (token) → `perfilGuard` (profileCompleted) → `rolGuard` (`route.data.roles`).

## Helper crítico frontend
```ts
// core/utils/media-url.ts
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;       // Google/base64/blob
  return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`; // /uploads/... -> absoluta
}
```

## Enums clave (backend)
- `ProgramaIngenieria(codigo, displayName)` — 33 valores (INGENIERIA_DE_SISTEMAS("504",...), etc.).
- `TipoIdentificacion(displayName)` — CC, TI, CE, PA.
- `TipoRol` — ROLE_ADMIN, ROLE_COORDINADOR, ROLE_ESTUDIANTE.
- `Genero`, `SkillTipo`(PENSAMIENTO_CRITICO/ADAPTABILIDAD), `TipoPregunta`(VERDADERO_FALSO/LIKERT/OPCION_UNICA/OPCION_MULTIPLE/DESCRIPCION), `EstadoCuestionario`(BORRADOR/COMPLETO/PUBLICADO/ARCHIVADO/ELIMINADO), `EvaluacionFase`(PRE_TEST/POST_TEST), `EvaluacionEstado`(EN_PROGRESO/COMPLETADO), `SkillNivel`(BAJO/INTERMEDIO/AVANZADO).

## DTOs notables
- `PreguntaRequest{ tipoPregunta, texto, imagenUrl?, ayuda?, maxOpciones?, idDimension?, opcionPreguntaRequest[] }`; `OpcionPreguntaRequest{ texto, peso, ordenVisualizacion }` (sin isCorrecta).
- `CuestionarioRequest`/`ActualizarCuestionarioRequest` con `programaObjetivo`.
- `EstudianteResumenResponse{ idUsuario, tipoIdentificacion, numeroIdentificacion, nombre, apellido, email, programaIngenieria, programaNombre, codigoPrograma, semestreAcademico, activado }`.
- `EstudianteResumenResponse` y export usan `UsuarioExportService` (POI).

---

# ESTRUCTURA DE ARCHIVOS RELEVANTE
```
skillbridge_frontend/
  src/environments/environment.ts
  src/app/app.routes.ts | app.config.ts | app.html
  src/styles.scss
  src/app/core/
    auth/{auth.service.ts, *.guard.ts, interceptors/*}
    models/{auth.model.ts, perfil.model.ts, questionnaire-admin.model.ts, ...}
    utils/media-url.ts
  src/app/shared/components/{sidebar, topbar, avatar-viewer}/
  src/app/layouts/main-layout/
  src/app/features/
    auth/{login, register, completar-perfil}/
    dashboard/{dashboard.ts/html/scss, dashboard.service.ts}
    questionnaires/{questionnaire-list, questionnaire-form, question-bank, question-form, branching-editor, questionnaire-preview, questionnaires.service.ts}
    score-matrix/{score-matrix, entry-plans}/
    dimensions/  assessment/{assessment-list, assessment-player, assessment-result}/
    analytics/student-progress/  teacher/{dashboard, group-report, components}/
    admin/users/  students/{students-list, students.service.ts}  profile/{components/*}/

skillbridge_backend/ (paquete com.udea.skillbridge)
  config/WebStaticResourceConfig.java
  controller/{CuestionarioController, PreguntaController, ...}
  service/impl/{CuestionarioServiceImpl, PreguntaServiceImpl, MotorDePuntuacion, EvaluacionEstudianteServiceImpl, AnalyticsServiceImpl, ...}
  entity/{CuestionarioEntity, PreguntaEntity, OpcionPreguntaEntity, ...}
  enums/{ProgramaIngenieria, TipoIdentificacion, ...}  (seguridad/enums)
  repository/{IPreguntaRepository(+JpaSpecificationExecutor), ICuestionarioRepository, PreguntaSpec, ...}
  seguridad/{controller/UsuarioController, service/{UsuarioService, UsuarioPerfilService, UsuarioExportService, AuthService, JwtService}, entity/{UsuarioEntity, UsuarioPerfilEntity}, config/{SecurityConfig, DataInitializer}, oauth2/*, repository/*, dto/*}
  src/main/resources/application.properties
  uploads/{avatars, preguntas}/  (archivos servidos en /uploads/**)
```

---

# PROBLEMAS RESUELTOS
- **Avatar 401/404:** backend no servía `/uploads/**` y la URL era relativa → `WebStaticResourceConfig` + permitAll + `resolveMediaUrl`. (varios componentes con avatar)
- **Avatar Google InvalidPathException:** `subirAvatar` intentaba borrar URL remota como archivo → guardar `if (avatarAnterior.startsWith("/uploads/"))`.
- **Avatar no se refresca en sidebar/topbar:** solo se escribía localStorage → `AuthService.updateCurrentUser` actualiza el signal.
- **Cambio de contraseña fallaba:** mismatch de nombres campos / max length; alineado (DTO `contrasenaActual/contrasenaNueva`, frontend igual, max 100).
- **Volver atrás cargaba otro cuestionario / scroll al inicio:** query param + `scrollRestoration='manual'` + captura/restauración de scroll en `.content-area`.
- **Selector mostraba título posición 0:** `<select [value]>` nativo poco fiable → `[ngModel]`/`[ngValue]`.
- **Enum ProgramaIngenieria roto en BD:** columna era MySQL ENUM con valores viejos → `ALTER ... VARCHAR(60)` + migración `SYSTEMS_ENGINEERING → INGENIERIA_DE_SISTEMAS`.
- **Iconos descuadrados (mat-icon caja 24px):** fix width/height/line-height en varios (meta-items cuestionarios, tags dimension-analysis, badge Email verificado, activity-icon dashboard).
- **Límite imagen 1MB:** faltaba config multipart → `max-file-size=5MB`.

---

# PENDIENTES ACTUALES
- **[ALTA] Reiniciar backend en STS.** Cambios Java de la última sesión (imágenes de preguntas: `PreguntaServiceImpl.subirImagen/actualizarImagen`, `PreguntaController` endpoints `/subir_imagen` y `PATCH /{id}/imagen`, `IPreguntaService`) **requieren recompilar**. También `pom.xml` agregó Apache POI (Maven lo descargará al recompilar). Sin esto, fallan subida/edición de imagen y export XLSX.
- **[MEDIA] Verificación end-to-end de imágenes:** crear pregunta con imagen → verla como estudiante; editar (reemplazar/quitar) imagen. Confirmar que `uploads/preguntas/` se crea junto al dir de ejecución del backend en STS.
- **[BAJA] Promedio PRE/POST en dashboard:** el usuario decidió dejar el "último cuestionario completado" (no promedio). Si se retoma: agrupar por dimensión o skill en `dashboard.service.ts`.
- **[BAJA] Imagen en vista previa/impresión** del cuestionario (`questionnaire-preview`) no se agregó (solo player y banco).
- **[BAJA] Datos placeholder:** 11 usuarios existentes tienen `numero_identificacion = TMP-<id>`; actualizar con documentos reales si se requiere.

---

# ÚLTIMA TAREA EN PROGRESO
**Tarea:** Imágenes en preguntas del Banco (crear y editar).
- **Terminado:**
  - Crear pregunta con imagen (frontend `question-form` + backend acepta `imagenUrl` en `crearPregunta`).
  - Subida de archivo: `POST /preguntas/subir_imagen` (POI no, solo guarda a disco) → guarda en `uploads/preguntas/`, devuelve `{imagenUrl}`.
  - Estudiante ve la imagen (`assessment-player` con `imageSrc`).
  - Miniatura en el banco.
  - **Editar imagen inline:** reemplazar/quitar — `PATCH /preguntas/{id}/imagen`, `question-bank.ts` (signals `editImageUrl/editImagePreview/uploadingEditImage`, `onEditImageSelected/removeEditImage`, integrado en `saveEdit`), HTML del bloque `.q-edit` con UI de imagen, SCSS añadido.
- **Falta:** únicamente **recompilar el backend en STS** y probar el flujo completo. Posible mejora: imagen en `questionnaire-preview`.
- **Archivos a revisar primero:**
  - Backend: `PreguntaServiceImpl.java`, `PreguntaController.java`, `IPreguntaService.java`, `application.properties`, `pom.xml`.
  - Frontend: `question-bank.ts/html/scss`, `question-form.ts/html/scss`, `questionnaires.service.ts`, `assessment-player.ts/html`, `core/utils/media-url.ts`.

---

# INSTRUCCIONES PARA CONTINUAR EN UNA NUEVA SESIÓN

> Prompt para pegar en una nueva conversación:

```
Eres un asistente experto en Angular 21 y Spring Boot 3 trabajando en el proyecto "SkillBridge".
Lee primero el archivo CONTEXT.md en la raíz del frontend
(C:\Users\User\Documents\ProyectosAngular\skillbridge_frontend\CONTEXT.md) — contiene
arquitectura, decisiones, endpoints, archivos y pendientes.

Reglas de trabajo (OBLIGATORIAS):
- Responde SIEMPRE en español.
- NUNCA hagas commit/push salvo que lo pida explícitamente.
- El backend (C:\Users\User\Documents\ProyectosSTS\skillbridge_backend) SOLO compila en STS/Eclipse;
  nunca uses mvnw. Tras modificar Java, recuérdame reiniciar el backend en STS.
- MySQL: root/admin, BD skill_bridge, binario en "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe".
- Notificaciones: toasts PrimeNG (MessageService global, <p-toast/> en app.html).
- Diálogos: p-dialog con maskStyleClass="bank-dialog-mask". Confirmaciones: p-confirmdialog + ConfirmationService.
- Convenciones Angular: standalone, signals, computed(), control flow @if/@for, input()/output(), inject(),
  OnPush; NO ngClass/ngStyle, NO standalone:true; usar resolveMediaUrl() para URLs de /uploads.
- Las soft skills se miden por PESO (no hay "opción correcta"; ese campo fue eliminado).

Estado: el proyecto está ~90%. La última tarea fue agregar IMÁGENES a las preguntas del Banco
(crear + editar reemplazar/quitar). El código está completo; falta REINICIAR el backend en STS
(se agregó Apache POI al pom.xml y endpoints /preguntas/subir_imagen y PATCH /preguntas/{id}/imagen)
y probar el flujo end-to-end. Pídeme confirmar que reinicié el backend antes de depurar.

Cuando te dé una tarea, primero localiza los archivos relevantes (usa la sección
"ESTRUCTURA DE ARCHIVOS" y "ENDPOINTS" del CONTEXT.md), explícame brevemente el plan y luego implementa.
```
