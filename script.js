(function(){
  const html=document.documentElement;
  const lbs=[...document.querySelectorAll('.lightBtn')], dbs=[...document.querySelectorAll('.darkBtn')];
  // only an explicit click is saved; otherwise the theme follows the system setting
  function setTheme(t,save){
    const dark=t==='dark';
    if(dark) html.setAttribute('data-theme','dark'); else html.removeAttribute('data-theme');
    lbs.forEach(b=>b.classList.toggle('active',!dark));
    dbs.forEach(b=>b.classList.toggle('active',dark));
    if(save){ try{ localStorage.setItem('theme',t); }catch(_){} }
  }
  lbs.forEach(b=>b.addEventListener('click',()=>setTheme('light',true)));
  dbs.forEach(b=>b.addEventListener('click',()=>setTheme('dark',true)));
  const savedTheme=()=>{ try{ return localStorage.getItem('theme'); }catch(_){ return null; } };
  const mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');
  setTheme(savedTheme() || (mq&&mq.matches ? 'dark' : 'light'));
  if(mq&&mq.addEventListener) mq.addEventListener('change',e=>{ if(!savedTheme()) setTheme(e.matches?'dark':'light'); });

  const ham=document.getElementById('hamburger'), menu=document.getElementById('menu');
  if(ham&&menu){
    const close=()=>{menu.classList.remove('open');ham.setAttribute('aria-expanded','false');};
    ham.addEventListener('click',(e)=>{e.stopPropagation();const open=menu.classList.toggle('open');ham.setAttribute('aria-expanded',open);});
    menu.addEventListener('click',(e)=>{ if(e.target.closest('a')) close(); });
    document.addEventListener('click',(e)=>{ if(!menu.contains(e.target)&&!ham.contains(e.target)) close(); });
    const zenBtn=document.getElementById('zenBtn'), zenLab=document.getElementById('zenLab');
    const setZen=(on)=>{
      document.body.classList.toggle('zen',on);
      if(zenBtn){ zenBtn.classList.toggle('active',on); zenBtn.setAttribute('aria-pressed',on); }
      if(zenLab) zenLab.textContent=on?'Exit zen':'Zen mode';
    };
    if(zenBtn){ zenBtn.addEventListener('click',()=>{ setZen(!document.body.classList.contains('zen')); close(); }); }
    document.addEventListener('keydown',(e)=>{
      if(e.key!=='Escape') return;
      if(menu.classList.contains('open')){ close(); ham.focus(); }
      else if(document.body.classList.contains('zen')) setZen(false);
    });
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
})();
