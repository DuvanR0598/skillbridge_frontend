# CONTEXT.md — Transferencia de contexto SkillBridge

> Documento de continuidad técnica. Generado al llegar al límite de ventana de contexto.
> Sesión previa: trabajo extenso sobre auth Google, perfil, dashboard, evaluaciones, ramificación condicional, ventana de disponibilidad, dimensiones (tabla), matriz de puntuación y planes de fortalecimiento.

---

# PROYECTO

- **Nombre del proyecto:** SkillBridge
- **Descripción general:** SPA Angular 21 para evaluación de *power skills* de estudiantes de ingeniería (Pensamiento Crítico, Adaptabilidad). Conecta a un backend Spring Boot. Roles: ADMIN, COORDINADOR (docente), ESTUDIANTE. El estudiante responde cuestionarios (PRE_TEST/POST_TEST); el sistema calcula resultados por dimensión y sugiere planes de fortalecimiento; el coordinador gestiona cuestionarios, preguntas, dimensiones, matriz de puntuación y ve analítica.
- **Objetivo principal:** Diagnóstico y desarrollo de competencias mediante cuestionarios con scoring configurable (matriz por skill/dimensión/nivel) y planes de mejora.
- **Estado actual (% aprox.):** ~85%. Flujos core funcionando y validados por API: auth (local+Google), perfil, dashboard por rol, evaluaciones (incl. reanudar sesión), ramificación condicional, ventana de disponibilidad, banco de preguntas, dimensiones (tabla), matriz de puntuación + planes. Pendiente: paso final de migración de dimensiones (eliminar enum + reporte de grupo por FK) y ajuste del motor de puntuación (triplicado).

---

# ARQUITECTURA Y TECNOLOGÍAS

## Frontend
- **Framework:** Angular **21** (standalone components, signals, native control flow `@if/@for/@switch`, `input()`/`output()`, `ChangeDetectionStrategy.OnPush`).
- **Rutas raíz del proyecto:** `C:\Users\User\Documents\ProyectosAngular\skillbridge_frontend`
- **Librerías importantes:** Angular Material v21 (tema M2 teal-700), `@angular/animations@21.2.15` (instalado para `provideAnimationsAsync`), `@tabler/icons-angular`, `chart.js` + `ng2-charts`, `date-fns` (con locale `es`), `@auth0/angular-jwt`.
- **Estructura relevante:** patrón de dos layouts — `AuthLayout` (sin sidebar) y `MainLayout` (con sidebar). Todo lo autenticado vive bajo `/app/*` como **hijos** del `MainLayout` (clave: deben ser children para heredar sidebar).
- **Configuraciones importantes:**
  - `src/environments/environment.ts`: `apiUrl: 'http://localhost:8083'`, `googleClientId: '822416114702-rrnluu8cpe02tu09538guic4lckasfhe.apps.googleusercontent.com'`.
  - `app.config.ts`: `provideZoneChangeDetection({eventCoalescing:true})`, `provideRouter(routes, withComponentInputBinding())`, `provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor]))`, `provideAnimationsAsync()`.
  - Build dev: `npx ng build --configuration development` (compila ~5s). No hay lint script; strict TS + Angular template strict.
  - Estilos globales y CSS vars en `src/styles.scss` (Material M2 ya inicializado ahí — NO reinicializar en componentes).

## Backend
- **Framework:** Spring Boot (Java 17+, Lombok, MapStruct, Spring Data JPA, Spring Security + JWT, OAuth2 Client para Google).
- **Ruta raíz:** `C:\Users\User\Documents\ProyectosSTS\skillbridge_backend`
- **Puerto:** `8083`. Paquete base: `com.udea.skillbridge`.
- **Dependencias importantes:** spring-boot-starter-web, data-jpa, security, oauth2-client, validation, Lombok, MapStruct, jackson-datatype-jsr310, MySQL connector.
- **Arquitectura:** capas Controller → Service (interfaz `I*Service` + `*ServiceImpl`) → Repository (Spring Data) → Entity. DTOs request/response con MapStruct (`I*Mapper`). Respuestas envueltas en `ApiResponse<T>`. Excepciones via `GlobalExceptionHandler` (`@RestControllerAdvice`).
- **Configuraciones importantes:**
  - `application.properties`: `server.port=8083`; MySQL `jdbc:mysql://localhost:3306/skill_bridge` user `root` pass `admin`; `spring.jpa.hibernate.ddl-auto=update`; `spring.jpa.show-sql=true`. Google OAuth2 con `${GOOGLE_CLIENT_ID}`/`${GOOGLE_CLIENT_SECRET}`; `redirect-uri={baseUrl}/login/oauth2/code/google`. JWT: `security.jwt.access-token-expiration=900000` (15 min), `refresh-token-expiration-days=7`, `security.jwt.secret-key=${JWT_SECRET_KEY}`.
  - **IMPORTANTE:** `mvnw` en este entorno NO compila (falla por annotation processor: "version can neither be null"). El usuario compila/reinicia desde **STS (Eclipse)**. La IA NO puede compilar Java aquí; sí puede correr SQL vía `mysql.exe` y validar por API contra el backend ya levantado.
  - `mysql.exe` disponible en: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe` (uso: `& $mysql -uroot -padmin skill_bridge -e "SQL"`).

## Base de datos
- **Motor:** MySQL 8.0 (`skill_bridge`).
- **Modelo general:** usuarios/roles/permisos; cuestionarios con preguntas (relación N:M con datos via `pregunta_cuestionario`); opciones; condiciones de ramificación; evaluaciones de estudiante con respuestas; matriz de puntuación + planes de fortalecimiento; dimensiones (tabla nueva).
- **Tablas principales:** `usuarios`, `roles`, `permissions`, `rol_permisos`, `usuario_roles`, `usuario_perfil`, `refresh_token`, `cuestionario`, `pregunta`, `opcion_pregunta`, `pregunta_cuestionario` (PK compuesta), `condicion_pregunta`, `evaluacion_estudiante`, `detalle_respuesta`, `puntuacion_matrices`, `nivel_matrix_bloom`, `puntuacion_resultado`, `plan_fortalecimiento`, `plan_recursos`, **`dimension`** (nueva, Fase 1-3).

---

# DECISIONES TÉCNICAS IMPORTANTES

1. **Alinear inglés↔español vía `@JsonProperty` en backend (no renombrar campos Java).**
   - Motivo: el frontend espera nombres en inglés (`firstName`, `tokenType`, `completionPercentage`...) y el backend tiene campos en español (`nombre`, `tipoToken`, `porcentajeCompleto`). Se usó `@JsonProperty` para no romper mappers/getters internos.
   - Alternativa descartada: renombrar campos Java (rompía MapStruct y servicios).
   - Impacto: patrón recurrente aplicado en `AuthResponse`, `UsuarioResponse`, `EstadoPerfilResponse`, etc. En query params se alineó el frontend al backend (`?fase`→`?phase`).

2. **OAuth Google: redirigir al frontend en vez de devolver JSON.**
   - El `OAuth2AuthenticationSuccessHandler` ahora hace `response.sendRedirect(frontendRedirectUri?token=..&refresh=..&profileCompleted=..)` en lugar de escribir JSON.
   - Motivo: el flujo OAuth es navegación del browser; devolver JSON mostraba el JSON crudo. Alternativa descartada: AJAX (no aplica a redirect OAuth).

3. **API stateless: entry point 401 en vez de redirigir a Google.**
   - Se agregó `JwtAuthenticationEntryPoint` (401 JSON) + `exceptionHandling`. Con `oauth2Login` el default redirigía a Google → CORS. Ahora el `errorInterceptor` del front refresca el token con 401.

4. **`prompt=select_account` en Google.** Resolver `OAuth2AuthorizationRequestResolver` custom para forzar el selector de cuenta.

5. **Refresh token silencioso sin navegar.** Se separó `persistSession()` (guarda tokens/usuario) de `handleAuthSuccess()` (persiste + navega). `refreshToken()` usa solo `persistSession()`.

6. **Validaciones de negocio → 400/409 con mensaje, no 500.**
   - Handlers específicos en `GlobalExceptionHandler` para `CuestionarioException` (respeta su status) y `DataIntegrityViolationException` (409 legible). Motivo: las reglas de negocio caían en el handler genérico `Exception`→500.

7. **Dimensión: convertir enum `SkillDimension` en tabla gestionada (`DimensionEntity`).** Implementado por **fases** (no big-bang) por riesgo en el scoring:
   - Fase 1 (CRUD tabla, aditivo) ✓. Fase 2 (pregunta→dimensión FK) ✓. Fase 3 núcleo (matriz/motor/resultado/Mi progreso por FK, conservando enum como legado) ✓ validado.
   - **Decisión del usuario:** eliminar el enum por completo, pero alcance "solo núcleo" → se aclaró que el enum se elimina en el **paso final** (junto al reporte de grupo) porque ese código aún lo usa.

8. **Ventana de disponibilidad validada solo al INICIAR, no al entregar.** Para no romper una sesión en curso si la ventana cierra a mitad.

9. **Resultado del estudiante NO expone dimensión gestionada en `PuntuacionResultadoResponse`** (es DTO del reporte del estudiante). La dimensión sí se ve en **analítica** ("Mi progreso" + reporte de grupo). Aclaración del usuario: ocultar dimensión SOLO mientras responde; en analítica el estudiante sí la ve.

10. **`track $index` en `@for` de listas de solo lectura** para evitar `NG0955` (claves duplicadas por dimensión/skill repetidos).

11. **Rutas `/app/*` como hijos de `MainLayout`** para heredar sidebar; `question-bank` movido a ruta hermana de `questionnaires` para que el resaltado del sidebar no capturara ambas.

---

# FUNCIONALIDADES IMPLEMENTADAS

1. **Auth local + Google OAuth2** — Estado: ✓ funcionando.
   - Front: `core/auth/auth.service.ts`, `core/interceptors/{auth,error}.interceptor.ts`, `features/auth/{login,register,completar-perfil,oauth2-callback}`.
   - Back: `seguridad/service/AuthService.java`, `seguridad/oauth2/OAuth2AuthenticationSuccessHandler.java`, `seguridad/config/{SecurityConfig,JwtAuthenticationEntryPoint}.java`, `seguridad/filter/JwtAuthenticationFilter.java`.
   - Obs: usuario admin sembrado `admin@skillbridge.edu.co` / `Admin123!` (DataInitializer). Registro asigna ROLE_ESTUDIANTE por defecto.

2. **Completar perfil** — ✓. `features/auth/completar-perfil`. Backend `/usuarios/me/perfil` (PATCH), `/perfil/programas` (GET). Selector de programas usa `value`/`displayName`.

3. **Dashboard por rol + actividad reciente derivada** — ✓. Front `features/dashboard`. Back `DashboardController` `GET /dashboard/actividad-reciente` (deriva de evaluaciones para estudiante / cuestionarios para coordinador).

4. **Admin de usuarios (promover roles)** — ✓. `features/admin/users`. Back `/usuarios/listar`, `PUT /usuarios/{id}/roles`, `PATCH /usuarios/{id}/toggle-enabled`. Validación "último administrador" (no quitar admin/desactivar al último).

5. **Evaluaciones (estudiante)** — ✓. `features/assessment/{assessment-list,assessment-player,assessment-result}` + `assessment.service.ts`. Flujo iniciar→responder→completar→reporte. Reanudar sesión EN_PROGRESO (precarga respuestas + salta a primera sin responder).

6. **Panel docente + reporte de grupo** — ✓ (datos). `features/teacher/*`. Back `/analitica/*`.

7. **Cuestionarios + Banco de preguntas** — ✓. `features/questionnaires/{questionnaire-list,questionnaire-form,questionnaire-builder,question-form,question-bank,branching-editor}` + `questionnaires.service.ts`. Builder muestra preguntas del cuestionario con opciones; quitar pregunta; banco con opciones (isCorrecta/peso).

8. **Ramificación condicional (branching)** — ✓ validado. `branching-editor`. Back `CondicionPreguntaController` `/condicion_pregunta/{idCuestionario}/*` (crear, listar_condicion, PUT editar, DELETE). Reglas: solo BORRADOR, DESCRIPCION no trigger, trigger≠target, opción pertenece al trigger, ambas en cuestionario, máx 1 condición de entrada por destino, sin ciclos directos, unicidad por cuestionario.

9. **Ventana de disponibilidad (fecha+hora)** — ✓. `cuestionario.fechaInicio/fechaFin`. Front: form con date+time pickers (`[min]=minDate`), `assessment-list` deshabilita fuera de ventana. Back valida al iniciar.

10. **`creadoPor` en cuestionario** — ✓. Guarda "nombre apellido" del usuario autenticado al crear.

11. **Dimensiones (tabla)** — ✓ validado. `features/dimensions/*`. Back `DimensionController` `/dimension/*` (CRUD, solo ADMIN/COORDINADOR). Pregunta→dimensión (`PATCH /preguntas/{id}/dimension?idDimension=`).

12. **Matriz de puntuación + Planes de fortalecimiento** — ✓ validado. `features/score-matrix/{score-matrix,entry-plans,score-matrix.service}`. Back `PuntuacionMatrixController` `/cuestionarios/{id}/puntuacion_matrix/*` y `PlanFortalecimientoController` `/puntuacion-matrix/{idMatrix}/plan-fortalecimiento/*`. Matriz editable solo en COMPLETO/PUBLICADO. Máx 3 planes (1 por eje).

13. **Fase 3 núcleo dimensión arbitraria en scoring** — ✓ validado por API. Matriz/motor/resultado/Mi progreso agrupan por FK de dimensión.

---

# CÓDIGO IMPORTANTE

## Endpoints clave (backend)
```
# Auth
POST /auth/login {email,password}           -> AuthResponse (accessToken, refreshToken, tokenType, expiresIn, profileCompleted, user)
POST /auth/register {firstName,lastName,email,password}
POST /auth/refresh {refreshToken}
GET  /oauth2/authorization/google           (inicia OAuth) -> redirige a http://localhost:4200/oauth2/callback?token=&refresh=&profileCompleted=
GET  /usuarios/me                            -> UsuarioResponse
GET  /perfil/programas                       -> [{value, displayName}]
PATCH /usuarios/me/perfil                    (CompletarPerfilRequest)

# Usuarios admin
GET  /usuarios/listar | PUT /usuarios/{id}/roles | PATCH /usuarios/{id}/toggle-enabled

# Cuestionarios
POST /cuestionario/crear_cuestionario        (CuestionarioRequest) @AuthenticationPrincipal -> setea creadoPor
GET  /cuestionario/listar_cuestionarios | /listar_cuestionarios_activos
GET  /cuestionario/buscar_cuestionario_id/{id}
PATCH /cuestionario/{id}/actualizar | /completo | /publicar | /archivar
DELETE /cuestionario/borrado_logico/{id}
POST /cuestionario/{idCuestionario}/pregunta (PreguntaCuestionarioRequest {idpregunta,obligatoria,peso})
DELETE /cuestionario/{idCuestionario}/pregunta/{idPregunta}   (@PreAuthorize ADMIN/COORDINADOR)
GET  /cuestionario/{id}/preguntas            -> PreguntaDeCuestionarioResponse[] (@PreAuthorize ADMIN/COORDINADOR)
GET  /cuestionario/{id}/entregar_cuestionario (estudiante; SIN dimensión)

# Preguntas
POST /preguntas/crear_pregunta (PreguntaRequest {tipoPregunta,texto,ayuda,maxOpciones,idDimension?,opcionPreguntaRequest[]})
GET  /preguntas/listar | /buscar_pregunta_id/{id}
PATCH /preguntas/{id}/opcion_peso | /{id}/dimension?idDimension=
DELETE /preguntas/eliminar_pregunta/{id}

# Ramificación
POST   /condicion_pregunta/{idCuestionario}/crear_condicion (CondicionPreguntaRequest {triggerIdPregunta,triggerIdOpcion,targetIdPregunta})
GET    /condicion_pregunta/{idCuestionario}/listar_condicion
PUT    /condicion_pregunta/{idCuestionario}/{idCondicion}
DELETE /condicion_pregunta/{idCuestionario}/{idCondicion}

# Evaluación (estudiante)
POST /evaluacion/cuestionario/{idCuestionario}/iniciar?phase=PRE_TEST|POST_TEST   (@PathVariable("idCuestionario"), @RequestParam("phase"))
POST /evaluacion/{idEvaluacion}/respuestas (EnviarRespuestaRequest {idPregunta,idsOpcionesSeleccionadas,respuestaAbierta})
PUT  /evaluacion/{idEvaluacion}/respuesta/{idPregunta}
PATCH /evaluacion/{idEvaluacion}/completo  -> InformeEvaluacionResponse
GET  /evaluacion/consultar-id/{idEvaluacion} | /{idEvaluacion}/reporte
GET  /evaluacion/estudiante/{idEstudiante}/cuestionario/{idCuestionario}

# Analítica
GET /analitica/estudiante/{idEstudiante}/cuestionario/{idCuestionario}/progreso  -> InformeProgresoEstudianteResponse (skillProgreso[] con dimensionNombre)
GET /analitica/cuestionario/{id}/reporte-grupo | /resumen | /estadistica-finalizacion | /analisis-dimension ...

# Dimensiones (ADMIN/COORDINADOR)
POST /dimension/crear (DimensionRequest {nombre,descripcion,skill}) | PUT /dimension/{id} | GET /dimension/listar?skill= | GET /dimension/{id} | DELETE /dimension/{id}

# Matriz de puntuación
POST /cuestionarios/{idCuestionario}/puntuacion_matrix/crear (PuntuacionMatrixRequest {idPregunta?,skill,idDimension?,dimension?(enum),nivel,minPuntaje,maxPuntaje,descripcion,caracteristicasObservables,nivelBloom[]})
GET  /cuestionarios/{idCuestionario}/puntuacion_matrix/listar?skill=
PUT  /cuestionarios/{idCuestionario}/puntuacion_matrix/{matrixId}/actualizar (ActualizarPuntuacionMatrixRequest {minPuntaje,maxPuntaje,descripcion,caracteristicasObservables,nivelesBloom[]})
DELETE /cuestionarios/{idCuestionario}/puntuacion_matrix/{matrixId}/eliminar

# Planes de fortalecimiento (anidados a la matriz)
POST   /puntuacion-matrix/{idMatrix}/plan-fortalecimiento/crear (PlanFortalecimientoRequest {planAxis,titulo,descripcion,tipoAccion,recursos[]})
GET    /puntuacion-matrix/{idMatrix}/plan-fortalecimiento/listar
PUT    /puntuacion-matrix/{idMatrix}/plan-fortalecimiento/actualizar/{idPlan}
DELETE /puntuacion-matrix/{idMatrix}/plan-fortalecimiento/eliminar/{idPlan}

# Dashboard
GET /dashboard/actividad-reciente
```

## Enums backend (valores reales)
```
SkillTipo: ADAPTABILIDAD, PENSAMIENTO_CRITICO
SkillNivel: BAJO, INTERMEDIO, AVANZADO
SkillDimension (LEGADO, a eliminar): INTERPRETACION, INFERENCIA, ANALISIS, EVALUACION, EXPLICACION, AUTORREGULACION, GESTION_DEL_CAMBIO, GESTION_DE_INCERTIDUMBRE
TipoPregunta: VERDADERO_FALSO, LIKERT, DESCRIPCION, OPCION_MULTIPLE, OPCION_UNICA
EstadoCuestionario: BORRADOR, COMPLETO, PUBLICADO, ARCHIVADO, ELIMINADO
EvaluacionFase: PRE_TEST, POST_TEST ; EvaluacionEstado: EN_PROGRESO, COMPLETADO, ABANDONADO
PlanAxis: ACADEMICO, EXPERIMENTAL, PERSONAL ; TipoAccion: LEER, VER, PRACTICAR
NivelBloom: RECORDAR, COMPRENDER, APLICAR, ANALIZAR, EVALUAR, CREAR
```

## ApiResponse<T> (wrapper estándar)
```java
{ success, message?, data, errorCode?, timestamp }
// ApiResponse.ok(data, msg) | ApiResponse.ok(data) | ApiResponse.error(msg, code)
```

## SecurityConfig (puntos clave)
- `sessionManagement STATELESS`; `exceptionHandling.authenticationEntryPoint(jwtAuthEntryPoint)`.
- `oauth2Login` con `authorizationRequestResolver` (prompt=select_account) + `successHandler(oAuth2SuccessHandler)`.
- `@PreAuthorize` a nivel método/clase para endpoints sensibles (ADMIN/COORDINADOR).
- `app.oauth2.redirect-uri` default `http://localhost:4200/oauth2/callback`.

## Frontend — auth.service.ts (esqueleto)
```ts
private _currentUser = signal(loadUserFromStorage());
private _accessToken = signal(localStorage.getItem('accessToken'));
login/register -> handleAuthSuccess(data)  // persistSession + navigate
refreshToken() -> persistSession(data)      // NO navega
handleOAuthCallback(token, refresh) -> guarda tokens + GET /usuarios/me -> set signals
// localStorage keys: accessToken, refreshToken, currentUser, profileCompleted
```

## errorInterceptor (clave)
```ts
if (error.status===401 && !req.url.includes('/auth/refresh')) {
  return authService.refreshToken().pipe(switchMap(r => next(req.clone({setHeaders:{Authorization:`Bearer ${r.data.accessToken}`}}))), catchError(()=>{authService.logout(); ...}));
}
if (error.status===403) router.navigate(['/app/dashboard']);
```

## Entidades clave (Fase 3 — dimensión)
```java
// DimensionEntity (tabla dimension): id, nombre(120), descripcion(500), skill(SkillTipo enum), timestamps
//   unique (skill, nombre)
// PreguntaEntity: + @ManyToOne DimensionEntity dimension (id_dimension, nullable)
// PuntuacionMatrixEntity: dimension(SkillDimension enum, LEGADO) + @ManyToOne DimensionEntity dimensionEnt (id_dimension)
//   unique uk_entrada_unica_de_matriz = (id_cuestionario, skill, id_dimension, nivel, id_pregunta)  // <- migrado a FK
// PuntuacionResultadoEntity: dimension(enum LEGADO) + @ManyToOne DimensionEntity dimensionEnt
//   unique uk_dimension_evaluacion_skill_resultados = (id_evaluacion, skill, id_dimension)  // <- migrado a FK
// PlanFortalecimientoEntity: @ManyToOne PuntuacionMatrixEntity (NO @OneToOne!), unique uk_plan_matrix_axis=(id_puntuacion_matrix, plan_axis)
```

## MotorDePuntuacion (Fase 3 — agrupa por FK)
```java
// buildGroupKey(PuntuacionMatrixEntity m): skill.name() + "_" + (m.getDimensionEnt()!=null ? "DIM_"+id : "GLOBAL")
// copia matriz.dimensionEnt -> resultado.dimensionEnt
// QUIRK PREEXISTENTE: suma el puntaje de la pregunta por CADA entrada de matriz del grupo
//   (3 niveles -> ×3). El % y la separación por dimensión son correctos; el nivel puede no matchear si el rango no cubre el total.
```

## Frontend models nuevos
```
core/models/dimension.model.ts: SkillTipo, SKILL_OPTIONS, DimensionResponse, DimensionRequest
core/models/score-matrix.model.ts: SkillNivel, NivelBloom, NIVEL_OPTIONS, BLOOM_OPTIONS, PuntuacionMatrix{Request,Response}, ActualizarPuntuacionMatrixRequest
core/models/plan-fortalecimiento.model.ts: PlanAxis, TipoAccion, PLAN_AXIS_OPTIONS, TIPO_ACCION_OPTIONS, PlanFortalecimiento{Request,Response}, Actualizar...
```

---

# ESTRUCTURA DE ARCHIVOS RELEVANTE

```
FRONTEND (skillbridge_frontend/src/app)
├─ app.routes.ts                      # /app/* hijos de MainLayout (dashboard, assessment, questionnaires, question-bank, dimensions, score-matrix, analytics, teacher, admin/users)
├─ app.config.ts
├─ core/
│  ├─ auth/{auth.service.ts, auth.guard.ts, rol.guard.ts, perfil.guard.ts}
│  ├─ interceptors/{auth,error}.interceptor.ts
│  └─ models/{api-response, auth, perfil, assessment, analytics, teacher-analytics,
│             questionnaire-admin, dimension, score-matrix, plan-fortalecimiento}.model.ts
├─ layouts/{auth-layout, main-layout}
├─ shared/components/sidebar/sidebar.ts   # navGroups por rol (incluye Dimensiones, Matriz de puntuación, Banco de preguntas)
└─ features/
   ├─ auth/{login, register, completar-perfil, oauth2-callback}
   ├─ dashboard/{dashboard.ts, dashboard.service.ts}
   ├─ assessment/{assessment-list, assessment-player, assessment-result, assessment.service.ts}
   ├─ questionnaires/{questionnaire-list, questionnaire-form, questionnaire-builder,
   │                  question-form, question-bank, branching-editor, questionnaires.service.ts, questionnaires.routes.ts}
   ├─ teacher/{dashboard, group-report, components/*, teacher-analytics.service.ts}
   ├─ analytics/{student-progress, components/{progress-comparison, dimension-analysis-table,...}}
   ├─ admin/users/{admin-users.ts, admin-users.service.ts}
   ├─ dimensions/{dimensions.ts, dimensions.service.ts}
   └─ score-matrix/{score-matrix.ts, entry-plans.ts, score-matrix.service.ts}

BACKEND (skillbridge_backend/src/main/java/com/udea/skillbridge)
├─ controller/{Cuestionario, Pregunta, CondicionPregunta, EvaluacionEstudiante, Analytics,
│              Dashboard, Dimension, PuntuacionMatrix, PlanFortalecimiento, ...}Controller.java
├─ service/{I*Service.java + impl/*ServiceImpl.java, impl/MotorDePuntuacion.java}
├─ repository/I*Repository.java
├─ entity/{Cuestionario, Pregunta, OpcionPregunta, PreguntaCuestionario, CondicionPregunta,
│          EvaluacionEstudiante, DetalleRespuesta, PuntuacionMatrix, PuntuacionResultado,
│          PlanFortalecimiento, Dimension}Entity.java
├─ dto/{request,response}/*.java  (+ dto/response/analytics/*)
├─ mapper/I*Mapper.java (MapStruct)
├─ enums/*.java
├─ common/{response/ApiResponse.java, exception/{GlobalExceptionHandler, BusinessException, ResourceNotFoundException}.java}
└─ seguridad/{config/{SecurityConfig, JwtAuthenticationEntryPoint, DataInitializer}, oauth2/*, filter/JwtAuthenticationFilter, service/*, entity/Usuario*, ...}
```

---

# PROBLEMAS RESUELTOS

1. **Programas en blanco en completar-perfil** — backend devolvía `valor`/`montrarNombre`, front esperaba `value`/`displayName`. Sol: renombrar campos en `ProgramaIngenieriaResponse` + service. (back)
2. **Google login mostraba JSON** — `OAuth2AuthenticationSuccessHandler` escribía JSON; ahora `sendRedirect` al front. (back)
3. **Login normal: campos undefined** — `AuthResponse`/`UsuarioResponse` con `@JsonProperty` a inglés. (back)
4. **Perfil no guardaba** — front PATCH a `/users/me/profile` (no existía) y campos inglés vs DTO español. Sol: URL `/usuarios/me/perfil` + `@JsonProperty` en `CompletarPerfilRequest`. (ambos)
5. **Dashboard porcentaje 0%** — `EstadoPerfilResponse` con `@JsonProperty(completionPercentage)`. (back)
6. **Actividad reciente igual para todos** — era mock; se creó `/dashboard/actividad-reciente` derivado por rol. (ambos)
7. **Rutas perdían sidebar / NG04002** — mover `/app/*` a hijos de `MainLayout`; faltaba registrar rutas (assessment, teacher, etc.). (front)
8. **NG8011 build animations** — faltaba `@angular/animations`; instalado `21.2.15` exacto. (front)
9. **Sidebar: `<a>` rotos en `@for`** (faltaba tag de apertura) en sidebar/dashboard/result/recursos. (front)
10. **NG0955 claves duplicadas** — `track $index` en listas de analytics/teacher/sidebar (`track item.label`). (front)
11. **CORS al expirar token** — `JwtAuthenticationEntryPoint` 401 en vez de redirigir a Google. (back)
12. **Assessment 500/400** — URLs `/questionnaires`→`/cuestionario/...`; `@PathVariable("idCuestionario")` y `@RequestParam("phase")`. Alineación de field names en DTOs de evaluación. (ambos)
13. **Builder: preguntas no aparecían** — `getQuestionsOfQuestionnaire` pegaba a `/pregunta` (singular, POST); corregido a `/preguntas` + mapeo `texto→textoPregunta`. (front)
14. **Condición mismo (opción→destino) en otro cuestionario daba 400** — `existsBy...` no filtraba por cuestionario; se agregó variante `...AndCuestionarioEntIdCuestionario` + unique constraint `uk_target_condicion_opcion` migrada a 3 columnas (incluye `id_cuestionario`). (back + SQL)
15. **Crear pregunta: "orden duplicado"** — front enviaba `selectedOptionIds`/`text`... ; backend espera `idsOpcionesSeleccionadas`/`texto`/`ordenVisualizacion`; `@NotBlank` inválido en campos no-String; faltaba `@Valid` cascade. (ambos)
16. **Planes: 2do plan daba 409** — `PlanFortalecimientoEntity` era `@OneToOne unique=true` (1 plan/matriz); cambiado a `@ManyToOne`; índice único autogenerado `UKabwdevhsuxhry63na6109iffp` eliminado vía SQL. (back + SQL)
17. **Borrar dimensión en uso → 500** — handler `DataIntegrityViolationException`→409. (back)

---

# PENDIENTES ACTUALES

1. **[ALTA] Fase 3 — Paso FINAL: eliminar enum `SkillDimension` + migrar reporte de grupo a FK.**
   - Falta: reescribir `AnalyticsServiceImpl.buildAnalisisDimensional`, `buildReporteGrupo`, `extraerDimension`, `buildDistribucionNiveles` (y las queries de `IAnalyticsRepository` con param `SkillDimension`) para enumerar/filtrar por la **dimensión gestionada (FK)** en vez del enum. Luego eliminar el enum `SkillDimension` de entidades/DTOs/mappers + **migración de datos** (crear filas `dimension` por cada valor enum existente y poblar `id_dimension` en `puntuacion_matrices`/`puntuacion_resultado`).
   - Archivos: `service/impl/AnalyticsServiceImpl.java`, `repository/IAnalyticsRepository.java`, DTOs `dto/response/analytics/*` (quitar `SkillDimension dimension`), `enums/SkillDimension.java` (borrar), entidades `PuntuacionMatrixEntity`/`PuntuacionResultadoEntity` (quitar campo enum `dimension`).
   - Próximo paso: hacerlo en STS con compilación; primero migrar analytics a FK manteniendo enum, validar, luego borrar enum.

2. **[MEDIA] Motor de puntuación: "triplicado" del puntaje.**
   - `MotorDePuntuacion.calcular` suma el puntaje de la pregunta por CADA entrada de matriz del grupo (3 niveles → ×3). El % es correcto pero el `nivel` puede no matchear el rango. Próximo paso: sumar el puntaje de cada pregunta una sola vez por grupo (dedupe por idPregunta) o calcular max/total con un set de preguntas únicas. Archivo: `service/impl/MotorDePuntuacion.java`.

3. **[MEDIA] UI: campos fantasma en cuestionario.** El form aún tiene `appPeriodStart/End`, `targetPopulation` que el backend ignora (solo `fechaInicio/fechaFin` se persisten). Decidir si persistir `targetPopulation` (agregar a entidad/DTO) o quitar del form. Archivos: `questionnaire-form.*`, backend `CuestionarioEntity`/DTOs.

4. **[BAJA] `studentCode`, `phoneNumber`, `academicYear`** capturados en completar-perfil pero no persistidos (no existen en `UsuarioPerfilEntity`). Decidir si agregarlos.

5. **[BAJA] Reasignar dimensión a pregunta existente desde la UI** (endpoint `PATCH /preguntas/{id}/dimension` existe; falta botón en banco/builder).

6. **[BAJA] Limpieza datos de prueba:** dimensiones id 6,7 quedaron referenciadas por matrices de cuestionarios soft-deleted; cuestionarios de prueba con borrado lógico.

---

# ÚLTIMA TAREA EN PROGRESO

- **Qué hacíamos:** Fase 3 de la migración de dimensiones (enum→tabla). Se implementó y **validó por API** el **núcleo FK-driven**: matriz, motor de puntuación, resultado y "Mi progreso" agrupan por la **dimensión gestionada (FK)** en vez del enum.
- **Ya terminado (validado):**
  - Repo matriz: `buscarEntradaPorDimension` + `existeRangoSuperpuestoPorDimension` (FK).
  - `PuntuacionMatrixServiceImpl`: validaciones usan `idDimension`.
  - Entidades: `uk_entrada_unica_de_matriz`→`(...,id_dimension,...)`, `uk_dimension_evaluacion_skill_resultados`→`(id_evaluacion,skill,id_dimension)`.
  - `MotorDePuntuacion.buildGroupKey(PuntuacionMatrixEntity)` por FK; copia `dimensionEnt` al resultado.
  - `AnalyticsServiceImpl.construirProgresoSkill` empareja PRE/POST por FK (`keyPorDimensionResultado`); `SkillProgresoResponse`/`AnalisisDimensionalResponse` exponen `idDimension`/`dimensionNombre`.
  - Migración SQL aplicada: drop `uk_entrada_unica_de_matriz` viejo + `idx_pm_cuestionario` de respaldo; resultado unique se crea sola al reiniciar.
  - **Validación API OK:** 2 dimensiones distintas mismo skill+nivel coexisten; resultado separado por dimensión (Interpretación 100% vs Análisis 0%); analítica muestra `dimensionNombre`.
- **Qué falta (este hilo):** el **Paso final** (pendiente #1): migrar reporte de grupo a FK y **eliminar el enum** + migración de datos. Y opcionalmente el **triplicado del motor** (pendiente #2).
- **Archivos a revisar primero:** `service/impl/AnalyticsServiceImpl.java` (reporte de grupo aún usa enum), `repository/IAnalyticsRepository.java` (queries con `SkillDimension`), `service/impl/MotorDePuntuacion.java` (triplicado), `enums/SkillDimension.java` (a borrar al final).

---

# INSTRUCCIONES PARA CONTINUAR EN UNA NUEVA SESIÓN

Copia/pega este prompt:

```
Continúo el proyecto SkillBridge (Angular 21 + Spring Boot + MySQL). Lee CONTEXT.md en
C:\Users\User\Documents\ProyectosAngular\skillbridge_frontend\CONTEXT.md — contiene todo el contexto técnico.

Contexto operativo CRÍTICO:
- Backend en C:\Users\User\Documents\ProyectosSTS\skillbridge_backend (Spring Boot, puerto 8083). NO se puede compilar Java aquí (mvnw falla por annotation processor); el usuario compila/reinicia desde STS (Eclipse). Tú SÍ puedes: editar Java, correr SQL vía mysql.exe ("C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -padmin skill_bridge -e "..."), y validar por API con PowerShell (Invoke-RestMethod, usar dangerouslyDisableSandbox:true porque el sandbox bloquea literales de ruta; evitar Remove-Item y variables reservadas como $PID; usar ${SID} no $SID:).
- Frontend: C:\Users\User\Documents\ProyectosAngular\skillbridge_frontend. Compila con: npx ng build --configuration development.
- Admin sembrado: admin@skillbridge.edu.co / Admin123!. ddl-auto=update.

Estado: Fase 3 (migración dimensión enum->tabla) NÚCLEO terminado y validado (matriz/motor/resultado/Mi progreso agrupan por FK de dimensión, conservando enum SkillDimension como columna legada).

Tarea pendiente PRIORITARIA (Paso final de Fase 3):
1) Migrar el REPORTE DE GRUPO de AnalyticsServiceImpl (buildAnalisisDimensional, buildReporteGrupo, buildDistribucionNiveles, extraerDimension) y las queries de IAnalyticsRepository que usan el param SkillDimension, para que enumeren/filtren por la dimensión gestionada (FK DimensionEntity) en vez del enum.
2) Migración de datos en MySQL: crear filas en tabla `dimension` por cada valor del enum existente y poblar id_dimension en puntuacion_matrices y puntuacion_resultado donde corresponda.
3) Eliminar el enum SkillDimension de entidades (PuntuacionMatrixEntity.dimension, PuntuacionResultadoEntity.dimension), DTOs (dto/response/analytics/*), mappers y el archivo enums/SkillDimension.java.
Hazlo en orden, manteniendo compilable cada paso (primero analytics a FK con enum aún presente, validar por API, luego borrar enum). Recuérdame reiniciar el backend en STS cuando toque y darme el SQL de migración.

Otros pendientes (ver CONTEXT.md): ajustar el "triplicado" del MotorDePuntuacion (suma puntaje por cada entrada de matriz del grupo); decidir campos fantasma del form de cuestionario (appPeriodStart/End, targetPopulation); persistir studentCode/phoneNumber/academicYear si se desea.

Empieza leyendo AnalyticsServiceImpl.java, IAnalyticsRepository.java y MotorDePuntuacion.java, y proponme el plan del Paso final antes de editar.
```
