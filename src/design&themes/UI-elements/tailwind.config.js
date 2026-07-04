/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./!(build|dist|.*)/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        "color-white": "#fff",
        "color-neutral-darkest": "#000",
        "color-neutral-lightest": "#eee",
        "color-neutral-darker": "#222",
        "color-neutral-lighter": "#ccc",
        "color-neutral-dark": "#444",
        "neutral-line": "#d8d8d8",
        "body-text": "rgba(0, 0, 0, 0.5)",
        "neutral-dark-border": "#2c2c2c",
        "neutral-line1": "#d8d8d8",
        "body-text1": "rgba(0, 0, 0, 0.6)",
        "zinc-300": "#d4d4d8",
        "gray-800": "#1f2937",
        "zinc-500": "#71717a",
        "gray-600": "#4b5563",
        "gray-300": "#d1d5db",
        "gray-400": "#9ca3af",
        "gray-200": "#e5e7eb",
        "accent-lime-dark": "#7fb423",
        "primary-text": "#0d0d0d",
        "accent-lime-light": "#c7fa63",
        "primary-text1": "#0d0d0d",
      },
      fontFamily: {
        "body-text-font-poppins": "Poppins",
      },
      borderRadius: {
        "corner-full": "1000px",
        "radius-400": "16px",
        "corner-medium": "12px",
      },
    },
    fontSize: {
      "text-sizes-heading-4": "32px",
      "text-sizes-heading-5": "24px",
      "text-sizes-text-regular": "16px",
      "text-sizes-text-medium": "18px",
      "text-sizes-text-small": "14px",
    },
    screens: {},
  },
  corePlugins: {
    preflight: false,
  },
};
