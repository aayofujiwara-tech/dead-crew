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
        'dice-spin': 'diceSpin 0.15s ease-in-out infinite',
        'die-bounce': 'dieBounce 0.2s ease-out',
        'dice-settle': 'diceSettle 0.15s ease-out',
        'dice-ghost': 'diceGhost 0.3s ease-out forwards',
        'dice-ghost-up': 'diceGhostUp 0.28s ease-in forwards',
        'dice-ghost-down': 'diceGhostDown 0.28s ease-in forwards',
        'dice-push-up': 'diceTransferUp 0.3s ease-in-out forwards',
        'dice-push-down': 'diceTransferDown 0.3s ease-in-out forwards',
        'die-incoming-from-top': 'dieIncomingFromTop 300ms ease-out forwards',
        'die-incoming-from-bottom': 'dieIncomingFromBottom 300ms ease-out forwards',
        'dice-swap': 'diceSwap 0.28s ease-in-out',
        'dice-curse': 'diceCurse 0.3s ease-out',
        'dice-gold-pulse': 'diceGoldPulse 1s ease-in-out infinite',
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
        diceSpin: {
          '0%, 100%': { transform: 'scale(0.9) rotate(0deg)' },
          '25%': { transform: 'scale(0.8) rotate(8deg)' },
          '50%': { transform: 'scale(0.9) rotate(-3deg)' },
          '75%': { transform: 'scale(0.8) rotate(-6deg)' },
        },
        dieBounce: {
          '0%': { transform: 'scale(1.25)' },
          '60%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
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
        diceGhostUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '60%': { transform: 'translateY(-15vh) scale(0.6)', opacity: '0.5' },
          '100%': { transform: 'translateY(-20vh) scale(0.2)', opacity: '0' },
        },
        diceGhostDown: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '60%': { transform: 'translateY(15vh) scale(0.6)', opacity: '0.5' },
          '100%': { transform: 'translateY(20vh) scale(0.2)', opacity: '0' },
        },
        diceTransferUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '65%': { transform: 'translateY(-35vh) scale(0.9)', opacity: '0.9' },
          '80%': { transform: 'translateY(-37vh) scale(1.15)', opacity: '1' },
          '92%': { transform: 'translateY(-35vh) scale(0.95)', opacity: '0.9' },
          '100%': { transform: 'translateY(-35vh) scale(1)', opacity: '0' },
        },
        diceTransferDown: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '65%': { transform: 'translateY(35vh) scale(0.9)', opacity: '0.9' },
          '80%': { transform: 'translateY(37vh) scale(1.15)', opacity: '1' },
          '92%': { transform: 'translateY(35vh) scale(0.95)', opacity: '0.9' },
          '100%': { transform: 'translateY(35vh) scale(1)', opacity: '0' },
        },
        dieIncomingFromTop: {
          '0%': { transform: 'translateY(-40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        dieIncomingFromBottom: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
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
        diceGoldPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(234, 179, 8, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(234, 179, 8, 0.8)' },
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
