# CONTEXT.md — SkillBridge: Documento de Transferencia de Contexto
> Generado el 2026-06-15. Para continuar en nueva sesión.

---

## PROYECTO

- **Nombre:** SkillBridge
- **Descripción:** SPA Angular 21 + Spring Boot 3 para evaluación de competencias en ingeniería (Pensamiento Crítico, Adaptabilidad). Soporta PRE_TEST y POST_TEST por cuestionario, genera planes de fortalecimiento y reportes analíticos para docentes y estudiantes.
- **Objetivo principal:** Permitir al docente ver el progreso grupal/individual y al estudiante ver su propio plan de mejoramiento basado en su nivel (BAJO/INTERMEDIO/AVANZADO).
- **Estado actual:** ~80% — funcionalidades core implementadas; pendiente validación del fix del mapper backend.

---

## ARQUITECTURA Y TECNOLOGÍAS

### Frontend
- **Framework:** Angular 21, standalone components, signals, OnPush, ChangeDetection
- **Librerías:** Angular Material v21 (M2, teal-700), `@tabler/icons-angular`, `chart.js` + `ng2-charts`, `date-fns`, `@auth0/angular-jwt`
- **Base URL backend:** `http://localhost:8083` (en `src/environments/environment.ts`)
- **Auth:** JWT en `localStorage` (`accessToken`, `refreshToken`, `currentUser`). Interceptor refresca en 401.
- **Roles:** `ROLE_ADMIN`, `ROLE_COORDINADOR` (docente), `ROLE_ESTUDIANTE`
- **Guards:** `authGuard` → `perfilGuard` → `rolGuard`
- **Rutas:** `/` AuthLayout (login/register/complete-profile) | `/app/*` MainLayout (dashboard, analytics, teacher, assessment, profile)

### Backend
- **Framework:** Spring Boot 3, Java 21
- **Directorio:** `C:\Users\User\Documents\ProyectosSTS\skillbridge_backend`
- **Puerto:** 8083
- **Compilación:** SOLO en STS (Eclipse). `mvnw` falla por error en annotation processors de MapStruct/Lombok.
- **BD:** `spring.jpa.hibernate.ddl-auto=update` → columnas nuevas se crean automáticamente al reiniciar.
- **Transacciones:** `@Transactional(readOnly = true)` en `AnalyticsServiceImpl` para mantener sesión LAZY abierta.
- **Dependencias clave:** MapStruct, Lombok, Spring Security + JWT, Spring Data JPA, MySQL 8

### Base de datos
- **Motor:** MySQL 8 — `mysql.exe` en `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`
- **Credenciales:** root / admin — DB: `skill_bridge`
- **Tablas principales:**
  - `cuestionario`, `pregunta`, `opcion_pregunta`
  - `evaluacion_estudiante` (sesiones PRE/POST)
  - `respuesta_estudiante`
  - `puntuacion_resultado` (resultados por dimensión/global)
  - `puntuacion_matrix` (umbrales BAJO/INTERMEDIO/AVANZADO por skill+dimensión)
  - `plan_fortalecimiento` (3 planes por matrix: ACADEMICO/EXPERIMENTAL/PERSONAL)
  - `usuario`, `rol`

---

## DECISIONES TÉCNICAS IMPORTANTES

### 1. Plan de fortalecimiento: solo resultado GLOBAL (no dimensiones)
- **Decisión:** `construirPlanesActuales()` en `AnalyticsServiceImpl` filtra `resultados` a solo los que tienen `dimensionEnt == null` (resultado global del cuestionario). Si no hay globales, cae al fallback de todos.
- **Motivo:** El estudiante debe ver su plan de mejoramiento **global**, no la mezcla de planes de todas las dimensiones.
- **Alternativa descartada:** mostrar todos los planes de todas las dimensiones (confuso, redundante).

### 2. Fix mapper IPlanFortalecimientoMapper — bug crítico (PENDIENTE RECOMPILE)
- **Bug original:** `@Mapping(source = "puntuacionMatrixEnt.id", target = "id")` hacía que los 3 planes de la misma matriz tuviesen todos `id = 34` (el id de la matriz, no el id del plan).
- **Fix aplicado en source:** cambió a `@Mapping(source = "puntuacionMatrixEnt.id", target = "idPuntuacionMatrix")`, así el `id` del plan toma su valor auto-generado real.
- **Impacto:** El frontend dedup `new Map(planes.map(p => [p.id, p]))` colapsaba los 3 planes a 1 porque todos tenían `id=34`. Con ids únicos (ej: 34, 35, 36), los 3 ejes (Académico, Experiencial, Personal) se muestran correctamente.
- **Estado:** Fix en source ya aplicado. **REQUIERE RECOMPILE EN STS Y RESTART DEL BACKEND.**

### 3. Deduplicación de planes en el frontend (safety net)
- **Decisión:** Mantener el dedup aunque el mapper esté corregido, como seguridad.
- `planActual = computed(() => Array.from(new Map(planes.map(p => [p.id, p])).values()))` en `student-progress.ts` y `group-report.ts`.

### 4. `track $index` en historial de scores (NG0955)
- **Decisión:** Usar `track $index` en lugar de `track score.skill` para el historial de intentos porque múltiples dimensiones comparten el mismo skill.

### 5. Master-detail en "Resultados individuales por estudiante"
- **Decisión:** Vista maestro (lista de estudiantes) → detalle (PRE/POST filter + tabla de resultados + plan + respuestas).
- Implementado en `group-report.html` / `group-report.ts` con signals `selectedStudentId`, `selectedPhase`, `showPlan`, `showAnswers`.

### 6. Clases CSS de pills en español
- **Decisión:** CSS usa nombres en español porque `nivel.toLowerCase()` produce `bajo/intermedio/avanzado`.

---

## FUNCIONALIDADES IMPLEMENTADAS

### Mi progreso (estudiante) — `student-progress`
- **Estado:** Completo (pendiente validar con fix del mapper)
- **Archivos:** `src/app/features/analytics/student-progress/student-progress.ts`, `.html`, `.scss`
- **Descripción:** Muestra PRE vs POST por dimensión, plan de mejoramiento actual (deduplicado), historial de intentos. Selector de cuestionario si el estudiante evaluó más de uno.
- **Fix reciente:** `planActual = computed()` con dedup; `track $index` para historial.

### Reporte de grupo (docente) — `group-report`
- **Estado:** Completo
- **Archivos:** `src/app/features/teacher/group-report/group-report.ts`, `.html`, `.scss`
- **Descripción:**
  - Tarjetas resumen (totales PRE/POST, % avanzado)
  - Dimensión más crítica / más mejorada
  - Distribución de niveles por dimensión (chart)
  - Tabla análisis dimensional
  - Lista "estudiantes con nivel Básico" (con nombreCompleto + email)
  - Master-detail: lista de estudiantes → filtro PRE/POST → tabla resultados
  - Botón "Ver plan de mejoramiento" por estudiante
  - Botón "Ver respuestas" por estudiante en la fase seleccionada
- **Fix reciente:** `pill-bajo/intermedio/avanzado`, null-safe `row.nivel`, `nombreCompleto`/`email`.

### Plan de mejoramiento — Backend
- **Estado:** Fix aplicado en source, PENDIENTE recompile
- **Archivos:** `IPlanFortalecimientoMapper.java`, `AnalyticsServiceImpl.java`

---

## CÓDIGO IMPORTANTE

### IPlanFortalecimientoMapper.java (ya con fix)
```java
@Mapper(componentModel = "spring")
public interface IPlanFortalecimientoMapper {
    @Mapping(target = "id",                  ignore = true)
    @Mapping(target = "puntuacionMatrixEnt", ignore = true)
    @Mapping(target = "createdAt",           ignore = true)
    @Mapping(target = "updatedAt",           ignore = true)
    PlanFortalecimientoEntity toEntity(PlanFortalecimientoRequest request);

    // id → el id propio del plan (auto). idPuntuacionMatrix → el id de la matriz.
    @Mapping(source = "puntuacionMatrixEnt.id", target = "idPuntuacionMatrix")
    PlanFortalecimientoResponse toResponse(PlanFortalecimientoEntity plan);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",                  ignore = true)
    @Mapping(target = "puntuacionMatrixEnt", ignore = true)
    @Mapping(target = "planAxis",            ignore = true)
    @Mapping(target = "createdAt",           ignore = true)
    @Mapping(target = "updatedAt",           ignore = true)
    void updateFromRequest(@MappingTarget PlanFortalecimientoEntity plan,
                           ActualizarPlanFortalecimientoRequest request);
}
```

### construirPlanesActuales en AnalyticsServiceImpl.java
```java
private List<PlanFortalecimientoResponse> construirPlanesActuales(
        List<PuntuacionResultadoEntity> resultados) {
    // Solo el resultado global (dimensionEnt == null)
    List<PuntuacionResultadoEntity> globales = resultados.stream()
            .filter(r -> r.getDimensionEnt() == null && r.getPuntuacionMatrizEnt() != null)
            .toList();
    List<PuntuacionResultadoEntity> fuente = globales.isEmpty()
            ? resultados.stream().filter(r -> r.getPuntuacionMatrizEnt() != null).toList()
            : globales;
    return fuente.stream()
            .flatMap(r -> r.getPuntuacionMatrizEnt().getPlanFortalecimientoEnt().stream())
            .map(planMapper::toResponse)
            .toList();
}
```

### TeacherAnalyticsService (frontend)
```typescript
// src/app/features/teacher/teacher-analytics.service.ts
getStudentProgress(idEstudiante: number, idCuestionario: number)
  : Observable<ApiResponse<InformeProgresoEstudianteResponse>> {
  return this.http.get(
    `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/progreso`
  );
}
getEvaluationDetail(idEvaluacion: number)
  : Observable<ApiResponse<EvaluacionEstudianteResponse>> {
  return this.http.get(`${this.API}/evaluacion/consultar-id/${idEvaluacion}`);
}
```

### PlanActual — modelo frontend (con POSIBLE TYPO)
```typescript
// src/app/core/models/analytics.model.ts  línea ~38-45
// ATENCIÓN: tipoAccion tenía un tab invisible antes de 'LEER' — verificar y limpiar
export interface PlanActual {
  id: number;
  planAxis: 'ACADEMICO' | 'EXPERIMENTAL' | 'PERSONAL';
  titulo: string;
  descripcion: string;
  tipoAccion: 'LEER' | 'VER' | 'PRACTICAR';   // sin caracteres invisibles
  recursos: string[];
}
```

---

## ENDPOINTS CLAVE

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/analitica/estudiante/{id}/cuestionario/{qId}/progreso` | Progreso individual + planActual |
| GET | `/analitica/cuestionario/{id}/reporte-grupo` | Reporte de grupo completo |
| GET | `/analitica/cuestionario/{id}/estudiantes-necesitan-apoyo` | Estudiantes con nivel BAJO |
| GET | `/evaluacion/consultar-id/{idEval}` | Detalle de sesión con respuestas |
| GET | `/analitica/cuestionario/{id}/resumen` | Resumen estadístico |
| POST | `/auth/login` | Login → JWT |
| POST | `/auth/refresh` | Refresh token |

---

## ESTRUCTURA DE ARCHIVOS RELEVANTE

```
skillbridge_frontend/src/app/
├── core/
│   ├── auth/auth.service.ts
│   ├── models/
│   │   ├── analytics.model.ts          ← PlanActual, InformeProgresoEstudianteResponse
│   │   ├── assessment.model.ts         ← DetalleRespuestaResponse, EvaluacionEstudianteResponse
│   │   ├── teacher-analytics.model.ts  ← ReporteGrupoResponse, NivelEstudianteResumenResponse
│   │   └── api-response.model.ts
│   └── interceptors/
└── features/
    ├── analytics/
    │   ├── student-progress/
    │   │   ├── student-progress.ts   ← planActual computed() con dedup
    │   │   └── student-progress.html ← @for planActual(); track plan.id
    │   └── analytics.service.ts
    └── teacher/
        ├── teacher-analytics.service.ts  ← getStudentProgress, getEvaluationDetail
        ├── group-report/
        │   ├── group-report.ts    ← master-detail, togglePlan, toggleAnswers
        │   ├── group-report.html  ← lista → detalle → plan/respuestas
        │   └── group-report.scss  ← pill-bajo/intermedio/avanzado
        └── components/
            ├── level-distribution-chart/
            ├── dimension-analysis-table/
            └── students-support-list/

skillbridge_backend/src/main/java/com/udea/skillbridge/
├── mapper/
│   └── IPlanFortalecimientoMapper.java   ← FIX APLICADO — necesita recompile en STS
├── service/impl/
│   └── AnalyticsServiceImpl.java         ← construirPlanesActuales, buildResumenesEstudiantes
├── dto/response/
│   ├── PlanFortalecimientoResponse.java  ← verificar campo idPuntuacionMatrix
│   └── analytics/
│       ├── NivelEstudianteResumenResponse.java  ← nombreCompleto, email, idEvaluacion
│       └── EstudianteQueNecesitaApoyoResponse.java
└── entity/
    ├── PlanFortalecimientoEntity.java
    └── PuntuacionResultadoEntity.java    ← dimensionEnt (null = global)
```

---

## PROBLEMAS RESUELTOS

### 1. Solo eje Personal en el plan (bug de 2 capas)
- **Capa 1 lógica:** `construirPlanesActuales` mezclaba planes de todas las dimensiones → filtrado a solo resultado global. Archivo: `AnalyticsServiceImpl.java`.
- **Capa 2 mapper:** `target = "id"` hacía `id=34` para los 3 planes → dedup colapsaba a 1. Fix: `target = "idPuntuacionMatrix"`. Archivo: `IPlanFortalecimientoMapper.java`. **PENDIENTE RECOMPILE.**

### 2. NG0955 duplicate track keys en "Mi progreso"
- Planes: dedup con `computed()`. Archivo: `student-progress.ts`.
- Historial: `track $index`. Archivo: `student-progress.html`.

### 3. TypeError `null.toLowerCase()` en group-report
- Fix: `row.nivel ? row.nivel.toLowerCase() : 'none'`. Archivo: `group-report.html`.

### 4. Pill CSS colors no aplicaban
- Renombradas a español: `.pill-bajo`, `.pill-intermedio`, `.pill-avanzado`, `.pill-none`. Archivo: `group-report.scss`.

### 5. `nombreCompleto`/`email` faltantes en listas
- Enriquecimiento con `IUsuarioRepository` en backend. Archivos: `AnalyticsServiceImpl.java`, DTOs.

### 6. LAZY loading `could not initialize proxy`
- `@Transactional(readOnly = true)` en `AnalyticsServiceImpl`. Archivo: `AnalyticsServiceImpl.java`.

---

## PENDIENTES ACTUALES

| Prioridad | Tarea | Archivos | Próximo paso |
|-----------|-------|----------|--------------|
| **ALTA** | Recompilar backend en STS y validar fix del mapper | `IPlanFortalecimientoMapper.java` | Build → Run en STS. Validar con GET `/analitica/estudiante/2/cuestionario/4/progreso` |
| **ALTA** | Verificar campo `idPuntuacionMatrix` en `PlanFortalecimientoResponse.java` | `dto/response/PlanFortalecimientoResponse.java` | Leer el DTO; añadir campo si falta |
| **MEDIA** | Corregir typo tab en `analytics.model.ts:43` — `tipoAccion: '\tLEER'` | `src/app/core/models/analytics.model.ts` | Limpiar caracteres invisibles |
| **BAJA** | Exportar CSV con tabla individual de estudiantes | `group-report.ts:exportCsv()` | Añadir `resumenEstudiantes` al CSV |

---

## ÚLTIMA TAREA EN PROGRESO

### Qué estábamos haciendo
Solucionando que "Plan de fortalecimiento actual" en "Mi progreso" (estudiante) solo mostraba el eje **Personal**, no los 3 ejes.

### Qué quedó terminado
- ✅ Fix lógica backend: filtrar solo resultado global en `construirPlanesActuales`
- ✅ Fix mapper backend: `target = "idPuntuacionMatrix"` (source ya modificado)
- ✅ Dedup frontend en `student-progress.ts` y `group-report.ts`
- ✅ NG0955 resueltos (planes + historial)
- ✅ Master-detail en group-report con plan y respuestas por estudiante
- ✅ Pill CSS en español + null-safe nivel
- ✅ `nombreCompleto`/`email` en listas de estudiantes

### Qué falta
- ⏳ **RECOMPILAR EN STS** — el fix del mapper está en source pero no compilado
- ⏳ Verificar `PlanFortalecimientoResponse.java` tiene `idPuntuacionMatrix`
- ⏳ Corregir typo tab en `analytics.model.ts:43`

### Validación esperada tras recompile
```
GET http://localhost:8083/analitica/estudiante/2/cuestionario/4/progreso
→ planActual: [
    { "id": X1, "planAxis": "ACADEMICO", "titulo": "Fundamentos de pensamiento crítico", ... },
    { "id": X2, "planAxis": "EXPERIMENTAL", "titulo": "Caso integrador", ... },
    { "id": X3, "planAxis": "PERSONAL", "titulo": "Hábitos de un pensador crítico", ... }
  ]
  (X1, X2, X3 deben ser ids DISTINTOS — no todos 34)
```

---

## DATOS DE PRUEBA

- Cuestionario: **"Evaluación de Pensamiento Crítico - Ingeniería"** (id=4)
- Estudiante de prueba: id=2 (ha realizado PRE_TEST)
- Matriz global: id=34 (BAJO), 3 planes con ejes ACADEMICO/EXPERIMENTAL/PERSONAL
- Admin: admin@skillbridge.edu.co / Admin123!

---

## PROMPT PARA NUEVA SESIÓN

Copia y pega esto en la nueva conversación:

```
Continuamos el proyecto SkillBridge (Angular 21 + Spring Boot 3 en STS/Eclipse).
Lee el archivo CONTEXT.md en C:\Users\User\Documents\ProyectosAngular\skillbridge_frontend\CONTEXT.md
para tener el contexto completo.

Tarea inmediata:
1. Leer PlanFortalecimientoResponse.java en el backend y verificar que tiene el campo
   `private Long idPuntuacionMatrix;`. Si no, añadirlo.
2. Confirmar que IPlanFortalecimientoMapper.java ya tiene el fix:
   @Mapping(source = "puntuacionMatrixEnt.id", target = "idPuntuacionMatrix")
3. Indicarme que recompile en STS (Eclipse) y reinicie el backend.
4. Tras reiniciar, validar con:
   GET http://localhost:8083/analitica/estudiante/2/cuestionario/4/progreso
   Espero planActual con 3 objetos con ids DISTINTOS (no todos 34) y ejes
   ACADEMICO, EXPERIMENTAL, PERSONAL.
5. Corregir typo en src/app/core/models/analytics.model.ts:43 — tipoAccion tiene
   un tab invisible antes de LEER.

Restricciones:
- Backend compila SOLO en STS, nunca con mvnw.
- Nunca hacer commit/push sin que yo lo pida explícitamente.
- mysql.exe en C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe (root/admin, DB skill_bridge)
```
