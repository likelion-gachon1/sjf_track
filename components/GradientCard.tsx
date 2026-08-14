"use client";

import type { WorldDef } from "@/lib/types";

type Size = "lg" | "md" | "sm" | "xs";

const SIZE_CLASSES: Record<Size, string> = {
  lg: "h-[420px] rounded-2xl p-8",
  md: "h-[280px] rounded-2xl p-6",
  sm: "h-[160px] rounded-xl p-4",
  xs: "h-20 w-32 rounded-lg p-2",
};

interface GradientCardProps {
  world: WorldDef;
  size?: Size;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

// World 카드. 실사 배경(backgroundImage)이 준비돼 있으면 그걸 쓰고, 없으면 gradient 로
// 폴백합니다. 현재 와이어프레임 화면에서는 쓰이지 않지만, 미러 화면의 "다른 세계도
// 보기" 안건이 확정되면 그대로 되살릴 수 있게 남겨둡니다.
export default function GradientCard({
  world,
  size = "md",
  selected = false,
  onClick,
  className = "",
  children,
}: GradientCardProps) {
  const textColor = world.textOn === "light" ? "text-white" : "text-ink";
  const isInteractive = typeof onClick === "function";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={[
        SIZE_CLASSES[size],
        textColor,
        "relative flex w-full flex-col justify-end overflow-hidden bg-cover bg-center text-left transition-transform duration-300",
        isInteractive ? "cursor-pointer hover:scale-[1.015]" : "cursor-default",
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-paper" : "",
        className,
      ].join(" ")}
      style={{
        backgroundImage: world.backgroundImage
          ? `url(${world.backgroundImage})`
          : world.gradient,
      }}
    >
      {size !== "xs" && (
        <div>
          <p className="font-serif text-2xl">{world.name}</p>
          <p className="mt-1 text-sm opacity-80">{world.tagline}</p>
        </div>
      )}
      {size === "xs" && <p className="font-serif text-sm leading-tight">{world.name}</p>}
      {children}
    </button>
  );
}
