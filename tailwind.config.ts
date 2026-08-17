import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        paper: "#faf8f5",
        accent: "#b08d57",
      },
      // 서체는 SUIT-Bold 하나로 통일합니다(app/layout.tsx 에서 로드).
      // serif 도 같은 서체를 가리키므로, 기존 font-serif 클래스를 일일이 바꾸지 않아도
      // 동일하게 적용됩니다. 폰트 로드 전/실패 시에만 뒤쪽 시스템 폰트로 넘어갑니다.
      fontFamily: {
        sans: [
          "var(--font-suit)",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "sans-serif",
        ],
        serif: [
          "var(--font-suit)",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "sans-serif",
        ],
      },
      letterSpacing: {
        widest2: "0.35em",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
