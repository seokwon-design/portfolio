/* =========================================================
   widgets.js — 기획한 규칙을 직접 만져볼 수 있는 인터랙티브 데모
   (실제 게임 데이터가 아닌, 포트폴리오에 공개한 예시 수치 기반)
   ========================================================= */
(() => {
'use strict';
const $ = (s, r) => r.querySelector(s);
const $$ = (s, r) => Array.from(r.querySelectorAll(s));
const fmt = (n, d = 1) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(/\.0+$/, '');
const W = {};

/* ---------------------------------------------------------
   1) 장비 강화 결과 확률 계산기
   --------------------------------------------------------- */
W.enhanceCalc = el => {
  el.innerHTML = `
  <div class="widget-head"><h4>강화 결과 확률 계산기</h4><small>포트폴리오 예시: 기본 30% + 일반 7%p + 특수 3%p, 유지 0.5 · 하락 0.3</small></div>
  <div class="widget-body"><div class="w-grid">
    <div>
      <div class="field"><label>기본 성공 확률 <output data-o="base"></output></label><input type="range" data-k="base" min="1" max="100" step="1" value="30"></div>
      <div class="field"><label>일반 보조재 보정 <output data-o="gen"></output></label><input type="range" data-k="gen" min="0" max="40" step="0.5" value="7"><div class="hint" data-h="gen"></div></div>
      <div class="field"><label>특수 보조재 보정 <output data-o="spe"></output></label><input type="range" data-k="spe" min="0" max="40" step="0.5" value="3"><div class="hint" data-h="spe"></div></div>
      <div class="field"><label>전역 최대 성공 확률 (GlobalFactor) <output data-o="cap"></output></label><input type="range" data-k="cap" min="5" max="100" step="1" value="60"></div>
      <div class="field"><label>RetainWeight (실패 중 유지 비중) <output data-o="rw"></output></label><input type="range" data-k="rw" min="0" max="1" step="0.05" value="0.5"></div>
      <div class="field"><label>DropWeight (실패 중 하락 비중) <output data-o="dw"></output></label><input type="range" data-k="dw" min="0" max="1" step="0.05" value="0.3"><div class="hint">RetainWeight + DropWeight ≤ 1 · 나머지가 파괴 비중</div></div>
    </div>
    <div>
      <div class="rowlbl">방지권 사용 설정</div>
      <div class="seg" data-ticket>
        <button data-t="none" aria-pressed="true">사용 안 함</button>
        <button data-t="drop" aria-pressed="false">하락 방지권</button>
        <button data-t="des" aria-pressed="false">파괴 방지권</button>
      </div>
      <div class="w-note" data-tnote></div>
      <div class="rowlbl" style="margin-top:20px">최종 결과 확률</div>
      <div class="stack"><div class="k-suc"></div><div class="k-ret"></div><div class="k-drop"></div><div class="k-des"></div></div>
      <div class="legend">
        <div><span><i class="k-suc"></i>성공</span><b data-r="suc"></b></div>
        <div><span><i class="k-ret"></i>유지</span><b data-r="ret"></b></div>
        <div><span><i class="k-drop"></i>하락</span><b data-r="drop"></b></div>
        <div><span><i class="k-des"></i>파괴</span><b data-r="des"></b></div>
      </div>
      <div class="w-note" data-calc></div>
      <div class="w-actions"><button class="btn sm primary" data-roll>강화 1회 시도</button><button class="btn sm" data-roll100>1,000회 시뮬레이션</button></div>
      <div class="result" data-res><span class="muted">시도 결과가 여기에 표시됩니다.</span></div>
    </div>
  </div></div>`;
  const S = { base:30, gen:7, spe:3, cap:60, rw:.5, dw:.3, t:'none' };
  let P = {};
  const inputs = $$('input[type=range]', el);
  const calc = () => {
    if (S.rw + S.dw > 1){ S.dw = Math.round((1 - S.rw) * 100) / 100; $('[data-k=dw]', el).value = S.dw; }
    const genE = Math.min(S.gen, S.base), speE = Math.min(S.spe, S.base);
    const raw = S.base + genE + speE, suc = Math.min(raw, S.cap, 100);
    const fail = 100 - suc, desW = Math.max(0, 1 - S.rw - S.dw);
    let ret = fail * S.rw, drop = fail * S.dw, des = fail * desW;
    // 방지권 사용 가능 여부
    const canDrop = drop > 0 && des === 0, canDes = des > 0;
    if (S.t === 'drop' && !canDrop) S.t = 'none';
    if (S.t === 'des' && !canDes) S.t = 'none';
    let tnote = '';
    if (S.t === 'drop'){ ret += drop; tnote = `하락 결과(${fmt(drop)}%)를 유지로 변경 · 강화 시 결과와 관계없이 1개 소모`; drop = 0; }
    if (S.t === 'des'){ ret += des; tnote = `파괴 결과(${fmt(des)}%)를 유지로 변경 · 하락은 보호하지 않음 · 결과와 관계없이 1개 소모`; des = 0; }
    $('[data-t=drop]', el).disabled = !canDrop; $('[data-t=des]', el).disabled = !canDes;
    $$('[data-t]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.t === S.t));
    const tn = $('[data-tnote]', el);
    if (!tnote){
      tnote = des > 0 && drop > 0 ? '하락·파괴 위험이 함께 있는 구간 → 파괴 방지권만 사용할 수 있습니다.'
            : des > 0 ? '파괴 위험 구간 → 파괴 방지권 사용 가능'
            : drop > 0 ? '하락 위험만 있는 구간 → 하락 방지권 사용 가능' : '실패 위험이 없는 구간입니다.';
    }
    tn.textContent = tnote;
    P = { suc, ret, drop, des };
    const bars = $$('.stack > div', el);
    [suc, ret, drop, des].forEach((v, i) => { bars[i].style.flexGrow = v; bars[i].style.flexBasis = 0; bars[i].textContent = v >= 7 ? fmt(v) + '%' : ''; });
    $('[data-r=suc]', el).textContent = fmt(suc) + '%'; $('[data-r=ret]', el).textContent = fmt(ret) + '%';
    $('[data-r=drop]', el).textContent = fmt(drop) + '%'; $('[data-r=des]', el).textContent = fmt(des) + '%';
    $('[data-o=base]', el).textContent = S.base + '%'; $('[data-o=gen]', el).textContent = '+' + S.gen + '%p'; $('[data-o=spe]', el).textContent = '+' + S.spe + '%p';
    $('[data-o=cap]', el).textContent = S.cap + '%'; $('[data-o=rw]', el).textContent = S.rw.toFixed(2); $('[data-o=dw]', el).textContent = S.dw.toFixed(2);
    $('[data-h=gen]', el).textContent = S.gen > S.base ? `기본 성공 확률(${S.base}%)을 넘는 보정은 반영하지 않음 → +${genE}%p 적용` : '보정 상한 = 기본 성공 확률';
    $('[data-h=spe]', el).textContent = S.spe > S.base ? `기본 성공 확률을 넘는 보정은 반영하지 않음 → +${speE}%p 적용` : '보정 상한 = 기본 성공 확률';
    const c = $('[data-calc]', el);
    c.innerHTML = `만분율 기준: 기본 ${S.base * 100} + 일반 ${genE * 100} + 특수 ${speE * 100} = ${raw * 100}` +
      (raw > suc ? ` → 전역 최대값 적용 <b style="color:var(--warn)">${suc * 100}</b>` : '') +
      `<br>실패 ${fmt(fail)}% × (유지 ${S.rw} / 하락 ${S.dw} / 파괴 ${fmt(desW, 2)}) — 비중은 전체가 아닌 <b>실패 확률 안에서의</b> 비율`;
  };
  inputs.forEach(i => i.addEventListener('input', () => { S[i.dataset.k] = parseFloat(i.value); if (i.dataset.k === 'rw' && S.rw + S.dw > 1){ S.dw = Math.round((1 - S.rw) * 100) / 100; $('[data-k=dw]', el).value = S.dw; } if (i.dataset.k === 'dw' && S.rw + S.dw > 1){ S.rw = Math.round((1 - S.dw) * 100) / 100; $('[data-k=rw]', el).value = S.rw; } calc(); }));
  $$('[data-t]', el).forEach(b => b.addEventListener('click', () => { S.t = b.dataset.t; calc(); }));
  const roll = () => { const r = Math.random() * 100; return r < P.suc ? 'suc' : r < P.suc + P.ret ? 'ret' : r < P.suc + P.ret + P.drop ? 'drop' : 'des'; };
  const NAMES = { suc:['강화 성공', 'var(--gold-2)', '강화 단계 +1'], ret:['유지', 'var(--info)', '강화 단계 변화 없음'], drop:['하락', '#c9c2b8', '강화 단계 -1'], des:['파괴', 'var(--bad)', '장비 파괴'] };
  const res = $('[data-res]', el);
  $('[data-roll]', el).addEventListener('click', () => {
    const k = roll(), [n, col, d] = NAMES[k];
    const prot = (S.t !== 'none') ? ` · ${S.t === 'drop' ? '하락' : '파괴'} 방지권 1개 소모` : '';
    const mega = (k === 'suc' || k === 'des') ? ' <span class="tag gold">확성기 출력 조건 체크</span>' : '';
    res.innerHTML = `<span class="big" style="color:${col}">${n}</span><span class="muted">${d}${prot}</span>${mega}`;
    res.classList.remove('flash'); void res.offsetWidth; res.classList.add('flash');
  });
  $('[data-roll100]', el).addEventListener('click', () => {
    const c = { suc:0, ret:0, drop:0, des:0 }; for (let i = 0; i < 1000; i++) c[roll()]++;
    res.innerHTML = `<span class="muted">1,000회 →</span> 성공 <b>${c.suc}</b> · 유지 <b>${c.ret}</b> · 하락 <b>${c.drop}</b> · 파괴 <b>${c.des}</b>`;
    res.classList.remove('flash'); void res.offsetWidth; res.classList.add('flash');
  });
  calc();
};

/* ---------------------------------------------------------
   2) 일반 보조재 수량 자동 조정
   --------------------------------------------------------- */
W.auxAdjust = el => {
  const M = { A:{ u:1, max:40 }, B:{ u:2, max:20 }, C:{ u:4, max:10 } }; // u: 0.01%p 단위
  const CAP = 100;
  let cnt, order;
  const reset = () => { cnt = { A:0, B:0, C:0 }; order = []; };
  el.innerHTML = `
  <div class="widget-head"><h4>보조재 등록 · 자동 조정 데모</h4><small>일반 보조재 합산 상한 +1.00%p</small></div>
  <div class="widget-body"><div class="w-grid">
    <div>
      <div class="mats">${Object.keys(M).map(k => `
        <div class="mat" data-m="${k}"><div class="nm">${k}</div>
          <div class="info">1개당 +${(M[k].u / 100).toFixed(2)}%p · 최대 ${M[k].max}개<br><b data-c="${k}">0개</b> <span data-v="${k}"></span></div>
          <div class="ctr"><button data-dec="${k}" aria-label="${k} 빼기">−</button><button data-inc="${k}" aria-label="${k} 추가">+</button></div>
        </div>`).join('')}
      </div>
      <div class="w-actions"><button class="btn sm" data-demo>포트폴리오 예시 재현 (A40·B20·C5 → C 추가)</button><button class="btn sm ghost" data-reset>초기화</button></div>
    </div>
    <div>
      <div class="rowlbl">합산 보정</div>
      <div class="meter"><i></i></div>
      <div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span data-total></span><span>상한 +1.00%p</span></div>
      <div class="rowlbl" style="margin-top:16px">등록 순서 <span class="muted" style="letter-spacing:0">(마지막이 가장 최근)</span></div>
      <div data-order class="tags"></div>
      <div class="rowlbl" style="margin-top:16px">처리 로그</div>
      <div class="logbox" data-log><span class="muted">재료를 추가해 보세요. 상한을 넘으면 최근 입력은 유지하고, 기존 재료를 등록 역순으로 줄입니다.</span></div>
    </div>
  </div></div>`;
  const total = () => Object.keys(cnt).reduce((s, k) => s + cnt[k] * M[k].u, 0);
  const log = (html) => { const l = $('[data-log]', el); if (l.querySelector('.muted')) l.innerHTML = ''; l.insertAdjacentHTML('afterbegin', `<div>${html}</div>`); };
  const draw = (flash = []) => {
    Object.keys(M).forEach(k => {
      $(`[data-c=${k}]`, el).textContent = cnt[k] + '개';
      $(`[data-v=${k}]`, el).textContent = cnt[k] ? `/ +${(cnt[k] * M[k].u / 100).toFixed(2)}%p` : '';
      const m = $(`[data-m=${k}]`, el); m.classList.toggle('flash', flash.includes(k));
    });
    const t = total();
    $('.meter i', el).style.width = Math.min(100, t / CAP * 100) + '%';
    $('[data-total]', el).innerHTML = `적용 <b style="color:#fff">+${(Math.min(t, CAP) / 100).toFixed(2)}%p</b>` + (t > CAP ? ` <span style="color:var(--warn)">(초과 ${((t - CAP) / 100).toFixed(2)}%p 미반영)</span>` : '');
    $('[data-order]', el).innerHTML = order.filter(k => cnt[k] > 0).map(k => `<span class="tag gold">${k}</span>`).join('<span class="muted">→</span>') || '<span class="muted">-</span>';
  };
  const inc = (k, n = 1, quiet = false) => {
    let added = 0;
    for (let i = 0; i < n; i++){ if (cnt[k] < M[k].max){ cnt[k]++; added++; } }
    if (!added){ log(`<span class="warn">${k}: 최대 등록 개수(${M[k].max}개) 도달</span>`); draw(); return; }
    order = order.filter(x => x !== k); order.push(k);
    let over = total() - CAP; const adj = {};
    if (over > 0){
      for (const m of order.slice(0, -1).reverse()){
        while (over > 0 && cnt[m] > 0){ cnt[m]--; over -= M[m].u; adj[m] = (adj[m] || 0) + 1; }
        if (over <= 0) break;
      }
    }
    const adjTxt = Object.keys(adj).map(m => `${m} ${adj[m]}개 차감`).join(', ');
    if (!quiet){
      let line = `<span class="info">${k} +${added}</span>`;
      if (adjTxt) line += ` → 상한 초과, <span class="warn">${adjTxt}</span>`;
      if (over > 0) line += ` → <span class="bad">조정할 재료 없음: 등록은 하되 초과분 미반영</span>`;
      log(line);
    }
    draw(Object.keys(adj));
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.inc) inc(b.dataset.inc);
    if (b.dataset.dec){ const k = b.dataset.dec; if (cnt[k] > 0){ cnt[k]--; log(`${k} -1`); draw(); } }
    if (b.hasAttribute('data-reset')){ reset(); $('[data-log]', el).innerHTML = '<span class="muted">초기화했습니다.</span>'; draw(); }
    if (b.hasAttribute('data-demo')){
      reset(); $('[data-log]', el).innerHTML = '';
      inc('A', 40, true); inc('B', 20, true); inc('C', 5, true);
      log('등록 전: A 40개(+0.40) · B 20개(+0.40) · C 5개(+0.20) = <b>+1.00%p</b>');
      setTimeout(() => inc('C', 5), 500);
    }
  });
  reset(); draw();
};

/* ---------------------------------------------------------
   3) 에테르 코어 장착 시뮬레이터
   --------------------------------------------------------- */
W.etherSim = el => {
  const SLOT_DIST = [31, 31, 22, 11, 5];          // 1~5 슬롯 생성 확률 (6티어 이상)
  const SUCCESS = [100, 80, 50, 30, 20];          // n번째 장착 성공 확률
  const DESTROY = [0, 0, 30, 40, 50];             // 실패 후 기존 코어 파괴 판정 확률
  const FX = {
    red:   { n:'레드',   c:'c-red',    Amulet:'공격 시 피해 +12%', Ring:'공격 치명도 +15%', Belt:'마나 물약 효과 +6%' },
    blue:  { n:'블루',   c:'c-blue',   Amulet:'주문 시 피해 +12%', Ring:'주문 치명도 +15%', Belt:'생명력 물약 효과 +6%' },
    yellow:{ n:'옐로우', c:'c-yellow', Amulet:'치명타 피해 +12%', Ring:'골드 획득량 +3%', Belt:'능력치 +6' },
    green: { n:'그린',   c:'c-green',  Amulet:'정예에게 피해 +18%', Ring:'처치 경험치 +3%', Belt:'적중도 +240' }
  };
  const PARTS = { Amulet:'목걸이', Ring:'반지', Belt:'벨트' };
  let slots = 0, cores = [], color = 'red', part = 'Amulet', tries = 0;
  el.innerHTML = `
  <div class="widget-head"><h4>에테르 코어 장착 시뮬레이터</h4><small>슬롯 정책 예시 EtherCoreSlotKey 11001 · 희귀 코어 기준</small></div>
  <div class="widget-body"><div class="w-grid">
    <div>
      <div class="rowlbl">① 장비 획득 — 슬롯 수 결정</div>
      <div class="seg" data-part>${Object.keys(PARTS).map(p => `<button data-p="${p}" aria-pressed="${p === part}">${PARTS[p]}</button>`).join('')}</div>
      <div class="w-actions"><button class="btn sm primary" data-acquire>6티어 액세서리 획득</button></div>
      <div class="w-note">슬롯 생성 확률 · 1개 31% / 2개 31% / 3개 22% / 4개 11% / 5개 5%</div>
      <div class="rowlbl" style="margin-top:18px">② 장착할 코어 선택</div>
      <div class="coresel">${Object.keys(FX).map(k => `<button data-c="${k}" aria-pressed="${k === color}"><i class="${FX[k].c}"></i>${FX[k].n}</button>`).join('')}</div>
      <div class="part-fx" data-fx></div>
    </div>
    <div>
      <div class="acc" data-slots></div>
      <div class="rowlbl" style="margin-top:16px">다음 장착 결과 확률 <span class="muted" data-nth style="letter-spacing:0"></span></div>
      <div class="stack"><div class="k-suc"></div><div class="k-ret"></div><div class="k-des"></div></div>
      <div class="legend"><div><span><i class="k-suc"></i>장착 성공</span><b data-ps></b></div><div><span><i class="k-ret"></i>일반 실패</span><b data-pf></b></div><div><span><i class="k-des"></i>기존 코어 파괴</span><b data-pd></b></div><div><span>누적 시도</span><b data-tries>0</b></div></div>
      <div class="w-actions"><button class="btn sm primary" data-insert>코어 장착 시도</button></div>
      <div class="logbox" data-log style="margin-top:12px"><span class="muted">먼저 액세서리를 획득해 슬롯 수를 결정하세요.</span></div>
      <div class="w-note" data-sum></div>
    </div>
  </div></div>`;
  const log = (h) => { const l = $('[data-log]', el); if (l.querySelector('.muted')) l.innerHTML = ''; l.insertAdjacentHTML('afterbegin', `<div>${h}</div>`); };
  const drawFx = () => {
    $('[data-fx]', el).innerHTML = Object.keys(PARTS).map(p => `<div class="${p === part ? 'on' : ''}"><b>${PARTS[p]}</b>${FX[color][p]}</div>`).join('');
  };
  const draw = (boom = []) => {
    const box = $('[data-slots]', el); let h = '';
    for (let i = 0; i < 5; i++){
      if (slots === 0 || i >= slots){ h += `<div class="slot locked"></div>`; continue; }
      const c = cores[i];
      h += `<div class="slot ${i === cores.length ? 'next' : ''} ${boom.includes(i) ? 'boom' : ''}">${c ? `<div class="core ${FX[c].c}"></div>` : (i + 1)}</div>`;
    }
    box.innerHTML = h;
    const k = cores.length, full = slots === 0 || k >= slots;
    $('[data-insert]', el).disabled = full;
    const s = full ? 0 : SUCCESS[k], f = 100 - s, d = full ? 0 : f * DESTROY[k] / 100, nf = f - d;
    const bars = $$('.stack > div', el);
    [s, nf, d].forEach((v, i) => { bars[i].style.flexGrow = full ? (i === 0 ? 1 : 0) : v; bars[i].style.flexBasis = 0; bars[i].textContent = !full && v >= 8 ? fmt(v) + '%' : ''; });
    $('[data-ps]', el).textContent = full ? '-' : fmt(s) + '%'; $('[data-pf]', el).textContent = full ? '-' : fmt(nf) + '%'; $('[data-pd]', el).textContent = full ? '-' : fmt(d) + '%';
    $('[data-nth]', el).textContent = slots === 0 ? '' : full ? '— 모든 슬롯 장착 완료' : `— ${k + 1}번째 슬롯`;
    $('[data-tries]', el).textContent = tries;
    const sum = {}; cores.forEach(c => sum[c] = (sum[c] || 0) + 1);
    $('[data-sum]', el).innerHTML = cores.length ? `${PARTS[part]}에 발현 중: ` + Object.keys(sum).map(c => `${FX[c][part]} ×${sum[c]}`).join(' · ') : '';
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p){ part = b.dataset.p; $$('[data-p]', el).forEach(x => x.setAttribute('aria-pressed', x === b)); drawFx(); draw(); }
    if (b.dataset.c){ color = b.dataset.c; $$('[data-c]', el).forEach(x => x.setAttribute('aria-pressed', x === b)); drawFx(); }
    if (b.hasAttribute('data-acquire')){
      let r = Math.random() * 100, n = 0; while (r >= SLOT_DIST[n]){ r -= SLOT_DIST[n]; n++; }
      slots = n + 1; cores = []; tries = 0;
      $('[data-log]', el).innerHTML = '';
      log(`<span class="info">${PARTS[part]} 획득 → 에테르 코어 슬롯 ${slots}개 생성</span>`);
      draw();
    }
    if (b.hasAttribute('data-insert')){
      const k = cores.length; if (k >= slots) return; tries++;
      const ok = Math.random() * 100 < SUCCESS[k];
      if (ok){ cores.push(color); log(`<span class="ok">${k + 1}번째 슬롯 장착 성공</span> — ${FX[color].n} 코어 · ${FX[color][part]}`); draw(); return; }
      let line = `<span class="warn">${k + 1}번째 장착 실패</span> — 시도한 코어 소멸`;
      const des = cores.length > 0 && Math.random() * 100 < DESTROY[k];
      if (des){
        const n = 1 + Math.floor(Math.random() * cores.length), from = cores.length - n;
        const idx = []; for (let i = from; i < cores.length; i++) idx.push(i);
        line += ` · <span class="bad">파괴 판정 발동: 기존 코어 ${n}개 파괴 (${idx.map(i => i + 1).reverse().join('·')}번, 장착 역순)</span>`;
        draw(idx); setTimeout(() => { cores = cores.slice(0, from); draw(); }, 550);
      } else { line += cores.length ? ' · 기존 코어 유지' : ''; draw(); }
      log(line);
    }
  });
  drawFx(); draw();
};

/* ---------------------------------------------------------
   4) 룬캐스트 프리셋 복원 규칙
   --------------------------------------------------------- */
W.runePreset = el => {
  const RUNES = [['화염 폭풍', ''], ['연쇄 번개', 'r3'], ['피의 서약', 'r2'], ['서리 파동', 'r3'], ['공명', ''], ['분열', 'r2'], ['가속', '']];
  const ST = ['보유', '미보유', '슬롯 잠김'];
  let state = RUNES.map(() => 0), cooling = false;
  el.innerHTML = `
  <div class="widget-head"><h4>프리셋 불러오기 — 부분 성공 규칙 데모</h4><small>각 슬롯의 현재 상태를 바꾼 뒤 불러오기를 실행해 보세요</small></div>
  <div class="widget-body">
    <div class="rowlbl">저장된 프리셋 (룬 UID · 슬롯 위치)</div>
    <div class="runes" data-saved>${RUNES.map(([n, c]) => `<div class="rune has ${c}">${n}</div>`).join('')}</div>
    <div class="rowlbl">현재 보유 상태 <span class="muted" style="letter-spacing:0">(클릭해서 변경)</span></div>
    <div class="state-row" data-state></div>
    <div class="rowlbl" style="margin-top:22px">현재 룬 캐스트</div>
    <div class="runes" data-board>${RUNES.map(() => `<div class="rune">비어 있음</div>`).join('')}</div>
    <div class="w-actions"><button class="btn sm primary" data-load>프리셋 불러오기</button><button class="btn sm ghost" data-rand>상태 무작위</button></div>
    <div class="result" data-res><span class="muted">불러오기 결과 안내가 여기에 표시됩니다.</span></div>
    <div class="w-note">① 기존 장착 해제 → ② 보관함·도감에서 Unique ID로 보유 위치 확인 후 인벤토리 이동 → ③ 저장 위치에 적용. 교체 과정에서 생기는 인벤토리 초과는 예외로 허용합니다.</div>
  </div>`;
  const drawState = () => {
    $('[data-state]', el).innerHTML = state.map((s, i) => `<button data-i="${i}" class="${s ? 'on' : ''}">${ST[s]}</button>`).join('');
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.i !== undefined){ const i = +b.dataset.i; state[i] = (state[i] + 1) % 3; drawState(); }
    if (b.hasAttribute('data-rand')){ state = state.map(() => Math.random() < .7 ? 0 : (Math.random() < .5 ? 1 : 2)); drawState(); }
    if (b.hasAttribute('data-load')){
      const res = $('[data-res]', el);
      if (cooling){ res.innerHTML = '<span style="color:var(--warn)">잠시 후 다시 시도해 주세요. (불러오기 쿨타임)</span>'; return; }
      cooling = true; b.disabled = true;
      const cells = $$('[data-board] .rune', el);
      cells.forEach(c => { c.className = 'rune'; c.textContent = '해제'; });
      res.innerHTML = '<span class="muted">기존 룬 장착 해제 · 보유 위치 확인 중…</span>';
      await new Promise(r => setTimeout(r, 650));
      const miss = [], lock = [];
      for (let i = 0; i < RUNES.length; i++){
        await new Promise(r => setTimeout(r, 120));
        const c = cells[i];
        if (state[i] === 0){ c.className = `rune has ${RUNES[i][1]} applied`; c.textContent = RUNES[i][0]; }
        else if (state[i] === 1){ c.className = 'rune skip applied'; c.textContent = '룬 없음'; miss.push(RUNES[i][0]); }
        else { c.className = 'rune locked applied'; c.textContent = '잠김'; lock.push(i + 1); }
      }
      if (!miss.length && !lock.length){
        res.innerHTML = '<span class="big" style="color:var(--ok)">성공</span><span>룬 프리셋을 정상적으로 불러왔습니다.</span>';
      } else {
        res.innerHTML = `<span class="big" style="color:var(--warn)">부분 성공</span><span>일부 룬을 적용하지 못했습니다.` +
          (miss.length ? ` 미보유: ${miss.join(', ')}.` : '') + (lock.length ? ` 잠긴 슬롯 ${lock.join('·')}번은 건너뜀.` : '') + ` 나머지 구성은 적용했습니다.</span>`;
      }
      res.classList.remove('flash'); void res.offsetWidth; res.classList.add('flash');
      setTimeout(() => { cooling = false; b.disabled = false; }, 1600);
    }
  });
  drawState();
};

/* ---------------------------------------------------------
   5) 이달의 상자 — 버튼 노출 규칙 & 연출 분기
   --------------------------------------------------------- */
W.gachaSim = el => {
  let owned = 7, busy = false;
  const ICONS = ['⚔', '🛡', '◆', '✦', '❖', '☗', '✧', '⬢'];
  const MOTM = ['그림자 군주의 대검', '심연의 왕관', '피의 군주 망토'];
  el.innerHTML = `
  <div class="widget-head"><h4>이달의 상자 — 버튼 규칙 · 연출 분기 데모</h4><small>이달의 아이템 확률은 시연용 임의값(8%)</small></div>
  <div class="widget-body"><div class="w-grid">
    <div class="gacha-stage">
      <div class="gbox" data-box><svg viewBox="0 0 100 100"><defs><linearGradient id="gb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9cd93"/><stop offset="1" stop-color="#7a5b2c"/></linearGradient></defs>
        <rect x="16" y="42" width="68" height="44" rx="5" fill="#2a1f3d" stroke="url(#gb1)" stroke-width="3"/>
        <rect x="12" y="30" width="76" height="16" rx="4" fill="#3a2b55" stroke="url(#gb1)" stroke-width="3"/>
        <rect x="45" y="30" width="10" height="56" fill="url(#gb1)"/><circle cx="50" cy="52" r="7" fill="#a990f5" stroke="#e9cd93" stroke-width="2"/></svg></div>
      <div class="muted" style="font-size:13px">보유 개수 : <b data-own style="color:#fff"></b></div>
      <div class="gbtns" data-btns></div>
      <div class="gres" data-res></div>
      <div class="notice" data-notice></div>
    </div>
    <div>
      <div class="field"><label>보유 상자 수 <output data-o></output></label><input type="range" min="0" max="25" value="7" data-own-r></div>
      <table class="tbl" style="min-width:0;font-size:13.5px"><thead><tr><th>보유 개수</th><th>버튼 상태</th></tr></thead><tbody>
        <tr><td>0개</td><td>1개 열기 딤드 → 클릭 시 유료 상점 이동 팝업</td></tr>
        <tr><td>1~4개</td><td>5개 열기 버튼 컬랩스, 1개 열기만 정렬</td></tr>
        <tr><td>5~9개</td><td>1개 열기 · 5개 열기</td></tr>
        <tr><td>10개 이상</td><td>5개 열기 → 10개 열기로 교체</td></tr>
      </tbody></table>
      <div class="w-note">연출 중에는 열기 버튼 딤드, 입력·씬 이탈(Esc) 불가. 이달의 아이템이 포함되면 희귀 연출(1.5~2초), 아니면 일반 연출(1초 이내). 확성기는 획득 UI 애니메이션이 끝난 뒤 출력합니다.</div>
    </div>
  </div></div>`;
  const draw = () => {
    $('[data-own]', el).textContent = owned; $('[data-o]', el).textContent = owned + '개'; $('[data-own-r]', el).value = owned;
    let h = `<button class="btn sm ${owned === 0 ? '' : 'primary'}" data-open="1" ${busy ? 'disabled' : ''} ${owned === 0 ? 'aria-disabled="true"' : ''}>1개 열기</button>`;
    if (owned >= 10) h += `<button class="btn sm primary" data-open="10" ${busy ? 'disabled' : ''}>10개 열기</button>`;
    else if (owned >= 5) h += `<button class="btn sm primary" data-open="5" ${busy ? 'disabled' : ''}>5개 열기</button>`;
    $('[data-btns]', el).innerHTML = h;
  };
  $('[data-own-r]', el).addEventListener('input', e => { if (busy) return; owned = +e.target.value; draw(); });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-open]'); if (!b || busy) return;
    const n = +b.dataset.open, notice = $('[data-notice]', el);
    if (owned < n){ notice.style.color = 'var(--bad)'; notice.textContent = '이달의 상자가 부족합니다. 유료 상점으로 이동하시겠습니까?'; return; }
    busy = true; owned -= n; draw(); notice.textContent = '';
    const res = $('[data-res]', el); res.innerHTML = '';
    const items = Array.from({ length: n }, () => Math.random() < .08);
    const rare = items.some(Boolean), box = $('[data-box]', el);
    box.classList.toggle('rare', rare); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    await new Promise(r => setTimeout(r, rare ? 1700 : 900));
    box.classList.remove('shake');
    res.innerHTML = items.map((m, i) => `<i class="${m ? 'motm' : ''}" style="animation-delay:${i * 60}ms">${m ? '★' : ICONS[Math.floor(Math.random() * ICONS.length)]}</i>`).join('');
    await new Promise(r => setTimeout(r, n * 60 + 400));
    const got = items.filter(Boolean);
    notice.style.color = '';
    for (let i = 0; i < got.length; i++){
      notice.textContent = `📢 모험가 님이 이달의 아이템 [${MOTM[Math.floor(Math.random() * MOTM.length)]}]을 획득하였습니다.`;
      await new Promise(r => setTimeout(r, 1300));
    }
    if (!got.length) notice.innerHTML = '<span class="muted">일반 연출 · 획득 메시지는 본인에게만 노멀 노티스로 출력</span>';
    busy = false; draw();
  });
  draw();
};

window.Widgets = W;
})();
