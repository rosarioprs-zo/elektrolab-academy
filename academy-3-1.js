/* ElektroLab Academy 3.1: navigation, progressive lessons and interactive SVG circuit workshop.
 * Deliberately additive: does not replace 3.0 lessons or their built-in calculations.
 */
(function () {
  'use strict';
  var openTopics = new Map();
  var studio = { mode: 'series', U: 12, R: [100, 220, 330] };
  var mounted = false;
  var lastLocale = null;
  var text = {
    de: {
      go: 'Weiterlernen', goDesc: 'Direkt zur nächsten offenen Lektion', lab: 'Schaltungen verstehen', labDesc: 'Widerstände zeichnen, Werte ändern, Lösungen prüfen', trainer: 'Formeln sicher anwenden', trainerDesc: 'P · U · R · I mit Rechenweg', learning: 'Dein Lernbereich', topics: 'Lernmodule', progress: 'abgeschlossen', search: 'Module suchen …', searchN: 'sichtbare Module', show: 'Öffnen', hide: 'Schließen', lineA: '1. Verstehen', lineB: '2. Rechnen', lineC: '3. Überprüfen', diagram: 'Schematische Beispielschaltung (maßstabsfrei)', original: 'Ursprüngliche Unterrichtsskizze anzeigen', studio: 'Interaktive Widerstandswerkstatt', studioDesc: 'Wähle die Schaltung, ändere die Werte und sieh den vollständigen Rechenweg.', series: 'Reihe', parallel: 'Parallel', mixed: 'Gemischt', mixDesc: 'R1 in Reihe mit R2 bis Rn parallel', plus: '+ Widerstand', minus: '− Widerstand', voltage: 'Quellenspannung U', resistance: 'Widerstand', totalR: 'Ersatzwiderstand', totalI: 'Gesamtstrom', totalP: 'Gesamtleistung', valueError: 'Bitte gib eine positive Spannung und Widerstände größer als 0 Ω ein.', path: 'Rechenweg Schritt für Schritt', given: 'Gegeben', parts: 'Werte an den Widerständen', current: 'Strom I', power: 'Leistung P', steps: 'Lösungsweg', showStudio: 'Widerstände selbst ausprobieren', hideStudio: 'Werkstatt ausblenden', zoom: 'Schaltbild vergrößern', close: 'Schließen'
    },
    it: {
      go: 'Continua a studiare', goDesc: 'Apri direttamente la prossima lezione', lab: 'Capire i circuiti', labDesc: 'Disegna resistenze, modifica valori, controlla i risultati', trainer: 'Allenamento formule', trainerDesc: 'P · U · R · I con tutti i passaggi', learning: 'Il tuo percorso', topics: 'Moduli del corso', progress: 'completati', search: 'Cerca un modulo …', searchN: 'moduli visibili', show: 'Apri', hide: 'Chiudi', lineA: '1. Capire', lineB: '2. Calcolare', lineC: '3. Controllare', diagram: 'Schema elettrico di esempio (non in scala)', original: 'Mostra lo schema originale della lezione', studio: 'Laboratorio interattivo di resistenze', studioDesc: 'Scegli il circuito, cambia i valori e osserva il procedimento completo.', series: 'Serie', parallel: 'Parallelo', mixed: 'Misto', mixDesc: 'R1 in serie al parallelo R2 fino a Rn', plus: '+ Resistenza', minus: '− Resistenza', voltage: 'Tensione U', resistance: 'Resistenza', totalR: 'Resistenza equivalente', totalI: 'Corrente totale', totalP: 'Potenza totale', valueError: 'Inserisci una tensione positiva e resistenze superiori a 0 Ω.', path: 'Procedimento passo dopo passo', given: 'Dati', parts: 'Valori su ogni resistenza', current: 'Corrente I', power: 'Potenza P', steps: 'Soluzione', showStudio: 'Prova a modificare le resistenze', hideStudio: 'Chiudi il laboratorio', zoom: 'Ingrandisci lo schema', close: 'Chiudi'
    }
  };
  function locale() { return (typeof lang !== 'undefined' && lang === 'it') ? 'it' : 'de'; }
  function tr(k) { return text[locale()][k] || k; }
  function el(id) { return document.getElementById(id); }
  function activeModule() { return (typeof active !== 'undefined') ? active : 1; }
  function course() { return (typeof data !== 'undefined') ? data : null; }
  function fnum(n, precision) {
    return Number(n).toLocaleString(locale() === 'it' ? 'it-IT' : 'de-DE', { maximumFractionDigits: precision === undefined ? 4 : precision });
  }
  function unit(n, what) {
    if (!Number.isFinite(n)) return '—';
    if (what === 'ohm') return Math.abs(n) >= 1000 ? fnum(n / 1000) + ' kΩ' : fnum(n) + ' Ω';
    if (what === 'ampere') return Math.abs(n) < 0.1 && n !== 0 ? fnum(n * 1000) + ' mA' : fnum(n) + ' A';
    if (what === 'volt') return fnum(n) + ' V';
    return fnum(n) + ' W';
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
  function completedIds() { try { return JSON.parse(localStorage.getItem('el-done') || '[]'); } catch (_) { return []; } }
  function svgWire(x1, y1, x2, y2) { return '<line class="elwire" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>'; }
  function svgDot(x, y) { return '<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="#137b80"/>'; }
  function svgRes(x, y, label, vertical) {
    return vertical ? '<rect class="elres" x="'+(x-23)+'" y="'+(y-34)+'" width="46" height="68" rx="5"/><text class="elreslabel" x="'+x+'" y="'+(y+5)+'" text-anchor="middle">'+label+'</text>' :
      '<rect class="elres" x="'+(x-30)+'" y="'+(y-19)+'" width="60" height="38" rx="5"/><text class="elreslabel" x="'+x+'" y="'+(y+6)+'" text-anchor="middle">'+label+'</text>';
  }
  function svgPower(U) {
    return svgWire(65, 75, 65, 143) + '<circle cx="65" cy="174" r="31" fill="#fff" stroke="#1d566c" stroke-width="3"/>'+
      '<text x="65" y="168" text-anchor="middle" font-size="19" fill="#157a78">+</text><text x="65" y="191" text-anchor="middle" font-size="19" fill="#157a78">−</text>'+
      svgWire(65, 205, 65, 275) + '<text x="98" y="183" font-size="16" fill="#335a70">'+escapeHtml(U == null ? 'U' : unit(U, 'volt'))+'</text>';
  }
  function vectorDiagram(kind, resistors, voltage) {
    var r = resistors || [100, 220], n = Math.max(2, r.length), a = svgPower(voltage), i, x, dx;
    if (kind === 'series') {
      var centers=[];
      for (i=0;i<n;i++) centers.push(175 + i * (430 / (n-1)));
      a += svgWire(65,75,centers[0]-30,75);
      for (i=0;i<n;i++) {
        x=centers[i]; a+=svgRes(x,75,'R'+(i+1),false);
        a+=svgWire(x+30,75,i+1<n?centers[i+1]-30:645,75);
      }
      a+=svgWire(645,75,645,275)+svgWire(645,275,65,275);
    } else if (kind === 'parallel') {
      a+=svgWire(65,75,645,75)+svgWire(645,275,65,275);
      for (i=0;i<n;i++) {
        x=150+i*(445/(n-1)); a+=svgWire(x,75,x,142)+svgRes(x,176,'R'+(i+1),true)+svgWire(x,210,x,275)+svgDot(x,75)+svgDot(x,275);
      }
    } else if (kind === 'divider') {
      a+=svgWire(65,75,435,75)+svgWire(435,75,435,116)+svgRes(435,148,'R1',true)+svgWire(435,182,435,204)+svgRes(435,238,'R2',true)+svgWire(435,272,435,275)+svgWire(435,275,65,275);
      a+=svgWire(435,193,572,193)+svgDot(435,193)+'<text x="578" y="197" fill="#245c94" font-size="18">Uaus</text>';
    } else { // mixed: R1 series with R2..Rn in parallel
      a+=svgWire(65,75,145,75)+svgRes(175,75,'R1',false)+svgWire(205,75,645,75)+svgWire(645,275,65,275);
      var count=n-1;
      for(i=0;i<count;i++){
        x=count===1?470:325+i*270/(count-1);a+=svgWire(x,75,x,142)+svgRes(x,176,'R'+(i+2),true)+svgWire(x,210,x,275)+svgDot(x,75)+svgDot(x,275);
      }
    }
    a+='<path d="M 210 35 H 330" stroke="#d85043" stroke-width="2.5" fill="none"/><path d="M 330 35 L 318 29 L 318 41 Z" fill="#d85043"/><text x="267" y="25" fill="#d85043" font-size="16" font-weight="bold">I</text>';
    return '<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+escapeHtml(kind)+'" style="font-family:system-ui,sans-serif"><style>.elwire{stroke:#157e85;stroke-width:4;stroke-linecap:round}.elres{fill:#d9ebf3;stroke:#20465d;stroke-width:3}.elreslabel{font:700 18px system-ui;fill:#15364b}</style><rect x="1" y="1" width="698" height="318" rx="12" fill="#f7fbfd"/>'+a+'</svg>';
  }
  function dashboard() {
    var d=course(); if (!d || !Array.isArray(d.modules)) return;
    var next=d.modules.find(function(m){return !completedIds().includes(m.id);}) || d.modules[0];
    var count=completedIds().filter(function(id){return d.modules.some(function(m){return m.id===id;});}).length;
    var block=el('el31Dashboard'); if (!block) return;
    block.innerHTML='<div class="el31-dashboard-head"><h2>'+tr('learning')+'</h2><small>'+count+' / '+d.modules.length+' '+tr('progress')+'</small></div>'+
      '<div class="el31-dashboard">'+
      '<button type="button" class="el31-card el31-card-main" data-go="next"><small>01 · '+tr('topics')+'</small><strong>'+tr('go')+': '+escapeHtml(next.title[locale()]||next.title.de)+'</strong><p>'+tr('goDesc')+'</p><div class="el31-progress"><span style="width:'+Math.round(100*count/d.modules.length)+'%"></span></div></button>'+
      '<button type="button" class="el31-card" data-go="lab"><small>02 · SVG</small><strong>'+tr('lab')+'</strong><p>'+tr('labDesc')+'</p></button>'+
      '<button type="button" class="el31-card" data-go="puri"><small>03 · P·U·R·I</small><strong>'+tr('trainer')+'</strong><p>'+tr('trainerDesc')+'</p></button></div>';
    block.querySelector('[data-go="next"]').onclick=function(){
      if(typeof active !== 'undefined') active=next.id;
      localStorage.setItem('el-active',String(next.id));
      if(!el('circuitHub').classList.contains('hidden'))el('circuitClose').click();
      if(typeof render==='function') render();
      el('lesson').scrollIntoView({behavior:'smooth',block:'start'});
    };
    block.querySelector('[data-go="lab"]').onclick=function(){el('circuitsBtn').click(); studioOpen(true);};
    block.querySelector('[data-go="puri"]').onclick=function(){el('puriBtn').click();el('puriPanel').scrollIntoView({behavior:'smooth',block:'start'});};
  }
  function prepareSearch(){
    var side=document.querySelector('.sidebar'); if(!side||el('el31Search'))return;
    var h=side.querySelector('h2');
    var input=document.createElement('input');input.id='el31Search';input.type='search';input.className='el31-section-search';input.setAttribute('aria-label',tr('search'));input.placeholder=tr('search');
    var hint=document.createElement('small');hint.id='el31SearchHint';hint.className='el31-search-info';
    h.after(input,hint);input.addEventListener('input',applySearch);
  }
  function applySearch(){
    var input=el('el31Search'),menu=el('menu');if(!input||!menu)return;
    var q=input.value.trim().toLocaleLowerCase(),visible=0;
    menu.querySelectorAll('button.item').forEach(function(b){var ok=b.textContent.toLocaleLowerCase().includes(q);b.hidden=!ok;if(ok)visible++;});
    var info=el('el31SearchHint');if(info)info.textContent=visible+' '+tr('searchN');
  }
  function buildTopics(){
    var area=el('lesson');if(!area)return;
    var id=activeModule(),set=openTopics.get(id);
    if(!set){set=new Set([0]);openTopics.set(id,set);}
    area.querySelectorAll('.topic-card').forEach(function(card,idx){
      if(card.classList.contains('el31-ready'))return;
      card.classList.add('el31-ready');card.id='sec-'+id+'-'+idx;
      var heading=card.querySelector('.topic-heading');if(!heading)return;
      var wrapper=document.createElement('div');wrapper.className='el31-topic-body';
      while(heading.nextSibling)wrapper.appendChild(heading.nextSibling);card.appendChild(wrapper);
      var b=document.createElement('button');b.type='button';b.className='el31-toggle';
      b.setAttribute('aria-controls',card.id+'-body');wrapper.id=card.id+'-body';
      heading.appendChild(b);
      function show(){var isOpen=set.has(idx);wrapper.hidden=!isOpen;b.textContent=isOpen?'− '+tr('hide'):'+ '+tr('show');b.setAttribute('aria-expanded',String(isOpen));}
      b.onclick=function(){if(set.has(idx))set.delete(idx);else set.add(idx);show();};show();
      var map={5:'series',6:'parallel',7:'mixed',8:'divider'};
      if(idx===0 && map[id]){
        var diagram=wrapper.querySelector('.diagram');
        if(diagram){
          var old=diagram.querySelector('pre');var original=old?old.textContent:'';
          var kind=map[id],svg=vectorDiagram(kind,[100,220,330],null);
          var figure=document.createElement('div');figure.className='el31-diagram';
          figure.innerHTML=svg+'<p class="el31-diagram-caption">'+tr('diagram')+'</p>';
          var details=document.createElement('details');details.className='el31-original';
          var summary=document.createElement('summary');summary.textContent=tr('original');
          var pre=document.createElement('pre');pre.textContent=original;
          details.append(summary,pre);figure.appendChild(details);diagram.replaceWith(figure);
        }
      }
    });
    if(!el('el31LearningLine')){
      var first=area.querySelector('.topic-card'),line=document.createElement('div');
      line.id='el31LearningLine';line.className='el31-learning-line';
      line.innerHTML='<strong>'+tr('lineA')+'</strong><span class="el31-arrow">›</span><strong>'+tr('lineB')+'</strong><span class="el31-arrow">›</span><strong>'+tr('lineC')+'</strong>';
      if(first)first.parentNode.insertBefore(line,first);
    }
    area.querySelectorAll('.topic-toc a[href^="#sec-"]').forEach(function(link){link.onclick=function(e){
      var target=el(link.getAttribute('href').slice(1));if(!target)return;
      e.preventDefault();var btn=target.querySelector('.el31-toggle');if(btn && btn.getAttribute('aria-expanded')==='false')btn.click();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    };});
  }
  function studioInit(){
    var hub=el('circuitHub');if(!hub||el('el31Studio'))return;
    var button=document.createElement('button');button.type='button';button.className='el31-open-studio';button.id='el31StudioButton';
    var studioEl=document.createElement('section');studioEl.id='el31Studio';studioEl.hidden=true;
    hub.insertBefore(button,el('circuitOverview'));
    hub.insertBefore(studioEl,el('circuitOverview'));
    button.onclick=function(){studioOpen(studioEl.hidden);};
    studioRender();
  }
  function studioOpen(on){
    if(!el('el31Studio'))return;
    var visible=Boolean(on);el('el31Studio').hidden=!visible;
    el('el31StudioButton').textContent=visible?tr('hideStudio'):tr('showStudio');
    if(visible){studioRender();el('el31Studio').scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function studioRender(){
    var root=el('el31Studio');if(!root)return;
    root.innerHTML='<div class="el31-studio-heading"><div><h3>'+tr('studio')+'</h3><p>'+tr('studioDesc')+'</p></div></div><div class="el31-studio-modes">'+
      ['series','parallel','mixed'].map(function(mode){return '<button type="button" class="el31-mode" data-mode="'+mode+'" aria-pressed="'+(studio.mode===mode)+'">'+tr(mode)+'</button>';}).join('')+'</div>'+ 
      '<small id="el31MixedInfo">'+(studio.mode==='mixed'?tr('mixDesc'):'')+'</small><div class="el31-inputs" id="el31Inputs"></div>'+ 
      '<div class="el31-stepper"><button type="button" id="el31Add">'+tr('plus')+'</button><button type="button" id="el31Remove">'+tr('minus')+'</button></div>'+ 
      '<div class="el31-stage" id="el31Drawing"></div><button type="button" class="el31-svg-detail" id="el31StudioZoom">⌕ '+tr('zoom')+'</button><div id="el31Results" aria-live="polite"></div>';
    root.querySelectorAll('[data-mode]').forEach(function(b){b.onclick=function(){studio.mode=b.dataset.mode;studioRender();};});
    el('el31Add').disabled=studio.R.length>=6;
    el('el31Remove').disabled=studio.R.length<=2;
    el('el31Add').onclick=function(){if(studio.R.length<6){studio.R.push(100);studioRender();}};
    el('el31Remove').onclick=function(){if(studio.R.length>2){studio.R.pop();studioRender();}};
    studioInputs();
  }
  function studioInputs(){
    var rows='<label>'+tr('voltage')+' (V)<input id="el31U" type="number" min="0.001" step="any" inputmode="decimal" value="'+studio.U+'"></label>';
    studio.R.forEach(function(r,i){rows+='<label>R'+(i+1)+' (Ω)<input type="number" data-res="'+i+'" min="0.001" step="any" inputmode="decimal" value="'+r+'"></label>';});
    el('el31Inputs').innerHTML=rows;
    el('el31U').oninput=function(){studio.U=Number(this.value);studioCalculate();};
    el('el31Inputs').querySelectorAll('[data-res]').forEach(function(b){b.oninput=function(){studio.R[+this.dataset.res]=Number(this.value);studioCalculate();};});
    studioCalculate();
  }
  function studioCalculate(){
    var U=studio.U,R=studio.R;
    if(!Number.isFinite(U)||U<=0||U>1e7||R.some(function(v){return !Number.isFinite(v)||v<=0||v>1e9;})){
      el('el31Drawing').innerHTML='';el('el31Results').innerHTML='<p class="el31-error">'+tr('valueError')+'</p>';return;
    }
    el('el31Drawing').innerHTML=vectorDiagram(studio.mode,R,U);
    if(el('el31StudioZoom'))el('el31StudioZoom').onclick=function(){
      if(!el('el31SvgDialog'))addZoom();
      el('el31SvgViewer').innerHTML=el('el31Drawing').innerHTML;
      el('el31SvgDialog').showModal();
    };
    var eq,amps=[],volts=[],steps=[],g,Itotal,Ptotal;
    if(studio.mode==='series'){
      eq=R.reduce(function(a,b){return a+b;},0);Itotal=U/eq;
      R.forEach(function(v,i){amps.push(Itotal);volts.push(Itotal*v);});
      steps.push('Rges = '+R.map(function(v,i){return 'R'+(i+1);}).join(' + ')+' = '+unit(eq,'ohm'));
      steps.push('Iges = U / Rges = '+unit(U,'volt')+' / '+unit(eq,'ohm')+' = '+unit(Itotal,'ampere'));
      steps.push((locale()==='it'?'Su ogni resistenza':'An jedem Widerstand')+': Ui = Iges · Ri');
    } else if(studio.mode==='parallel'){
      g=R.reduce(function(a,v){return a+1/v;},0);eq=1/g;Itotal=U/eq;
      R.forEach(function(v,i){amps.push(U/v);volts.push(U);});
      steps.push('1/Rges = '+R.map(function(v,i){return '1/R'+(i+1);}).join(' + '));
      steps.push('Rges = 1 / ('+R.map(function(v){return '1/'+fnum(v);}).join(' + ')+') = '+unit(eq,'ohm'));
      steps.push('Ii = U / Ri; Iges = Σ Ii = '+unit(Itotal,'ampere'));
    } else {
      g=R.slice(1).reduce(function(a,v){return a+1/v;},0);var Rp=1/g;
      eq=R[0]+Rp;Itotal=U/eq;var Up=U-Itotal*R[0];
      amps.push(Itotal);volts.push(Itotal*R[0]);
      R.slice(1).forEach(function(v){amps.push(Up/v);volts.push(Up);});
      steps.push('Rp = 1 / ('+R.slice(1).map(function(v,i){return '1/R'+(i+2);}).join(' + ')+') = '+unit(Rp,'ohm'));
      steps.push('Rges = R1 + Rp = '+unit(R[0],'ohm')+' + '+unit(Rp,'ohm')+' = '+unit(eq,'ohm'));
      steps.push('Iges = U / Rges = '+unit(Itotal,'ampere'));
      steps.push('U1 = Iges · R1 = '+unit(volts[0],'volt')+'; Up = U − U1 = '+unit(Up,'volt'));
      steps.push('I2 ... In = Up / Ri; '+(locale()==='it'?'controllo':'Kontrolle')+': Σ Irami = Iges');
    }
    Ptotal=U*Itotal;
    var kp=[['U',unit(U,'volt')],[tr('totalR'),unit(eq,'ohm')],[tr('totalI'),unit(Itotal,'ampere')],[tr('totalP'),unit(Ptotal,'watt')]];
    var khtml='<div class="el31-result-grid">'+kp.map(function(k){return '<div class="el31-kpi"><span>'+k[0]+'</span><strong>'+k[1]+'</strong></div>';}).join('')+'</div>';
    var table='<div class="el31-table-wrap"><table class="el31-table"><thead><tr><th>'+tr('resistance')+'</th><th>R</th><th>U</th><th>I</th><th>P</th></tr></thead><tbody>';
    R.forEach(function(v,i){table+='<tr><td>R'+(i+1)+'</td><td>'+unit(v,'ohm')+'</td><td>'+unit(volts[i],'volt')+'</td><td>'+unit(amps[i],'ampere')+'</td><td>'+unit(volts[i]*amps[i],'watt')+'</td></tr>';});
    table+='</tbody></table></div>';
    el('el31Results').innerHTML=khtml+'<div class="el31-worked"><h4>'+tr('path')+'</h4><ol>'+steps.map(function(s){return '<li>'+escapeHtml(s)+'</li>';}).join('')+'</ol></div>'+ 
      '<div class="el31-worked"><h4>'+tr('parts')+'</h4>'+table+'</div>';
  }
  function addZoom(){
    if(!el('el31SvgDialog')){
      var dialog=document.createElement('dialog');dialog.id='el31SvgDialog';dialog.className='el31-illustration-dialog';
      dialog.innerHTML='<button type="button" class="el31-dialog-close" id="el31DialogClose">✕ '+tr('close')+'</button><div id="el31SvgViewer"></div>';
      document.body.appendChild(dialog);el('el31DialogClose').onclick=function(){dialog.close();};
      dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
    }
    document.querySelectorAll('.circuit-figure').forEach(function(figure){
      if(figure.querySelector('.el31-svg-detail'))return;
      var b=document.createElement('button');b.className='el31-svg-detail';b.type='button';b.textContent='⌕ '+tr('zoom');
      figure.appendChild(b);b.onclick=function(){var svg=figure.querySelector('svg');if(!svg)return;
        el('el31SvgViewer').innerHTML=svg.outerHTML;el('el31SvgDialog').showModal();};
    });
  }
  function refresh(){
    if(!course())return;
    dashboard();prepareSearch();applySearch();buildTopics();studioInit();
    if(lastLocale !== null && lastLocale !== locale() && el('el31Studio')) studioRender();
    lastLocale=locale();
    if(el('el31StudioButton'))el('el31StudioButton').textContent=el('el31Studio').hidden?tr('showStudio'):tr('hideStudio');
    var input=el('el31Search');if(input)input.placeholder=tr('search');
    addZoom();
    if(el('el31DialogClose')) el('el31DialogClose').textContent='✕ '+tr('close');
  }
  function init(){
    if(mounted)return;mounted=true;
    var hero=document.querySelector('.hero');if(hero&&!el('el31Dashboard')){
      var dashboardEl=document.createElement('section');dashboardEl.id='el31Dashboard';dashboardEl.setAttribute('aria-label','ElektroLab Academy');hero.after(dashboardEl);
    }
    // Existing code calls render() on navigation, progress, data and language changes.
    if(typeof render==='function'){
      var legacyRender=render;
      render=function(){legacyRender();refresh();};
    }
    // Circuit detail navigation is handled separately by version 3.0.
    if(typeof renderCircuitHub==='function'){
      var oldCircuit=renderCircuitHub;
      renderCircuitHub=function(){oldCircuit();addZoom();};
    }
    refresh();
  }
  window.ElektroLab31={init:init,recalculate:studioCalculate,diagram:vectorDiagram};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
