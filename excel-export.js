/* ══ EXPORTAR A EXCEL (.xlsx) — ILFIS UBUNTU ═══════════════════════════════════
   Un solo generador para TODOS los botones "Exportar a Excel" del ecosistema.
   Reemplaza los CSV: el archivo baja ya en columnas, con encabezado en negrita,
   fila de títulos congelada, filtros y columnas al ancho del contenido.

   REGLA: los números se pasan como número y las fechas como texto ya formateado
   (dd/mm/aaaa). El helper respeta el tipo que le dan: lo que llega como texto
   queda como texto (teléfonos, códigos), lo que llega como número queda número.

   Uso:
     ILFISExcel.bajar({
       archivo: 'notas_rociadores',              // sin extensión; se agrega la fecha
       hojas: [{ nombre: 'Notas',
                 cabeceras: ['N°','Alumno','Promedio'],
                 filas: [[1,'Ana Torres',87.5], ...] }]
     });

   La librería (ExcelJS) se descarga solo al primer clic en Exportar, así no
   pesa en la carga de la página para los alumnos.
   ════════════════════════════════════════════════════════════════════════════ */
window.ILFISExcel = (function () {
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  var cargando = null;

  function cargarLib() {
    if (window.ExcelJS) return Promise.resolve();
    if (cargando) return cargando;
    cargando = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = CDN;
      s.onload = function () { res(); };
      s.onerror = function () {
        cargando = null;
        rej(new Error('No se pudo cargar el generador de Excel (revisa la conexión a internet).'));
      };
      document.head.appendChild(s);
    });
    return cargando;
  }

  function hoyLima() {
    try {
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function ancho(cab, filas, i) {
    var max = String(cab == null ? '' : cab).length;
    for (var f = 0; f < filas.length; f++) {
      var v = filas[f][i];
      var l = String(v == null ? '' : v).length;
      if (l > max) max = l;
    }
    return Math.min(46, Math.max(10, max + 3));   // 9 es el ancho por defecto: no se escribiría
  }

  function armarHoja(wb, h) {
    var cabeceras = h.cabeceras || [];
    var filas = h.filas || [];
    var ws = wb.addWorksheet((h.nombre || 'Hoja 1').slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }]   // la fila de títulos queda fija al bajar
    });

    ws.addRow(cabeceras);
    filas.forEach(function (f) {
      ws.addRow(f.map(function (v) { return (v === '' || v == null) ? null : v; }));
    });

    var cab = ws.getRow(1);
    cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cab.height = 20;
    cab.alignment = { vertical: 'middle', wrapText: true };
    cab.eachCell(function (c) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16213E' } };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFC0392B' } } };
    });

    // getColumn(1..n): asignar sobre ws.columns deja la primera columna sin ancho.
    for (var i = 0; i < cabeceras.length; i++) {
      ws.getColumn(i + 1).width = ancho(cabeceras[i], filas, i);
    }
    if (cabeceras.length) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to:   { row: 1, column: cabeceras.length }
      };
    }
    return ws;
  }

  function bajar(opts) {
    opts = opts || {};
    var hojas = opts.hojas || [{ nombre: opts.nombre, cabeceras: opts.cabeceras, filas: opts.filas }];
    var nombreArchivo = (opts.archivo || 'export') + '_' + hoyLima() + '.xlsx';

    return cargarLib().then(function () {
      var wb = new window.ExcelJS.Workbook();
      wb.creator = 'ILFIS UBUNTU';
      wb.created = new Date();
      hojas.forEach(function (h) { armarHoja(wb, h); });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      var blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nombreArchivo;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }).catch(function (e) {
      alert('No se pudo generar el Excel.\n\n' + (e && e.message ? e.message : e));
      throw e;
    });
  }

  return { bajar: bajar, hoy: hoyLima };
})();
