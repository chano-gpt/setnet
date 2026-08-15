# setnet

<p align="center">
  <img src="assets/collie-hero.webp" alt="양떼를 몰고 있는 개 한 마리" width="640">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/harnesses-7-666666?labelColor=333333" alt="7 harnesses" />
  <img src="https://img.shields.io/badge/runs_on-herdr-666666?labelColor=333333" alt="runs on herdr" />
  <img src="https://img.shields.io/badge/transport-tailscale-666666?labelColor=333333" alt="tailscale" />
  <img src="https://img.shields.io/badge/license-MIT-666666?labelColor=333333" alt="MIT license" />
</p>

<p align="center">
  한국어 · <a href="README.en.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
</p>

---

**헛둘셋넷 — 여러 종류의 코딩 에이전트를 폰 하나로 몰고 다닌다.**

setnet은 [Herdr](https://herdr.dev) 위에서 도는 에이전트 무리를 폰에서 감독하는 웹 UI다. Tailscale 안에서만 열리고, 클라우드도 계정도 없다.

다른 도구와 갈리는 지점은 하나다. **setnet은 에이전트를 종류별로 구분해서 다룬다.** 터미널 화면을 그대로 미러링해 던져주는 대신, 하네스마다 무엇을 할 수 있고 무엇을 하면 안 되는지를 알고 있다 — Claude Code, Codex, pi, OpenCode, 그리고 **AGY와 OMO(Senpi)**까지.

## 목차

- [무엇이 다른가](#무엇이-다른가)
- [지원 하네스](#지원-하네스)
- [핵심 기능](#핵심-기능)
- [설치](#설치)
- [보안 — 반드시 먼저 읽기](#보안--반드시-먼저-읽기)
- [계보](#계보)
- [문서](#문서)

## 무엇이 다른가

가장 가까운 대안은 [Collie](https://github.com/AltanS/collie)다 — setnet은 여기서 갈라져 나왔다. Collie는 어떤 에이전트든 하나의 범용 터미널 미러로 다룬다. setnet은 그 위에 **하네스를 아는 계층**을 얹었다.

| | setnet | Collie |
|---|---|---|
| **AGY · OMO(Senpi) 지원** | 전용 명령 카탈로그 + 트랜스크립트 어댑터 | 없음 |
| **에이전트 실행** | 앱에서 6종 실행, 하네스별 안전 인자 고정 (Claude는 `--permission-mode manual`, Codex는 `--ask-for-approval on-request --sandbox workspace-write`) | 이미 떠 있는 패널에만 붙음 |
| **프롬프트 전송 경로** | 대시보드에서는 모든 에이전트가 Herdr `agent.prompt`로 직접 전송 — 터미널 타이핑을 우회 | PTY에 키를 찍어 넣는 경로만 존재 |
| **계획 진행 상황** | Senpi todo-state를 파싱해 현재 단계와 작업별 상태(대기/진행/완료/중단)를 대화에 표시 | 없음 |
| **대시보드에서 바로 지시** | 패널에 들어가지 않고 대시보드에서 프롬프트 전송, IME 안전 초안, 실시간 작업 경과 시간 | 패널로 들어가야 함 |
| **모바일 내비게이션** | 전용 탭 바 (무리 / 스페이스, 주의 필요 개수 배지) | 단일 대시보드 |
| **번들 명령의 정직성** | 카탈로그마다 `partial`(불완전) · `insert-only`(자동 실행 안 함) 표시 + 출처 명시 | 완전한 목록인 것처럼 노출 |
| **미지원 하네스** | 두 단계 확인("그래도 입력") 없이는 입력 거부 | 그냥 한 번에 전송 |
| **응답 본문 검증** | 형식이 어긋난 요청은 거부 | 누락 필드를 조용히 기본값 처리 |

**보안 모델과 배포 방식은 Collie 그대로 두었다** — 루프백 바인딩, `tailscale serve` 단일 진입점, same-origin 게이트. 검증된 것을 다시 만들 이유가 없다.

## 지원 하네스

| 하네스 | 명령 카탈로그 | 대화 기록 | 화면 문법 인식 | 앱에서 실행 |
|---|---|---|---|---|
| **AGY** (Antigravity) | ✅ AGY 1.1.12 기준 | — | — | ✅ |
| **OMO** (Senpi) | ✅ Senpi 2026.8.12-4 기준 | ✅ + 계획 진행 상황 | ✅ | ✅ |
| Claude Code | ✅ | ✅ | ✅ 전체 문법 | ✅ (`--permission-mode manual`) |
| Codex | ✅ | ✅ | — | ✅ (승인 요청 + workspace-write 샌드박스) |
| pi | ✅ | ✅ | — | ✅ |
| OpenCode | ✅ | ✅ | — | ✅ |
| omp | ✅ | — | ✅ 기본 | — |

"화면 문법 인식"은 터미널 화면에서 선택지·마법사·입력창 상태를 읽어내는 어댑터를 말한다. Claude Code만 전체 문법(프롬프트 선택, 마법사, 미리보기, 다중 선택, 메뉴)을 갖고, OMO는 omp 어댑터를 공유한다. 어댑터가 없는 하네스는 범용 미러로 떨어지고, 대화 기록 어댑터가 없는 하네스(AGY, omp)는 히스토리 기능이 뜨지 않는다.

명령 카탈로그는 **의도적으로 불완전하다.** 워크스페이스 스킬·플러그인·MCP 프롬프트가 런타임에 명령을 추가하기 때문에, setnet은 자기가 아는 것만 `partial`로 표시해 노출하고 출처를 밝힌다. 그리고 **탭해도 실행되지 않는다** — 입력창에 삽입만 하고 전송은 사람이 한다. 런타임 명령 집합은 흔들리고, 지원하지 않는 명령은 부작용을 낼 수 있기 때문이다.

## 핵심 기능

**하네스를 아는 조작**
- 하네스별 슬래시 명령 팔레트 — 입력창에서 `/`를 치면 인라인 메뉴, 탭해서 삽입
- 어댑터가 없는 하네스에는 입력을 막고, 두 단계 확인을 거쳐야 통과
- 패널에서 답할 때는 화면을 읽어 입력창 준비 상태를 확인하고, 보낸 글자가 실제로 들어갔는지 확인한 뒤에야 전송 키를 누른다 — 대화상자가 키보드를 잡고 있을 때 엔터가 그 대화상자를 answer해버리는 사고를 막는다
- OMO처럼 검증된 터미널 입력 문법이 없는 하네스는 Herdr의 관리형 수명주기(`agent.prompt`)로 보낸다 — PTY를 건드리지 않는다

**대화 기록**
- 터미널이 스크롤백으로 되돌아갈 수 없는 구간까지, 에이전트 자신의 세션 로그에서 읽는다
- OMO는 계획(plan)을 별도 블록으로 렌더 — 현재 단계와 완료 개수까지
- 라이브 대화 뷰는 폴링에 상한을 두고, 화면이 가려지면 멈추고, 진행 중이던 요청은 취소한다

**모바일 우선**
- 홈 화면에 설치되는 PWA
- 무리 / 스페이스 탭 바, 주의가 필요한 에이전트 개수 배지
- 대시보드는 "마지막에 바뀐 순서"가 아니라 **"당신을 기다리는 순서"**로 정렬
- 특수키 패드(`Esc`, `Ctrl+C`, 화살표), 카메라 롤 이미지 전송, 출력 내 검색
- 에이전트가 막히면 웹 푸시로 알림

**직접 소유**
- 당신 기계에서 돈다. 루프백 바인딩, 클라우드 없음, 계정 없음
- 현관문은 당신이 고른다 — 기본은 `tailscale serve`, 아니면 직접 세운 리버스 프록시

## 설치

호스트(에이전트가 도는 기계)에서 실행한다. 폰이 아니다.

```bash
herdr plugin install chano-gpt/setnet
herdr plugin action invoke start --plugin herdr.collie
```

로컬 클론으로 개발하려면:

```bash
git clone https://github.com/chano-gpt/setnet.git && cd setnet
herdr plugin link "$(pwd)"
herdr plugin action invoke start --plugin herdr.collie
```

> 플러그인 id는 아직 `herdr.collie`다. 리브랜딩이 기존 설치를 깨지 않는다고 확인될 때까지 유지한다.

필요한 것: [Bun](https://bun.sh), [Herdr](https://herdr.dev) 0.7.0 이상, [Tailscale](https://tailscale.com), git. 첫 실행 배너·업데이트·트러블슈팅 절차는 [운영 매뉴얼](OPERATIONS.md)에 전부 있다.

## 보안 — 반드시 먼저 읽기

**setnet은 설계상 당신 기계에 대한 원격 셸 접근이다.** 한 번의 호출이 실제 터미널 패널에 임의의 키를 입력한다. URL에 닿는 사람은 모든 패널(소스, 시크릿, 환경변수, 에이전트 출력)을 읽고 당신 계정으로 아무 명령이나 실행할 수 있다. 샌드박스도 명령 허용목록도 없다 — 있으면 도구의 목적 자체가 사라진다. **URL을 루트 로그인처럼 다뤄라.**

기본 방어선:

- **루프백 바인딩만** (`127.0.0.1`) — 절대 `0.0.0.0`이 아니다
- **단단한 현관문 정확히 하나** — `tailscale serve`(기본), 또는 규격에 맞는 리버스 프록시
- **`COLLIE_TRUSTED_USER`** — 본인 tailnet 계정 외 전부 거부
- **`COLLIE_DEVICE_HEADER` + `COLLIE_DEVICE_ALLOWLIST`** — 기기별 쓰기 권한, 나머지는 읽기 전용
- **`COLLIE_PUBLIC_HOSTS`** — Host 검증으로 DNS 리바인딩 차단
- same-origin 게이트 + 엄격한 CSP, 패널 출력은 React 텍스트 노드로만 렌더

> 🚫 **`tailscale funnel`은 절대 쓰지 마라.** funnel은 이것을 공인 인터넷에 노출한다. setnet을 funnel로 여는 것이 옳은 상황은 존재하지 않는다.

네 가지 배포 형태(개인 tailnet / 기기 인가 프록시 / 리버스 프록시 단독 / off-host 아이덴티티 프록시)의 정확한 설정은 잘못 옮기면 그대로 사고가 되는 영역이라 **원문을 번역하지 않고 유지한다** — [운영 매뉴얼 → Security](OPERATIONS.md#%EF%B8%8F-security--read-before-you-run-it) · [Deployment variants](OPERATIONS.md#deployment-variants)를 읽어라.

무보증으로 제공된다.

## 계보

setnet은 [AltanS/collie](https://github.com/AltanS/collie)에서 갈라져 나왔고, 그 위에 크로스 하네스 계층을 얹었다. Collie가 먼저 증명한 것 — 폰에서 에이전트를 모는 게 실제로 쓸 만하다는 것, 그리고 그걸 안전하게 여는 방법 — 은 그대로 가져와 쓴다. 업스트림이 다듬어 온 설치·보안·배포 문서 전체는 [운영 매뉴얼](OPERATIONS.md)에 영문 그대로 보존했다.

## 문서

- 설계 근거 — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 검증된 Herdr 소켓 API — [`HERDR_API.md`](./HERDR_API.md)
- 운영·버전 규칙 — [`CLAUDE.md`](./CLAUDE.md)
- 결정 기록 — [`.adr/`](./.adr/)
- 변경 이력 — [`CHANGELOG.md`](./CHANGELOG.md)
- 설치·보안·배포 운영 매뉴얼(영문) — [`OPERATIONS.md`](./OPERATIONS.md)
