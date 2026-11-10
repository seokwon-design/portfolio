"""
포트폴리오 사이트 빌드 스크립트
--------------------------------
src/pages/*.html  →  루트의 *.html

- 각 소스 파일 맨 위의 <!--meta {...} --> JSON 으로 제목/설명 등을 지정합니다.
- 공통 헤더·푸터·스크립트는 이 파일의 LAYOUT 에서 관리합니다.
- 프로젝트 페이지(p-*.html)는 히어로/메타/목차/이전·다음 링크가 자동 생성됩니다.

사용법:  python build.py
"""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src" / "pages"

SITE = "정석원 | 시스템·콘텐츠 기획자 포트폴리오"

# 프로젝트 순서 (이전/다음 링크용)
ORDER = ["p-rune-preset", "p-constellation", "p-card", "p-agony",
         "p-enhance", "p-ether", "p-gacha", "p-beles"]

# 프로젝트별 포트폴리오 PDF 페이지 범위 (부록 슬라이드 자동 생성)
SLIDES = {"p-rune-preset": (6, 9), "p-constellation": (10, 15), "p-card": (16, 23), "p-agony": (24, 32),
          "p-enhance": (33, 41), "p-ether": (42, 47), "p-beles": (48, 52)}
SLIDE_CAPS = {
    6: "룬캐스트 프리셋 — 개요", 7: "저장한 빌드로 다시 전환", 8: "저장 범위 — 구성과 이용 권한의 관리 단위 분리",
    9: "복원 규칙 — 일부 룬이 없어도 가능한 구성은 적용",
    10: "시간의 성좌 통폐합 — 개요", 11: "기획 배경 — 시즌마다 따로 반복하던 성장 파밍", 12: "참여 설계 — 원하는 이벤트를 확정하는 선택",
    13: "전투 구성 — 던전 안에서 발견하고 보상 획득", 14: "ERD — 기존 이벤트 구조에 성좌 이벤트를 연결", 15: "전환 설계 — 사용처 종료와 기존 획득 상태를 구분",
    16: "카드 앨범·덱 — 개요", 17: "기획 목표 및 핵심 설계 방향", 18: "앨범 / 덱 역할 구조", 19: "ERD — 그룹 구성과 효과 조건의 분리",
    20: "UI/UX 구조 — 카드 리스트", 21: "UI/UX 구조 — 카드 앨범", 22: "UI/UX 구조 — 카드 덱", 23: "UD 개선 — 확인한 카드를 바로 강화 대상으로",
    24: "침식의 공세 — 개요", 25: "시스템 구조 — 전투 규칙과 선택 흐름", 26: "레벨 설계 — 사방의 압박과 이동을 유도하는 공간",
    27: "스폰 설계 — 구성은 유지하고 등장 순서와 시간은 다르게", 28: "보상 시스템 — 배치된 상자와 보상 데이터를 연결",
    29: "콘텐츠 ERD — 이벤트 실행과 생성 대상을 분리", 30: "시스템 ERD ① — 맵 연결과 공통 설정", 31: "시스템 ERD ② — 웨이브 조건과 스폰 그룹",
    32: "시스템 ERD ③ — 선택 옵션 · 비용 · 보상 표시",
    33: "장비 강화 — 개요", 34: "강화 구조 요약", 35: "보조재 확률 보정 구조", 36: "최근 입력한 보조재 우선 반영과 자동 조정",
    37: "결과 확률 계산과 방지권 정책", 38: "테이블 구조 — 조건 조회와 키 참조", 39: "UI/UX 구조 — 강화 전 선택과 비용을 확인",
    40: "UI/UX 구조 — 결과 공개와 리소스 연결", 41: "무기 강화 이펙트 — 장착 상태에서 성장 표현",
    42: "에테르 코어 — 개요", 43: "슬롯과 성장 구조 — 획득과 장착의 두 단계", 44: "부위별 효과 — 하나의 코어를 세 부위에 활용",
    45: "장착 리스크 — 실패와 기존 코어 파괴를 분리", 46: "데이터 구조 — 설정 단위와 조회 조건의 구분", 47: "실제 장착 화면 — 효과와 위험을 확인한 뒤 실행",
    48: "차원 균열: 벨레스 — 개요", 49: "세 방향의 침입, 네 명의 대응 역할", 50: "보상만 고르지 않고, 감당할 전투 조건까지 비교",
    51: "선택 조정과 지급 확정을 구분한 보상 교환", 52: "데이터 구조 — 난이도 · 웨이브 · 선택 · 보상",
}

FONTS = ("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700"
         "&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@500;600;700&display=swap")

SIGIL = """<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="#c9a46a" stroke-width="1.6">
<circle cx="32" cy="32" r="28" opacity=".55"/><circle cx="32" cy="32" r="20"/><path d="M32 6 L54 44 H10 Z" opacity=".8"/>
<path d="M32 58 L10 20 H54 Z" opacity=".35"/></g><circle cx="32" cy="32" r="3.2" fill="#e9cd93"/></svg>"""

GATE = """
<div class="gate" role="dialog" aria-label="입장">
  <canvas></canvas>
  <div class="gate-inner">
    <div class="sigil">
      <svg class="r1" viewBox="0 0 200 200"><g fill="none" stroke="#c9a46a" stroke-width=".7" opacity=".7">
        <circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="88" stroke-dasharray="2 6"/>
        <path id="ring" d="M100 18 a82 82 0 1 1 -.1 0"/></g>
        <text font-family="Cinzel,serif" font-size="8.4" letter-spacing="3.4" fill="#8a7048"><textPath href="#ring">SYSTEM · CONTENT · BALANCE · FLOW · EXCEPTION · DATA · SYSTEM · CONTENT · BALANCE ·</textPath></text></svg>
      <svg class="r2" viewBox="0 0 200 200"><g fill="none" stroke="#c9a46a" stroke-width=".9">
        <path d="M100 30 L161 135 H39 Z" opacity=".75"/><path d="M100 170 L39 65 H161 Z" opacity=".4"/><circle cx="100" cy="100" r="44" opacity=".6"/></g></svg>
      <svg class="r3" viewBox="0 0 200 200"><circle cx="100" cy="100" r="9" fill="#e9cd93"/><circle cx="100" cy="100" r="20" fill="none" stroke="#e9cd93" stroke-width=".6"/></svg>
    </div>
    <span class="eyebrow">Portfolio · System &amp; Content Designer</span>
    <h1>JEONG SEOKWON</h1>
    <p class="motto">깊이는 발견하게, 시작은 가볍게.</p>
    <div class="gate-actions">
      <button class="btn primary" data-enter="sound"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>BGM과 함께 입장</button>
      <button class="btn ghost" data-enter="mute">조용히 입장</button>
    </div>
    <small>BGM은 우측 상단 버튼 또는 <b>M</b> 키로 언제든 켜고 끌 수 있습니다.</small>
  </div>
</div>"""

NAV = """
<header class="nav">
  <div class="wrap">
    <a class="brand" href="index.html">{sigil}<span><b>JEONG SEOKWON</b><em> · Portfolio</em></span></a>
    <nav class="nav-links" aria-label="주요 메뉴">
      <div class="nav-item has-sub"><a class="top" href="index.html#about" data-nav="about">About</a>
        <div class="sub"><div class="sub-col">
          <a href="index.html#about">기획 철학 · 핵심 강점</a>
          <a href="index.html#letter">자기소개서</a>
        </div></div></div>
      <div class="nav-item has-sub"><a class="top" href="index.html#career" data-nav="career">Career</a>
        <div class="sub"><div class="sub-col">
          <a href="index.html#career">경력</a>
          <a href="index.html#skills">스킬 · 학력</a>
        </div></div></div>
      <div class="nav-item has-sub"><a class="top" href="index.html#projects" data-nav="projects">Projects</a>
        <div class="sub wide">
          <div class="sub-col"><span class="sub-h ud">UNDECEMBER · 언디셈버</span>
            <a href="p-rune-preset.html">룬캐스트 프리셋</a>
            <a href="p-constellation.html">시간의 성좌 통폐합</a>
            <a href="p-card.html">카드 앨범 · 덱</a>
            <a href="p-agony.html">침식의 공세</a>
          </div>
          <div class="sub-col"><span class="sub-h dd">DARK DECEMBER · 다크디셈버</span>
            <a href="p-enhance.html">장비 강화</a>
            <a href="p-ether.html">에테르 코어</a>
            <a href="p-gacha.html">가챠 상자 · 이달의 상자</a>
            <a href="p-beles.html">차원 균열: 벨레스</a>
          </div>
        </div></div>
      <div class="nav-item has-sub"><a class="top" href="index.html#works" data-nav="works">Other Works</a>
        <div class="sub"><div class="sub-col">
          <a href="index.html#works">기타 시스템 기획 · 라이브 개선</a>
          <a href="index.html#docs">그 밖에 작성한 기획서</a>
        </div></div></div>
      <div class="nav-item"><a class="top" href="index.html#contact" data-nav="contact">Contact</a></div>
    </nav>
    <div class="bgm">
      <button class="bgm-pick" aria-haspopup="true" aria-expanded="false" title="BGM 선택 · 볼륨"><span class="bgm-label">BGM OFF</span><svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg></button>
      <button class="bgm-btn" aria-pressed="false" title="BGM 켜기"><span class="eq"><i></i><i></i><i></i><i></i></span></button>
      <div class="bgm-pop" hidden role="menu" aria-label="BGM 선택">
        <div class="bgm-pop-h">BGM 선택</div>
        <div class="bgm-list"></div>
        <label class="bgm-vol"><span>볼륨</span><input type="range" min="0" max="1" step="0.01" aria-label="BGM 볼륨"></label>
        <p class="bgm-note">브라우저에서 실시간으로 만드는 음악입니다 · M 키로 켜기/끄기</p>
      </div>
    </div>
    <button class="menu-btn" aria-label="메뉴"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
  </div>
</header>""".replace("{sigil}", SIGIL)

FOOTER = """
<footer>
  <div class="wrap">
    <div>© 2026 정석원 · System &amp; Content Designer · zaqkoko@naver.com</div>
    <div class="bgm-credit">게임 화면과 리소스의 저작권은 니즈게임즈에 있으며 포트폴리오 목적으로만 사용했습니다. BGM은 Web Audio로 실시간 생성됩니다.</div>
  </div>
</footer>"""

LAYOUT = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{og}">
<meta name="theme-color" content="#0c0a09">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<link rel="stylesheet" href="assets/css/style.css?v=11">
</head>
<body data-page="{page}">
{gate}{nav}
<main>
{main}
</main>
{footer}
<script src="assets/js/widgets.js?v=11"></script>
<script src="assets/js/main.js?v=11"></script>
</body>
</html>
"""


def esc(s):
    return html.escape(s, quote=True)


def project_page(meta, body, slug):
    game = meta["game"]  # 'ud' | 'dd'
    gname = {"ud": "UNDECEMBER", "dd": "DARK DECEMBER"}[game]
    gk = {"ud": "언디셈버", "dd": "다크디셈버"}[game]
    contrib = "".join(
        f'<div class="bar"><span>{esc(k)}</span><span>{v}%</span><i style="--v:{v}%"></i></div>'
        for k, v in meta.get("contrib", []))
    metas = "".join(f'<div><span>{esc(k)}</span><b>{v}</b></div>' for k, v in meta["meta"])
    if slug in SLIDES:
        a, b = SLIDES[slug]
        btns = "".join(
            f'<button data-cap="p.{n} · {esc(SLIDE_CAPS[n])}"><img src="assets/img/slides/p{n:02d}.webp" alt="{esc(SLIDE_CAPS[n])}" loading="lazy"></button>'
            for n in range(a, b + 1))
        body += f"""
<section class="chapter" id="slides" data-toc="포트폴리오 원본 슬라이드">
  <span class="eyebrow">Appendix</span>
  <h2>포트폴리오 원본 슬라이드</h2>
  <p class="lede">PDF 포트폴리오 {a}~{b}쪽 전체입니다. 클릭하면 전체 화면으로 보고 ← → 키로 넘길 수 있습니다.</p>
  <div class="slide-grid" data-gallery>{btns}</div>
</section>"""
    chapters = re.findall(r'<section class="chapter[^"]*" id="([^"]+)" data-toc="([^"]+)"', body)
    toc = "".join(f'<a href="#{cid}">{esc(lbl)}</a>' for cid, lbl in chapters)
    i = ORDER.index(slug)
    prev_slug, next_slug = ORDER[i - 1] if i > 0 else None, ORDER[i + 1] if i < len(ORDER) - 1 else None
    def title_of(s):
        m = json.loads(re.match(r"<!--meta\s*(\{.*?\})\s*-->", (SRC / f"{s}.html").read_text("utf-8"), re.S).group(1))
        return m["short"]
    pn = '<div class="p-next">'
    pn += (f'<a href="{prev_slug}.html"><span>← PREV</span><b>{esc(title_of(prev_slug))}</b></a>' if prev_slug
           else '<a href="index.html#projects"><span>← BACK</span><b>프로젝트 목록</b></a>')
    pn += (f'<a class="nx" href="{next_slug}.html"><span>NEXT →</span><b>{esc(title_of(next_slug))}</b></a>' if next_slug
           else '<a class="nx" href="index.html#works"><span>NEXT →</span><b>기타 작업 보기</b></a>')
    pn += "</div>"
    return f"""
<section class="p-hero">
  <div class="bg" style="background-image:url('{meta['cover']}')"></div>
  <div class="wrap">
    <div class="crumbs"><a href="index.html#projects">Projects</a><span>/</span><span class="tag {game}">{gname} · {gk}</span></div>
    <h1>{meta['title']}</h1>
    <p class="one">{meta['one']}</p>
    <div class="meta">{metas}{('<div><span>CONTRIBUTION</span><div class="contrib">' + contrib + '</div></div>') if contrib else ''}</div>
  </div>
</section>
<div class="p-body">
  <div class="wrap p-layout">
    <aside class="toc"><b>CONTENTS</b>{toc}</aside>
    <div class="p-content">
{body}
{pn}
    </div>
  </div>
</div>"""


def build():
    out = []
    for f in sorted(SRC.glob("*.html")):
        raw = f.read_text("utf-8")
        m = re.match(r"<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        slug = f.stem
        main = project_page(meta, body, slug) if slug.startswith("p-") else body
        title = meta.get("page_title") or (f"{meta['short']} · {SITE}" if slug.startswith("p-") else SITE)
        page = LAYOUT.format(
            title=esc(title), desc=esc(meta.get("desc", "")), og=meta.get("og", meta.get("cover", "")),
            fonts=FONTS, page=meta.get("page", "projects"),
            gate=GATE if slug == "index" else "", nav=NAV, main=main, footer=FOOTER)
        (ROOT / f"{slug}.html").write_text(page, "utf-8")
        out.append(slug)
    print("built:", ", ".join(out))


if __name__ == "__main__":
    build()
