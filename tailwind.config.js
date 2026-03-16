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
        'dice-roll': 'diceRoll 0.25s ease-out',
        'dice-settle': 'diceSettle 0.15s ease-out',
        'dice-ghost': 'diceGhost 0.3s ease-out forwards',
        'dice-push-up': 'dicePushUp 0.28s ease-in-out forwards',
        'dice-push-down': 'dicePushDown 0.28s ease-in-out forwards',
        'dice-swap': 'diceSwap 0.28s ease-in-out',
        'dice-curse': 'diceCurse 0.3s ease-out',
        'ghost-pop': 'ghostPop 0.4s ease-out forwards',
        'counter-bounce': 'counterBounce 0.25s ease-out',
        'screen-shake': 'screenShake 0.15s ease-out',
        'confetti': 'confetti 0.6s ease-out forwards',
        'instant-win-text': 'instantWinText 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'victory-burst': 'victoryBurst 0.35s ease-out',
        'wave': 'wave 8s linear infinite',
        'wave-slow': 'waveSlow 12s linear infinite',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate(0deg) scale(0.5)', opacity: '0' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)', opacity: '1' },
        },
        diceSettle: {
          '0%': { transform: 'scale(1.2)' },
          '60%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        diceGhost: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-40px) scale(0.3)', opacity: '0' },
        },
        dicePushUp: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '40%': { transform: 'translateY(-20px) scale(1.1)' },
          '100%': { transform: 'translateY(-60px) scale(0.8)', opacity: '0.3' },
        },
        dicePushDown: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '40%': { transform: 'translateY(20px) scale(1.1)' },
          '100%': { transform: 'translateY(60px) scale(0.8)', opacity: '0.3' },
        },
        diceSwap: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(30px) scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        diceCurse: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        ghostPop: {
          '0%': { transform: 'scale(0) translateY(0)', opacity: '1' },
          '50%': { transform: 'scale(1.5) translateY(-15px)', opacity: '0.8' },
          '100%': { transform: 'scale(0.5) translateY(-35px)', opacity: '0' },
        },
        counterBounce: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
        screenShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px) translateY(1px)' },
          '50%': { transform: 'translateX(3px) translateY(-1px)' },
          '75%': { transform: 'translateX(-2px) translateY(1px)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(80px) rotate(720deg) scale(0)', opacity: '0' },
        },
        instantWinText: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.3) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
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
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        waveSlow: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
