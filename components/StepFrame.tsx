// 02 PRODUCT / 03 MOOD / 04 TRAVEL STYLE 이 공유하는 레이아웃.
// 와이어프레임 기준: 우상단 진행 표시(01 / 03), 중앙 헤딩 + 서브라인, 선택 영역,
// 필요하면 하단 각주.
interface StepFrameProps {
  /** 1~3 (와이어프레임의 01 / 02 / 03) */
  stepNumber: number;
  totalSteps?: number;
  heading: string;
  subline?: string;
  footnote?: string;
  children: React.ReactNode;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function StepFrame({
  stepNumber,
  totalSteps = 3,
  heading,
  subline,
  footnote,
  children,
}: StepFrameProps) {
  return (
    <div className="relative flex h-full min-h-screen flex-col items-center justify-center bg-paper px-12 py-14 text-center">
      <p className="absolute right-12 top-12 text-xs tracking-widest2 text-ink/40">
        {pad2(stepNumber)} / {pad2(totalSteps)}
      </p>

      <h2 className="font-serif text-4xl leading-snug">{heading}</h2>
      {subline && <p className="mt-4 text-sm text-ink/50">{subline}</p>}

      <div className="mt-14 flex w-full max-w-4xl flex-col items-center">{children}</div>

      {footnote && <p className="absolute bottom-12 text-xs text-ink/35">{footnote}</p>}
    </div>
  );
}
