# LLM API Cost Calculator & llms.txt Generator

A static, single-page developer tool with two jobs:

1. **Cost calculator** — price one average LLM request across OpenAI, Anthropic, Google and
   DeepSeek models, then scale it to a day, a month and a year. Cached input, budget reverse
   calculation, editable prices, CSV/Markdown export.
2. **llms.txt generator** — fill in a site name, a summary and sections of links, and get a
   spec-shaped `llms.txt` or `llms-full.txt` with structural validation, one-click copy and a
   real `.txt` download.

No build step, no framework, no backend, no analytics, no CDN. Everything runs in the tab and
works offline after the first load.

## Files

```
index.html              the whole tool (both tabs, guide, FAQ, price notes)
privacy.html            privacy policy
assets/styles.css       hand-written CSS, light + dark, self-hosted Inter
assets/engine.js        pure engine: token maths, cost model, llms.txt build + validate
assets/app.js           UI wiring (DOM only; no business logic of its own)
assets/fonts/           Inter subset (SIL OFL), served from this folder
favicon.svg             icon
robots.txt, sitemap.xml, .nojekyll
test.js                 86 Node unit tests against assets/engine.js
uitest.py               150 headless-Chrome checks at 1440x900 and 390x844
preview-desktop.png     desktop view, 1440x900
preview-mobile.png      mobile view, 390x844 (full page)
preview-llmstxt.png     generator view, 1440x900
```

## Run it

```bash
python3 -m http.server 8000      # then open http://127.0.0.1:8000/
```

Serve over HTTP rather than opening `index.html` from disk: Chrome blocks `file://` font
requests (CORS), so the self-hosted Inter face falls back to the system sans.

## Test it

```bash
node test.js        # engine: 86 tests
python3 uitest.py   # real browser: 150 checks, saves the preview screenshots
```

`uitest.py` starts its own static server on a free port and drives headless Chrome with a
fresh context, so it touches no other browser profile, cookie or session. It fails the run on
any console error, any request that leaves the app folder, any horizontal overflow, or any
figure that disagrees with the prices on screen.

## Price data

List prices in USD per 1M tokens, read from the providers' public pricing pages on
**20 November 2026**:

| Provider | Source | Scope used |
| --- | --- | --- |
| OpenAI | https://developers.openai.com/api/docs/pricing | Standard tier, short context |
| Anthropic | https://docs.anthropic.com/en/docs/about-claude/pricing | Base input, output, cache hits |
| Google | https://ai.google.dev/gemini-api/docs/pricing | Paid tier, standard |
| DeepSeek | https://api-docs.deepseek.com/quick_start/pricing | Peak rate (off-peak is 50%) |

- Every price is editable in the table; the chart, totals, budget column and exports follow.
- Models that have left the current price sheet (`o1`, `o3-mini`, `Claude 3.7 Sonnet`,
  `Claude 3.5 Haiku`, `Gemini 2.5 Pro/Flash`, `Gemini 2.0 Flash`, `DeepSeek V3/R1`) are marked
  **legacy**, hidden by default and keep their last published list price for comparison.
- Not modelled: batch/flex tiers, long-context surcharges, cache-write fees, thinking tokens
  billed as output, minimum charges, negotiated discounts. The page says so where it matters.

### The maths

```
cached share s (0-100%)
per request = (input x (1 - s) x input_price
             + input x s       x cached_price
             + output          x output_price) / 1,000,000
per day     = per request x requests_per_day
per month   = per day x days_per_month
per year    = per month x 12
budget      = floor(budget / per request)  requests a month
```

Token estimates use the usual English rule of thumb (≈4 characters or 0.75 words per token)
and are labelled as an estimate; the newer Claude tokenizer produces roughly 30% more tokens
for the same text.

## llms.txt output shape

```
# Acme API

> One-line summary in a blockquote.

Optional Markdown details.

## Documentation

- [Quickstart](https://example.com/docs/quickstart.md): Send your first request.

## Optional

- [Changelog](https://example.com/changelog.md)
```

- Exactly one H1, one blockquote line, then H2 sections of `- [name](url): note`.
- Links marked *optional* are gathered into a single `## Optional` block at the end, the
  convention the spec describes for material an agent may skip.
- `llms-full.txt` additionally carries each section's Markdown body; in `llms.txt` bodies are
  opt-in.
- Validation errors: missing H1 or summary, a `#` typed into the title, relative/non-http URLs,
  spaces or unbalanced brackets in a URL, a link without a name or URL, links under an unnamed
  section, `[`/`]` in a link name. Warnings: repeated URLs, multi-line summary, headings inside
  the details block, overlong notes, no links yet.

## Deployment (not done here)

Nothing has been pushed or published. The canonical URL, Open Graph URL, `sitemap.xml` and
`robots.txt` assume `https://marcj81.github.io/llm-cost-llms-txt/`; change them if the folder
is published elsewhere. The contact address in `privacy.html` and the footer is
`goodday810202@gmail.com`.

GitHub Pages: publish the contents of this folder as the site root (`.nojekyll` is included).

## Design system — Direction A (Crisp Bento SaaS)

Applied 2026-11-22 to unify the three overseas apps. Structure and behaviour are unchanged; only the skin follows Direction A.

| Token | Value |
| --- | --- |
| Page / surface | `#FAFAFA` / `#FFFFFF` |
| Hairline | 1px `#E7E8EA` (strong `#D7D9DD`) |
| Tile radius | 16px (buttons 12px, pills 999px) |
| Ink | `#0C0D0F` (secondary `#3C4045`, muted `#6B7076`) |
| Accent | single cobalt `#2F5BFF` (hover `#2445C9`, soft `#EEF2FF`) |
| Headline | sans-serif 800, tracking -0.04em |
| State colours | ok `#0B7A55` · warn `#A9550A` · error `#B4211C` — meaning only |
| Dark | page `#0A0B0D` · surface `#121317` · line `#24262B` · accent `#8AA4FF` |

- Contrast ≥ 4.5:1: measured on light, dark, mobile and the privacy page — 0 failures.
- Fonts stay self-hosted (0 external requests); the dotted page grid was removed for the flat Direction A canvas.


## 2차 업그레이드 (2026-11-23)

### 정확한 토큰 수 (`assets/vendor/gpt-tokenizer-*.js`) — gpt-tokenizer 4.1.2 (MIT)
- 기존 `문자/4` 근사치 대신 **실제 BPE 병합표**로 셉니다.
  - `o200k_base`(GPT-4o·4.1·o 시리즈, 2.8MB)
  - `cl100k_base`(GPT-4·3.5, 1.0MB)
- 두 파일 모두 `Count exactly`를 누를 때만 받습니다(첫 화면 용량 0 증가).
- 결과에 근사치 대비 차이(%)를 함께 보여 줍니다.

### llms.txt 스펙 재검증 (`validateSpecText`)
- 생성된 파일을 스펙으로 **다시 읽어** 확인합니다.
  - 첫 줄 `# 이름` 하나, 그다음 `> 한 줄 요약`
  - `## 섹션`과 `- [이름](절대 URL): 설명` 형식
  - H3 이하 제목·상대 경로·이름 없는 링크는 오류
- 결과를 검증 패널에 `Spec re-read: ...`로 표시합니다.

### 검증
- `node test.js` 93건 통과 · `python3 uitest.py`(브라우저 실측)
