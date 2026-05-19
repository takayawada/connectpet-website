/* =============================================
   ConnectPet — common.js
   全ページ共通JS (Lenis + GSAP + ScrollTrigger)
============================================= */

/* ─── LENIS ─── */
const lenis = new Lenis({
  duration: 1.3,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 2
});
(function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.lagSmoothing(0);

/* ─── CURSOR ─── */
const $c = document.getElementById('cur');
const $cr = document.getElementById('cur-r');
if ($c && $cr) {
  let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function cl() {
    $c.style.left = mx+'px'; $c.style.top = my+'px';
    rx += (mx-rx)*.11; ry += (my-ry)*.11;
    $cr.style.left = rx+'px'; $cr.style.top = ry+'px';
    requestAnimationFrame(cl);
  })();
  document.querySelectorAll('a,button,details summary').forEach(el => {
    el.addEventListener('mouseenter', () => { $c.classList.add('h'); $cr.classList.add('h'); });
    el.addEventListener('mouseleave', () => { $c.classList.remove('h'); $cr.classList.remove('h'); });
  });
}

/* ─── MAGNETIC BUTTONS ─── */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', function(e) {
    const r = this.getBoundingClientRect();
    gsap.to(this, { x:(e.clientX-r.left-r.width/2)*.28, y:(e.clientY-r.top-r.height/2)*.28, duration:.3, ease:'power2.out' });
  });
  btn.addEventListener('mouseleave', function() {
    gsap.to(this, { x:0, y:0, duration:.6, ease:'elastic.out(1,.5)' });
  });
});

/* ─── NAV compact on scroll ─── */
const $nav = document.getElementById('nav');
if ($nav) lenis.on('scroll', ({ scroll }) => { $nav.classList.toggle('sc', scroll > 60); });

/* ─── MENU + CAT RUNNER ─── */
const $mb  = document.getElementById('mbtn');
const $fm  = document.getElementById('fullmenu');
const $cat = document.getElementById('cat-runner');
let mo = false;

function openMenu() {
  mo = true;
  if ($cat) {
    $cat.classList.remove('run'); void $cat.offsetWidth;
    $cat.classList.add('run'); $cat.style.opacity = '1';
    $cat.addEventListener('animationend', function cb() {
      $cat.removeEventListener('animationend', cb);
      $cat.style.opacity = '0'; $cat.classList.remove('run');
    });
  }
  setTimeout(() => { if ($fm) $fm.classList.add('open'); }, 120);
  if ($mb) { $mb.classList.add('open'); $mb.setAttribute('aria-expanded','true'); }
  lenis.stop();
}
function closeMenu() {
  mo = false;
  if ($fm) $fm.classList.remove('open');
  if ($mb) { $mb.classList.remove('open'); $mb.setAttribute('aria-expanded','false'); }
  lenis.start();
}
if ($mb) $mb.addEventListener('click', () => mo ? closeMenu() : openMenu());
window.addEventListener('keydown', e => { if (e.key === 'Escape' && mo) closeMenu(); });
document.querySelectorAll('.m-item').forEach(a => a.addEventListener('click', closeMenu));

/* ─── SCROLL REVEAL (IntersectionObserver) ─── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
  });
}, { threshold: .1, rootMargin: '0px 0px -36px 0px' });
document.querySelectorAll('.sr').forEach(el => io.observe(el));

/* ─── NUMBER COUNTERS ─── */
document.querySelectorAll('.cnt').forEach(el => {
  const to = parseInt(el.getAttribute('data-to'), 10);
  ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
    onEnter() {
      gsap.to({ v: 0 }, { v: to, duration: 2, ease: 'power2.out',
        onUpdate() { el.textContent = Math.floor(this.targets()[0].v); }
      });
    }
  });
});

/* ─── TICKER PAUSE ─── */
const trk = document.getElementById('tkTrk');
if (trk) {
  trk.addEventListener('mouseenter', () => trk.style.animationPlayState = 'paused');
  trk.addEventListener('mouseleave', () => trk.style.animationPlayState = 'running');
}

/* ─── SERVICE CARD image parallax ─── */
gsap.utils.toArray('.svc-img-i').forEach(img => {
  gsap.to(img, { yPercent: -9, ease: 'none',
    scrollTrigger: {
      trigger: img.closest('.svc-card'),
      start: 'top bottom', end: 'bottom top', scrub: true
    }
  });
});

/* ─── HERO ANIMATIONS (index.htmlのみ) ─── */
const hEy    = document.getElementById('hEy');
const hH1    = document.getElementById('hH1');
const hRule  = document.getElementById('hRule');
const hBody  = document.getElementById('hBody');
const hCta   = document.getElementById('hCta');
const hFrame = document.getElementById('hFrame');
const hSc    = document.getElementById('hSc');
const mStmt  = document.getElementById('mStmt');

if (hEy) gsap.to(hEy, { opacity:1, y:0, duration:.65, delay:.3, ease:'power3.out' });

if (hH1 && typeof SplitType !== 'undefined') {
  const sp = new SplitType(hH1, { types: 'words,chars' });
  gsap.fromTo(sp.chars,
    { y:'110%', opacity:0 },
    { y:'0%', opacity:1, duration:.65, stagger:.022, delay:.55, ease:'power3.out' }
  );
}
if (hRule) setTimeout(() => hRule.classList.add('on'), 900);
if (hBody) gsap.to(hBody, { opacity:1, y:0, duration:.65, delay:1.1, ease:'power3.out' });
if (hCta)  gsap.to(hCta,  { opacity:1, y:0, duration:.5,  delay:1.35, ease:'power3.out' });
if (hFrame) setTimeout(() => hFrame.classList.add('on'), 650);
if (hSc)   setTimeout(() => hSc.classList.add('on'), 2400);

if (mStmt && typeof SplitType !== 'undefined') {
  const msp = new SplitType(mStmt, { types: 'words,chars' });
  gsap.fromTo(msp.chars,
    { y:'105%', opacity:0 },
    { y:'0%', opacity:1, duration:.52, stagger:.016, ease:'power3.out',
      scrollTrigger: { trigger: mStmt, start:'top 80%', once:true }
    }
  );
}

/* ─── PLAN CARD hover highlight ─── */
document.querySelectorAll('.plan-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    gsap.to(this, { y: -6, duration: .35, ease: 'power2.out' });
  });
  card.addEventListener('mouseleave', function() {
    gsap.to(this, { y: 0, duration: .5, ease: 'elastic.out(1,.6)' });
  });
});

/* ─── FAQ cursor fix ─── */
document.querySelectorAll('details summary').forEach(s => {
  s.style.cursor = 'none';
});
