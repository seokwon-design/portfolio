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
      <a href="index.html#about" data-nav="about">About</a>
      <a href="index.html#career" data-nav="career">Career</a>
      <a href="index.html#projects" data-nav="projects">Projects</a>
      <a href="index.html#works" data-nav="works">Other Works</a>
      <a href="index.html#contact" data-nav="contact">Contact</a>
    </nav>
    <div class="bgm">
      <span class="bgm-label">BGM OFF</span>
      <input type="range" min="0" max="1" step="0.01" aria-label="BGM 볼륨">
      <button class="bgm-btn" aria-pressed="false" title="BGM 켜기"><span class="eq"><i></i><i></i><i></i><i></i></span></button>
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
<link rel="stylesheet" href="assets/css/style.css?v=3">
</head>
<body data-page="{page}">
{gate}{nav}
<main>
{main}
</main>
{footer}
<script src="assets/js/widgets.js?v=3"></script>
<script src="assets/js/main.js?v=3"></script>
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
