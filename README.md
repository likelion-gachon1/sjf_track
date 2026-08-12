# MCM PORTAL — Step 2 프로토타입

5단계 플로우는 Step 1과 동일하게 유지하고, 4번 "미러" 화면에 실제 웹캠 영상을
띄웠습니다. 아직 배경 합성/세그멘테이션/크로마키는 없습니다 (다음 스텝).

## 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속. 부스의 큰 가로 화면 기준 레이아웃이라 브라우저 창을 넓게 띄워서 보는 걸 권장합니다.

4번 미러 화면에 들어가면 브라우저가 카메라 권한을 요청합니다. **허용**을 눌러야 영상이 보입니다.

## 우리가 수정할 파일

거의 모든 카피/데이터는 [`config/portal.config.ts`](config/portal.config.ts) 하나에 모여 있습니다.

- `COPY` — 화면에 보이는 모든 문구 (카메라 안내 문구 포함)
- `MOOD_QUESTION` / `COLOR_QUESTION` — 2번 화면(취향 입력)의 질문과 선택지
- `WORLDS` — World 목록 (이름, 한줄 소개, CSS 그라데이션)
- `WORLD_MAPPING` — (오늘의 순간, 제품 색) 답변 조합 → 대표 World + 추천 이유 문장
- `WORLD_ALTERNATES` — 결과 화면에 같이 보여줄 대안 World 2개
- `CAMERA_CONFIG` — 웹캠 요청 해상도(`width`/`height`)와 좌우 반전(`mirror`) 여부

컴포넌트 코드(`components/`)는 건드릴 필요 없이 위 값만 바꾸면 화면에 바로 반영됩니다.

## 플로우

1. **인트로** (`components/StepIntro.tsx`) — 촬영 동의 체크 후 시작
2. **취향 입력** (`components/StepGuided.tsx`) — 질문 2개
3. **World 추천 결과** (`components/StepWorldResult.tsx`) — 대표 1 + 대안 2
4. **미러** (`components/StepMirror.tsx` + `components/MirrorStage.tsx`) — 실제 웹캠 영상(좌우 반전), World 썸네일로 전환 가능, 캡처
5. **결과 & 저장** (`components/StepResult.tsx`) — 저장, 갤러리, QR 자리

상태는 `lib/FlowContext.tsx`의 React Context + `useReducer`로 관리되며 라우팅 없이 한 페이지에서 전환됩니다.

## 웹캠 동작 방식

- `lib/useCamera.ts`가 `getUserMedia` 권한 요청, 에러 분류(권한 거부/카메라 없음/사용 중/미지원), 카메라 목록 조회를 담당합니다.
- `components/MirrorStage.tsx`가 `<video>`(화면 밖 hidden)에서 매 프레임을 `<canvas>`로 그려서 보여줍니다. `requestAnimationFrame` 루프를 사용하며, 다음 스텝에서 이 draw 루프 안에 배경 합성을 붙일 예정입니다.
- 미러 화면을 벗어나면(다른 단계로 이동) 컴포넌트가 언마운트되면서 스트림이 자동으로 `stop()`되고, 다시 들어오면 재요청합니다.
- 카메라가 여러 대면 화면 우측 하단에 선택 드롭다운이 뜹니다(1대면 생략).
- 권한 거부/카메라 없음/사용 중 등 에러 상황에서는 안내 문구 + "다시 시도" 버튼이 뜹니다.

## 다음 스텝에서 추가될 것

세그멘테이션/크로마키, 선택된 World 배경과의 실시간 합성 — 이번 Step 2에는 포함되지 않았습니다.
