import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#17212f',
        mist: '#5f6d82',
        primary: '#3f6f9f',
        navy: '#1f3f63',
        accent: '#b84f32'
      },
      boxShadow: {
        glass: '0 20px 50px rgba(31, 63, 99, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
