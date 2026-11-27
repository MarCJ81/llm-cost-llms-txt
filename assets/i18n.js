/* ==========================================================================
   LLM Cost Calculator & llms.txt Generator · KO / EN runtime
   English is the default in the markup; this file adds Korean.
   - Language choice: ?lang=ko|en → localStorage('onetap_lang') → navigator.language
   - Static text is translated by exact match on the text node, so the markup
     stays readable and no string is duplicated.
   - Dynamic strings call t('english') from app.js / engine.js.
   - Elements holding inline markup get a data-ko-html="…" attribute.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'onetap_lang';
  var DEFAULT_LANG = 'en';
  var OTHER_LANG = 'ko';

  var DICT = {
    /* ---- shell ---- */
    'LLM API Cost Calculator & llms.txt Generator — Free, No Upload': 'LLM API 비용 계산기 & llms.txt 생성기 — 무료, 업로드 없음',
    'Skip to content': '본문으로 바로 가기',
    '& llms.txt': '& llms.txt',
    'Cost calculator': '비용 계산기',
    'llms.txt generator': 'llms.txt 생성기',
    'Runs in your browser': '브라우저에서 실행',
    'Developer utilities · free, no sign-up': '개발자 도구 · 무료, 가입 없음',
    'Price an LLM feature before you ship it.': 'LLM 기능을 출시하기 전에 비용부터 계산하세요.',
    'Compare what the same token profile costs on OpenAI, Anthropic, Google and DeepSeek — then publish an': '같은 토큰 사용량이 OpenAI·Anthropic·Google·DeepSeek에서 얼마인지 비교하고, AI 에이전트에게 사이트 내용을 알려 주는',
    'that tells an AI agent what your site actually contains.': '까지 바로 만들어 공개하세요.',
    'Calculate a cost': '비용 계산하기',
    'Build an llms.txt': 'llms.txt 만들기',
    'Nothing leaves the tab': '탭 밖으로 나가지 않음',
    'Prices checked 20 Nov 2026': '가격 확인일 2026년 11월 20일',
    'Says exactly what it validates': '무엇을 검사하는지 그대로 밝힙니다',

    /* ---- workload ---- */
    'Your workload': '사용량',
    'One average request, repeated.': '평균 요청 하나를 반복한다고 보고 계산합니다.',
    'Reset': '초기화',
    'Token counts are entered as': '토큰 수는 이 단위로 넣습니다',
    'Tokens': '토큰',
    'Words': '단어',
    'Characters': '글자',
    'Switching converts the numbers so the same text stays in the box.': '단위를 바꾸면 같은 글이 되도록 숫자를 환산합니다.',
    'Input': '입력',
    'per request': '요청당',
    'tokens': '토큰',
    '≈ 1,500 tokens': '≈ 1,500 토큰',
    'Output': '출력',
    '≈ 400 tokens': '≈ 400 토큰',
    'Cached input share': '캐시된 입력 비율',
    'repeated prompt prefix': '반복되는 프롬프트 앞부분',
    '0% prices every input token at the full rate. Use 60–90% for a long fixed system prompt.': '0%면 모든 입력 토큰을 정가로 계산합니다. 길고 고정된 시스템 프롬프트가 있으면 60~90%를 쓰세요.',
    'Requests': '요청',
    'per day': '하루',
    'Days': '일수',
    'per month': '한 달',
    'Monthly cost = per day × this.': '월 비용 = 하루 비용 × 이 일수.',
    'Reverse from a monthly budget': '월 예산에서 역산하기',
    'Monthly budget': '월 예산',
    'The table gains a column: how many requests this budget buys on each model.': '표에 열이 하나 늘어납니다. 모델마다 이 예산으로 몇 건을 처리할 수 있는지 보여 줍니다.',
    'Not sure about tokens?': '토큰 수가 확실하지 않나요?',
    'Paste a real prompt and measure it.': '실제 프롬프트를 붙여넣어 세어 보세요.',
    'Sample text': '예시 텍스트',
    '≈ Tokens': '≈ 토큰',
    'Count exactly': '정확히 세기',
    'Use as input tokens': '입력 토큰으로 쓰기',
    'A planning guide, not a bill: ≈4 characters or ≈0.75 words per English token. Tokenizers differ by model — the newer Claude tokenizer produces about 30% more tokens for the same text. “Count exactly” loads the real BPE table (2.8 MB for o200k, 1 MB for cl100k) once and shows the true count.': '계산 계획용 어림값이지 청구서가 아닙니다. 영어 기준 토큰 하나에 약 4글자 또는 0.75단어입니다. 토크나이저는 모델마다 달라서, 최신 Claude 토크나이저는 같은 글에서 토큰이 약 30% 더 나옵니다. “정확히 세기”를 누르면 실제 BPE 표(o200k 2.8MB, cl100k 1MB)를 한 번 받아 정확한 개수를 보여 줍니다.',

    /* ---- stats ---- */
    'Cheapest here': '여기서 가장 저렴',
    'Most expensive': '가장 비쌈',
    'Saving per month': '월 절감액',
    'Requests per month': '월 요청 수',
    'Monthly cost by model': '모델별 월 비용',
    'At this workload, cheapest first.': '이 사용량 기준, 저렴한 순서입니다.',
    'Cheapest': '최저가',
    'Priciest': '최고가',

    /* ---- comparison ---- */
    'Full comparison': '전체 비교',
    'Prices are USD per 1M tokens and editable in place.': '가격은 100만 토큰당 미국 달러이며 표에서 바로 고칠 수 있습니다.',
    'Copy CSV': 'CSV 복사',
    'Copy table': '표 복사',
    'All': '전체',
    'Custom': '직접 입력',
    'Show legacy models': '이전 모델 보기',
    'Sort: cheapest': '정렬: 저렴한 순',
    'Reset prices': '가격 초기화',
    'Cost of the current workload on each model, cheapest first': '현재 사용량 기준 모델별 비용, 저렴한 순',
    'Model': '모델',
    'Cached': '캐시',
    'Per request': '요청당',
    'Per month': '월',
    'Per year': '연',
    'Requests / month': '월 요청 수',
    '+ Add a model with your own price': '+ 내 가격으로 모델 추가',
    'Model name': '모델 이름',
    'Input $/1M': '입력 $/1M',
    'Cached $/1M': '캐시 $/1M',
    'Output $/1M': '출력 $/1M',
    'Add model': '모델 추가',
    'Cancel': '취소',

    /* ---- llms.txt builder ---- */
    'Start from an example': '예시에서 시작하기',
    'Four shapes that fit most sites. Every URL is example.com — replace them.': '대부분의 사이트에 맞는 네 가지 형태입니다. 주소는 모두 example.com이니 바꿔 쓰세요.',
    'SaaS / API docs': 'SaaS · API 문서',
    'Product, docs, pricing, API reference': '제품·문서·가격·API 레퍼런스',
    'E-commerce': '이커머스',
    'Catalogue, policies, shipping, returns': '상품·정책·배송·반품',
    'Personal site': '개인 사이트',
    'Writing, projects, CV': '글·프로젝트·이력',
    'Open-source project': '오픈소스 프로젝트',
    'Install, API, contributing': '설치·API·기여 안내',
    'Site details': '사이트 정보',
    'The first three blocks of the file.': '파일 앞부분을 이루는 세 가지 블록입니다.',
    'Clear all': '모두 지우기',
    'Site or project name': '사이트 또는 프로젝트 이름',
    'required': '필수',
    'Becomes the only': '파일에서 유일한',
    'in the file.': '이 됩니다.',
    'One-line summary': '한 줄 요약',
    'Becomes the': '에이전트가 가장 먼저 읽는',
    'an agent reads first.': '이 됩니다.',
    'Details': '상세',
    'optional Markdown': '선택 · Markdown',
    'Plain Markdown between the summary and the first section. No headings here — the sections provide those.': '요약과 첫 섹션 사이에 들어가는 일반 Markdown입니다. 여기에는 제목을 쓰지 마세요. 제목은 아래 섹션이 만듭니다.',
    'Sections': '섹션',
    'Each section becomes an': '섹션마다',
    'and a list of links.': '과 링크 목록이 만들어집니다.',
    '+ Add a section': '+ 섹션 추가',
    'Generated file': '생성된 파일',
    'Copy file': '파일 복사',
    'Download .txt': '.txt 내려받기',
    'Include section bodies in llms.txt': 'llms.txt에도 섹션 본문 넣기',
    'Saved as': '저장 위치',
    'How the calculator works': '계산 방식',
    'Three numbers decide almost everything about an LLM bill: how many tokens go in, how many come back, and how often you call. The rest is arithmetic.': 'LLM 청구서의 거의 전부는 세 숫자로 정해집니다. 입력 토큰이 몇 개인지, 출력이 몇 개인지, 얼마나 자주 호출하는지입니다. 나머지는 산수입니다.',

    /* ---- price notes ---- */
    'Model price notes': '모델 가격 출처',
    'List prices per 1M tokens, read from each provider\'s pricing page on': '100만 토큰당 정가이며, 각 제공사의 가격 페이지에서 확인한 날짜는',
    '20 November 2026': '2026년 11월 20일',
    '. Prices move; the table below is editable for a reason.': '입니다. 가격은 바뀌므로 아래 표를 직접 고칠 수 있게 했습니다.',
    'Provider': '제공사',
    'What is included': '포함 범위',
    'Source': '출처',
    'Standard tier, short context; cached input where published': '표준 등급, 짧은 컨텍스트, 공개된 경우 캐시 입력 포함',
    'API pricing': 'API 가격',
    'Base input, output and cache-hit rates': '기본 입력·출력·캐시 적중 요율',
    'Claude pricing': 'Claude 가격',
    'Paid tier, standard serving; launch pricing noted where it expires': '유료 등급, 표준 서빙. 프로모션 가격은 종료 시점을 표시',
    'Gemini pricing': 'Gemini 가격',
    'Peak rate; off-peak is half price': '피크 요율, 비피크는 절반 가격',
    'Models & pricing': '모델·가격',
    'Models marked': '표시된',
    'have left the current price sheet and keep their last published list price for comparison. Batch and flex tiers, long-context surcharges, cache-write fees, thinking tokens billed as output, and minimum charges are not modelled — check the provider for those.': '모델은 현재 가격표에서 빠졌지만 비교를 위해 마지막 공개 정가를 유지합니다. 배치·플렉스 등급, 장문 컨텍스트 할증, 캐시 쓰기 요금, 출력으로 과금되는 사고 토큰, 최소 청구 금액은 계산에 넣지 않았으니 제공사에서 확인하세요.',

    /* ---- faq ---- */
    'Questions': '질문',
    'How is the monthly cost calculated?': '월 비용은 어떻게 계산하나요?',
    'Each request is priced in three parts: fresh input at the input rate, the cached share of the input at the cached-input rate, and output at the output rate. Prices are per million tokens, so the sum is divided by one million. Multiply by requests per day and days per month for the month, and by twelve for the year.': '요청 하나를 세 부분으로 나눠 계산합니다. 새 입력은 입력 요율로, 입력 중 캐시된 부분은 캐시 입력 요율로, 출력은 출력 요율로 계산합니다. 가격이 100만 토큰 기준이므로 합계를 100만으로 나눕니다. 여기에 하루 요청 수와 월 일수를 곱하면 월 비용, 12를 더 곱하면 연 비용입니다.',
    'Are these the real list prices?': '이 가격이 실제 정가인가요?',
    'They were copied from each provider\'s public pricing page on 20 November 2026 and every field is editable, so you can enter a contract rate or a price change. Legacy models keep their last published list price and are hidden unless you ask for them. Confirm billing-critical numbers with the provider.': '2026년 11월 20일 각 제공사의 공개 가격 페이지에서 옮겨 왔고 모든 항목을 고칠 수 있으므로, 계약 요율이나 바뀐 가격을 직접 넣어도 됩니다. 이전 모델은 마지막 공개 정가를 유지하며, 요청하지 않으면 숨겨 둡니다. 청구에 직결되는 숫자는 제공사에서 다시 확인하세요.',
    'What is a cached input token?': '캐시된 입력 토큰이란?',
    'Providers let you reuse a prompt prefix that was sent recently — a system prompt, a document, a tool schema — and charge less when those tokens hit the cache. Enter the share of your input that repeats; 0% prices everything as fresh input.': '제공사는 최근에 보낸 프롬프트 앞부분(시스템 프롬프트, 문서, 도구 스키마)을 다시 쓸 수 있게 하고, 그 토큰이 캐시에 맞으면 더 싸게 과금합니다. 입력 중 반복되는 비율을 넣으세요. 0%면 전부 새 입력으로 계산합니다.',
    'How accurate is the token estimate?': '토큰 추정은 얼마나 정확한가요?',
    'It uses the usual English rule of thumb: about four characters or 0.75 words per token. It is a planning aid, not a bill. Tokenizers differ by model, and the newer Claude tokenizer produces roughly 30% more tokens for the same text, so check a provider-side counter for anything billing-critical.': '영어 기준 통상적인 어림법으로 토큰 하나에 약 4글자 또는 0.75단어를 적용합니다. 계획을 세우는 데 쓰는 값이지 청구서가 아닙니다. 토크나이저는 모델마다 다르고 최신 Claude 토크나이저는 같은 글에서 토큰이 약 30% 더 나오므로, 청구에 직결되는 일에는 제공사 쪽 카운터로 확인하세요.',
    'Is my data uploaded anywhere?': '제 데이터가 어디로 올라가나요?',
    'No. There is no backend, no analytics, no third-party script and no web font from a CDN. The calculations and the file generation run in the tab, and the page keeps working offline after it has loaded.': '아니요. 백엔드도, 분석 도구도, 외부 스크립트도, CDN 웹폰트도 없습니다. 계산과 파일 생성은 탭 안에서 실행되고, 페이지를 한 번 열면 오프라인에서도 동작합니다.',
    'What is the difference between llms.txt and llms-full.txt?': 'llms.txt와 llms-full.txt는 무엇이 다른가요?',
    'is the small index: an agent reads it, then fetches only the pages it needs.': '는 작은 색인입니다. 에이전트가 이 파일을 읽고 필요한 페이지만 가져갑니다.',
    'is the expanded variant that carries the documentation text itself, so one fetch is enough. This generator keeps section bodies out of': '는 문서 본문까지 담은 확장판이라 한 번 받으면 충분합니다. 이 생성기는 섹션 본문을',
    'and includes them in': '에는 넣지 않고',
    'Where do I put the file?': '파일은 어디에 두나요?',
    'At the root of the domain as': '도메인 루트에',
    ', or at any subpath to cover just those pages, such as': '로 두거나, 해당 페이지만 대상으로 하위 경로에 둘 수 있습니다. 예:',
    '. You can point at it with a': '. 다음으로 가리킬 수 있습니다:',
    'link or an HTTP': '링크 또는 HTTP',
    'header. The file must be served as text; the download here is already a plain': '헤더. 파일은 텍스트로 제공되어야 하며, 여기서 내려받는 파일은 이미 일반',
    'Does llms.txt replace robots.txt or sitemap.xml?': 'llms.txt가 robots.txt나 sitemap.xml을 대신하나요?',
    'No.': '아니요.',
    'says which crawlers may fetch what,': '는 어떤 크롤러가 무엇을 가져갈 수 있는지 정하고,',
    'lists pages for search engines, and': '는 검색엔진에 페이지 목록을 주며,',
    'guides an agent that is already allowed in. Most sites want all three.': '는 이미 허용된 에이전트를 안내합니다. 대부분의 사이트는 셋 다 필요합니다.',
    'Why does the validator reject relative URLs?': '상대 URL을 왜 거부하나요?',
    'Because an agent reads the file from outside your site and cannot resolve': '에이전트가 사이트 밖에서 파일을 읽기 때문에 기준 주소를 모르는 상태에서',
    'against a base it does not know. Absolute URLs, ideally the Markdown version of each page, are unambiguous.': '를 해석할 수 없습니다. 절대 URL, 가능하면 각 페이지의 Markdown 버전이 분명합니다.',
    'Can I use this for a client site?': '고객사 사이트에 써도 되나요?',
    'Yes. There is nothing to sign up for, no attribution requirement and no markup on your prices. The generated file is yours.': '됩니다. 가입할 것도, 출처 표시 의무도, 가격 할증도 없습니다. 만들어진 파일은 여러분 것입니다.',
    'LLM Cost & llms.txt': 'LLM 비용 · llms.txt',
    'Two small tools for people who ship with language models. Built as a static page; no account, no server, no tracking.': '언어 모델로 제품을 만드는 사람을 위한 작은 도구 두 가지입니다. 정적 페이지로 만들었고 계정도 서버도 추적도 없습니다.',
    'Privacy': '개인정보',
    'llms.txt spec': 'llms.txt 규격',
    'Back to top': '맨 위로',
    'Prices are published list prices, checked 20 November 2026, and are not an offer. Model names belong to their providers; this page is not affiliated with any of them. Contact:': '가격은 2026년 11월 20일 확인한 공개 정가이며 청약이 아닙니다. 모델 이름은 각 제공사의 것이고 이 페이지는 어느 곳과도 제휴하지 않았습니다. 문의:',

    /* ---- app.js dynamic ---- */
    'Copy was blocked — select the text and copy it manually.': '복사가 차단되었습니다. 텍스트를 선택해 직접 복사해 주세요.',
    'Downloaded ': '내려받음: ',
    'Switch to light theme': '밝은 테마로 바꾸기',
    'Switch to dark theme': '어두운 테마로 바꾸기',
    ' tokens per request': ' 토큰/요청',
    'Workload reset to 1,500 in / 400 out, 1,000 requests a day.': '사용량을 입력 1,500 / 출력 400, 하루 1,000건으로 초기화했습니다.',
    'Paste some text first.': '텍스트를 먼저 붙여넣으세요.',
    'Loading tokenizer…': '토크나이저 불러오는 중…',
    '% vs ≈)': '% 대 ≈)',
    ' tokens · ': ' 토큰 · ',
    'Could not load the tokenizer — showing the ≈ estimate.': '토크나이저를 불러오지 못했습니다. ≈ 추정값으로 보여 줍니다.',
    'Counting…': '세는 중…',
    ' line': '줄',
    ' lines': '줄',
    ' chars · ≈': '자 · ≈',
    ' · exact ': ' · 정확히 ',
    'Exact count: ': '정확한 개수: ',
    ' tokens (o200k_base)': ' 토큰 (o200k_base)',
    'Tokenizer could not load': '토크나이저를 불러오지 못했습니다',
    'Input set to ≈': '입력값을 ≈',
    ' tokens.': ' 토큰으로 설정했습니다.',
    'custom': '직접 입력',
    'legacy': '이전 모델',
    ' input price per million tokens': ' 입력 가격 (100만 토큰당)',
    ' cached input price per million tokens': ' 캐시 입력 가격 (100만 토큰당)',
    ' output price per million tokens': ' 출력 가격 (100만 토큰당)',
    'No models match this filter. Add a custom model or switch the provider.': '이 필터에 맞는 모델이 없습니다. 직접 모델을 추가하거나 제공사를 바꿔 보세요.',
    ' model': '개 모델',
    ' models': '개 모델',
    ' requests/month': '건/월',
    'prices checked ': '가격 확인 ',
    'legacy models hidden': '이전 모델 숨김',
    'priciest first': '비싼 순',
    ' per month, ': ' /월, ',
    ' per request': ' /요청',
    'No models to chart.': '차트로 그릴 모델이 없습니다.',
    'Monthly cost includes ': '월 비용에는 ',
    ' requests.': '건의 요청이 포함됩니다.',
    'Dashed line: your ': '점선: 내 ',
    ' budget.': ' 예산.',
    'Every model here fits inside it.': '여기 있는 모델은 모두 예산 안에 들어옵니다.',
    'Legacy models are hidden — tick “Show legacy models” to compare them.': '이전 모델은 숨겨져 있습니다. “이전 모델 보기”를 켜면 비교할 수 있습니다.',
    'No models in this filter': '이 필터에 모델이 없습니다',
    '× the cheapest': '× 최저가',
    '% less · ': '% 절감 · ',
    'Add a second model to compare': '비교할 모델을 하나 더 추가하세요',
    'Your budget buys': '이 예산으로',
    ' a day on ': ' 하루에 처리: ',
    'This model costs nothing at these prices': '이 가격에서는 비용이 0입니다',
    ' calls': '건',
    '/day × ': ' /일 × ',
    ' days': '일',
    'Sort: priciest': '정렬: 비싼 순',
    'Prices restored to the published list prices.': '가격을 공개 정가로 되돌렸습니다.',
    'Give the model a name first.': '모델 이름을 먼저 넣어 주세요.',
    'Input and output prices are required.': '입력·출력 가격은 필수입니다.',
    'Prices cannot be negative.': '가격은 음수일 수 없습니다.',
    'Your own price': '내 가격',
    ' added at $': ' 추가됨 — $',
    ' out per 1M tokens.': ' (100만 토큰당 출력).',
    'Copied ': '복사함: ',
    ' rows as CSV.': '개 행을 CSV로.',
    'Copied the Markdown table (': 'Markdown 표를 복사했습니다 (',
    ' rows).': '개 행).',
    'Page title': '페이지 제목',
    'One-line note': '한 줄 메모',
    'Section name (Documentation, Pricing…)': '섹션 이름 (문서, 가격 등)',
    'Markdown body for llms-full.txt': 'llms-full.txt에 들어갈 Markdown 본문',
    'Optional Markdown carried into llms-full.txt': 'llms-full.txt에 담길 선택 Markdown',
    '+ Add link': '+ 링크 추가',
    ' issue': '개 문제',
    ' issues': '개 문제',
    ' to fix': '를 고쳐 주세요',
    'and ': '외 ',
    ' more': '개 더',
    'Ready, with ': '준비됨, 확인할 것 ',
    ' note': '개',
    ' notes': '개',
    'Ready to publish.': '공개할 준비가 되었습니다.',
    ' The file passes every structural check.': ' 파일이 모든 구조 검사를 통과했습니다.',
    'Spec re-read: valid llms.txt': '규격 재확인: 올바른 llms.txt',
    'Spec re-read: ': '규격 재확인: ',
    ' note(s)': '개 참고',
    ' problem(s)': '개 문제',
    ' section(s) · ': '개 섹션 · ',
    ' link(s)': '개 링크',
    ' example loaded — replace the example.com URLs.': ' 예시를 불러왔습니다. example.com 주소를 바꿔 주세요.',
    'Cleared. Start with the site name.': '지웠습니다. 사이트 이름부터 넣어 보세요.',
    'Nothing to copy yet — add a name and a summary.': '아직 복사할 것이 없습니다. 이름과 요약을 먼저 넣으세요.',
    ' copied to the clipboard.': ' 클립보드에 복사했습니다.',
    'Nothing to download yet — add a name and a summary.': '아직 내려받을 것이 없습니다. 이름과 요약을 먼저 넣으세요.',

    /* ---- validator messages ---- */
    'File is empty.': '파일이 비어 있습니다.',
    'The file must start with a single H1: "# Name".': '파일은 하나의 H1("# 이름")으로 시작해야 합니다.',
    'The first heading is H2; llms.txt starts with one H1.': '첫 제목이 H2입니다. llms.txt는 H1 하나로 시작합니다.',
    'A one-line blockquote summary (starting with ">") must come right after the H1.': '한 줄 인용 요약(">"로 시작)이 H1 바로 다음에 와야 합니다.',
    'Only H1 and H2 are used in llms.txt; this heading is deeper.': 'llms.txt에서는 H1과 H2만 씁니다. 이 제목은 더 깊습니다.',
    'Section heading has no name.': '섹션 제목에 이름이 없습니다.',
    'List item is not a markdown link; agents read "- [Name](URL): note".': '목록 항목이 Markdown 링크가 아닙니다. 에이전트는 "- [이름](주소): 설명" 형식을 읽습니다.',
    'Link has no name.': '링크에 이름이 없습니다.',
    'Link URL must be absolute (https://…).': '링크 주소는 절대 URL이어야 합니다 (https://…).',
    'No "## Section" yet — llms.txt needs somewhere to point.': '아직 "## 섹션"이 없습니다. llms.txt는 가리킬 곳이 필요합니다.',
    'No links yet — an agent has nothing to fetch.': '아직 링크가 없습니다. 에이전트가 가져갈 것이 없습니다.',
    'Files over ~50 KB are usually truncated by tooling; split it or use llms-full.txt.': '50KB를 넘는 파일은 도구에서 잘리는 경우가 많습니다. 나누거나 llms-full.txt를 쓰세요.',
    'Site or project name is required — it becomes the file\'s only H1.': '사이트 또는 프로젝트 이름이 필요합니다. 파일의 유일한 H1이 됩니다.',
    'Type the name without the leading "#"; the generator adds the heading marker.': '이름에 "#"을 붙이지 마세요. 제목 기호는 생성기가 넣습니다.',
    'Names longer than 120 characters are hard for an agent to match.': '120자를 넘는 이름은 에이전트가 맞추기 어렵습니다.',
    'A one-line summary is required — it becomes the blockquote that tells an agent what the site is.': '한 줄 요약이 필요합니다. 사이트가 무엇인지 알려 주는 인용문이 됩니다.',
    'The summary is a single blockquote line; line breaks are collapsed into spaces.': '요약은 인용 한 줄입니다. 줄바꿈은 공백으로 합쳐집니다.',
    'Do not type the ">" yourself — the generator adds the blockquote marker.': '">"를 직접 쓰지 마세요. 인용 기호는 생성기가 넣습니다.',
    'Summaries over 400 characters are rarely read in full; aim for one sentence.': '400자를 넘는 요약은 끝까지 읽히기 어렵습니다. 한 문장으로 줄이세요.',
    'Headings in the details block would break the file structure — use bold text or a list instead.': '상세 블록에 제목을 쓰면 파일 구조가 깨집니다. 굵은 글씨나 목록을 쓰세요.'
  };

  var META = {
    ko: {
      title: 'LLM API 비용 계산기 & llms.txt 생성기 — 무료, 업로드 없음',
      description: 'LLM 기능을 출시하기 전에 비용을 계산하세요. 같은 토큰 사용량이 OpenAI·Anthropic·Google·DeepSeek에서 얼마인지 비교하고, AI 에이전트용 llms.txt도 만듭니다. 모두 브라우저에서, 업로드 없이.',
      ogTitle: 'LLM API 비용 계산기 & llms.txt 생성기',
      ogDescription: '모델별 LLM 비용을 비교하고 llms.txt를 만듭니다. 모든 계산은 브라우저 안에서 끝납니다.'
    }
  };

  /* Keys are matched on whitespace-collapsed text, so store them that way. */
  var DICT_NORM = {};
  Object.keys(DICT).forEach(function (k) {
    var nk = String(k).replace(/\s+/g, ' ').trim();
    if (DICT_NORM[nk] == null) DICT_NORM[nk] = DICT[k];
  });

  var current = DEFAULT_LANG;
  var textOrig = new Map();
  var attrOrig = new WeakMap();
  var htmlOrig = new Map();
  var metaOrig = null;

  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function isOther() { return current === OTHER_LANG; }

  function detect() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'ko' || q === 'en') return q;
    } catch (e) { /* older engines */ }
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (e) { /* private mode */ }
    var nav = navigator.language || navigator.userLanguage || '';
    return /^ko/i.test(nav) ? 'ko' : 'en';
  }

  function t(en) {
    if (isOther() && en != null) {
      var key = norm(en);
      if (DICT_NORM[key] != null) return DICT_NORM[key];
    }
    return en;
  }

  function L(en, ko) { return isOther() ? ko : en; }

  function textNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

  function translateTextNode(node) {
    var orig = textOrig.get(node);
    if (orig == null) {
      if (!isOther()) return;
      orig = node.nodeValue;
      textOrig.set(node, orig);
    }
    var key = norm(orig);
    var tr = (isOther() && key) ? DICT_NORM[key] : null;
    if (tr == null && isOther() && /^[·\u00b7]\s/.test(key)) {
      var tail = key.replace(/^[·\u00b7]\s/, '');
      if (DICT_NORM[tail] != null) tr = key.slice(0, key.length - tail.length) + DICT_NORM[tail];
    }
    if (tr != null) {
      var lead = (orig.match(/^\s*/) || [''])[0];
      var trail = (orig.match(/\s*$/) || [''])[0];
      node.nodeValue = lead + tr + trail;
    } else {
      node.nodeValue = orig;
    }
  }

  function translateAttrs(el) {
    var rec = attrOrig.get(el);
    ATTRS.forEach(function (attr) {
      var val = el.getAttribute(attr);
      if (val == null) return;
      if (!rec) { rec = {}; attrOrig.set(el, rec); }
      if (!(attr in rec)) {
        if (!isOther()) return;
        rec[attr] = val;
      }
      var orig = rec[attr];
      var tr = isOther() ? DICT_NORM[norm(orig)] : null;
      el.setAttribute(attr, tr != null ? tr : orig);
    });
  }

  /* Translate one subtree. Used for the first paint and for markup that the
     app writes later (documents, table rows, dialogs). */
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute('data-ko-html')) {
      if (!htmlOrig.has(root)) htmlOrig.set(root, root.innerHTML);
      root.innerHTML = isOther() ? root.getAttribute('data-ko-html') : htmlOrig.get(root);
      return;
    }
    textNodes(root).forEach(translateTextNode);
    if (root.nodeType === 1) translateAttrs(root);
    Array.prototype.slice.call(root.querySelectorAll('body *')).forEach(translateAttrs);
  }

  var observer = null;
  var muting = false;
  function watch() {
    if (observer || !window.MutationObserver || !isOther()) return;
    observer = new MutationObserver(function (records) {
      if (muting) return;
      muting = true;
      try {
        records.forEach(function (rec) {
          Array.prototype.slice.call(rec.addedNodes || []).forEach(function (n) {
            if (n.nodeType === 1 || n.nodeType === 3) translateTree(n);
          });
        });
      } finally { muting = false; }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function applyDom() {
    textNodes(document.body).forEach(translateTextNode);
    Array.prototype.slice.call(document.querySelectorAll('[data-ko-html]')).forEach(translateTree);
    Array.prototype.slice.call(document.querySelectorAll('body *')).forEach(translateAttrs);
    if (isOther()) watch();
  }

  function setMeta(attr, name, value) {
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (el) el.setAttribute('content', value);
  }

  function applyMeta() {
    if (!metaOrig) {
      metaOrig = {
        title: document.title,
        description: (document.querySelector('meta[name="description"]') || {}).content || '',
        ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || '',
        ogDescription: (document.querySelector('meta[property="og:description"]') || {}).content || ''
      };
    }
    var pack = isOther() ? META[OTHER_LANG] : null;
    document.title = pack ? pack.title : metaOrig.title;
    setMeta('name', 'description', pack ? pack.description : metaOrig.description);
    setMeta('property', 'og:title', pack ? pack.ogTitle : metaOrig.ogTitle);
    setMeta('property', 'og:description', pack ? pack.ogDescription : metaOrig.ogDescription);
  }

  function paintButtons() {
    Array.prototype.slice.call(document.querySelectorAll('[data-lang]')).forEach(function (b) {
      var on = b.getAttribute('data-lang') === current;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function apply(lang) {
    current = (lang === 'ko' || lang === 'en') ? lang : DEFAULT_LANG;
    document.documentElement.lang = current;
    applyMeta();
    applyDom();
    paintButtons();
  }

  function set(lang) {
    if (lang !== 'ko' && lang !== 'en') return;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
    apply(lang);
    bind();
    fireLang();
  }

  function bind() {
    Array.prototype.slice.call(document.querySelectorAll('[data-lang]')).forEach(function (b) {
      if (b.getAttribute('data-bound') === '1') return;
      b.setAttribute('data-bound', '1');
      b.addEventListener('click', function () { set(b.getAttribute('data-lang')); });
    });
  }

  /* Apps that build text in JS render before this file boots; tell them once
     so their first paint matches the chosen language. */
  function fireLang() {
    try {
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
    } catch (e) { /* older engines */ }
  }

  function boot() {
    apply(detect());
    bind();
    fireLang();
  }

  window.OneTapLang = {
    detect: detect,
    current: function () { return current; },
    set: set,
    apply: apply,
    bind: bind,
    t: t,
    L: L,
    translate: translateTree,
    isKo: function () { return isOther(); }
  };
  window.t = t;
  window.L = L;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
