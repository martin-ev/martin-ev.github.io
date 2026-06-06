(function(){
  const html=document.documentElement;
  const lbs=[...document.querySelectorAll('.lightBtn')], dbs=[...document.querySelectorAll('.darkBtn')];
  function setTheme(t){
    const dark=t==='dark';
    if(dark) html.setAttribute('data-theme','dark'); else html.removeAttribute('data-theme');
    lbs.forEach(b=>b.classList.toggle('active',!dark));
    dbs.forEach(b=>b.classList.toggle('active',dark));
    try{ localStorage.setItem('theme',t); }catch(_){}
  }
  lbs.forEach(b=>b.addEventListener('click',()=>setTheme('light')));
  dbs.forEach(b=>b.addEventListener('click',()=>setTheme('dark')));
  let saved; try{ saved=localStorage.getItem('theme'); }catch(_){}
  setTheme(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const ham=document.getElementById('hamburger'), menu=document.getElementById('menu');
  if(ham&&menu){
    const bar=menu.parentElement;
    const close=()=>{menu.classList.remove('open');bar.classList.remove('menu-open');ham.setAttribute('aria-expanded','false');};
    ham.addEventListener('click',(e)=>{e.stopPropagation();const open=menu.classList.toggle('open');bar.classList.toggle('menu-open',open);ham.setAttribute('aria-expanded',open);});
    menu.addEventListener('click',(e)=>{ if(e.target.closest('a')) close(); });
    document.addEventListener('click',(e)=>{ if(!menu.contains(e.target)&&!ham.contains(e.target)) close(); });
    const zenBtn=document.getElementById('zenBtn'), zenLab=document.getElementById('zenLab');
    const setZen=(on)=>{
      document.body.classList.toggle('zen',on);
      if(zenBtn){ zenBtn.classList.toggle('active',on); zenBtn.setAttribute('aria-pressed',on); }
      if(zenLab) zenLab.textContent=on?'Exit zen':'Zen mode';
    };
    if(zenBtn){ zenBtn.addEventListener('click',()=>{ setZen(!document.body.classList.contains('zen')); close(); }); }
    document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&document.body.classList.contains('zen')) setZen(false); });
    // While in zen mode the content (.wrap) is hidden, so in-page anchor links can't scroll.
    // Intercept them: exit zen first, then scroll to the target section.
    document.addEventListener('click',(e)=>{
      if(!document.body.classList.contains('zen')) return;
      const a=e.target.closest('a[href^="#"]');
      if(!a) return;
      const id=a.getAttribute('href').slice(1);
      const target=id?document.getElementById(id):null;
      e.preventDefault();
      setZen(false);
      requestAnimationFrame(()=>{
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
        else scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  (function(){
    const barInner=document.querySelector('.bar-inner');
    const nav=document.querySelector('.nav-inline');
    if(!barInner||!nav) return;
    const all=[...nav.querySelectorAll('[data-collapse]')];
    const levels=[...new Set(all.map(el=>+el.dataset.collapse))].sort((a,b)=>a-b)
      .map(p=>all.filter(el=>+el.dataset.collapse===p));
    const overflowing=()=>barInner.scrollWidth>barInner.clientWidth+1;
    function fit(){
      barInner.classList.add('measuring');
      barInner.classList.remove('identity-wrap');
      all.forEach(el=>el.classList.remove('collapsed'));
      for(let i=0;i<levels.length&&overflowing();i++){
        levels[i].forEach(el=>el.classList.add('collapsed'));
      }
      const needWrap=overflowing();
      barInner.classList.remove('measuring');
      barInner.classList.toggle('identity-wrap',needWrap);
    }
    fit();
    addEventListener('resize',fit);
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
  })();

  (function(){
    let addr;
    try{ addr=atob(atob('YlhoaGNYSnJkSHBwZDI1aUxtNWxkblpvWldweVoyRm1aV1J5ZEhSeQ==')+atob('UUhCaGJHeHRkV050YzI1NWFYRXVkMlZsY0hKbWRHeDZMbUpqZUdocg==')).replace(/(.)./g,'$1'); }catch(_){ return; }
    document.querySelectorAll('.js-email').forEach(a=>{
      a.setAttribute('href','mailto:'+addr);
    });
  })();

  const els=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver((ents)=>{
      ents.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('in'), Math.min(i,6)*60); io.unobserve(e.target);} });
    },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    els.forEach(el=>io.observe(el));
  } else { els.forEach(el=>el.classList.add('in')); }
})();
