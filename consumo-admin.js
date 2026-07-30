/* ADMIN CONSUMO v2 - ILFIS
   Sub-pestana "Consumo" del area General del panel Admin (index.html).
   Aditivo: no modifica el codigo existente. Reusa la clave admin (ilfis_admin_key)
   y la constante API. Lee /admin/uso y /admin/consumo-log (solo lectura).
   Sigue la maqueta aprobada MOCKUP_Consumo_Admin.html (jul 2026):
   4 vistas (Resumen / Por alumno / Por modulo / Que preguntan), selector de
   periodo, filtro de cuentas de prueba y export a Excel real (excel-export.js).
   Para quitarlo: borrar la linea <script src="consumo-admin.js">. */
(function(){
  if (typeof API === 'undefined') return;
  var LS = 'ilfis_admin_key';
  // Cuentas del equipo: se excluyen de las metricas para no inflar los numeros.
  var CUENTAS_PRUEBA = ['grupo3speru@gmail.com', 'contacto@ilfislatinoamerica.com'];
  var MODS = {consultas:'Chat IA', experto:'Experto', nfpa:'NFPA', fm:'FM', videos:'Videos'};
  var FUENTES = {corpus:'Chat IA / Experto', youtube:'Videos', nfpa:'NFPA', fm:'FM', biblioteca:'Biblioteca'};
  // Fecha desde la que el servidor anota el modulo de cada pregunta.
  var DESDE_MODS = '2026-07-30';

  var USO = null, LOG = null, cargadoUna = false, cargandoAhora = false;
  var periodo = 30;            // dias; 0 = todo
  var sinPrueba = true;        // excluir cuentas del equipo
  var vista = 'resumen';
  var ordCol = 'ultima', ordDir = -1;
  var hoyStr = null;

  /* ── estilos ─────────────────────────────────────────────── */
  var CSS = ''
    + '#admin-sec-consumo .cns-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:14px;}'
    + '#admin-sec-consumo .cns-seg{display:flex;background:#0f1830;border:1px solid #2a2a5a;border-radius:9px;overflow:hidden;}'
    + '#admin-sec-consumo .cns-seg button{background:none;border:none;color:#8aa;padding:7px 13px;font-size:.78rem;cursor:pointer;font-family:inherit;}'
    + '#admin-sec-consumo .cns-seg button.on{background:#16213e;color:#fff;}'
    + '#admin-sec-consumo .cns-btn{background:#0f3460;color:#dde;border:1px solid #2a2a5a;border-radius:8px;padding:7px 13px;font-size:.78rem;cursor:pointer;font-family:inherit;}'
    + '#admin-sec-consumo .cns-subtabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;}'
    + '#admin-sec-consumo .cns-subtab{background:#0f1830;border:1px solid #2a2a5a;color:#8aa;border-radius:20px;padding:6px 15px;font-size:.79rem;cursor:pointer;font-family:inherit;}'
    + '#admin-sec-consumo .cns-subtab.on{background:#16213e;color:#fff;border-color:#c0392b;}'
    + '#admin-sec-consumo .cns-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;}'
    + '#admin-sec-consumo .cns-stat{background:#0f1830;border:1px solid #2a2a5a;border-radius:11px;padding:11px 13px;}'
    + '#admin-sec-consumo .cns-stat .n{color:#fff;font-size:1.4rem;font-weight:700;line-height:1.15;}'
    + '#admin-sec-consumo .cns-stat .l{color:#8aa;font-size:.66rem;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}'
    + '#admin-sec-consumo .cns-stat .s{font-size:.7rem;margin-top:4px;color:#8aa;}'
    + '#admin-sec-consumo .cns-stat .q{color:#7f8fa6;font-size:.67rem;line-height:1.4;margin-top:6px;padding-top:6px;border-top:1px solid #1c2540;}'
    + '#admin-sec-consumo .cns-stat .q b{color:#9db4ff;font-weight:600;}'
    + '#admin-sec-consumo .cns-sec{color:#fff;font-size:.93rem;font-weight:700;margin:20px 0 8px;}'
    + '#admin-sec-consumo .cns-box{background:#0f1830;border:1px solid #2a2a5a;border-radius:12px;padding:14px;margin-bottom:6px;}'
    + '#admin-sec-consumo .cns-pq{background:#101c33;border:1px solid #24365c;border-left:3px solid #2a6bb0;border-radius:8px;padding:10px 12px;margin-top:10px;font-size:.74rem;color:#b8c4d4;line-height:1.55;}'
    + '#admin-sec-consumo .cns-pq b{color:#fff;}'
    + '#admin-sec-consumo .cns-pq .t{display:block;color:#9db4ff;font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-weight:700;}'
    + '#admin-sec-consumo .cns-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;}'
    + '@media(max-width:820px){#admin-sec-consumo .cns-cols{grid-template-columns:1fr;}}'
    + '#admin-sec-consumo .cns-row{display:flex;align-items:center;gap:9px;margin-bottom:6px;font-size:.78rem;}'
    + '#admin-sec-consumo .cns-row .lb{width:145px;color:#dde;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '#admin-sec-consumo .cns-row .tr{flex:1;display:block;background:#16213e;border-radius:4px;height:15px;overflow:hidden;}'
    + '#admin-sec-consumo .cns-row .fi{display:block;height:100%;background:#c0392b;}'
    + '#admin-sec-consumo .cns-row .fi.b{background:#2a6bb0;}'
    + '#admin-sec-consumo .cns-row .vl{width:100px;text-align:right;color:#8aa;flex:none;font-size:.73rem;}'
    + '#admin-sec-consumo .cns-tw{overflow-x:auto;}'
    + '#admin-sec-consumo table{width:100%;border-collapse:collapse;font-size:.82rem;}'
    + '#admin-sec-consumo th{color:#9db4ff;text-align:right;padding:7px 8px;border-bottom:1px solid #2a2a5a;cursor:pointer;white-space:nowrap;font-size:.74rem;}'
    + '#admin-sec-consumo th.l,#admin-sec-consumo td.l{text-align:left;}'
    + '#admin-sec-consumo td{color:#dde;text-align:right;padding:7px 8px;border-bottom:1px solid #1c2540;white-space:nowrap;}'
    + '#admin-sec-consumo tr:hover td{background:#16213e;}'
    + '#admin-sec-consumo .cns-name{color:#fff;}'
    + '#admin-sec-consumo .cns-mail{color:#8aa;font-size:.72rem;}'
    + '#admin-sec-consumo .cns-chip{display:inline-block;font-size:.63rem;padding:1px 6px;border-radius:9px;margin-right:3px;border:1px solid #2a3f6a;background:#12203a;color:#9db4ff;}'
    + '#admin-sec-consumo .cns-flag{display:inline-block;font-size:.63rem;padding:1px 6px;border-radius:9px;background:#3a1414;color:#f87171;border:1px solid #6b1f1f;margin-left:3px;}'
    + '#admin-sec-consumo .cns-zero td{opacity:.45;}'
    + '#admin-sec-consumo .cns-no{color:#8aa;font-style:italic;padding:14px;}'
    + '#admin-sec-consumo .cns-search{flex:1;min-width:170px;padding:8px 12px;border-radius:8px;border:1px solid #2a2a5a;background:#0f1830;color:#dde;font-family:inherit;}'
    + '#admin-sec-consumo ul.cns-lista{margin:0;padding-left:17px;color:#dde;font-size:.8rem;line-height:1.7;}'
    + '#admin-sec-consumo ul.cns-lista span{color:#8aa;}';

  function inyectarCSS(){
    if(document.getElementById('cns-css')) return;
    var st = document.createElement('style');
    st.id = 'cns-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ── utilitarios ─────────────────────────────────────────── */
  function esc(s){ return (s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function fday(f){ if(!f) return '—'; var p=String(f).split('-'); return p.length===3 ? (p[2]+'/'+p[1]+'/'+p[0].slice(2)) : f; }
  function dstr(dt){ return dt.toISOString().slice(0,10); }
  function hoyDate(){ return hoyStr ? new Date(hoyStr+'T12:00:00Z') : new Date(); }
  function desdeStr(){
    if(!periodo) return null;
    var d = hoyDate(); d.setUTCDate(d.getUTCDate() - (periodo - 1));
    return dstr(d);
  }
  function esPrueba(a){ return CUENTAS_PRUEBA.indexOf((a.email||'').toLowerCase()) !== -1; }
  function alumnos(){
    var l = (USO && USO.alumnos) || [];
    return sinPrueba ? l.filter(function(a){ return !esPrueba(a); }) : l;
  }
  function enPeriodo(f){ var de = desdeStr(); return !!f && (!de || f >= de); }
  function pregPeriodo(a){
    var de = desdeStr(); if(!de) return a.preguntas || 0;
    var t = 0, pd = a.por_dia || {};
    for(var f in pd){ if(f >= de) t += pd[f]; }
    return t;
  }
  function ultimaVez(a){
    var u = a.ultimo_ingreso || '', f = a.fin || '';
    return (u > f ? u : f) || null;
  }
  function relDias(f){
    if(!f) return 'nunca entró';
    var d = Math.round((hoyDate() - new Date(f+'T12:00:00Z')) / 86400000);
    if(d <= 0) return 'hoy';
    if(d === 1) return 'ayer';
    return 'hace ' + d + ' días';
  }
  function stat(n, l, s, q){
    return '<div class="cns-stat"><div class="n">'+n+'</div><div class="l">'+l+'</div>'
      + (s ? '<div class="s">'+s+'</div>' : '')
      + (q ? '<div class="q"><b>Para qué sirve:</b> '+q+'</div>' : '')
      + '</div>';
  }
  function barra(lb, pct, vl, azul){
    return '<div class="cns-row"><span class="lb" title="'+esc(lb)+'">'+esc(lb)+'</span>'
      + '<span class="tr"><span class="fi'+(azul?' b':'')+'" style="width:'+Math.max(0,Math.min(100,pct))+'%"></span></span>'
      + '<span class="vl">'+vl+'</span></div>';
  }

  /* ── armado del contenedor ───────────────────────────────── */
  function inyectar(){
    var tabs = document.getElementById('admin-tabs-general') || document.querySelector('.admin-tabs');
    var ref  = document.getElementById('admin-sec-alumnos');
    if(!tabs || !ref || document.getElementById('admin-sec-consumo')) return;
    inyectarCSS();

    var btn = document.createElement('button');
    btn.className = 'admin-tab'; btn.type = 'button'; btn.textContent = 'Consumo';
    btn.setAttribute('onclick', "adminShowTab('consumo', this)");
    tabs.appendChild(btn);

    var sec = document.createElement('div');
    sec.className = 'admin-section'; sec.id = 'admin-sec-consumo';
    sec.innerHTML =
      '<div class="cns-bar">'
      +   '<div class="cns-seg" id="cns-periodos">'
      +     '<button data-p="1">Hoy</button><button data-p="7">7 días</button>'
      +     '<button data-p="30" class="on">30 días</button><button data-p="0">Todo</button>'
      +   '</div>'
      +   '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      +     '<button type="button" class="cns-btn" id="cns-prueba">Excluir cuentas del equipo ✓</button>'
      +     '<button type="button" class="cns-btn" id="cns-excel">⤓ Exportar a Excel</button>'
      +     '<button type="button" class="cns-btn" id="cns-reload">↻ Recargar</button>'
      +   '</div>'
      + '</div>'
      + '<div class="cns-subtabs">'
      +   '<button type="button" class="cns-subtab on" data-v="resumen">Resumen</button>'
      +   '<button type="button" class="cns-subtab" data-v="alumnos">Por alumno</button>'
      +   '<button type="button" class="cns-subtab" data-v="modulos">Por módulo</button>'
      +   '<button type="button" class="cns-subtab" data-v="temas">Qué preguntan</button>'
      + '</div>'
      + '<div id="cns-cuerpo"><div class="cns-no">Cargando…</div></div>';
    ref.parentNode.appendChild(sec);

    sec.querySelector('#cns-reload').addEventListener('click', function(){ cargar(true); });
    sec.querySelector('#cns-prueba').addEventListener('click', function(){
      sinPrueba = !sinPrueba;
      this.textContent = 'Excluir cuentas del equipo ' + (sinPrueba ? '✓' : '✗');
      render();
    });
    sec.querySelector('#cns-excel').addEventListener('click', exportar);
    sec.querySelectorAll('#cns-periodos button').forEach(function(b){
      b.addEventListener('click', function(){
        sec.querySelectorAll('#cns-periodos button').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); periodo = parseInt(b.dataset.p, 10); render();
      });
    });
    sec.querySelectorAll('.cns-subtab').forEach(function(b){
      b.addEventListener('click', function(){
        sec.querySelectorAll('.cns-subtab').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); vista = b.dataset.v; render();
      });
    });
  }

  /* ── datos ───────────────────────────────────────────────── */
  function cargar(forzar){
    if(cargandoAhora) return;
    var key = (localStorage.getItem(LS) || '').trim();
    var cuerpo = document.getElementById('cns-cuerpo');
    if(!key){ if(cuerpo) cuerpo.innerHTML = '<div class="cns-no">Entra primero con tu clave de administración.</div>'; return; }
    if(cargadoUna && !forzar){ render(); return; }
    cargandoAhora = true;
    if(cuerpo) cuerpo.innerHTML = '<div class="cns-no">Cargando consumo…</div>';
    var h = { headers: { 'x-admin-key': key } };
    Promise.all([
      fetch(API + '/admin/uso', h).then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); }),
      fetch(API + '/admin/consumo-log', h).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
    ]).then(function(res){
      USO = res[0]; LOG = res[1];
      hoyStr = (USO.resumen && USO.resumen.hoy) || null;
      cargadoUna = true; cargandoAhora = false; render();
    }).catch(function(e){
      cargandoAhora = false;
      if(cuerpo) cuerpo.innerHTML = '<div class="cns-no">No se pudo cargar (' + e + ').</div>';
    });
  }

  /* ── vistas ──────────────────────────────────────────────── */
  function render(){
    var cuerpo = document.getElementById('cns-cuerpo');
    if(!cuerpo || !USO) return;
    if(vista === 'resumen')  cuerpo.innerHTML = vResumen();
    if(vista === 'alumnos'){ cuerpo.innerHTML = vAlumnos(); wireTabla(); }
    if(vista === 'modulos')  cuerpo.innerHTML = vModulos();
    if(vista === 'temas')    cuerpo.innerHTML = vTemas();
  }

  function vResumen(){
    var l = alumnos(), de = desdeStr();
    var registrados = l.length;
    var nuevos = l.filter(function(a){ return enPeriodo(a.registro); }).length;
    // OJO: Firebase cuenta el registro mismo como un ingreso. Para no mostrar
    // un "100% entraron" vacio, en "Todo" se exige haber vuelto DESPUES del
    // dia del registro (o haber preguntado algo).
    function volvio(a){
      var u = ultimaVez(a);
      if(!u) return false;
      if((a.preguntas || 0) > 0) return true;
      return !!a.registro && u > a.registro;
    }
    var entraron = periodo
      ? l.filter(function(a){ return enPeriodo(ultimaVez(a)); }).length
      : l.filter(volvio).length;
    var pregs = 0, topers = 0, topesVeces = 0;
    l.forEach(function(a){
      pregs += pregPeriodo(a);
      var t = a.topes || 0;
      if(t > 0){ topers++; topesVeces += t; }
    });
    var costo = null, costoPreg = null;
    if(LOG && LOG.por_dia){
      costo = 0;
      var nlog = 0;
      for(var f in LOG.por_dia){
        if(!de || f >= de){ costo += LOG.por_dia[f].costo; nlog += LOG.por_dia[f].n; }
      }
      if(nlog) costoPreg = costo / nlog;
    }
    var etiqueta = periodo === 1 ? 'hoy' : (periodo ? periodo + ' días' : 'todo');

    var h = '<div class="cns-stats">'
      + stat(registrados, 'Registrados', nuevos + ' nuevos en ' + etiqueta,
             'tamaño de tu audiencia; es el denominador de todo lo demás.')
      + stat(entraron, periodo ? 'Entraron (' + etiqueta + ')' : 'Volvieron tras registrarse',
             registrados ? Math.round(100*entraron/registrados) + '% de los registrados' : '',
             periodo ? 'separa el registro de la costumbre: si baja, se van callados.'
                     : 'registrarse ya cuenta como un ingreso, así que aquí se exige haber vuelto otro día o haber preguntado algo.')
      + stat(pregs, 'Preguntas (' + etiqueta + ')', 'con tope de ' + (USO.resumen.tope_diario||5) + '/día por alumno',
             'el latido del producto: cada una es un problema real resuelto.')
      + (costo != null
          ? stat('US$ ' + costo.toFixed(2), 'Costo IA (' + etiqueta + ')',
                 costoPreg != null ? 'US$ ' + costoPreg.toFixed(4) + ' por pregunta' : '',
                 'lo que te cuesta regalar 2026; se ve aquí antes que en la factura. '
                 + '<b>Ojo:</b> NFPA y FM recién anotan su gasto desde el ' + fday(DESDE_MODS)
                 + '; lo anterior a esa fecha solo incluye Chat IA/Experto y Videos, así que el histórico se queda corto.')
          : stat('—', 'Costo IA', 'sin datos del log', ''))
      + stat(topers, 'Alumnos que toparon', topesVeces + ' días al tope en total',
             'demanda reprimida: tu lista de primeros clientes cuando se cobre.')
      + '</div>';

    h += '<div class="cns-sec">Altas nuevas (según el periodo elegido)</div><div class="cns-box">'
      + graficoAltas(l)
      + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
      + 'Le pone fecha al crecimiento: los picos coinciden con lo que publicaste, así que dice qué campaña trajo gente y cuál no movió nada. '
      + 'La escala se ajusta sola: por día hasta 1 mes, por semana hasta ~4 meses, por mes de ahí en adelante.</div></div>';

    // Embudo (todo el histórico, no depende del periodo)
    var todos = l.length;
    var entraronAlg = l.filter(volvio).length;
    var preguntaron = l.filter(function(a){ return (a.preguntas||0) > 0; }).length;
    var volvieron = l.filter(function(a){ return (a.dias_activos||0) >= 2; }).length;
    var d30 = (function(){ var d = hoyDate(); d.setUTCDate(d.getUTCDate()-29); return dstr(d); })();
    var siguen = l.filter(function(a){ var u = ultimaVez(a); return u && u >= d30; }).length;
    function pct(n){ return todos ? Math.round(100*n/todos) : 0; }

    h += '<div class="cns-cols"><div><div class="cns-sec">¿Se quedan? (histórico)</div><div class="cns-box">'
      + barra('Se registraron', 100, todos + ' · 100%')
      + barra('Volvieron tras registrarse', pct(entraronAlg), entraronAlg + ' · ' + pct(entraronAlg) + '%')
      + barra('Preguntaron ≥1 vez', pct(preguntaron), preguntaron + ' · ' + pct(preguntaron) + '%')
      + barra('Volvieron otro día', pct(volvieron), volvieron + ' · ' + pct(volvieron) + '%')
      + barra('Activos últimos 30 días', pct(siguen), siguen + ' · ' + pct(siguen) + '%')
      + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
      + 'Cada escalón es una puerta: el más bajo dice dónde pierdes gente y qué arreglar primero, en vez de adivinar. '
      + (todos - entraronAlg > 0 ? '<b>' + (todos-entraronAlg) + ' se registraron y no han vuelto</b> — problema de bienvenida, no de producto.' : '')
      + '</div></div></div>';

    // Distribucion de intensidad en el periodo
    var d0=0,d1=0,d2=0,d3=0;
    l.forEach(function(a){
      var p = pregPeriodo(a);
      if(p<=0) d0++; else if(p<=5) d1++; else if(p<=20) d2++; else d3++;
    });
    var maxd = Math.max(d0,d1,d2,d3,1);
    h += '<div><div class="cns-sec">¿Pagarían? (' + etiqueta + ')</div><div class="cns-box">'
      + barra('Sin preguntas', 100*d0/maxd, String(d0), true)
      + barra('1 a 5', 100*d1/maxd, String(d1), true)
      + barra('6 a 20', 100*d2/maxd, String(d2), true)
      + barra('Más de 20', 100*d3/maxd, String(d3))
      + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
      + 'Parte a los registrados por intensidad. Con esto se decide el precio y dónde poner el corte del plan gratis. '
      + 'Los de "más de 20" y los que topan el límite ya te dijeron que sí.</div></div></div></div>';

    // Calidad del asistente
    if(LOG && LOG.n_total){
      h += '<div class="cns-sec">¿Responde bien el asistente? (histórico del log)</div><div class="cns-box">'
        + barra('Con buen respaldo', LOG.pct_buen_respaldo || 0, (LOG.pct_buen_respaldo||0) + '%')
        + barra('Flojas o sin material', 100-(LOG.pct_buen_respaldo||0), (100-(LOG.pct_buen_respaldo||0)).toFixed(1) + '%', true)
        + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
        + 'La nota del asistente puesta por el propio sistema, sin esperar quejas. Tardanza promedio: '
        + (LOG.latencia_prom_ms != null ? (LOG.latencia_prom_ms/1000).toFixed(1) + ' s' : '—')
        + '. Las flojas están en la vista "Qué preguntan": son el material que falta subir.</div></div>';
    }
    return h;
  }

  function graficoAltas(l){
    // Agrupa registros por dia/semana/mes segun el periodo (escala automatica).
    var de = desdeStr();
    var fechas = l.map(function(a){ return a.registro; }).filter(function(f){ return !!f && (!de || f >= de); });
    if(!fechas.length) return '<div class="cns-no">Sin registros en este periodo.</div>';
    fechas.sort();
    var primera = de || fechas[0], ultima = hoyStr || fechas[fechas.length-1];
    var dias = Math.round((new Date(ultima) - new Date(primera)) / 86400000) + 1;
    var modo = dias <= 32 ? 'dia' : (dias <= 130 ? 'semana' : 'mes');
    function clave(f){
      if(modo === 'dia') return f;
      if(modo === 'mes') return f.slice(0,7);
      var d = new Date(f + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));  // lunes de esa semana
      return dstr(d);
    }
    var grupos = {}, orden = [];
    // generar la serie completa (incluye ceros)
    var cur = new Date(primera + 'T12:00:00Z'), fin = new Date(ultima + 'T12:00:00Z');
    while(cur <= fin){
      var k = clave(dstr(cur));
      if(orden.indexOf(k) === -1){ orden.push(k); grupos[k] = 0; }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    fechas.forEach(function(f){ var k = clave(f); if(k in grupos) grupos[k]++; });
    var max = 1; orden.forEach(function(k){ if(grupos[k] > max) max = grupos[k]; });

    var W = 900, H = 150, base = 120, bw = Math.max(4, Math.floor(W / orden.length) - 3);
    var svg = '<svg viewBox="0 0 ' + (W+40) + ' ' + H + '" style="width:100%;height:auto">'
      + '<line x1="34" y1="'+base+'" x2="'+(W+38)+'" y2="'+base+'" stroke="#2a2a5a"/>'
      + '<text x="26" y="'+(base+4)+'" fill="#8aa" font-size="10" text-anchor="end">0</text>'
      + '<text x="26" y="20" fill="#8aa" font-size="10" text-anchor="end">'+max+'</text>';
    orden.forEach(function(k, i){
      var v = grupos[k], hh = Math.round((base-14) * v / max);
      var x = 38 + i * (bw + 3);
      var esParcial = (i === orden.length - 1 && modo !== 'dia');
      svg += '<rect x="'+x+'" y="'+(base-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+(esParcial?'#7a2c22':'#c0392b')+'">'
        + '<title>'+k+': '+v+'</title></rect>';
    });
    // rotulos: primero, medio, ultimo
    function rot(k){
      if(modo === 'mes') return k;
      if(modo === 'semana') return 'sem. ' + fday(k).slice(0,5);
      return fday(k).slice(0,5);
    }
    [[0,'start'],[Math.floor((orden.length-1)/2),'middle'],[orden.length-1,'end']].forEach(function(p){
      var x = 38 + p[0] * (bw + 3) + bw/2;
      svg += '<text x="'+x+'" y="'+(base+16)+'" fill="#8aa" font-size="10" text-anchor="'+p[1]+'">'+rot(orden[p[0]])+'</text>';
    });
    svg += '</svg>';
    var nota = modo === 'dia' ? 'Cada barra es un día.'
      : (modo === 'semana' ? 'Cada barra es una semana (empieza lunes); la última va incompleta y se pinta más clara.'
                           : 'Cada barra es un mes; el último va incompleto y se pinta más claro.');
    return svg + '<div style="color:#8aa;font-size:.72rem;margin-top:4px;">' + nota + ' Pasa el mouse por una barra para ver el número.</div>';
  }

  function vAlumnos(){
    var etiqueta = periodo === 1 ? 'hoy' : (periodo ? 'últimos ' + periodo + ' días' : 'todo el histórico');
    return '<div class="cns-bar"><input type="text" class="cns-search" id="cns-search" placeholder="Buscar por nombre o correo…"></div>'
      + '<div class="cns-box"><div class="cns-tw"><table id="cns-tabla"></table></div>'
      + '<div class="cns-pq"><span class="t">Cómo leer la columna Módulos</span>'
      + 'Cada etiqueta es <b>módulo + preguntas hechas ahí</b>. Ejemplo: <span class="cns-chip">Experto 21</span> = 21 preguntas en Pregúntale al Experto. '
      + '<span class="cns-chip">Chat IA</span> Consultas · <span class="cns-chip">Experto</span> Pregúntale al Experto · '
      + '<span class="cns-chip">NFPA</span> interpreta NFPA · <span class="cns-chip">FM</span> interpreta FM · <span class="cns-chip">Videos</span> momentos en videos. '
      + '<b>El servidor anota el módulo desde el ' + fday(DESDE_MODS) + '</b>: lo preguntado antes cuenta en el total pero sin módulo.</div>'
      + '<div class="cns-pq"><span class="t">Para qué sirve cada columna</span>'
      + '<b>Última vez</b>: el orden de la tabla — arriba lo que pasa ahora, abajo quién se está yendo. '
      + '<b>Registrado</b>: cruzado con la anterior dice cuánto duró. '
      + '<b>Preguntas</b> (' + etiqueta + '): el uso real. '
      + '<b>Días act.</b>: hábito o atracón de un día. '
      + '<b>Topó</b>: días que chocó con el límite — quiere más de lo que el gratis le da. '
      + 'Avisos: <span class="cns-flag">se enfrió</span> más de 14 días sin entrar habiendo usado · <span class="cns-flag">no activó</span> se registró y nunca entró.</div>'
      + '</div>';
  }

  var COLS = [
    {k:'nombre',   t:'Alumno', l:true},
    {k:'ultima',   t:'Última vez'},
    {k:'registro', t:'Registrado'},
    {k:'preg',     t:'Preguntas'},
    {k:'mods',     t:'Módulos', l:true, nosort:true},
    {k:'dias_activos', t:'Días act.'},
    {k:'topes',    t:'Topó'}
  ];

  function filasAlumnos(){
    var q = (document.getElementById('cns-search') || {value:''}).value.toLowerCase().trim();
    var items = alumnos().map(function(a){
      return {
        a: a, nombre: a.nombre || '', email: a.email || '',
        ultima: ultimaVez(a) || '', registro: a.registro || '',
        preg: pregPeriodo(a), dias_activos: a.dias_activos || 0, topes: a.topes || 0
      };
    });
    if(q) items = items.filter(function(it){
      return (it.nombre + ' ' + it.email).toLowerCase().indexOf(q) !== -1;
    });
    items.sort(function(x, y){
      var va = x[ordCol], vb = y[ordCol];
      if(typeof va === 'string' || typeof vb === 'string'){
        va = String(va); vb = String(vb);
        return va < vb ? -ordDir : (va > vb ? ordDir : 0);
      }
      return (va - vb) * ordDir;
    });
    return items;
  }

  function wireTabla(){
    var cont = document.getElementById('cns-tabla');
    var sb = document.getElementById('cns-search');
    if(sb) sb.addEventListener('input', pintarTabla);
    pintarTabla();
    function pintarTabla(){
      if(!cont) return;
      var items = filasAlumnos();
      var head = '<tr>' + COLS.map(function(c){
        var arrow = (c.k === ordCol) ? (ordDir === 1 ? ' ▲' : ' ▼') : '';
        return '<th class="' + (c.l ? 'l' : '') + '" data-k="' + c.k + '">' + c.t + arrow + '</th>';
      }).join('') + '</tr>';
      var rows = items.map(function(it){
        var a = it.a;
        var chips = Object.keys(a.mods || {}).sort(function(m, n){ return a.mods[n] - a.mods[m]; })
          .map(function(m){ return '<span class="cns-chip">' + (MODS[m] || m) + ' ' + a.mods[m] + '</span>'; }).join('') || '—';
        var avisos = '';
        if(!it.ultima) avisos += '<span class="cns-flag">no activó</span>';
        else if((a.preguntas||0) > 0 && a.dias_desde_ultima != null && a.dias_desde_ultima > 14) avisos += '<span class="cns-flag">se enfrió</span>';
        var cls = it.preg > 0 ? '' : ' class="cns-zero"';
        return '<tr' + cls + '>'
          + '<td class="l"><div class="cns-name">' + esc(it.nombre) + avisos + '</div><div class="cns-mail">' + esc(it.email) + '</div></td>'
          + '<td>' + relDias(it.ultima || null) + '</td>'
          + '<td>' + fday(it.registro || null) + '</td>'
          + '<td>' + it.preg + '</td>'
          + '<td class="l">' + chips + '</td>'
          + '<td>' + it.dias_activos + '</td>'
          + '<td>' + (it.topes || '—') + '</td>'
        + '</tr>';
      }).join('');
      if(!items.length) rows = '<tr><td class="cns-no" colspan="7">No hay alumnos que coincidan.</td></tr>';
      cont.innerHTML = head + rows;
      cont.querySelectorAll('th').forEach(function(th){
        th.addEventListener('click', function(){
          var k = th.dataset.k;
          if(!k || k === 'mods') return;
          if(k === ordCol){ ordDir = -ordDir; } else { ordCol = k; ordDir = (k === 'nombre') ? 1 : -1; }
          pintarTabla();
        });
      });
    }
  }

  function vModulos(){
    var l = alumnos();
    var tot = {};   // modulo -> {n, alumnos}
    l.forEach(function(a){
      for(var m in (a.mods || {})){
        tot[m] = tot[m] || {n:0, al:0};
        tot[m].n += a.mods[m]; tot[m].al++;
      }
    });
    var claves = Object.keys(tot).sort(function(x, y){ return tot[y].n - tot[x].n; });
    var suma = 0; claves.forEach(function(k){ suma += tot[k].n; });

    var h = '<div class="cns-sec">Qué módulo se usa de verdad</div><div class="cns-box">';
    if(!claves.length){
      h += '<div class="cns-no">Todavía no hay datos: el servidor empezó a anotar el módulo de cada pregunta el '
        + fday(DESDE_MODS) + '. En unos días esta tabla se llena sola.</div>';
    } else {
      h += '<div class="cns-tw"><table><tr><th class="l">Módulo</th><th>Preguntas</th><th>Alumnos distintos</th><th>Preg./alumno</th></tr>'
        + claves.map(function(k){
            var t = tot[k];
            return '<tr><td class="l"><span class="cns-name">' + (MODS[k] || k) + '</span></td>'
              + '<td>' + t.n + '</td><td>' + t.al + '</td><td>' + (t.al ? (t.n/t.al).toFixed(1) : '—') + '</td></tr>';
          }).join('') + '</table></div>';
      h += '<div style="margin-top:10px;">' + claves.map(function(k){
        return barra(MODS[k] || k, suma ? 100*tot[k].n/suma : 0, tot[k].n + ' · ' + (suma ? Math.round(100*tot[k].n/suma) : 0) + '%');
      }).join('') + '</div>';
    }
    h += '<div class="cns-pq"><span class="t">Para qué sirve</span>'
      + '<b>Preguntas</b>: qué módulo sostiene la plataforma. <b>Alumnos distintos</b>: si el uso es de muchos o de tres fanáticos. '
      + '<b>Preg./alumno</b>: profundidad — alta es herramienta diaria, baja es que lo probaron y no volvieron. '
      + 'Se cuenta desde el ' + fday(DESDE_MODS) + '.</div></div>';

    // Reparto historico por fuente del log (corpus/youtube), disponible desde antes
    if(LOG && LOG.por_fuente){
      var fk = Object.keys(LOG.por_fuente).sort(function(x, y){ return LOG.por_fuente[y].n - LOG.por_fuente[x].n; });
      var fs = 0; fk.forEach(function(k){ fs += LOG.por_fuente[k].n; });
      h += '<div class="cns-sec">Histórico del log (desde jul 2026)</div><div class="cns-box">'
        + fk.map(function(k){
            var t = LOG.por_fuente[k];
            return barra((FUENTES[k] || k), fs ? 100*t.n/fs : 0,
              t.n + ' · US$ ' + (t.costo || 0).toFixed(2), k !== 'corpus');
          }).join('')
        + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
        + 'El log guarda cada respuesta con su costo real en dólares. Aquí se ve qué parte del gasto de IA se lleva cada tipo de búsqueda.</div></div>';
    }
    return h;
  }

  function vTemas(){
    if(!LOG || !LOG.n_total){
      return '<div class="cns-box"><div class="cns-no">El log de consultas aún no tiene datos.</div></div>';
    }
    var h = '<div class="cns-sec">Preguntas que salieron flojas (las más recientes)</div><div class="cns-box">';
    if(LOG.flojas && LOG.flojas.length){
      h += '<ul class="cns-lista">' + LOG.flojas.map(function(f){
        return '<li>"' + esc(f.query) + '" <span>· ' + fday(f.fecha) + ' · '
          + (f.top_score != null ? 'respaldo ' + f.top_score : 'sin material') + '</span></li>';
      }).join('') + '</ul>';
    } else {
      h += '<div class="cns-no">Ninguna floja registrada. Buen respaldo en todas.</div>';
    }
    h += '<div class="cns-pq"><span class="t">Para qué sirve</span>'
      + 'Cada línea es un hueco en tu material: el alumno preguntó y el sistema no encontró buen respaldo (puntaje &lt; '
      + (LOG.umbral_flojo || 0.35) + '). Sube ese contenido y el asistente pasa de "no encontré" a responder. '
      + 'Es la lista de tareas más rentable del tablero, y también tu estudio de mercado: dice qué curso lanzar después.</div></div>';

    // Gasto por dia: solo desde que el medidor de costo existe. Antes de esa
    // fecha el log anotaba la pregunta pero no el gasto, y mezclar filas con
    // US$ 0.00 "falso" confundia la lectura.
    var todasF = Object.keys(LOG.por_dia || {}).sort();
    var primeraConCosto = null;
    todasF.forEach(function(f){ if(primeraConCosto === null && LOG.por_dia[f].costo > 0) primeraConCosto = f; });
    var fechas = primeraConCosto === null ? []
      : todasF.filter(function(f){ return f >= primeraConCosto; }).slice(-30);
    if(fechas.length){
      var mx = 0.01, omitidas = 0;
      todasF.forEach(function(f){ if(primeraConCosto && f < primeraConCosto) omitidas++; });
      fechas.forEach(function(f){ if(LOG.por_dia[f].costo > mx) mx = LOG.por_dia[f].costo; });
      h += '<div class="cns-sec">Gasto diario en IA (US$)</div><div class="cns-box">'
        + '<div style="color:#8aa;font-size:.73rem;margin-bottom:8px;">Cada fila es un día con actividad. '
        + '<b style="color:#dde;">El largo de la barra es el gasto en dólares</b>; al lado, el gasto exacto y cuántas respuestas lo generaron.</div>'
        + fechas.map(function(f){
            var d = LOG.por_dia[f];
            return barra(fday(f), 100*d.costo/mx, 'US$ ' + d.costo.toFixed(2) + ' · ' + d.n + ' resp.', true);
          }).join('')
        + '<div class="cns-pq"><span class="t">Para qué sirve</span>'
        + 'El gasto real día a día: si un día se dispara sin que suban las respuestas, algo anda mal (respuestas muy largas o abuso). '
        + 'Se muestra desde el ' + fday(primeraConCosto) + ', cuando se instaló el medidor de costo'
        + (omitidas ? ' — los ' + omitidas + ' días anteriores tenían preguntas pero sin gasto anotado, por eso no salen' : '')
        + '. Y recuerda: NFPA y FM anotan su gasto recién desde el ' + fday(DESDE_MODS) + '.</div></div>';
    }
    return h;
  }

  /* ── excel ───────────────────────────────────────────────── */
  function exportar(){
    if(!USO || typeof ILFISExcel === 'undefined'){ alert('Aún no hay datos cargados.'); return; }
    var items = filasAlumnos();
    var cab = ['Alumno','Correo','Última vez','Registrado','Preguntas (periodo)','Preguntas (total)','Días activos','Días al tope','Módulos'];
    var filas = items.map(function(it){
      var a = it.a;
      var mods = Object.keys(a.mods || {}).map(function(m){ return (MODS[m]||m) + ' ' + a.mods[m]; }).join(', ');
      return [it.nombre, it.email, it.ultima ? fday(it.ultima) : 'nunca entró', fday(it.registro || null),
              it.preg, a.preguntas || 0, it.dias_activos, it.topes, mods];
    });
    ILFISExcel.bajar({ archivo: 'consumo_alumnos', hojas: [{ nombre: 'Consumo', cabeceras: cab, filas: filas }] });
  }

  /* ── enganche al panel ───────────────────────────────────── */
  function hook(){
    if(typeof window.adminShowTab === 'function' && !window.adminShowTab._cnsWrapped){
      var orig = window.adminShowTab;
      window.adminShowTab = function(name, btn){
        var r = orig.apply(this, arguments);
        if(name === 'consumo') cargar(false);
        return r;
      };
      window.adminShowTab._cnsWrapped = true;
    }
  }

  function init(){ inyectar(); hook(); }

  var intentos = 0;
  var iv = setInterval(function(){
    intentos++;
    if(document.querySelector('.admin-tabs') && document.getElementById('admin-sec-alumnos')) init();
    if(document.getElementById('admin-sec-consumo') || intentos > 40) clearInterval(iv);
  }, 500);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
