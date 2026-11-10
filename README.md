# 정석원 포트폴리오 사이트

정적 사이트(HTML/CSS/JS)라서 별도 서버 없이 어디든 올릴 수 있습니다.

## 로컬에서 보기
```bash
python -m http.server 8791
```
→ http://localhost:8791 접속.
`index.html`을 더블클릭해도 열리지만, 이때는 페이지를 옮길 때마다 BGM이 처음부터 다시 시작됩니다. 서버로 열면 페이지를 이동해도 BGM이 끊기지 않습니다.

## 구조
```
index.html, p-*.html   ← build.py가 만든 결과물 (직접 고쳐도 되지만, 다시 빌드하면 덮어써짐)
src/pages/*.html       ← 실제 내용 원본. 여기를 고친 뒤 `python build.py`
build.py               ← 공통 헤더/푸터/입장 화면, 프로젝트 페이지 상단(히어로·메타·목차) 생성
assets/css/style.css   ← 디자인
assets/js/main.js      ← BGM, 입장 화면, 페이지 전환, 라이트박스
assets/js/widgets.js   ← 강화 계산기 · 보조재 조정 · 에테르 코어 · 룬 프리셋 · 이달의 상자 데모
assets/img, video, files
```

## BGM
- 기본: 브라우저가 실시간으로 만드는 다크 판타지 앰비언트 (저작권 문제 없음)
- 원하는 음악으로 바꾸기: `assets/audio/bgm.mp3` 파일을 넣으면 자동으로 그 파일을 반복 재생합니다.
  (파일이 없을 때 콘솔에 404가 한 줄 찍히는 건 정상입니다.)
- 영상을 소리 켜고 재생하면 BGM 볼륨이 자동으로 줄어듭니다. `M` 키로 켜기/끄기.

## 배포
- **Netlify Drop**: https://app.netlify.com/drop 에 `portfolio-site` 폴더를 끌어다 놓기
- **GitHub Pages**: 저장소에 올린 뒤 Settings → Pages → 브랜치 지정
- 전체 용량 약 125MB (영상 91MB). 가장 큰 파일은 `assets/video/agony.mp4` (30MB)로 GitHub 파일 제한(100MB) 이내입니다.
- `src/`, `build.py`, `README.md`, `.claude/`는 배포에 필요 없습니다.
