/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["Libre Baskerville", "serif"],
        sans:  ["Source Sans Pro", "sans-serif"],
      },
      colors: {
        brand: {
          navy:       "#2B2B2B",   // Casi negro — fondo oscuro / texto
          teal:       "#63BDB5",   // Teal vibrante — acento principal
          terracotta: "#15696F",   // Teal oscuro — acento secundario
          cream:      "#EEF2F0",   // Blanco verdoso — fondo claro
          orange:     "#858585",   // Gris medio — textos secundarios
        },
        primary: {
          50:  "#EEF2F0",
          100: "#d4e8e6",
          200: "#a9d5d1",
          300: "#7ec3bc",
          400: "#63BDB5",
          500: "#3fa39b",
          600: "#2d8880",
          700: "#15696F",
          800: "#0f4f54",
          900: "#2B2B2B",
        },
      },
      boxShadow: {
        soft:      "0 20px 27px 0 rgba(43, 43, 43, 0.09)",
        "soft-xl": "0 23px 45px -11px rgba(43, 43, 43, 0.16)",
      },
    },
  },
  plugins: [],
};