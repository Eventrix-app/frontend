/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./!(build|dist|.*)/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        "fill-background": "#f3f4f6",
      },
      fontFamily: {
        "header-font-zalando-sans-expanded": "Zalando Sans Expanded",
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
