/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./!(build|dist|.*)/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        "fill-background": "#f3f4f6",
        "primary-lime": "#142767",
        "primary-lime1": "#a8e934",
        "accent-lime-light": "#c7fa63",
        "accent-lime-light1": "#c7fa63",
        "accent-lime-dark": "#7fb423",
        "accent-lime-dark1": "#7fb423",
        "primary-text": "#0d0d0d",
        "primary-text1": "#0d0d0d",
        "body-text": "rgba(0, 0, 0, 0.5)",
        "body-text1": "rgba(0, 0, 0, 0.6)",
        "background-light": "#fafaf7",
        "background-light1": "#fafaf7",
        "background-mid": "#f2f2ef",
        "neutral-line": "#d8d8d8",
        "background-dark": "#0a0a0a",
        "background-dark1": "#0a0a0a",
        "neutral-line1": "#d8d8d8",
        "neutral-dark-border": "#2c2c2c",
        "supporting-colors-success-state": "#7ed321",
        "supporting-colors-warning-state": "#ffc861",
        "supporting-colors-success-state1": "#ffc861",
        "supporting-colors-error-state": "#ff5b5b",
      },
    },
    screens: {
      mq750: {
        raw: "screen and (max-width: 750px)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
