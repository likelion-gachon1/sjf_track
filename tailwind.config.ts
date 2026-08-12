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
      fontFamily: {
        serif: [
          "'Playfair Display'",
          "Georgia",
          "'Times New Roman'",
          "serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Pretendard",
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
