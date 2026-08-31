import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        eqc: {
          950: '#001524',
          900: '#002b49',
          800: '#003d66',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
