# ⚠️ PARA EL OTRO CLAUDE — Minas al hacer PASARELA DE PAGOS y SEGURIDAD INTEGRAL

> Ambos proyectos tocan **matrícula, Firebase Auth y permisos**, que es lo que sostiene la
> Plataforma Educativa (en VIVO, cohorte desde el 20-jul). Lee esto antes de tocar nada, y
> **lee el código real de `cursos.py` y el aula** antes de proponer. Si dudas de algo de mi
> lado, mejor pregúntame (deja un snippet) que romperlo. Cloud Run guarda revisiones →
> rollback inmediato si algo se cae.

## 1. La MATRÍCULA es un custom claim — no inventes otro sistema de acceso
- El acceso a un diplomado = `cursos_activos: { "diplomado_<curso>": "<fecha_iso_exp>" }` en los
  **custom claims** del usuario (+ `premium: True`). Así lo lee el aula (`verificar_matricula`, `_alumno`).
- **La pasarela de pagos, al confirmar un pago, debe CONCEDER ese mismo claim.** Reusa la lógica de
  `_conceder_matricula_uid(uid, llave, dias)` en `cursos.py` (o replica su formato EXACTO). No crees un
  "acceso paralelo" en otra colección: romperías el aula, pausar/reanudar y las prórrogas.
- La compuerta de pago del front YA existe en `index.html` raíz: `FIN_GRATIS = 2027-01-01`,
  `_plataformaEsDePago()`, `_puedeEntrarPlataforma()`, `mostrarBloqueoPago()`. Hoy es GRATIS hasta 2027;
  la pasarela solo tiene que **conceder el claim** cuando toque cobrar. Intégrate con eso, no lo dupliques.

## 2. DOS proyectos GCP — no cruces las identidades (ya rompió una vez)
- `ilfisubuntu` (SIN guion, nº 27378911758) = Cloud Run + Firestore ("el que corre").
- `ilfis-ubuntu` (CON guion, nº 986363919942) = Firebase Auth (logins) + Storage (entregas).
- El compute SA `27378911758-compute@developer.gserviceaccount.com` tiene en el proyecto **ilfis-ubuntu**
  los roles **Firebase Authentication Admin** + **Storage Object Admin**. **NO se los quites** "por
  seguridad": sin ellos se rompen los claims (matrícula) y las entregas → error `INSUFFICIENT_PERMISSION`.
  Ya pasó y costó horas.

## 3. Firestore rules: el backend NO se rige por ellas (usa Firebase Admin/ADC)
- `cursos.py` y `app.py` escriben Firestore con el **Admin SDK**, que **ignora las reglas de seguridad**.
  Así que endurecer las reglas de Firestore está bien y **no rompe el backend**.
- Riesgo solo si agregas lectura de Firestore **desde el navegador (cliente)**: ahí SÍ aplican reglas.
  Hoy el diploma NO lee Firestore desde el cliente (todo pasa por el backend). Si vas a bloquear todo por
  defecto, revisa que ninguna página cliente dependa de acceso directo a Firestore.

## 4. Auth de los paneles admin — no cambies el contrato sin avisar
- Los endpoints admin de `cursos.py` autentican con `_solo_admin` / `_panel_auth`: aceptan **X-Admin-Key
  (= ADMIN_SECRET)** o el **token de un correo en `ADMIN_EMAILS`** (`contacto@`, `grupo3speru@`).
- Si **rotas `ADMIN_SECRET`** (buena idea de seguridad): avisa, porque la clave vive en `localStorage` del
  navegador y hay que re-guardarla. No cambies la forma de leer el header `X-Admin-Key`.
- El instructor/docente entra por login Google (correo docente) — no rompas ese flujo de token.

## 5. CORS — el front vive en GitHub Pages, el backend en Cloud Run
- El aula y los paneles (origen `https://ilfis-ubuntu.ilfislatinoamerica.com`) llaman al backend
  (`ilfis-ubuntu-27378911758.us-central1.run.app`). Si endureces CORS, **mantén ese origen permitido**,
  o el aula deja de cargar.

## 6. Colecciones Firestore del diploma — no borrar/renombrar
`quizAttempts`, `notasManual`, `entregas`, `alumnos`, `progress`, `certificados`, `cert_emitidos`,
`solicitudes_diplomado`, `matriculas_pausadas`, `prorrogas`, `bloqueados`, `config/*`
(cohorte_{curso}, docentes_{curso}, videos_{curso}).

## 7. Bucket de entregas
`ENTREGAS_BUCKET = ilfis-ubuntu.firebasestorage.app` (Storage del proyecto ilfis-ubuntu). Las entregas de
tareas y las fotos de perfil viven ahí. No cambies el nombre ni le quites permiso de escritura al compute SA.

---

**En una frase:** para PAGOS, conceder acceso = escribir el claim `cursos_activos` (reusa mi función).
Para SEGURIDAD, endurece Firestore rules/CORS/ADMIN_SECRET libremente, pero **no toques los roles del
compute SA ni el formato de los claims**. Ante cualquier duda sobre `cursos.py` o el aula, pásame un
snippet y lo integro yo. — Claude Plataforma Educativa, 22-jul.
