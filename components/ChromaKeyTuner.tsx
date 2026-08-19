"use client";

import { useCallback, useEffect, useState } from "react";
import { CAMERA_CONFIG } from "@/config/portal.config";
import { pickColorFromVideo, type ChromaKeyParams } from "@/lib/chromaKey";
import { coverRect } from "@/lib/composite";
import {
  clearTunedChromaKey,
  defaultChromaKey,
  formatChromaKeySnippet,
  readTunedChromaKey,
  writeTunedChromaKey,
} from "@/lib/matting";

// =============================================================================
// 크로마키 보정 패널 — /calibrate 와 07 화면(?tune=1)이 공유합니다.
// -----------------------------------------------------------------------------
// 이 패널의 결과물은 화면 상태가 아니라 **config 에 붙여넣을 코드 조각**입니다.
// localStorage 저장은 조정하는 동안 새로고침해도 값이 남게 하려는 편의일 뿐이고,
// 부스 실행은 언제나 config/portal.config.ts 의 상수만 씁니다 (lib/matting.ts 주석).
// =============================================================================

export interface ChromaKeyTuning {
  params: ChromaKeyParams;
  update: (patch: Partial<ChromaKeyParams>) => void;
  reset: () => void;
  /** World 배경 대신 마젠타 단색 — 남은 초록 테두리와 인물 구멍이 드러납니다. */
  alphaView: boolean;
  setAlphaView: (v: boolean) => void;
  /** "화면에서 색 찍기" 모드. 켜져 있으면 미리보기 클릭이 키 컬러를 바꿉니다. */
  picking: boolean;
  setPicking: (v: boolean) => void;
}

export function useChromaKeyTuning(): ChromaKeyTuning {
  // 서버 렌더와 첫 클라이언트 렌더가 같아야 하므로 config 값으로 시작하고,
  // 저장해둔 보정값은 mount 이후에 얹습니다.
  const [params, setParams] = useState<ChromaKeyParams>(defaultChromaKey);
  const [alphaView, setAlphaView] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setParams(readTunedChromaKey());
  }, []);

  const update = useCallback((patch: Partial<ChromaKeyParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      writeTunedChromaKey(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearTunedChromaKey();
    setParams(defaultChromaKey());
  }, []);

  return { params, update, reset, alphaView, setAlphaView, picking, setPicking };
}

/**
 * 미리보기 캔버스 클릭 → 비디오 원본의 그 지점 색.
 *
 * ⚠️ 두 번 변환해야 맞습니다.
 *   1) 합성 화면은 인물 레이어를 **좌우 반전**해서 그립니다(CAMERA_CONFIG.mirror).
 *      이걸 빼면 왼쪽 초록을 찍었는데 오른쪽 사람 색이 잡힙니다.
 *   2) 비디오는 캔버스에 **cover 크롭**으로 들어갑니다. 잘려나간 만큼을 되돌려야
 *      화면 좌표와 원본 좌표가 맞습니다.
 */
export function pickKeyColorFromClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  video: HTMLVideoElement | null
): string | null {
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const box = event.currentTarget.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;

  let u = (event.clientX - box.left) / box.width;
  const v = (event.clientY - box.top) / box.height;
  if (CAMERA_CONFIG.mirror) u = 1 - u;

  // coverRect 는 종횡비에만 의존하므로 CSS 픽셀 크기를 그대로 넣어도 됩니다.
  const cover = coverRect(video.videoWidth, video.videoHeight, box.width, box.height);
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const videoU = clamp01((u * box.width - cover.x) / cover.width);
  const videoV = clamp01((v * box.height - cover.y) / cover.height);

  return pickColorFromVideo(video, videoU, videoV);
}

interface SliderProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, hint, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-wide text-white/90">{label}</span>
        <span className="font-mono text-xs text-white/60">{value.toFixed(3)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-white"
      />
      <span className="mt-0.5 block text-[11px] leading-snug text-white/45">{hint}</span>
    </label>
  );
}

export default function ChromaKeyTuner({
  tuning,
  className = "",
}: {
  tuning: ChromaKeyTuning;
  className?: string;
}) {
  const { params, update, reset, alphaView, setAlphaView, picking, setPicking } = tuning;
  const snippet = formatChromaKeySnippet(params);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // http 등 클립보드가 막힌 환경 — 아래 textarea 에서 직접 복사하면 됩니다.
      setCopied(false);
    }
  };

  return (
    <div
      className={
        "w-[320px] max-w-full space-y-4 rounded-2xl bg-black/75 p-5 text-white backdrop-blur " +
        className
      }
    >
      <div>
        <p className="text-xs font-semibold tracking-widest">크로마키 보정</p>
        <p className="mt-1 text-[11px] leading-snug text-white/50">
          조명을 먼저 잡고, 키 컬러 → similarity → spill 순으로 맞추세요.
          <br />
          <span className="text-white/40">몸 윤곽에 초록 테두리가 남으면 spill 을 올립니다.</span>
        </p>
      </div>

      {/* 키 컬러 */}
      <div className="space-y-2">
        <span className="text-xs font-semibold tracking-wide text-white/90">키 컬러</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={params.keyColor}
            onChange={(e) => update({ keyColor: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
            aria-label="키 컬러"
          />
          <span className="font-mono text-xs text-white/70">{params.keyColor}</span>
        </div>
        <button
          type="button"
          onClick={() => setPicking(!picking)}
          aria-pressed={picking}
          className={[
            "w-full rounded-lg border px-3 py-2 text-xs transition-colors",
            picking
              ? "border-white bg-white text-black"
              : "border-white/30 text-white/85 hover:bg-white/10",
          ].join(" ")}
        >
          {picking ? "화면을 클릭하세요 (취소하려면 다시 누름)" : "화면에서 색 찍기"}
        </button>
        <p className="text-[11px] leading-snug text-white/45">
          인물이 설 자리 뒤, 스크린 가운데를 찍으세요. 구석이 덜 지워지면 조명을 먼저
          고르게 잡고, 그래도 남으면 similarity 를 조금씩 올립니다.
        </p>
      </div>

      <Slider
        label="similarity"
        hint="지우는 색 범위. 0.3 을 넘기면 무채색 옷·피부까지 지워집니다."
        value={params.similarity}
        min={0.02}
        max={0.4}
        step={0.005}
        onChange={(v) => update({ similarity: v })}
      />
      <Slider
        label="smoothness"
        hint="가장자리 부드러움. 너무 키우면 인물 윤곽이 반투명해집니다."
        value={params.smoothness}
        min={0}
        max={0.3}
        step={0.005}
        onChange={(v) => update({ smoothness: v })}
      />
      <Slider
        label="edgeShrink"
        hint="머리카락·움직임 블러의 반투명 띠를 깎습니다. 과하면 머리카락이 얇아집니다."
        value={params.edgeShrink}
        min={0}
        max={0.7}
        step={0.02}
        onChange={(v) => update({ edgeShrink: v })}
      />
      <Slider
        label="spill ← 초록 테두리"
        hint="몸 윤곽에 초록 테두리가 보이면 이걸 올리세요(1.0 권장). 카키·올리브 옷이 탁해지면 0.6 정도로."
        value={params.spill}
        min={0}
        max={1}
        step={0.02}
        onChange={(v) => update({ spill: v })}
      />

      <label className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2">
        <input
          type="checkbox"
          checked={alphaView}
          onChange={(e) => setAlphaView(e.target.checked)}
          className="h-4 w-4 accent-fuchsia-500"
        />
        <span className="text-xs">
          알파 보기
          <span className="ml-1 text-white/45">— 배경을 마젠타로</span>
        </span>
      </label>

      {/* 결과 — 이 패널의 진짜 산출물 */}
      <div className="space-y-2 border-t border-white/15 pt-3">
        <p className="text-[11px] leading-snug text-white/60">
          아래 코드를 <code className="font-mono">config/portal.config.ts</code> 의{" "}
          <code className="font-mono">MATTING_CONFIG</code> 안 chromaKey 블록에 덮어쓰세요.
        </p>
        <textarea
          readOnly
          value={snippet}
          rows={6}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-lg bg-black/60 p-2 font-mono text-[11px] leading-snug text-emerald-200/90 outline-none ring-1 ring-white/15"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/85"
          >
            {copied ? "복사됨" : "설정 코드 복사"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-white/30 px-3 py-2 text-xs text-white/85 hover:bg-white/10"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
