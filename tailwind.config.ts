import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#faf8f6",
          100: "#f5efe8",
          200: "#ece7e1",
          300: "#e0d5c8",
          400: "#d8cfc4",
          500: "#b5a99a",
          600: "#8a8078",
          700: "#6b6b6b",
          800: "#2c2c2c",
        },
        accent: {
          DEFAULT: "#c69f73",
          hover: "#b08a5f",
          light: "#f5efe8",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        tag: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
