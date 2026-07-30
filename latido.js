/* ══ TIEMPO TRABAJANDO — ILFIS UBUNTU ═════════════════════════════════════════
   Mide cuánto tiempo REAL trabaja un suscriptor dentro de la plataforma.

   NO cuenta ventanas abiertas: cuenta señales de vida. El reloj corre solo si
   se cumplen las dos cosas A LA VEZ:
     1. La pestaña está al frente y visible (si se va a otra pestaña o
        minimiza, el navegador avisa y el reloj se detiene solo).
     2. Hubo señal del usuario en el último minuto: mover el mouse, un clic,
        escribir o rodar la página.
   Sin señal durante un minuto, el reloj se para. Vuelve a arrancar al toque
   siguiente. Así, una ventana abierta toda la noche suma CERO.

   Cada 30 s de trabajo acumulado manda un latido al servidor con los segundos
   y en qué sección estaba. Es aditivo: si este archivo se borra, la
   plataforma sigue funcionando igual, solo se deja de medir.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  if (typeof API === 'undefined') return;

  var PASO_MS      = 1000;    // cada cuánto revisa el reloj
  var ENVIO_SEG    = 30;      // manda al servidor cada 30 s trabajados
  var INACTIVO_MS  = 60000;   // un minuto sin señal = deja de contar
  var MAX_ACUM     = 90;      // tope por envío (por si el equipo se durmió)

  var acumulado   = 0;        // segundos trabajados aún no enviados
  var ultimaSenal = Date.now();
  var enviando    = false;

  function hayUsuario() {
    return (Date.now() - ultimaSenal) < INACTIVO_MS;
  }
  function visible() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }
  function marcarSenal() { ultimaSenal = Date.now(); }

  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel', 'click']
    .forEach(function (ev) {
      window.addEventListener(ev, marcarSenal, { passive: true, capture: true });
    });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') marcarSenal();
    else enviar(true);            // al irse, no se pierde lo acumulado
  });

  /* En qué parte de la plataforma está: se lee del panel visible.
     Si mañana cambian los paneles, esto degrada a "plataforma" y no rompe. */
  function seccion() {
    try {
      var p = document.querySelector('.panel.activo, .panel.active, .panel[style*="display: block"]');
      if (p && p.id) return p.id.replace(/^panel-/, '').slice(0, 40);
    } catch (e) {}
    return 'plataforma';
  }

  function token() {
    try {
      var u = firebase.auth().currentUser;
      return u ? u.getIdToken() : null;
    } catch (e) { return null; }
  }

  function enviar(usarBeacon) {
    if (acumulado <= 0 || enviando) return;
    var seg = Math.min(MAX_ACUM, acumulado);
    var t = token();
    if (!t) return;                       // sin sesión no se mide nada
    enviando = true;
    var sec = seccion();
    t.then(function (idToken) {
      var cuerpo = JSON.stringify({ id_token: idToken, segundos: seg, seccion: sec });
      acumulado -= seg;
      // Al cerrar o cambiar de pestaña, sendBeacon llega aunque la página muera.
      if (usarBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(API + '/api/latido', new Blob([cuerpo], { type: 'application/json' }));
        enviando = false;
        return;
      }
      return fetch(API + '/api/latido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true
      }).then(function () { enviando = false; })
        .catch(function () { enviando = false; });   // se pierde ese tramo, no molesta al usuario
    }).catch(function () { enviando = false; });
  }

  setInterval(function () {
    if (visible() && hayUsuario()) {
      acumulado++;
      if (acumulado >= ENVIO_SEG) enviar(false);
    }
  }, PASO_MS);

  window.addEventListener('pagehide', function () { enviar(true); });
  window.addEventListener('beforeunload', function () { enviar(true); });
})();
