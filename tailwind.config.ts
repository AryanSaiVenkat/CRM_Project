import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRD §8.2 design tokens
        primary: { DEFAULT: "#1E3A8A", foreground: "#FFFFFF" },
        accent: { DEFAULT: "#0F766E", foreground: "#FFFFFF" },
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#1E3A8A",
        background: "#F8FAFC",
        foreground: "#0F172A",
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" },
        destructive: { DEFAULT: "#B42318", foreground: "#FFFFFF" },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
