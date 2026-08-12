# MCM PORTAL — Step 1 프로토타입

웹캠/합성 없이, 5단계 플로우가 클릭만으로 끝까지 흐르는 더미 데이터 기반 껍데기.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속. 부스의 큰 가로 화면 기준 레이아웃이라 브라우저 창을 넓게 띄워서 보는 걸 권장합니다.

## 우리가 수정할 파일

거의 모든 카피/데이터는 [`config/portal.config.ts`](config/portal.config.ts) 하나에 모여 있습니다.

- `COPY` — 화면에 보이는 모든 문구
- `MOOD_QUESTION` / `COLOR_QUESTION` — Step 2 질문과 선택지
- `WORLDS` — World 목록 (이름, 한줄 소개, CSS 그라데이션)
- `WORLD_MAPPING` — (오늘의 순간, 제품 색) 답변 조합 → 대표 World + 추천 이유 문장
- `WORLD_ALTERNATES` — 결과 화면에 같이 보여줄 대안 World 2개

컴포넌트 코드(`components/`)는 건드릴 필요 없이 위 값만 바꾸면 화면에 바로 반영됩니다.

## 플로우

1. **인트로** (`components/StepIntro.tsx`) — 촬영 동의 체크 후 시작
2. **취향 입력** (`components/StepGuided.tsx`) — 질문 2개
3. **World 추천 결과** (`components/StepWorldResult.tsx`) — 대표 1 + 대안 2
4. **미러** (`components/StepMirror.tsx`) — 자리만 있는 미러 화면, World 썸네일로 전환 가능, 캡처
5. **결과 & 저장** (`components/StepResult.tsx`) — 저장, 갤러리, QR 자리

상태는 `lib/FlowContext.tsx`의 React Context + `useReducer`로 관리되며 라우팅 없이 한 페이지에서 전환됩니다.

## 다음 스텝에서 추가될 것

웹캠 연동, 세그멘테이션/크로마키, 실시간 합성 — 이번 Step 1에는 포함되지 않았습니다.
