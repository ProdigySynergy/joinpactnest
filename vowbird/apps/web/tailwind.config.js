/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0f1729", light: "#1a2744" },
        gold: { DEFAULT: "#d4a853", light: "#e8c97a" },
        cream: "#f5f0e6",
        sage: "#5a8f7b",
      },
    },
  },
  plugins: [],
};
