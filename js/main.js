(function(){
  var $=function(s,c){return (c||document).querySelector(s)},
      $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

  /* header sticky + nav activa */
  var hdr=$('.hdr');
  var onScroll=function(){hdr.classList.toggle('is-stuck',window.scrollY>8)};
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});

  /* tabs */
  $$('.tab-btn').forEach(function(b){
    b.addEventListener('click',function(){
      $$('.tab-btn').forEach(function(x){x.classList.remove('is-active');x.setAttribute('aria-selected','false')});
      $$('.panel').forEach(function(p){p.classList.remove('is-active')});
      b.classList.add('is-active');b.setAttribute('aria-selected','true');
      $('#'+b.dataset.tab).classList.add('is-active');
    });
  });

  /* sistema interactivo */
  var ICONS={
    1:'<path d="M3 8.5 11 3l8 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8.5 21v-6h5v6"/>',
    2:'<path d="M20 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
    3:'<rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="m16.5 11 5-3v8l-5-3z"/>',
    4:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    5:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    6:'<path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="m9.5 13 2 2 3.5-3.5"/>',
    7:'<path d="M20 11a8 8 0 1 0-.8 4.5"/><path d="M20 5.5V11h-5.5"/>'
  };
  var SYS={
    1:['Oferta','Definimos qué vendes y por qué deberían elegirte a ti. Sin una oferta clara, ningún anuncio funciona.'],
    2:['Mensaje','Traducimos esa oferta al lenguaje de tu cliente: qué necesita escuchar para entender el valor y decidir avanzar.'],
    3:['Creatividad','Producimos los anuncios que detienen la atención, en volumen suficiente para aprender qué funciona.'],
    4:['Adquisición','Llevamos ese mensaje al público correcto con campañas estructuradas para poder escalar lo que rinde.'],
    5:['Embudo','Convertimos el interés en oportunidades reales: página, formulario, filtros y avisos a tu equipo.'],
    6:['Venta','Acompañamos lo que pasa después: seguimiento, asistencia a las llamadas y cierre.'],
    7:['Optimización','Cruzamos los datos con lo que ocurre en ventas y devolvemos el aprendizaje a la oferta y al mensaje.']
  };
  var sysN=$('#sysN'),sysT=$('#sysT'),sysD=$('#sysD'),sysBig=$('#sysBig'),sysIc=$('#sysIc'),sysCard=$('#sysCard'),sysCur=0;
  var pick=function(n){
    n=parseInt(n,10);
    if(n===sysCur)return;
    sysCur=n;
    $$('.node').forEach(function(x){x.classList.remove('is-on')});
    var node=$('.node[data-node="'+n+'"]');
    if(node)node.classList.add('is-on');
    if(!sysT)return;
    sysN.textContent='Fase 0'+n;sysT.textContent=SYS[n][0];sysD.textContent=SYS[n][1];
    sysBig.textContent='0'+n;
    sysIc.innerHTML='<svg viewBox="0 0 24 24">'+ICONS[n]+'</svg>';
    sysCard.classList.remove('is-swap');void sysCard.offsetWidth;sysCard.classList.add('is-swap');
  };
  $$('.node').forEach(function(n){
    n.addEventListener('click',function(){pick(n.dataset.node)});
    n.addEventListener('mouseenter',function(){pick(n.dataset.node)});
    n.addEventListener('focus',function(){pick(n.dataset.node)});
    n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(n.dataset.node)}});
  });
  pick(1);

  /* timeline + faq */
  $$('.tl__head').forEach(function(h){
    h.addEventListener('click',function(){h.parentElement.classList.toggle('is-open')});
  });
  $$('.faq__q').forEach(function(q){
    q.addEventListener('click',function(){
      var it=q.parentElement,open=it.classList.contains('is-open');
      $$('.faq__item').forEach(function(x){x.classList.remove('is-open')});
      if(!open)it.classList.add('is-open');
    });
  });


  /* conectores del proceso: se calculan con la posición real de cada badge para que nunca crucen el texto */
  var flowEl=$('.flow'),flowWire=$('#flowWire');
  var drawFlowWire=function(){
    if(!flowEl||!flowWire)return;
    if(window.innerWidth<=720){
      var mobileFlow=flowEl.getBoundingClientRect();
      var sixth=flowEl.querySelector('.flow__row--rev .step:last-child');
      var seventh=flowEl.querySelector('.flow__end > .step__badge');
      if(!sixth||!seventh)return;
      var sixthRect=sixth.getBoundingClientRect(),seventhRect=seventh.getBoundingClientRect();
      var x6=sixthRect.left-mobileFlow.left+20;
      var x7=seventhRect.left-mobileFlow.left+seventhRect.width/2;
      var y6=sixthRect.bottom-mobileFlow.top;
      var y7=seventhRect.top-mobileFlow.top;
      var middle=(y6+y7)/2,curve=Math.min(6,(y7-y6)/4);
      var mobileSvg=flowWire.ownerSVGElement;
      if(mobileSvg)mobileSvg.setAttribute('viewBox','0 0 '+mobileFlow.width+' '+mobileFlow.height);
      flowWire.setAttribute('d','M '+x6+' '+(y6-1)+' L '+x6+' '+(middle-curve)+' Q '+x6+' '+middle+' '+(x6+curve)+' '+middle+' L '+(x7-curve)+' '+middle+' Q '+x7+' '+middle+' '+x7+' '+(middle+curve)+' L '+x7+' '+y7);
      return;
    }
    if(window.innerWidth<=980){flowWire.setAttribute('d','');return;}
    var fr=flowEl.getBoundingClientRect();
    var badge=function(n){
      var all=flowEl.querySelectorAll('.step__badge');
      for(var i=0;i<all.length;i++){if(all[i].textContent.trim()===String(n))return all[i];}
      return null;
    };
    var pt=function(el){var r=el.getBoundingClientRect();return{x:r.left-fr.left+r.width/2,y:r.top-fr.top+r.height/2};};
    var roundPath=function(points,radius){
      if(!points||points.length<2)return '';
      var out=['M',points[0].x,points[0].y];
      var same=function(a,b){return Math.abs(a.x-b.x)<0.5&&Math.abs(a.y-b.y)<0.5;};
      for(var i=1;i<points.length-1;i++){
        var prev=points[i-1],curr=points[i],next=points[i+1];
        var v1={x:curr.x-prev.x,y:curr.y-prev.y},v2={x:next.x-curr.x,y:next.y-curr.y};
        var l1=Math.hypot(v1.x,v1.y),l2=Math.hypot(v2.x,v2.y);
        if(!l1||!l2)continue;
        var u1={x:v1.x/l1,y:v1.y/l1},u2={x:v2.x/l2,y:v2.y/l2};
        if((Math.abs(u1.x-u2.x)<0.001&&Math.abs(u1.y-u2.y)<0.001)||(Math.abs(u1.x+u2.x)<0.001&&Math.abs(u1.y+u2.y)<0.001)){
          out.push('L',curr.x,curr.y);continue;
        }
        var r=Math.min(radius,l1/2,l2/2);
        var pIn={x:curr.x-u1.x*r,y:curr.y-u1.y*r};
        var pOut={x:curr.x+u2.x*r,y:curr.y+u2.y*r};
        if(!same(points[i-1],pIn)) out.push('L',pIn.x,pIn.y);
        out.push('Q',curr.x,curr.y,pOut.x,pOut.y);
      }
      out.push('L',points[points.length-1].x,points[points.length-1].y);
      return out.join(' ');
    };
    var b1=badge(1),b2=badge(2),b3=badge(3),b4=badge(4),b5=badge(5),b6=badge(6),b7=badge(7),end=flowEl.querySelector('.flow__end');
    if(!b1||!b2||!b3||!b4||!b5||!b6||!b7||!end)return;
    var p1=pt(b1),p2=pt(b2),p3=pt(b3),p4=pt(b4),p5=pt(b5),p6=pt(b6);
    var er=end.getBoundingClientRect(),r7=b7.getBoundingClientRect(),p7=pt(b7);
    var rightX=fr.width-14,leftX=14,endTop=er.top-fr.top;
    var svg=flowWire.ownerSVGElement;if(svg)svg.setAttribute('viewBox','0 0 '+fr.width+' '+fr.height);
    var points=[
      p1,p2,p3,
      {x:rightX,y:p3.y},{x:rightX,y:p4.y},p4,
      p5,p6,
      {x:leftX,y:p6.y},{x:leftX,y:endTop},{x:p7.x,y:endTop},
      {x:p7.x,y:r7.top-fr.top}
    ];
    flowWire.setAttribute('d',roundPath(points,24));
  };
  requestAnimationFrame(drawFlowWire);
  window.addEventListener('resize',function(){requestAnimationFrame(drawFlowWire)});
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(drawFlowWire);}

  /* reveal + funnel */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}});
  },{threshold:.14,rootMargin:'0px 0px -40px 0px'});
  $$('.rv').forEach(function(el){io.observe(el)});

  /* carrusel de logos: duplicamos la tira para el bucle */
  var track=$('#logoTrack');
  if(track){track.innerHTML+=track.innerHTML}

  /* barra CTA móvil: solo cuando el CTA del hero sale de pantalla */
  var mbar=$('.mbar'),heroCta=$('.hero__cta');
  if(mbar&&heroCta){
    new IntersectionObserver(function(es){
      es.forEach(function(e){mbar.classList.toggle('is-on',!e.isIntersecting)});
    },{threshold:0}).observe(heroCta);
  }

  /* palabra rotativa del titular */
  var rot=$('#rot');
  if(rot && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    var words=$$('#rot i'),ri=0;
    setInterval(function(){
      words[ri].classList.remove('is-on');words[ri].classList.add('is-out');
      var prev=ri;ri=(ri+1)%words.length;
      words[ri].classList.remove('is-out');words[ri].classList.add('is-on');
      setTimeout(function(){words[prev].classList.remove('is-out')},520);
    },2400);
  }

  /* paneles de dudas: giro al pulsar */
  $$('.pain').forEach(function(c){
    c.addEventListener('click',function(){c.classList.toggle('is-flipped')});
    c.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();c.classList.toggle('is-flipped')}
    });
  });

  /* cifras incrementales — cualquier elemento con [data-count] */
  var countEls=$$('[data-count]');
  if(countEls.length){
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var runCount=function(el){
      var target=parseFloat(el.dataset.count),
          pre=el.dataset.pre||'',suf=el.dataset.suf||'',
          dur=parseInt(el.dataset.dur||'2600',10),t0=null;
      if(reduce){el.textContent=pre+target+suf;return}
      var step=function(ts){
        if(!t0)t0=ts;
        var k=Math.min((ts-t0)/dur,1),eased=1-Math.pow(1-k,3);
        el.textContent=pre+Math.round(target*eased)+suf;
        if(k<1)requestAnimationFrame(step);
      };
      el.textContent=pre+'0'+suf;
      requestAnimationFrame(step);
    };
    var cio=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        cio.unobserve(e.target);
        runCount(e.target);
      });
    },{threshold:.6});
    countEls.forEach(function(el){cio.observe(el)});
  }

})();
