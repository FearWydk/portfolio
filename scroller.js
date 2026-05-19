/* ============================================================
   scroller.js — shared tilt + holo + drag + fade logic
   Include on any page that has a .track element
   ============================================================ */

/* ── FADE EDGE AUTO-SIZING ── */
function initFadeEdge(trackEl) {
  const root = document.documentElement;
  const wrap = trackEl.closest('.scroller-wrap');
  function update() {
    const fadeW = Math.min(100, Math.max(40, Math.round(wrap.offsetWidth * 0.18)));
    root.style.setProperty('--fade-w', fadeW + 'px');
    trackEl.style.paddingLeft  = fadeW + 'px';
    trackEl.style.paddingRight = fadeW + 'px';
  }
  update();
  window.ResizeObserver
    ? new ResizeObserver(update).observe(wrap)
    : window.addEventListener('resize', update);
}

/* ── TILT + HOLO ── */
function initTilt(card) {
  if (window.matchMedia('(pointer: coarse) and (max-width:600px)').matches) return;
  const MAX = 8, ZLIFT = 28;
  const holo = card.querySelector('.holo');
  let raf, targetRX=0, targetRY=0, currentRX=0, currentRY=0, active=false;
  const lerp = (a,b,t) => a+(b-a)*t;

  function tick() {
    currentRX = lerp(currentRX, targetRX, 0.12);
    currentRY = lerp(currentRY, targetRY, 0.12);
    card.style.transform = `rotateX(${currentRX}deg) rotateY(${currentRY}deg) translateZ(${active?ZLIFT:0}px)`;
    card.style.boxShadow = active
      ? `0 ${18+Math.abs(currentRX)}px ${50+Math.abs(currentRX)*2}px rgba(0,0,0,.75),0 0 30px rgba(34,211,238,.12),inset 0 1px 0 rgba(34,211,238,.18)`
      : '';
    raf = requestAnimationFrame(tick);
  }

  card.addEventListener('mouseenter', () => {
    active=true; card.classList.add('tilting');
    raf = requestAnimationFrame(tick);
  });
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    targetRX = -(y-0.5)*MAX*2; targetRY = (x-0.5)*MAX*2;
    const angle = Math.atan2(y-0.5, x-0.5)*(180/Math.PI);
    holo.style.background = `conic-gradient(from ${angle}deg at ${x*100}% ${y*100}%,
      rgba(255,0,80,.20),rgba(255,165,0,.18),rgba(255,255,0,.15),
      rgba(0,255,140,.18),rgba(0,180,255,.20),rgba(160,0,255,.18),
      rgba(255,0,180,.18),rgba(255,0,80,.20))`;
    holo.style.setProperty('--gx', x*100+'%');
    holo.style.setProperty('--gy', y*100+'%');
  });
  card.addEventListener('mouseleave', () => {
    active=false; targetRX=0; targetRY=0;
    setTimeout(() => {
      cancelAnimationFrame(raf);
      card.style.transform=''; card.style.boxShadow='';
      card.classList.remove('tilting');
      currentRX=0; currentRY=0;
    }, 600);
  });
}

/* ── BUILD CARD FROM DATA OBJECT ── */
function buildCard(p) {
  const scene = document.createElement('div');
  scene.className = 'card-scene';
  const card = document.createElement('article');
  card.className = 'card';

  let mediaHTML = '';
  if (p.media.type === 'image') {
    mediaHTML = `<div class="card-media"><span class="badge ${p.badgeClass}">${p.badge}</span><img src="${p.media.src}" alt="${p.media.alt}" loading="lazy"/></div>`;
  } else if (p.media.type === 'svg') {
    mediaHTML = `<div class="card-media"><span class="badge ${p.badgeClass}">${p.badge}</span>${p.media.code}</div>`;
  } else {
    mediaHTML = `<div class="card-media" style="background:linear-gradient(135deg,#0d1117,#1a1f2e 40%,#111318);"><span class="badge ${p.badgeClass}">${p.badge}</span>${p.media.html}</div>`;
  }

  const tagsHTML = p.tags.map(t => t.link
    ? `<a class="tag ${t.color}" href="${t.link}" target="_blank" rel="noopener">${t.label} ↗</a>`
    : `<span class="tag ${t.color}">${t.label}</span>`
  ).join('');

  card.innerHTML = `
    ${mediaHTML}
    <div class="holo"></div>
    <div class="card-body">
      <div class="tags">${tagsHTML}</div>
      <h3 class="card-title">${p.title}</h3>
      <p class="card-desc">${p.desc}</p>
      <div class="card-footer">
        <span class="card-year">${p.year}</span>
        <a class="card-cta" href="${p.ctaLink}" target="_blank" rel="noopener">${p.ctaLabel} →</a>
      </div>
    </div>`;

  scene.appendChild(card);
  return scene;
}

/* ── INIT SCROLLER ── */
function initScroller(trackId, dotsId, prevId, nextId, projects) {
  const track  = document.getElementById(trackId);
  const dotsEl = document.getElementById(dotsId);
  const mobile = window.matchMedia('(pointer: coarse) and (max-width:600px)').matches;

  projects.forEach((p, i) => {
    const scene = buildCard(p);
    track.appendChild(scene);
    initTilt(scene.querySelector('.card'));
    if (!mobile) {
      const dot = document.createElement('button');
      dot.className = 'dot s-dot' + (i===0?' active':'');
      dot.setAttribute('aria-label', `Project ${i+1}`);
      dot.addEventListener('click', () => scrollTo(i));
      dotsEl.appendChild(dot);
    }
  });

  initFadeEdge(track);
  if (mobile) return;

  const GAP = 20;
  const cardW = () => track.querySelector('.card-scene').offsetWidth + GAP;

  function scrollTo(i) { track.scrollTo({ left: i*cardW(), behavior:'smooth' }); }
  function updateDots() {
    const idx = Math.round(track.scrollLeft / cardW());
    dotsEl.querySelectorAll('.s-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  }

  document.getElementById(prevId).addEventListener('click', () => track.scrollBy({left:-cardW(), behavior:'smooth'}));
  document.getElementById(nextId).addEventListener('click', () => track.scrollBy({left: cardW(), behavior:'smooth'}));
  track.addEventListener('scroll', updateDots, {passive:true});

  let down=false, startX, scrollLeft;
  track.addEventListener('mousedown', e => { down=true; startX=e.pageX-track.offsetLeft; scrollLeft=track.scrollLeft; });
  document.addEventListener('mouseup', () => down=false);
  document.addEventListener('mousemove', e => {
    if (!down) return;
    e.preventDefault();
    track.scrollLeft = scrollLeft-(e.pageX-track.offsetLeft-startX);
  });
}
