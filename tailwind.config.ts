import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        card: "#111111",
        border: "#2a2a2a",
        "accent-green": "#00ff66",
        "accent-orange": "#ff7700",
        ink: "#0a0a0a",
        neon: {
          green: "#00ff66",
          orange: "#ff7700",
        },
        "zsea-bg": "#171A15",
        "zsea-card": "#1B2019",
        "zsea-border": "#333A2D",
        "zsea-accent-green": "#9ABC87",
        "zsea-accent-purple": "#9ABC87",
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Cascadia Code", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
