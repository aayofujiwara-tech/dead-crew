/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a0e1a',
          800: '#111833',
          700: '#1a2340',
          600: '#243050',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        cream: '#f5f0e8',
        ghost: {
          orange: '#f97316',
          glow: '#67e8f9',
        },
      },
      fontFamily: {
        pirate: ['"Pirata One"', 'cursive'],
        body: ['"Crimson Text"', 'serif'],
      },
      animation: {
        'dice-roll': 'diceRoll 0.6s ease-out',
        'dice-remove': 'diceRemove 0.5s ease-out forwards',
        'dice-move': 'diceMove 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'victory-burst': 'victoryBurst 0.8s ease-out',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate(0deg) scale(0.5)', opacity: '0' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)', opacity: '1' },
        },
        diceRemove: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0) translateY(-30px)', opacity: '0' },
        },
        diceMove: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-40px) scale(1.1)' },
          '100%': { transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(45, 212, 191, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(45, 212, 191, 0.6)' },
        },
        victoryBurst: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
