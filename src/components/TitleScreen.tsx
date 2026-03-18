import { useState } from 'react';
import type { GameMode } from '../types/game';

interface TitleScreenProps {
  onStart: (mode: GameMode, p1Name: string, p2Name?: string, p3Name?: string) => void;
  onShowRules: () => void;
}

const INPUT_CLASS = `
  w-full px-3 py-2.5 rounded-r-xl text-center font-pirate text-lg
  bg-navy-700 text-cream border border-l-0 border-teal-600/50
  placeholder:text-teal-600/40
  focus:outline-none focus:border-teal-400 focus:shadow-[0_0_15px_rgba(45,212,191,0.2)]
  transition-all
`;

function toDisplayName(input: string): string {
  const trimmed = input.trim();
  return trimmed ? `キャプテン・${trimmed}` : 'キャプテン';
}

function NameInput({ value, onChange, label, labelColor }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  labelColor: string;
}) {
  return (
    <div>
      <label className={`block font-pirate text-sm ${labelColor} mb-1 text-center`}>
        {label}
      </label>
      <div className="flex items-stretch">
        <span className="
          flex items-center px-3 rounded-l-xl font-pirate text-base
          bg-navy-800 text-teal-400 border border-r-0 border-teal-600/50
          select-none whitespace-nowrap
        ">
          キャプテン・
        </span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="名前を入力"
          maxLength={8}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

const BACK_BTN = `
  px-6 py-2 rounded-xl font-pirate text-base
  bg-navy-700 text-teal-400 border border-teal-600/50
  hover:bg-teal-600/20 hover:border-teal-400 transition-all duration-75
`;

type Step = 'count' | 'mode' | 'names';

export default function TitleScreen({ onStart, onShowRules }: TitleScreenProps) {
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p3Name, setP3Name] = useState('');
  const [step, setStep] = useState<Step>('count');
  const [playerCount, setPlayerCount] = useState<2 | 3>(2);
  const [selectedMode, setSelectedMode] = useState<GameMode>('cpu');

  const p1Display = toDisplayName(p1Name);
  const p2Display = toDisplayName(p2Name);
  const p3Display = toDisplayName(p3Name);

  function goToMode(count: 2 | 3) {
    setPlayerCount(count);
    setStep('mode');
  }

  function goToNames(mode: GameMode) {
    setSelectedMode(mode);
    setStep('names');
  }

  function handleLaunch() {
    switch (selectedMode) {
      case 'cpu':
        onStart('cpu', p1Display);
        break;
      case 'local':
        onStart('local', p1Display, p2Display);
        break;
      case 'cpu3':
        onStart('cpu3', p1Display, p2Display);
        break;
      case 'local3':
        onStart('local3', p1Display, p2Display, p3Display);
        break;
    }
  }

  function renderContent() {
    switch (step) {
      // ----- Step 1: Choose player count -----
      case 'count':
        return (
          <>
            <button
              onClick={() => goToMode(2)}
              className="
                px-10 py-4 rounded-xl font-pirate text-2xl
                bg-teal-600 text-navy-900
                hover:bg-teal-400 active:scale-95
                transition-all duration-200
                shadow-[0_0_30px_rgba(45,212,191,0.4)]
                animate-glow-pulse mb-3 w-full max-w-xs
              "
            >
              2人で遊ぶ
            </button>

            <button
              onClick={() => goToMode(3)}
              className="
                px-10 py-4 rounded-xl font-pirate text-2xl
                bg-navy-700 text-yellow-400 border border-yellow-500/50
                hover:bg-yellow-600/20 hover:border-yellow-400
                active:scale-95 transition-all duration-200
                mb-4 w-full max-w-xs
              "
            >
              3人で遊ぶ
            </button>

            <button onClick={onShowRules} className={BACK_BTN + ' text-lg'}>
              ルールを見る
            </button>
          </>
        );

      // ----- Step 2: Choose mode -----
      case 'mode':
        return (
          <>
            <p className="font-pirate text-xl text-teal-400 mb-6 text-center">
              {playerCount === 2 ? '2人で遊ぶ' : '3人で遊ぶ'}
            </p>

            {playerCount === 2 ? (
              <>
                <button
                  onClick={() => goToNames('cpu')}
                  className="
                    px-8 py-3 rounded-xl font-pirate text-xl
                    bg-teal-600 text-navy-900
                    hover:bg-teal-400 active:scale-95
                    transition-all duration-200
                    shadow-[0_0_20px_rgba(45,212,191,0.3)]
                    mb-3 w-full max-w-xs
                  "
                >
                  人間 vs CPU
                </button>
                <button
                  onClick={() => goToNames('local')}
                  className="
                    px-8 py-3 rounded-xl font-pirate text-xl
                    bg-navy-700 text-teal-400 border border-teal-600/50
                    hover:bg-teal-600/20 hover:border-teal-400
                    active:scale-95 transition-all duration-200
                    mb-4 w-full max-w-xs
                  "
                >
                  人間 vs 人間
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => goToNames('cpu3')}
                  className="
                    px-8 py-3 rounded-xl font-pirate text-xl
                    bg-teal-600 text-navy-900
                    hover:bg-teal-400 active:scale-95
                    transition-all duration-200
                    shadow-[0_0_20px_rgba(45,212,191,0.3)]
                    mb-3 w-full max-w-xs
                  "
                >
                  人間 2人 + CPU 1人
                </button>
                <button
                  onClick={() => goToNames('local3')}
                  className="
                    px-8 py-3 rounded-xl font-pirate text-xl
                    bg-navy-700 text-yellow-400 border border-yellow-500/50
                    hover:bg-yellow-600/20 hover:border-yellow-400
                    active:scale-95 transition-all duration-200
                    mb-4 w-full max-w-xs
                  "
                >
                  人間 3人
                </button>
              </>
            )}

            <button onClick={() => setStep('count')} className={BACK_BTN}>
              ← 戻る
            </button>
          </>
        );

      // ----- Step 3: Name inputs -----
      case 'names':
        return (
          <>
            {selectedMode === 'cpu3' && (
              <p className="font-pirate text-sm text-teal-400/70 mb-3 text-center">
                船長3はCPUが操作します
              </p>
            )}

            <div className="w-full mb-4 space-y-3">
              <NameInput value={p1Name} onChange={setP1Name} label="船長1の名前" labelColor="text-teal-400" />
              {(selectedMode === 'local' || selectedMode === 'cpu3' || selectedMode === 'local3') && (
                <NameInput value={p2Name} onChange={setP2Name} label="船長2の名前" labelColor="text-ghost-orange" />
              )}
              {selectedMode === 'local3' && (
                <NameInput value={p3Name} onChange={setP3Name} label="船長3の名前" labelColor="text-yellow-400" />
              )}
              <p className="text-teal-400/50 text-xs text-center">
                空欄なら「キャプテン」になるぞ
              </p>
            </div>

            <button
              onClick={handleLaunch}
              className="
                px-10 py-4 rounded-xl font-pirate text-2xl
                bg-teal-600 text-navy-900
                hover:bg-teal-400 active:scale-95
                transition-all duration-200
                shadow-[0_0_30px_rgba(45,212,191,0.4)]
                animate-glow-pulse mb-3
              "
            >
              出航！
            </button>

            <button onClick={() => setStep('mode')} className={BACK_BTN}>
              ← 戻る
            </button>
          </>
        );
    }
  }

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
        <div className="text-6xl mb-4">🏴‍☠️</div>
        <h1 className="font-pirate text-5xl sm:text-6xl text-ghost-orange mb-3 text-center drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          デッドクルー
        </h1>
        <p className="font-pirate text-xl text-teal-400 mb-8 text-center">
          幽霊船員を全て成仏させろ
        </p>

        {renderContent()}
      </div>
    </div>
  );
}
