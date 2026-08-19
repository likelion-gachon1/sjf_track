// 02 PRODUCT / 03 MOOD / 04 TRAVEL STYLE 이 공유하는 레이아웃.
// 목업 기준: 상단 가운데 진행 표시(점), 중앙 헤딩 + 서브라인, 선택 영역, 필요하면 하단 각주.
interface StepFrameProps {
  /** 1~3 (진행 단계) */
  stepNumber: number;
  totalSteps?: number;
  heading: string;
  subline?: string;
  footnote?: string;
  children: React.ReactNode;
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
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-center bg-cover bg-center px-12 py-14 text-center"
      style={{
        // 02·03·04 선택 화면 공통 배경(qr). 옅은 종이빛 베일만 얹어 헤딩 가독성을
        // 확보하고, 파일이 없으면 기존 종이색(paper)으로 폴백합니다.
        backgroundImage:
          "linear-gradient(rgba(250,248,245,0.4), rgba(250,248,245,0.4)), url(/ui/qr.jpg), linear-gradient(#faf8f5, #faf8f5)",
      }}
    >
      <ProgressDots current={stepNumber} total={totalSteps} />

      <h2 className="mt-10 font-sans text-4xl font-extrabold leading-snug text-ink">{heading}</h2>
      {subline && <p className="mt-4 text-sm text-ink/80">{subline}</p>}

      <div className="mt-14 flex w-full max-w-5xl flex-col items-center">{children}</div>

      {footnote && <p className="absolute bottom-12 text-xs text-ink/65">{footnote}</p>}
    </div>
  );
}

// 상단 가운데 진행 점 — 지난/현재 단계는 진하게, 다음 단계는 옅게. 점 사이는 선으로 잇습니다.
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center" aria-label={`${current} / ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        return (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <span
                className={[
                  "h-px w-10",
                  i < current ? "bg-ink/40" : "bg-ink/15",
                ].join(" ")}
              />
            )}
            <span
              className={[
                "h-2.5 w-2.5 rounded-full",
                done ? "bg-ink/70" : "bg-ink/20",
              ].join(" ")}
            />
          </div>
        );
      })}
    </div>
  );
}
