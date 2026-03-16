import { useState } from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-navy-900 text-cream flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background wave animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-10">
          <div className="absolute inset-0 animate-wave">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full">
              <path d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z" fill="#2dd4bf" />
            </svg>
          </div>
          <div className="absolute inset-0 animate-wave-slow">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full">
              <path d="M0,80 C150,20 350,100 600,40 C850,100 1050,20 1200,80 L1200,120 L0,120 Z" fill="#14b8a6" />
            </svg>
          </div>
        </div>

        {/* Floating ghosts */}
        <div className="absolute top-[10%] left-[10%] text-5xl opacity-15 animate-float">👻</div>
        <div className="absolute top-[20%] right-[15%] text-4xl opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>👻</div>
        <div className="absolute top-[50%] left-[5%] text-3xl opacity-10 animate-float" style={{ animationDelay: '0.8s' }}>💀</div>
        <div className="absolute top-[40%] right-[8%] text-4xl opacity-10 animate-float" style={{ animationDelay: '2.2s' }}>🏴‍☠️</div>
        <div className="absolute bottom-[30%] left-[20%] text-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>⚓</div>
        <div className="absolute bottom-[25%] right-[20%] text-5xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>👻</div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        {/* Title */}
        <div className="text-6xl mb-4">🏴‍☠️</div>
        <h1 className="font-pirate text-5xl sm:text-6xl text-ghost-orange mb-3 text-center drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          デッドクルー
        </h1>
        <p className="font-pirate text-xl text-teal-400 mb-10 text-center">
          幽霊船員を全て成仏させろ
        </p>

        {/* Start button */}
        <button
          onClick={onStart}
          className="
            px-10 py-4 rounded-xl font-pirate text-2xl
            bg-teal-600 text-navy-900
            hover:bg-teal-400 active:scale-95
            transition-all duration-200
            shadow-[0_0_30px_rgba(45,212,191,0.4)]
            animate-glow-pulse
            mb-8
          "
        >
          出航する！
        </button>

        {/* Rules section */}
        <div className="w-full">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="
              w-full flex items-center justify-between
              px-4 py-3 rounded-lg
              bg-navy-700/60 border border-teal-600/30
              hover:border-teal-400/50 transition-all
              text-left
            "
          >
            <span className="font-pirate text-lg text-cream">遊び方</span>
            <span className={`text-teal-400 transition-transform duration-300 ${rulesOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {rulesOpen && (
            <div className="mt-2 px-4 py-4 rounded-lg bg-navy-800/80 border border-teal-600/20 space-y-3 text-sm max-h-[40vh] overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                <RuleItem emoji="🎲" text="両プレイヤーが同時にダイスを振る" />
                <RuleItem emoji="1️⃣" text="1が出たらそのダイスを除外（成仏）" />
                <RuleItem emoji="6️⃣" text="6が出たらそのダイスを相手に渡す" />
                <RuleItem emoji="✨" text="ぞろ目で特殊効果が発動！" />
                <div className="pl-8 space-y-1 text-teal-400/70 text-xs">
                  <p>2×3個 → ダイスを全て入れ替え（選択可）</p>
                  <p>3×3個 → 除外済み3個を相手に追加</p>
                  <p>4×3個 → 除外済み4個を相手に追加</p>
                  <p>5×3個 → 自分2個除外 or 1個相手に押し付け</p>
                </div>
                <RuleItem emoji="🏆" text="手持ちダイスが0になったらラウンド勝利" />
                <RuleItem emoji="👑" text="2ラウンド先取でマッチ勝利！" />
                <div className="pt-2 border-t border-teal-600/20">
                  <p className="text-ghost-orange font-bold text-xs mb-1">即勝利条件</p>
                  <div className="space-y-1 text-teal-400/70 text-xs">
                    <p>5個ぞろ目 / 4個ぞろ目 / フルハウス</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base flex-shrink-0">{emoji}</span>
      <span className="text-teal-400/90">{text}</span>
    </div>
  );
}
