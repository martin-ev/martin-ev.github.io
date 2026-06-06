(function(){
  const field=document.getElementById('field');
  if(!field) return;
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
  field.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  let dpr=1;

  // pointer repulsion: RAD px reach, FORCE px push, TAU = lag in seconds
  let mx=-1e4, my=-1e4;
  const RAD=130, FORCE=28, TAU_SCROLL=0.23, TAU_PUSH=0.1;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;},{passive:true});
  document.addEventListener('mouseleave',()=>{mx=-1e4;my=-1e4;});
  const GREY='#948a80';
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  // 5% of shapes get a random color
  const tone=()=>Math.random()<0.05?`hsl(${Math.floor(Math.random()*360)},70%,55%)`:GREY;

  // Distribution of shapes
  const MENU=[['dot',32],['plus',20],['tri',14],['sq',14],['hex',10],['line',10]];
  const BAG=[]; MENU.forEach(([t,w])=>{for(let i=0;i<w;i++)BAG.push(t);});

  function makeShape(type){
    switch(type){
      case 'dot':  return {type,size:rnd(4,9)};
      case 'plus': return {type,size:rnd(10,18)};
      case 'tri':  return {type,size:rnd(14,26)};
      case 'sq':   return {type,size:rnd(12,22)};
      case 'hex':  return {type,size:rnd(16,28)};
      case 'line': return {type,size:rnd(14,26)};
    }
  }
  function draw(s){
    const z=s.size, c=s.color;
    switch(s.type){
      case 'dot':{ ctx.beginPath(); ctx.arc(0,0,z/2,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); break; }
      case 'plus':{ const h=z*0.32; ctx.strokeStyle=c; ctx.lineWidth=Math.max(1.5,z*0.12); ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(0,h); ctx.moveTo(-h,0); ctx.lineTo(h,0); ctx.stroke(); break; }
      case 'tri':{ ctx.beginPath(); ctx.moveTo(0,-0.38*z); ctx.lineTo(0.4*z,0.36*z); ctx.lineTo(-0.4*z,0.36*z); ctx.closePath();
        ctx.fillStyle=c; ctx.fill(); break; }
      case 'sq':{ ctx.fillStyle=c; ctx.fillRect(-0.38*z,-0.38*z,0.76*z,0.76*z); break; }
      case 'hex':{ ctx.beginPath(); for(let k=0;k<6;k++){ const a=Math.PI/180*(60*k-30), px=(z/2)*Math.cos(a), py=(z/2)*Math.sin(a); k?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath();
        ctx.strokeStyle=c; ctx.lineWidth=2; ctx.stroke(); break; }
      case 'line':{ const h=(z-2)/2; ctx.strokeStyle=c; ctx.lineWidth=2.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-h,0); ctx.lineTo(h,0); ctx.stroke(); break; }
    }
  }

  // durations in seconds. start at t=0 (clean), forward diffusion for 10s, stay at t=1000 for 0s, then reverse diffusion back to t=0 for 5s, then stay t=0 for 1s, repeat.
  // Clean data distribution: X_0 ~ Poisson(lambda) number of shapes per node, lambda is N/(cols*rows)
  // Forward diffusion: we actually implement a telegrapher's / run-and-tumble process: each shape has a heading that randomly wobbles (TURN) and moves at constant speed (SPEED). Looks more relaxing than pure Brownian noise.
  // formula: X_t = X_{t-dt} + SPEED*dt*[cos(head),sin(head)], head_t = head_{t-dt} + rnd(-TURN,TURN)*sqrt(dt)
  // the distribution of noisy data given clean data is not exactely X_t = X_0 + sigma_t * N(0,Id), especially at low t.
  // at low t, it's ~ballistic (a ring of radius SPEED*t)
  // at high t, it is a good approximation with sigma_t = SPEED*sqrt(tau*t), tau = 6/TURN^2 ~ 0.98s the heading-decorrelation time
  // Reverse diffusion (euler discretization of the reverse-time ODE / probability flow ODE - assuming forward noising is brownian noise):
  // X_{t-dt} = E[X_0|X_t] + (sigma_{t-dt}/sigma_t)*(X_t - E[X_0|X_t])          (DDIM step; as sigma->0 this snaps X to its nearest node)
  // where the denoiser is the posterior mean E[X_0|X_t] = sum_j w_j*node_j, w_j ~ exp(-|X_t-node_j|^2 / (2*sigma_t^2))  (this is postNode())
  const SPEED=7, TURN=2.48, FORWARDDIFFUSION=10, NOISY=0, REVERSEDIFFUSION=5, CLEAN=1, T=FORWARDDIFFUSION+NOISY+REVERSEDIFFUSION+CLEAN;
  const TAU=6/(TURN*TURN);   // heading-decorrelation time; sigma_t = SPEED*sqrt(TAU*t)
  let CELL=89;
  let SP=SPEED;   // effective speed, scaled by CELL/89 so motion shrinks with the grid on small screens
  let cols,rows,cw,ch,vw,vh,tw,th,states=[],N=0;

  function gridFromN(SW,SH){
    cols=Math.max(1,Math.round(Math.sqrt(N*SW/SH)));
    rows=Math.ceil(N/cols);
    cw=CELL; ch=CELL;
    tw=cols*CELL; th=rows*CELL;
  }
  function sizeCanvas(){
    dpr=Math.min(2, window.devicePixelRatio||1);
    canvas.width=Math.round(vw*dpr); canvas.height=Math.round(vh*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function layout(){
    vw=innerWidth; vh=innerHeight;
    while(tw<vw){ cols++; tw=cols*CELL; }
    while(th<vh){ rows++; th=rows*CELL; }
    sizeCanvas();
  }

  function build(){
    vw=innerWidth; vh=innerHeight;
    CELL=Math.round(Math.max(44, Math.min(89, Math.min(vw,vh)/9)));
    SP=SPEED*CELL/89;
    const SW=Math.max(innerWidth,(window.screen&&screen.width)||innerWidth);
    const SH=Math.max(innerHeight,(window.screen&&screen.height)||innerHeight);
    N=Math.min(3000, Math.max(800, Math.round(SW*SH/940)));
    gridFromN(SW,SH);
    sizeCanvas();
    states=[];
    // clean data = lattice sites, each shape dropped on a uniformly random node (counts per node end up ~Poisson)
    for(let i=0;i<N;i++){
      const col=tone(), s=makeShape(pick(BAG));
      s.color=col; s.colored=(col!==GREY);
      const cc=Math.floor(Math.random()*cols), rr=Math.floor(Math.random()*rows);
      s.bx=(cc+0.5)*cw; s.by=(rr+0.5)*ch;
      s.tx=s.bx; s.ty=s.by; s.ox=0; s.oy=0;
      const spin=(s.type!=='dot');
      s.head=rnd(0,Math.PI*2); s.rot=spin?rnd(0,360):0; s.vrot=spin?rnd(-30,30):0; s.px=0; s.py=0;
      states.push(s);
    }
  }
  function nearestNode(ax,ay){
    const c=Math.round(ax/cw-0.5), r=Math.round(ay/ch-0.5);
    return [(c+0.5)*cw,(r+0.5)*ch];
  }
  // posterior mean E[x0|xt]: softmax-weighted average of lattice nodes, weights ~ exp(-d^2/2sig^2)
  function postNode(ax,ay,sig){
    const c0=Math.round(ax/cw-0.5), r0=Math.round(ay/ch-0.5), R=Math.max(1,Math.ceil(3*sig/CELL)), k=1/(2*sig*sig);
    let ws=0,wx=0,wy=0;
    for(let dc=-R;dc<=R;dc++)for(let dr=-R;dr<=R;dr++){
      const nx=(c0+dc+0.5)*cw, ny=(r0+dr+0.5)*ch, d2=(ax-nx)*(ax-nx)+(ay-ny)*(ay-ny), w=Math.exp(-d2*k);
      ws+=w; wx+=w*nx; wy+=w*ny;
    }
    return ws>0?[wx/ws,wy/ws]:[(c0+0.5)*cw,(r0+0.5)*ch];
  }
  build();
  addEventListener('resize',layout);

  let elapsed=0, prev=0, captured=false, last=performance.now(), paused=false, scSmooth=window.scrollY||0;
  const tvalEl=document.getElementById('tval');
  const playBtn=document.getElementById('playBtn');
  const playIcon=document.getElementById('playIcon');
  if(playBtn){ playBtn.addEventListener('click',()=>{
    paused=!paused;
    if(playIcon) playIcon.className='ci '+(paused?'ci-play':'ci-pause');
    playBtn.setAttribute('aria-label',paused?'Play diffusion':'Pause diffusion');
  }); }
  function tFor(phase){
    if(phase<FORWARDDIFFUSION) return Math.round(1000*phase/FORWARDDIFFUSION);
    if(phase<FORWARDDIFFUSION+NOISY) return 1000;
    if(phase<FORWARDDIFFUSION+NOISY+REVERSEDIFFUSION) return Math.round(1000*(1-(phase-(FORWARDDIFFUSION+NOISY))/REVERSEDIFFUSION));
    return 0;
  }
  const DEG=Math.PI/180, MARGIN=40;
  function frame(now){
    const dt=Math.max(0,Math.min(0.05,(now-last)/1000)); last=now;
    const aScroll=1-Math.exp(-dt/TAU_SCROLL), aPush=1-Math.exp(-dt/TAU_PUSH);
    if(!paused) elapsed+=dt;
    const phase=elapsed%T;
    if(phase<prev){ for(const s of states){s.bx=((s.tx%tw)+tw)%tw;s.by=((s.ty%th)+th)%th;s.ox=0;s.oy=0;} captured=false; }
    if(phase>=FORWARDDIFFUSION+NOISY && !captured){ for(const s of states){ const[tx,ty]=nearestNode(s.bx+s.ox,s.by+s.oy); s.tx=tx;s.ty=ty; } captured=true; }
    const scReal=window.scrollY||window.pageYOffset||0;
    scSmooth+=(scReal-scSmooth)*aScroll;
    const offX=(tw-vw)/2, offY=(th-vh)/2;
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    const zen=document.body.classList.contains('zen');
    const greyBase=dark?0.08:0.055, clrBase=dark?0.16:0.11;

    ctx.clearRect(0,0,vw,vh);
    for(const s of states){
      if(!paused){
        if(phase<FORWARDDIFFUSION){ s.head+=rnd(-TURN,TURN)*Math.sqrt(dt); s.ox+=Math.cos(s.head)*SP*dt; s.oy+=Math.sin(s.head)*SP*dt; s.rot+=s.vrot*dt; }
        else if(phase<FORWARDDIFFUSION+NOISY){ }
        else if(phase<FORWARDDIFFUSION+NOISY+REVERSEDIFFUSION){
          // reverse diffusion: DDIM/euler step on the VE prob-flow ODE. diffusion-time t runs FORWARDDIFFUSION -> 0 across the REVERSEDIFFUSION window
          const q=(phase-(FORWARDDIFFUSION+NOISY))/REVERSEDIFFUSION, tc=FORWARDDIFFUSION*(1-q), tn=tc-FORWARDDIFFUSION*dt/REVERSEDIFFUSION;
          const sig=SP*Math.sqrt(TAU*tc), r=Math.sqrt(Math.max(tn,0)/tc);   // r = sigma_{t-dt}/sigma_t = sqrt(tn/tc)
          const[px,py]=postNode(s.bx+s.ox,s.by+s.oy,sig), gx=px-s.bx, gy=py-s.by;
          s.ox=gx+r*(s.ox-gx); s.oy=gy+r*(s.oy-gy);                            // X_{t-dt} = x0hat + r*(X_t - x0hat)
        }
        else{ const[nx,ny]=nearestNode(s.bx+s.ox,s.by+s.oy); s.tx=nx;s.ty=ny; s.ox=s.tx-s.bx; s.oy=s.ty-s.by; }
      }
      // wrap onto the torus (y follows scroll 1:1 so the fixed canvas scrolls with the page), then shift into screen space; skip anything off-screen
      const wx=((s.bx+s.ox)%tw+tw)%tw, wy=((s.by+s.oy-scSmooth)%th+th)%th;
      const x=wx-offX, y=wy-offY;
      if(x<-MARGIN||x>vw+MARGIN||y<-MARGIN||y>vh+MARGIN) continue;
      // push away from the cursor
      let ddx=x-mx, ddy=y-my, dist=Math.hypot(ddx,ddy), tpx=0,tpy=0;
      if(dist<RAD){ const m=FORCE*(1-dist/RAD), inv=dist>0.01?1/dist:0; tpx=ddx*inv*m; tpy=ddy*inv*m; }
      s.px+=(tpx-s.px)*aPush; s.py+=(tpy-s.py)*aPush;
      ctx.globalAlpha=zen?1:(s.colored?clrBase:greyBase);
      ctx.save(); ctx.translate(x+s.px, y+s.py); if(s.rot) ctx.rotate(s.rot*DEG); draw(s); ctx.restore();
    }
    ctx.globalAlpha=1;
    if(tvalEl) tvalEl.textContent=tFor(phase);
    prev=phase; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
