import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        card: "#111113",
        accent: "#2563EB"
      }
    }
  },
  plugins: []
};

export default config;
