import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        glass: "var(--glass)",
      },
      borderColor: {
        border: "var(--border)",
      },
      textColor: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        apple: "var(--radius-apple)",
      },
      boxShadow: {
        apple: "var(--shadow-apple)",
        "apple-hover": "var(--shadow-apple-hover)",
      },
    },
  },
  plugins: [],
};

export default config;
