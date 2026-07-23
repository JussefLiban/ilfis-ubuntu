# HANDOFF — Cambios del Claude de Plataforma Educativa (22-jul-2026)

> Para el **otro Claude** (el que trabaja el 100% de Ubuntu: `app.py`, `index.html` raíz,
> Cálculos/Calculador, Clases Premium, etc.). Aquí está TODO lo que cambió el Claude de la
> **Plataforma Educativa** (diplomados tutorados) el 22-jul, para que no te tome tiempo entenderlo.

## Reparto de trabajo (recordatorio)
- **Yo (Claude Plataforma Educativa):** solo toco `cursos.py` (backend) y el frontend del diplomado:
  `diplomado-rociadores/`, `instructor-cursos/`, `admin-cursos/`, `catalogo/`, y las **secciones de
  Plataforma Educativa del `index.html` raíz** (Intranet → Plataforma Educativa: Alumnos, Prórrogas, etc.).
- **Tú:** `app.py`, el resto del `index.html` raíz, Cálculos/Calculador, Clases Premium, Aplicativos.
- **Regla:** NO re-subir `app.py` entero (es tuyo). Nos vemos por GitHub, no por carpetas.

## Estado: la Plataforma Educativa está COMPLETA y en vivo (Rociadores + Cálculos). NADA pendiente de mi lado.

---

## Qué cambió hoy (22-jul)

### 1. Nombre del alumno = "Mis datos" (NO el de Google) — DECISIÓN de negocio
- Fuente única del nombre para mostrar = `nombre_certificado` (lo que el alumno llena en "Mis datos").
  El `display_name` viene del perfil de Google y NO es confiable (ej. una cuenta se llamaba "Ingeniería").
- Backend `cursos.py`: `_nombres_por_uid()` resuelve **nombre_certificado → displayName → email**.
- **Modelo de DOS ámbitos, INTENCIONAL (no lo "arregles"):**
  - Plataforma **general** (Intranet General/Suscriptores, Premium): muestra el nombre de la **cuenta** (Google).
  - **Curso/diplomado**: muestra el nombre **formal** de "Mis datos".
  - Jussef decidió NO sincronizarlos. Es a propósito.

### 2. Roster único intranet ↔ planilla del profesor (`cursos.py`)
- `_roster_curso(llave)`: la ÚNICA lista de alumnos que comparten la planilla y la intranet =
  **matriculados + pausados**, nombre de "Mis datos", orden alfabético sin acentos (`_clave_orden`),
  **numerados 1..N**. Endpoint: `GET /api/cursos/{curso}/admin/roster`.
- Las dos planillas (rociadores literal + genérica `{curso}`) usan el roster: **solo matriculados+pausados**
  (se acabaron los "fantasmas" de cuentas de prueba con quiz), filas en **orden alfabético con `numero`**,
  nombre del roster. El ranking por nota queda como dato aparte.
- Frontend: la intranet (Educativa → Alumnos) trae `/admin/roster` y muestra el MISMO número y nombre que
  el profesor. El panel del profesor muestra "N." junto al nombre.

### 3. Matrícula con 3 estados: Matriculado / Pausado / Eliminado
- **Pausar** = suspende (falta de pago) guardando el vencimiento; **Reanudar** lo restaura igual. **Eliminar** = definitivo.
- Backend `cursos.py`: `POST /api/cursos/{curso}/admin/matricula/pausar`, `/reanudar`,
  `GET /api/cursos/admin/matriculas/pausadas`. Colección Firestore `matriculas_pausadas`.
- Frontend `index.html` raíz (Educativa → Alumnos): botones Pausar (⏸) / Reanudar (▶) / Eliminar (🗑).
  Funciones nuevas: `adminPausar`, `adminReanudar`, `adminBorrarCuenta`, `eduVerTabla`, `eduCargarRoster`,
  `_eduRoster`, `_pausados`. (Si tocas el panel Intranet, respétalas.)

### 4. Prórroga de TAREAS por alumno+semana (`cursos.py` + `instructor-cursos/`)
- Solo TAREAS (los cuestionarios NUNCA se prorrogan). Solo EXTIENDE. A prueba de fallos: ante cualquier
  error del lookup, cae al plazo normal (nunca rompe una entrega).
- Backend: helper `_con_prorroga` integrado en TODOS los puntos de cierre de entregas (rociadores + genérico:
  ver plazo/subir/borrar/finalizar/reabrir). Endpoints `POST /api/cursos/{curso}/admin/prorroga`,
  `GET /admin/prorrogas`, `DELETE /admin/prorroga/{uid}/{sem}`. Colección Firestore `prorrogas`. Tope blando 240h.
- Frontend: pestaña nueva **⏱ Prórrogas** en `instructor-cursos/`. El Examen Final (trabajo que se sube, sem 13
  en Rociadores) se incluye con su nombre; los cuestionarios no.

### 5. Limpieza (`cursos.py`)
- `eliminar-cuenta` ahora limpia también: `progress`, `matriculas_pausadas`, `prorrogas`.

### 6. Aula (`diplomado-rociadores/`)
- Texto de la leyenda del comentario del boletín aclarado: "Tu profesor te dejó un comentario (pasa el
  ratón por el icono para leerlo)". El comentario/nota solo aparece tras la publicación (lunes 12:00).

---

## Cosas que YA estaban y verifiqué hoy (no las toques pensando que faltan)
- **Certificados**: circuito completo (emitir/anular/listar/QR/descarga del alumno). NO bloqueado por Laravel.
- **Fecha de cohorte configurable**, **docentes** por correo, **ponderación** de notas.
- **Videos**: reproductor nativo de Drive (iframe /preview), SIN Cloud Run en el diploma (tu proxy de app.py
  es solo de Premium). Cursos genéricos enlazan videos POR NOMBRE (`/admin/videos/descubrir` +
  `config/videos_{curso}`); Rociadores usa `ROCIADORES_VIDEO_IDS` a mano (es la maqueta). NO quitar el acceso
  Lector del compute SA a la carpeta de Drive: el backend la lee para buscar videos por nombre y bajar materiales.

## Fuera de mi alcance (para ti / decisión de Jussef)
- **Seguridad**: fase transversal a TODO Ubuntu — la lleva Jussef contigo.
- **Cohortes múltiples**: se programa puntualmente si hace falta (no es pendiente).

_Registro vivo detallado: `ESTADO_PROYECTO_CURSOS.md` en la carpeta de trabajo._
