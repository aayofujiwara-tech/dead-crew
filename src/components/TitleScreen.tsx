import { useState } from 'react';
import type { GameMode } from '../types/game';

interface TitleScreenProps {
  onStart: (mode: GameMode, playerName: string) => void;
  onShowRules: () => void;
}

export default function TitleScreen({ onStart, onShowRules }: TitleScreenProps) {
  const [name, setName] = useState('');

  const displayName = name.trim() || 'キャプテン';

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
        <p className="font-pirate text-xl text-teal-400 mb-8 text-center">
          幽霊船員を全て成仏させろ
        </p>

        {/* Name input */}
        <div className="w-full mb-6">
          <label className="block font-pirate text-sm text-teal-400 mb-1.5 text-center">
            船長の名前
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="キャプテン"
            maxLength={12}
            className="
              w-full px-4 py-2.5 rounded-xl text-center font-pirate text-lg
              bg-navy-700 text-cream border border-teal-600/50
              placeholder:text-teal-600/40
              focus:outline-none focus:border-teal-400 focus:shadow-[0_0_15px_rgba(45,212,191,0.2)]
              transition-all
            "
          />
          <p className="text-teal-400/50 text-xs text-center mt-1">
            空欄なら「キャプテン」になるぞ
          </p>
        </div>

        {/* Start buttons */}
        <button
          onClick={() => onStart('cpu', displayName)}
          className="
            px-10 py-4 rounded-xl font-pirate text-2xl
            bg-teal-600 text-navy-900
            hover:bg-teal-400 active:scale-95
            transition-all duration-200
            shadow-[0_0_30px_rgba(45,212,191,0.4)]
            animate-glow-pulse
            mb-3
          "
        >
          CPU と対戦
        </button>

        <button
          onClick={() => onStart('local', displayName)}
          className="
            px-10 py-3 rounded-xl font-pirate text-xl
            bg-navy-700 text-teal-400 border border-teal-600/50
            hover:bg-teal-600/20 hover:border-teal-400
            active:scale-95
            transition-all duration-200
            mb-4
          "
        >
          2人で対戦
        </button>

        {/* Rules button */}
        <button
          onClick={onShowRules}
          className="
            px-6 py-2 rounded-xl font-pirate text-lg
            bg-navy-700 text-teal-400 border border-teal-600/50
            hover:bg-teal-600/20 hover:border-teal-400 transition-all duration-75
          "
        >
          ルールを見る
        </button>
      </div>
    </div>
  );
}
