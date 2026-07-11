/* ADMIN CONSUMO VIEWER - ILFIS
   Agrega la sub-pestana "Consumo" al panel Admin del index.html.
   Aditivo: no modifica el codigo existente. Reusa la clave admin (ilfis_admin_key)
   y la constante API. Lee /admin/uso (solo lectura).
   Para quitarlo: borrar la linea <script src="consumo-admin.js">. */
(function(){
  if (typeof API === 'undefined') return;
  var LS = 'ilfis_admin_key';
  var DATOS = [], RESUMEN = {}, cargadoUna = false;
  var ordCol = 'preguntas', ordDir = -1;  // -1 desc, 1 asc

  var CSS = ''
    + '#admin-sec-consumo .cns-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;}'
    + '#admin-sec-consumo .cns-title{color:#fff;font-size:1.05rem;font-weight:bold;}'
    + '#admin-sec-consumo .cns-reload{background:#0f3460;color:#dde;border:1px solid #2a2a5a;border-radius:8px;padding:8px 14px;cursor:pointer;}'
    + '#admin-sec-consumo .cns-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;}'
    + '#admin-sec-consumo .cns-stat{background:#0f1830;border:1px solid #2a2a5a;border-radius:10px;padding:10px 14px;min-width:90px;}'
    + '#admin-sec-consumo .cns-stat .n{color:#fff;font-size:20px;font-weight:bold;}'
    + '#admin-sec-consumo .cns-stat .l{color:#8aa;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}'
    + '#admin-sec-consumo .cns-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;}'
    + '#admin-sec-consumo .cns-search{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;border:1px solid #2a2a5a;background:#0f1830;color:#dde;}'
    + '#admin-sec-consumo .cns-note{color:#8aa;font-size:12px;margin-bottom:10px;}'
    + '#admin-sec-consumo .cns-tablewrap{overflow-x:auto;}'
    + '#admin-sec-consumo table{width:100%;border-collapse:collapse;font-size:0.88rem;}'
    + '#admin-sec-consumo th{color:#9db4ff;text-align:right;padding:8px 10px;border-bottom:1px solid #2a2a5a;cursor:pointer;white-space:nowrap;}'
    + '#admin-sec-consumo th.l,#admin-sec-consumo td.l{text-align:left;}'
    + '#admin-sec-consumo td{color:#dde;text-align:right;padding:8px 10px;border-bottom:1px solid #1c2540;white-space:nowrap;}'
    + '#admin-sec-consumo tr:hover td{background:#16213e;}'
    + '#admin-sec-consumo .cns-name{color:#fff;}'
    + '#admin-sec-consumo .cns-mail{color:#8aa;font-size:0.78rem;}'
    + '#admin-sec-consumo .cns-zero td{opacity:.5;}'
    + '#admin-sec-consumo .cns-no{color:#8aa;font-style:italic;padding:14px;}';

  function inyectarCSS(){
    if(document.getElementById('cns-css')) return;
    var st = document.createElement('style');
    st.id = 'cns-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s){ return (s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function fday(f){ if(!f) return '—'; var p=String(f).split('-'); return p.length===3 ? (p[2]+'/'+p[1]+'/'+p[0].slice(2)) : f; }
  function stat(n,l){ return '<div class="cns-stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }

  function inyectar(){
    // Preferir el area "General" del panel; si no existe, caer al contenedor plano (nunca desaparece).
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
      '<div class="cns-head"><div class="cns-title">Consumo del asistente por alumno</div>'
      + '<button type="button" class="cns-reload">Recargar</button></div>'
      + '<div class="cns-stats" id="cns-stats"></div>'
      + '<div class="cns-note" id="cns-note"></div>'
      + '<div class="cns-bar"><input type="text" class="cns-search" id="cns-search" placeholder="Buscar por nombre o correo..."></div>'
      + '<div class="cns-tablewrap"><table id="cns-tabla"></table></div>';
    ref.parentNode.appendChild(sec);

    sec.querySelector('.cns-reload').addEventListener('click', cargar);
    sec.querySelector('#cns-search').addEventListener('input', render);
  }

  function cargar(){
    var key = (localStorage.getItem(LS) || '').trim();
    var cont = document.getElementById('cns-tabla');
    if(!key){ if(cont) cont.innerHTML = '<tr><td class="cns-no">Entra primero con tu clave de administracion.</td></tr>'; return; }
    if(cont) cont.innerHTML = '<tr><td class="cns-no">Cargando...</td></tr>';
    fetch(API + '/admin/uso', { headers: { 'x-admin-key': key } })
      .then(function(r){
        if(!r.ok){ if(cont) cont.innerHTML = '<tr><td class="cns-no">No se pudo cargar (' + r.status + ').</td></tr>'; return null; }
        return r.json();
      })
      .then(function(data){
        if(!data) return;
        DATOS = data.alumnos || []; RESUMEN = data.resumen || {}; cargadoUna = true; render();
      })
      .catch(function(){ if(cont) cont.innerHTML = '<tr><td class="cns-no">Error de conexion.</td></tr>'; });
  }

  var COLS = [
    {k:'nombre',            t:'Alumno',          l:true},
    {k:'preguntas',         t:'Preguntas'},
    {k:'inicio',            t:'Inicio'},
    {k:'fin',               t:'Fin'},
    {k:'dias_activos',      t:'Días activos'},
    {k:'prom_dia_activo',   t:'Prom/día activo'},
    {k:'prom_total',        t:'Prom/total'},
    {k:'dias_desde_ultima', t:'Días sin entrar'}
  ];

  function render(){
    var st = document.getElementById('cns-stats');
    if(st) st.innerHTML =
      stat(RESUMEN.alumnos_total||0,'Alumnos')
      + stat(RESUMEN.alumnos_activos||0,'Activos')
      + stat(RESUMEN.total_preguntas||0,'Preguntas')
      + stat((RESUMEN.prom_por_activo!=null?RESUMEN.prom_por_activo:0),'Prom/activo');
    var note = document.getElementById('cns-note');
    if(note) note.textContent = 'El conteo de preguntas se detiene en ' + (RESUMEN.tope_diario||5) + ' por alumno y por día (tope diario del sistema).';

    var cont = document.getElementById('cns-tabla'); if(!cont) return;
    var sb = document.getElementById('cns-search');
    var q = (sb ? sb.value : '').toLowerCase().trim();
    var items = DATOS.slice();
    if(q) items = items.filter(function(it){
      return ((it.nombre||'')+' '+(it.email||'')).toLowerCase().indexOf(q) !== -1;
    });
    items.sort(function(a,b){
      var va=a[ordCol], vb=b[ordCol];
      if(va==null) va = (ordDir===1) ? Infinity : -Infinity;
      if(vb==null) vb = (ordDir===1) ? Infinity : -Infinity;
      if(typeof va==='string' || typeof vb==='string'){ va=''+va; vb=''+vb; return va<vb?-ordDir:(va>vb?ordDir:0); }
      return (va-vb)*ordDir;
    });

    var head = '<tr>' + COLS.map(function(c){
      var arrow = (c.k===ordCol) ? (ordDir===1?' ▲':' ▼') : '';
      return '<th class="'+(c.l?'l':'')+'" data-k="'+c.k+'">'+c.t+arrow+'</th>';
    }).join('') + '</tr>';
    var rows = items.map(function(it){
      var cls = (it.preguntas>0) ? '' : ' class="cns-zero"';
      return '<tr'+cls+'>'
        + '<td class="l"><div class="cns-name">'+esc(it.nombre)+'</div><div class="cns-mail">'+esc(it.email)+'</div></td>'
        + '<td>'+(it.preguntas||0)+'</td>'
        + '<td>'+fday(it.inicio)+'</td>'
        + '<td>'+fday(it.fin)+'</td>'
        + '<td>'+(it.dias_activos||0)+'</td>'
        + '<td>'+(it.prom_dia_activo!=null?it.prom_dia_activo:0)+'</td>'
        + '<td>'+(it.prom_total!=null?it.prom_total:0)+'</td>'
        + '<td>'+(it.dias_desde_ultima!=null?it.dias_desde_ultima:'—')+'</td>'
      + '</tr>';
    }).join('');
    if(!items.length) rows = '<tr><td class="cns-no" colspan="8">No hay alumnos que coincidan.</td></tr>';
    cont.innerHTML = head + rows;

    var ths = cont.querySelectorAll('th');
    ths.forEach(function(th){ th.addEventListener('click', function(){
      var k = th.dataset.k;
      if(k===ordCol){ ordDir = -ordDir; } else { ordCol = k; ordDir = (k==='nombre')?1:-1; }
      render();
    }); });
  }

  function hook(){
    if(typeof window.adminShowTab === 'function' && !window.adminShowTab._cnsWrapped){
      var orig = window.adminShowTab;
      window.adminShowTab = function(name, btn){
        var r = orig.apply(this, arguments);
        if(name === 'consumo' && !cargadoUna) cargar();
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
