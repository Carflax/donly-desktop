/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A", // Dark Slate
        primary: "#2563EB", // Blue
        card: "#1E293B", // Darker Slate
        secondary: "#64748B", // Muted Slate
      }
    },
  },
  plugins: [],
}
