/* ADMIN FEEDBACK VIEWER - ILFIS
   Agrega la sub-pestana "Opiniones" al panel Admin del index.html.
   Aditivo: no modifica el codigo existente. Reusa la clave admin (ilfis_admin_key)
   y la constante API. Para quitarlo: borrar la linea <script src="feedback-admin.js">. */
(function(){
  if (typeof API === 'undefined') return;
  var LS = 'ilfis_admin_key';
  var DATOS = [], filtro = 'todos', cargadoUna = false;

  var CSS = ''
    + '#admin-sec-feedback .fbv-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;}'
    + '#admin-sec-feedback .fbv-title{color:#fff;font-size:1.05rem;font-weight:bold;}'
    + '#admin-sec-feedback .fbv-reload{background:#0f3460;color:#dde;border:1px solid #2a2a5a;border-radius:8px;padding:8px 14px;cursor:pointer;}'
    + '#admin-sec-feedback .fbv-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;}'
    + '#admin-sec-feedback .fbv-stat{background:#0f1830;border:1px solid #2a2a5a;border-radius:10px;padding:10px 14px;min-width:84px;}'
    + '#admin-sec-feedback .fbv-stat .n{color:#fff;font-size:20px;font-weight:bold;}'
    + '#admin-sec-feedback .fbv-stat .l{color:#8aa;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}'
    + '#admin-sec-feedback .fbv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;}'
    + '#admin-sec-feedback .fbv-chip{background:#0f3460;color:#cdd;border:1px solid #2a2a5a;border-radius:16px;padding:6px 12px;cursor:pointer;font-size:0.85rem;}'
    + '#admin-sec-feedback .fbv-chip.sel{background:#c0392b;border-color:#c0392b;color:#fff;}'
    + '#admin-sec-feedback .fbv-search{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;border:1px solid #2a2a5a;background:#0f1830;color:#dde;}'
    + '#admin-sec-feedback .fbv-card{background:#16213e;border:1px solid #2a2a5a;border-left:4px solid #2a2a5a;border-radius:0 10px 10px 0;padding:14px;margin-bottom:10px;}'
    + '#admin-sec-feedback .fbv-card.up{border-left-color:#5dcc85;}'
    + '#admin-sec-feedback .fbv-card.down{border-left-color:#c0392b;}'
    + '#admin-sec-feedback .fbv-card.rep{border-left-color:#e6a23c;}'
    + '#admin-sec-feedback .fbv-row1{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:0.8rem;color:#8aa;margin-bottom:8px;}'
    + '#admin-sec-feedback .fbv-badge{background:#0f3460;border-radius:6px;padding:2px 8px;color:#cdd;}'
    + '#admin-sec-feedback .fbv-coment{color:#fff;font-size:1rem;line-height:1.5;white-space:pre-wrap;}'
    + '#admin-sec-feedback .fbv-no{color:#8aa;font-style:italic;}'
    + '#admin-sec-feedback details{margin-top:8px;}'
    + '#admin-sec-feedback summary{cursor:pointer;color:#9db4ff;font-size:0.85rem;}'
    + '#admin-sec-feedback .fbv-qa{margin-top:8px;font-size:0.88rem;color:#cdd;}'
    + '#admin-sec-feedback .fbv-qa b{color:#fff;}'
    + '#admin-sec-feedback .fbv-qa div{margin-bottom:8px;white-space:pre-wrap;}';

  function inyectarCSS(){
    if(document.getElementById('fbv-css')) return;
    var st = document.createElement('style');
    st.id = 'fbv-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s){ return (s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function fmt(iso){ if(!iso) return 'fecha desconocida'; try{ return new Date(iso).toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return iso; } }
  function stat(n,l){ return '<div class="fbv-stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }

  function inyectar(){
    var tabs = document.querySelector('.admin-tabs');
    var ref  = document.getElementById('admin-sec-alumnos');
    if(!tabs || !ref || document.getElementById('admin-sec-feedback')) return;
    inyectarCSS();

    var btn = document.createElement('button');
    btn.className = 'admin-tab'; btn.type = 'button'; btn.textContent = 'Opiniones';
    btn.setAttribute('onclick', "adminShowTab('feedback', this)");
    tabs.appendChild(btn);

    var sec = document.createElement('div');
    sec.className = 'admin-section'; sec.id = 'admin-sec-feedback';
    sec.innerHTML =
      '<div class="fbv-head"><div class="fbv-title">Opiniones de los usuarios</div>'
      + '<button type="button" class="fbv-reload">Recargar</button></div>'
      + '<div class="fbv-stats" id="fbv-stats"></div>'
      + '<div class="fbv-bar">'
        + '<span class="fbv-chip sel" data-f="todos">Todos</span>'
        + '<span class="fbv-chip" data-f="coment">Con comentario</span>'
        + '<span class="fbv-chip" data-f="down">Le falta</span>'
        + '<span class="fbv-chip" data-f="up">Me sirvio</span>'
        + '<span class="fbv-chip" data-f="rep">Reportes</span>'
        + '<input type="text" class="fbv-search" id="fbv-search" placeholder="Buscar en comentarios, preguntas, correo...">'
      + '</div><div id="fbv-lista"></div>';
    ref.insertAdjacentElement('afterend', sec);

    sec.querySelector('.fbv-reload').addEventListener('click', cargar);
    sec.querySelector('#fbv-search').addEventListener('input', render);
    var chips = sec.querySelectorAll('.fbv-chip');
    chips.forEach(function(c){ c.addEventListener('click', function(){
      chips.forEach(function(x){ x.classList.remove('sel'); });
      c.classList.add('sel'); filtro = c.dataset.f; render();
    }); });
  }

  function cargar(){
    var key = (localStorage.getItem(LS) || '').trim();
    var lista = document.getElementById('fbv-lista');
    if(!key){ if(lista) lista.innerHTML = '<div class="fbv-no">Entra primero con tu clave de administracion.</div>'; return; }
    if(lista) lista.innerHTML = '<div class="fbv-no">Cargando...</div>';
    fetch(API + '/admin/feedback?limite=500', { headers: { 'x-admin-key': key } })
      .then(function(r){
        if(!r.ok){ if(lista) lista.innerHTML = '<div class="fbv-no">No se pudo cargar (' + r.status + ').</div>'; return null; }
        return r.json();
      })
      .then(function(data){
        if(!data) return;
        DATOS = data.feedback || []; cargadoUna = true; render();
      })
      .catch(function(){ if(lista) lista.innerHTML = '<div class="fbv-no">Error de conexion.</div>'; });
  }

  function pasa(it){
    if(filtro === 'coment') return (it.comentario||'').trim().length > 0;
    if(filtro === 'down')   return it.util === false;
    if(filtro === 'up')     return it.util === true;
    if(filtro === 'rep')    return it.tipo === 'reporte_general';
    return true;
  }

  function render(){
    var cont = document.getElementById('fbv-lista'); if(!cont) return;
    var st = document.getElementById('fbv-stats');
    if(st) st.innerHTML =
      stat(DATOS.length,'Total')
      + stat(DATOS.filter(function(d){return d.util===true;}).length,'Sirvio')
      + stat(DATOS.filter(function(d){return d.util===false;}).length,'Le falta')
      + stat(DATOS.filter(function(d){return (d.comentario||'').trim();}).length,'Comentario')
      + stat(DATOS.filter(function(d){return d.tipo==='reporte_general';}).length,'Reportes');
    var sb = document.getElementById('fbv-search');
    var q = (sb ? sb.value : '').toLowerCase().trim();
    var items = DATOS.filter(pasa);
    if(q) items = items.filter(function(it){
      return ((it.comentario||'')+' '+(it.pregunta||'')+' '+(it.respuesta||'')+' '+(it.email||'')).toLowerCase().indexOf(q) !== -1;
    });
    if(!items.length){ cont.innerHTML = '<div class="fbv-no">No hay aportes que coincidan.</div>'; return; }
    cont.innerHTML = items.map(tarjeta).join('');
  }

  function tarjeta(it){
    var cls = 'fbv-card', voto = '<span>- sin voto</span>';
    if(it.tipo === 'reporte_general'){ cls += ' rep'; voto = '<span style="color:#e6a23c;font-weight:bold;">reporte</span>'; }
    else if(it.util === true){ cls += ' up'; voto = '<span style="color:#5dcc85;font-weight:bold;">Me sirvio</span>'; }
    else if(it.util === false){ cls += ' down'; voto = '<span style="color:#ff8a80;font-weight:bold;">Le falta</span>'; }
    var zona  = it.zona  ? '<span class="fbv-badge">'+esc(it.zona)+'</span>' : '';
    var quien = it.email ? '<span>'+esc(it.email)+'</span>' : '';
    var com = (it.comentario||'').trim()
      ? '<div class="fbv-coment">'+esc(it.comentario)+'</div>'
      : '<div class="fbv-no">(sin comentario)</div>';
    var qa = '';
    if((it.pregunta||'').trim() || (it.respuesta||'').trim()){
      qa = '<details><summary>Ver pregunta y respuesta</summary><div class="fbv-qa">'
         + (it.pregunta  ? '<div><b>Pregunta:</b> '+esc(it.pregunta)+'</div>'  : '')
         + (it.respuesta ? '<div><b>Respuesta:</b> '+esc(it.respuesta)+'</div>' : '')
         + '</div></details>';
    }
    return '<div class="'+cls+'"><div class="fbv-row1">'+voto+zona+'<span>'+fmt(it.timestamp)+'</span>'+quien+'</div>'+com+qa+'</div>';
  }

  function hook(){
    if(typeof window.adminShowTab === 'function' && !window.adminShowTab._fbvWrapped){
      var orig = window.adminShowTab;
      window.adminShowTab = function(name, btn){
        var r = orig.apply(this, arguments);
        if(name === 'feedback' && !cargadoUna) cargar();
        return r;
      };
      window.adminShowTab._fbvWrapped = true;
    }
  }

  function init(){ inyectar(); hook(); }

  var intentos = 0;
  var iv = setInterval(function(){
    intentos++;
    if(document.querySelector('.admin-tabs') && document.getElementById('admin-sec-alumnos')) init();
    if(document.getElementById('admin-sec-feedback') || intentos > 40) clearInterval(iv);
  }, 500);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
