/* =========================================================
   main.js — BGM / intro gate / page transitions / UI
   ========================================================= */
(() => {
'use strict';

/* ---------------------------------------------------------
   설정: 직접 고른 BGM 파일을 쓰고 싶다면
   assets/audio/bgm.mp3 로 넣으면 자동으로 그 파일을 재생합니다.
   파일이 없으면 브라우저에서 실시간으로 생성하는 앰비언트 BGM을 재생합니다.
   --------------------------------------------------------- */
const BGM_FILE = 'assets/audio/bgm.mp3';

const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} },
  sget(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
  sset(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* =========================================================
   BGM ENGINE — generative dark-fantasy ambient (Web Audio)
   ========================================================= */
const BGM = (() => {
  let ctx = null, master, padBus, padFilter, wet, dry, comp, lfo, lfoGain;
  let fileEl = null, mode = null;        // 'file' | 'synth'
  let playing = false, ducked = false, timer = null, nextTime = 0, bar = 0;
  let volume = parseFloat(store.get('bgmVol', '0.55'));
  const listeners = new Set();
  const CH = 7.2; // seconds per chord
  // D minor : i – VI – III – VII – i – iv – VI – V
  const PROG = [
    [38, [50, 57, 62, 65]], [34, [46, 53, 58, 62]], [41, [48, 53, 57, 60]], [36, [48, 55, 60, 64]],
    [38, [50, 57, 62, 65]], [43, [50, 55, 58, 62]], [34, [46, 53, 58, 65]], [45, [49, 52, 57, 64]]
  ];
  const BELL = { 0:[74,77,81,86,84], 1:[74,77,82,86], 2:[77,81,84,88], 3:[76,79,84,86], 4:[74,77,81,86,89], 5:[74,79,82,86], 6:[77,82,86,89], 7:[76,81,85,88] };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const emit = () => listeners.forEach(f => f(playing));

  function impulse(sec, decay){
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++){
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function build(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(5.5, 2.6);
    wet = ctx.createGain(); wet.gain.value = .62;
    dry = ctx.createGain(); dry.gain.value = .55;
    verb.connect(wet).connect(master); dry.connect(master);
    wet._in = verb;
    padBus = ctx.createGain(); padBus.gain.value = 1;
    padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 820; padFilter.Q.value = .6;
    padBus.connect(padFilter); padFilter.connect(dry); padFilter.connect(verb);
    lfo = ctx.createOscillator(); lfo.frequency.value = .05;
    lfoGain = ctx.createGain(); lfoGain.gain.value = 360;
    lfo.connect(lfoGain).connect(padFilter.frequency); lfo.start();
    return true;
  }
  function pad(t, notes){
    notes.forEach((m, i) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.034, t + 2.6);
      g.gain.setValueAtTime(.034, t + CH - .4);
      g.gain.linearRampToValueAtTime(0, t + CH + 3.2);
      g.connect(padBus);
      [-7, 7].forEach(det => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.frequency.value = hz(m); o.detune.value = det + (Math.random() * 4 - 2);
        o.connect(g); o.start(t); o.stop(t + CH + 3.4);
      });
    });
  }
  function bass(t, m){
    const g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m);
    o2.type = 'triangle'; o2.frequency.value = hz(m + 12); g2.gain.value = .25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.14, t + 1.8);
    g.gain.setValueAtTime(.14, t + CH - .3); g.gain.linearRampToValueAtTime(0, t + CH + 1.5);
    o.connect(g); o2.connect(g2).connect(g); g.connect(dry);
    o.start(t); o2.start(t); o.stop(t + CH + 1.6); o2.stop(t + CH + 1.6);
  }
  function bell(t, m, v){
    const g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m);
    o2.type = 'sine'; o2.frequency.value = hz(m) * 2.76; g2.gain.value = .18;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t + 3.4);
    o.connect(g); o2.connect(g2).connect(g);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan){ pan.pan.value = Math.random() * 1.2 - .6; g.connect(pan); pan.connect(wet._in); pan.connect(dry); }
    else { g.connect(wet._in); }
    o.start(t); o2.start(t); o.stop(t + 3.5); o2.stop(t + 3.5);
  }
  function drum(t){
    const g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(42, t + .5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    o.connect(g); g.connect(dry); g.connect(wet._in);
    o.start(t); o.stop(t + 1.7);
  }
  function scheduleBar(t){
    const i = bar % PROG.length, [b, notes] = PROG[i];
    pad(t, notes); bass(t, b);
    if (i % 2 === 0) drum(t + .05);
    if (i === 3 || i === 7) drum(t + CH * .75);
    const pool = BELL[i], n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++){
      const at = t + 1.2 + Math.random() * (CH - 1.8);
      bell(at, pool[Math.floor(Math.random() * pool.length)], .05 + Math.random() * .035);
    }
    bar++;
  }
  function tick(){
    if (!playing || !ctx) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + .1;
    while (nextTime < ctx.currentTime + 2.5){ scheduleBar(nextTime); nextTime += CH; }
  }
  const level = () => volume * (ducked ? .18 : 1);

  function probeFile(){
    return new Promise(res => {
      const a = new Audio(); let done = false;
      const fin = ok => { if (done) return; done = true; res(ok ? a : null); };
      a.addEventListener('canplaythrough', () => fin(true), { once:true });
      a.addEventListener('error', () => fin(false), { once:true });
      setTimeout(() => fin(false), 2500);
      a.preload = 'auto'; a.loop = true; a.src = BGM_FILE;
    });
  }
  async function ensure(){
    if (mode) return true;
    fileEl = await probeFile();
    if (fileEl){ mode = 'file'; return true; }
    if (build()){ mode = 'synth'; return true; }
    return false;
  }
  async function play(){
    if (!(await ensure())) return false;
    playing = true; store.set('bgm', 'on');
    if (mode === 'file'){
      fileEl.volume = 0;
      try { await fileEl.play(); } catch(e){ playing = false; emit(); return false; }
      fadeFile(level(), 2500);
    } else {
      try { await ctx.resume(); } catch(e){}
      if (ctx.state !== 'running'){ playing = false; emit(); return false; }
      nextTime = ctx.currentTime + .15;
      const g = master.gain; g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(level(), ctx.currentTime + 3);
      tick(); clearInterval(timer); timer = setInterval(tick, 400);
    }
    emit(); return true;
  }
  let fadeRaf = null;
  function fadeFile(to, ms, after){
    cancelAnimationFrame(fadeRaf);
    const from = fileEl.volume, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      fileEl.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) fadeRaf = requestAnimationFrame(step); else if (after) after();
    };
    fadeRaf = requestAnimationFrame(step);
  }
  function stop(save = true){
    if (!playing) return;
    playing = false; if (save) store.set('bgm', 'off');
    if (mode === 'file'){ fadeFile(0, 900, () => fileEl.pause()); }
    else if (ctx){
      const g = master.gain; g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      clearInterval(timer);
      setTimeout(() => { if (!playing) ctx.suspend(); }, 1400);
    }
    emit();
  }
  function apply(){
    if (!playing) return;
    if (mode === 'file') fadeFile(level(), 500);
    else if (ctx){ const g = master.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(level(), ctx.currentTime + .5); }
  }
  return {
    play, stop,
    toggle(){ return playing ? (stop(), false) : play(); },
    get playing(){ return playing; },
    setVolume(v){ volume = v; store.set('bgmVol', String(v)); apply(); },
    get volume(){ return volume; },
    duck(on){ ducked = on; apply(); },
    on(f){ listeners.add(f); }
  };
})();
window.BGM = BGM;

/* =========================================================
   Header controls
   ========================================================= */
function initHeader(){
  const box = $('.bgm'); if (!box) return;
  const btn = $('.bgm-btn', box), rng = $('input[type=range]', box), lbl = $('.bgm-label', box);
  const sync = on => {
    box.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'BGM 끄기' : 'BGM 켜기';
    if (lbl) lbl.textContent = on ? 'BGM ON' : 'BGM OFF';
  };
  BGM.on(sync); sync(false);
  btn.addEventListener('click', () => BGM.toggle());
  if (rng){ rng.value = BGM.volume; rng.addEventListener('input', () => BGM.setVolume(parseFloat(rng.value))); }
  const mb = $('.menu-btn'), links = $('.nav-links');
  if (mb) mb.addEventListener('click', () => links.classList.toggle('open'));
  links && links.addEventListener('click', e => { if (e.target.closest('a')) links.classList.remove('open'); });
}

function toast(msg, ms = 2600){
  let t = $('.toast'); if (!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms);
}

/* =========================================================
   Intro gate (index only, once per session)
   ========================================================= */
function initGate(){
  const gate = $('.gate');
  const pref = store.get('bgm', 'on');
  if (!gate){ resumeOnGesture(pref); return; }
  if (store.sget('gate')){ gate.remove(); resumeOnGesture(pref); return; }
  document.documentElement.style.overflow = 'hidden';
  const cv = $('canvas', gate); const stopFx = cv ? embers(cv, 70) : () => {};
  const close = async withSound => {
    store.sset('gate', '1');
    if (withSound) BGM.play(); else store.set('bgm', 'off');
    gate.classList.add('hide');
    document.documentElement.style.overflow = '';
    setTimeout(() => { stopFx(); gate.remove(); }, 1000);
  };
  $('[data-enter=sound]', gate).addEventListener('click', () => close(true));
  $('[data-enter=mute]', gate).addEventListener('click', () => close(false));
}
function resumeOnGesture(pref){
  if (pref !== 'on' || BGM.playing) return;
  const go = () => { BGM.play(); off(); };
  const off = () => ['pointerdown', 'keydown'].forEach(ev => window.removeEventListener(ev, go, true));
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, go, true));
}

/* =========================================================
   Ember particles
   ========================================================= */
function embers(cv, count = 60){
  const c = cv.getContext('2d'); let w, h, raf, dpr = Math.min(2, window.devicePixelRatio || 1);
  const ps = [];
  const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); window.addEventListener('resize', resize);
  const spawn = (init) => ({ x: Math.random() * w, y: init ? Math.random() * h : h + 10, r: Math.random() * 1.8 + .4,
    vy: -(Math.random() * .45 + .12), vx: Math.random() * .3 - .15, a: Math.random() * .6 + .2, t: Math.random() * 6.28,
    hue: Math.random() < .8 ? 36 : 14 });
  for (let i = 0; i < count; i++) ps.push(spawn(true));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = () => {
    if (!cv.isConnected){ cancel(); return; }
    c.clearRect(0, 0, w, h);
    for (const p of ps){
      p.t += .02; p.y += p.vy; p.x += p.vx + Math.sin(p.t) * .2;
      if (p.y < -10) Object.assign(p, spawn(false));
      const fl = p.a * (.7 + Math.sin(p.t * 3) * .3);
      c.beginPath(); c.fillStyle = `hsla(${p.hue},85%,65%,${fl})`;
      c.shadowColor = `hsla(${p.hue},90%,60%,1)`; c.shadowBlur = 8;
      c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
    }
    raf = requestAnimationFrame(loop);
  };
  const cancel = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  if (!reduce) loop();
  return cancel;
}

/* =========================================================
   Lightbox
   ========================================================= */
const LB = (() => {
  let el, img, cap, list = [], idx = 0;
  function mk(){
    el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<img alt=""><div class="cap"></div><button class="x" aria-label="닫기">✕</button><button class="pv" aria-label="이전">‹</button><button class="nx" aria-label="다음">›</button>';
    document.body.appendChild(el); img = $('img', el); cap = $('.cap', el);
    $('.x', el).onclick = close; $('.pv', el).onclick = () => show(idx - 1); $('.nx', el).onclick = () => show(idx + 1);
    el.addEventListener('click', e => { if (e.target === el) close(); });
    document.addEventListener('keydown', e => {
      if (!el.classList.contains('on')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1);
    });
  }
  function show(i){
    idx = (i + list.length) % list.length; const it = list[idx];
    img.src = it.src; img.alt = it.cap || ''; cap.textContent = (it.cap || '') + (list.length > 1 ? `  (${idx + 1}/${list.length})` : '');
    $('.pv', el).style.display = $('.nx', el).style.display = list.length > 1 ? '' : 'none';
  }
  function open(items, i){ if (!el) mk(); list = items; el.classList.add('on'); show(i); }
  function close(){ el.classList.remove('on'); }
  return { open };
})();

document.addEventListener('click', e => {
  // work card: swap thumbnail for inline video
  const vb = e.target.closest('[data-video]');
  if (vb){
    const th = $('.thumb', vb.closest('.work'));
    if (th){ th.innerHTML = `<video src="${vb.dataset.video}" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video>`; th.style.cursor = 'default'; delete th.dataset.images; vb.remove(); }
    return;
  }
  const t = e.target.closest('[data-images], [data-lb], figure img, .strip button');
  if (!t || t.closest('a') || t.closest('.widget')) return;
  // work card thumb with data-images list
  if (t.dataset.images){
    const caps = (t.dataset.caps || '').split('|');
    LB.open(t.dataset.images.split('|').map((s, i) => ({ src: s, cap: caps[i] || t.dataset.title || '' })), 0); return;
  }
  const scope = t.closest('[data-gallery]') || t.closest('figure') || t.parentElement;
  const nodes = $$('figure img, .strip button, [data-lb]', scope).filter(n => !n.dataset.images);
  const items = nodes.map(n => {
    const im = n.tagName === 'IMG' ? n : $('img', n);
    const fc = n.closest('figure') && $('figcaption', n.closest('figure'));
    return { src: n.dataset.full || im.dataset.full || im.currentSrc || im.src, cap: n.dataset.cap || (fc ? fc.textContent : im.alt) };
  });
  LB.open(items, Math.max(0, nodes.indexOf(t)));
});

/* =========================================================
   Video → BGM ducking
   ========================================================= */
document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO' && !e.target.muted) BGM.duck(true); }, true);
const unduck = () => { if (!$$('video').some(v => !v.paused && !v.muted)) BGM.duck(false); };
document.addEventListener('pause', e => { if (e.target.tagName === 'VIDEO') unduck(); }, true);
document.addEventListener('ended', e => { if (e.target.tagName === 'VIDEO') unduck(); }, true);
document.addEventListener('volumechange', e => { if (e.target.tagName === 'VIDEO'){ if (!e.target.paused && !e.target.muted) BGM.duck(true); else unduck(); } }, true);

/* =========================================================
   Per-page init (also after page transitions)
   ========================================================= */
let pageCleanups = [];
function initPage(){
  pageCleanups.forEach(f => { try{ f(); }catch(e){} }); pageCleanups = [];
  const main = $('main'); const page = document.body.dataset.page || '';

  // nav active state
  $$('.nav-links a').forEach(a => a.classList.toggle('on', a.dataset.nav === page));

  // reveal
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv', main).forEach(n => io.observe(n));
  pageCleanups.push(() => io.disconnect());

  // hero embers + slideshow
  const cv = $('.hero canvas.embers', main); if (cv) pageCleanups.push(embers(cv, 46));
  const shots = $$('.hero-bg .shot', main);
  if (shots.length){
    let k = 0; shots[0].classList.add('on');
    const h = setInterval(() => { shots[k].classList.remove('on'); k = (k + 1) % shots.length; shots[k].classList.add('on'); }, 6500);
    pageCleanups.push(() => clearInterval(h));
  }

  // tabs
  $$('[role=tablist]', main).forEach(tl => {
    const btns = $$('button', tl);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); $('#' + x.getAttribute('aria-controls')).classList.toggle('on', on); });
    }));
  });

  // TOC highlight (detail pages)
  const toc = $('.toc', main);
  if (toc){
    const links = $$('a', toc), map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const tio = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting){ links.forEach(a => a.classList.remove('on')); const a = map.get(en.target.id); a && a.classList.add('on'); }
    }), { rootMargin: '-30% 0px -60% 0px' });
    $$('.chapter[id]', main).forEach(c => tio.observe(c));
    pageCleanups.push(() => tio.disconnect());
  }

  // widgets
  if (window.Widgets) $$('[data-widget]', main).forEach(w => { const f = window.Widgets[w.dataset.widget]; if (f && !w._init){ w._init = true; f(w); } });
}

/* =========================================================
   Soft page transitions (keeps BGM playing across pages)
   ========================================================= */
const canSoft = location.protocol === 'http:' || location.protocol === 'https:';
async function go(url, push = true){
  const u = new URL(url, location.href);
  try {
    const res = await fetch(u.href, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const nm = $('main', doc); if (!nm) throw new Error('no main');
    const cur = $('main');
    $$('video', cur).forEach(v => v.pause());
    cur.classList.add('leaving'); await wait(230);
    cur.replaceWith(nm); nm.classList.add('entering');
    document.title = doc.title; document.body.dataset.page = doc.body.dataset.page || '';
    if (push) history.pushState({ soft: 1 }, '', u.href);
    if (u.hash){ const t = document.getElementById(decodeURIComponent(u.hash.slice(1))); if (t){ requestAnimationFrame(() => t.scrollIntoView()); } else window.scrollTo(0, 0); }
    else window.scrollTo({ top: 0, behavior: 'instant' });
    initPage();
  } catch (e){ location.href = u.href; }
}
if (canSoft){
  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (u.origin !== location.origin || !/(\.html|\/)$/.test(u.pathname)) return;
    if (u.pathname === location.pathname){ if (u.hash) return; e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    e.preventDefault(); go(u.href);
  });
  window.addEventListener('popstate', () => go(location.href, false));
}

document.addEventListener('DOMContentLoaded', () => { initHeader(); initGate(); initPage(); });
window.addEventListener('keydown', e => { if (e.key === 'm' && !/input|textarea/i.test(e.target.tagName) && !e.ctrlKey && !e.metaKey){ BGM.toggle(); } });
window.toast = toast;
})();
