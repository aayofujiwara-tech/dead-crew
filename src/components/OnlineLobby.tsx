import { useState, useEffect } from 'react';
import { ref, set, get, onValue, off } from 'firebase/database';
import { db } from '../utils/firebase';
import { generateRoomCode } from '../utils/roomCode';

interface OnlineLobbyProps {
  onGameStart: (roomCode: string, role: 'host' | 'guest', myName: string, opponentName: string) => void;
  onBack: () => void;
}

const BTN_PRIMARY = `
  px-8 py-3 rounded-xl font-pirate text-xl
  bg-teal-600 text-navy-900
  hover:bg-teal-400 active:scale-95
  transition-all duration-200
  shadow-[0_0_20px_rgba(45,212,191,0.3)]
  w-full max-w-xs
`;

const BTN_SECONDARY = `
  px-8 py-3 rounded-xl font-pirate text-xl
  bg-navy-700 text-teal-400 border border-teal-600/50
  hover:bg-teal-600/20 hover:border-teal-400
  active:scale-95 transition-all duration-200
  w-full max-w-xs
`;

const BACK_BTN = `
  px-6 py-2 rounded-xl font-pirate text-base
  bg-navy-700 text-teal-400 border border-teal-600/50
  hover:bg-teal-600/20 hover:border-teal-400 transition-all duration-75
`;

const INPUT_CLASS = `
  w-full px-3 py-2.5 rounded-r-xl text-center font-pirate text-lg
  bg-navy-700 text-cream border border-l-0 border-teal-600/50
  placeholder:text-teal-600/40
  focus:outline-none focus:border-teal-400 focus:shadow-[0_0_15px_rgba(45,212,191,0.2)]
  transition-all
`;

type LobbyState = 'name' | 'menu' | 'creating' | 'waiting' | 'joining';

export default function OnlineLobby({ onGameStart, onBack }: OnlineLobbyProps) {
  const [lobbyState, setLobbyState] = useState<LobbyState>('name');
  const [nameInput, setNameInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    const displayName = trimmed ? `キャプテン・${trimmed}` : 'キャプテン';
    setPlayerName(displayName);
    setLobbyState('menu');
  };

  // ---------------------------------------------------------------------------
  // Create room
  // ---------------------------------------------------------------------------
  const handleCreate = async () => {
    setLobbyState('creating');
    setError('');

    // Generate a unique room code (retry if collision)
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const snapshot = await get(ref(db, `rooms/${code}`));
      if (!snapshot.exists()) break;
      code = generateRoomCode();
      attempts++;
    }

    // Write room to Firebase
    await set(ref(db, `rooms/${code}`), {
      host: playerName,
      guest: null,
      status: 'waiting',
      gameState: null,
      rolled: { p1: false, p2: false },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    setRoomCode(code);
    setLobbyState('waiting');
  };

  // ---------------------------------------------------------------------------
  // Wait for guest to join
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (lobbyState !== 'waiting' || !roomCode) return;

    const guestRef = ref(db, `rooms/${roomCode}/guest`);
    const unsub = onValue(guestRef, snapshot => {
      const guest = snapshot.val();
      if (guest && typeof guest === 'string') {
        // Guest has joined — start game!
        onGameStart(roomCode, 'host', playerName, guest);
      }
    });

    return () => off(guestRef, 'value', unsub);
  }, [lobbyState, roomCode, playerName, onGameStart]);

  // Cleanup room if leaving while waiting
  useEffect(() => {
    if (lobbyState !== 'waiting' || !roomCode) return;
    return () => {
      // Only clean up if we're the host and still in waiting
      get(ref(db, `rooms/${roomCode}/status`)).then(snap => {
        if (snap.val() === 'waiting') {
          set(ref(db, `rooms/${roomCode}`), null);
        }
      });
    };
  }, [lobbyState, roomCode]);

  // ---------------------------------------------------------------------------
  // Join room
  // ---------------------------------------------------------------------------
  const handleJoin = async () => {
    setError('');
    const code = joinCode.trim();
    if (code.length !== 4) {
      setError('4桁のルームコードを入力してください');
      return;
    }

    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) {
      setError('ルームが見つかりません');
      return;
    }

    const room = snapshot.val();
    if (room.status !== 'waiting') {
      setError('このルームはすでにゲーム中です');
      return;
    }

    if (room.guest) {
      setError('このルームは満員です');
      return;
    }

    // Join the room
    await set(ref(db, `rooms/${code}/guest`), playerName);
    await set(ref(db, `rooms/${code}/status`), 'playing');

    onGameStart(code, 'guest', playerName, room.host);
  };

  // ---------------------------------------------------------------------------
  // Copy room code
  // ---------------------------------------------------------------------------
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-[100dvh] bg-navy-900 text-cream flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[10%] text-5xl opacity-15 animate-float">🌐</div>
        <div className="absolute top-[20%] right-[15%] text-4xl opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>👻</div>
        <div className="absolute bottom-[25%] right-[20%] text-5xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>⚓</div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        <div className="text-5xl mb-3">🌐</div>
        <h2 className="font-pirate text-3xl text-ghost-orange mb-6 text-center">
          ネット対戦
        </h2>

        {lobbyState === 'name' && (
          <div className="text-center space-y-4 w-full max-w-xs">
            <p className="text-teal-400 font-pirate text-base mb-1">船長の名前を入力</p>
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
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="名前を入力"
                maxLength={8}
                className={INPUT_CLASS}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              />
            </div>
            <p className="text-teal-400/50 text-xs text-center">
              空欄なら「キャプテン」になるぞ
            </p>
            <button onClick={handleNameSubmit} className={BTN_PRIMARY}>
              決定
            </button>
            <button onClick={onBack} className={BACK_BTN + ' mt-2'}>
              ← 戻る
            </button>
          </div>
        )}

        {lobbyState === 'menu' && (
          <>
            <button onClick={handleCreate} className={BTN_PRIMARY + ' mb-3'}>
              ルームを作る
            </button>
            <button onClick={() => setLobbyState('joining')} className={BTN_SECONDARY + ' mb-6'}>
              ルームに入る
            </button>
            <button onClick={onBack} className={BACK_BTN}>
              ← 戻る
            </button>
          </>
        )}

        {lobbyState === 'creating' && (
          <div className="text-center">
            <p className="text-teal-400 font-pirate text-lg animate-pulse">
              ルームを作成中...
            </p>
          </div>
        )}

        {lobbyState === 'waiting' && (
          <div className="text-center space-y-4">
            <p className="text-teal-400 font-pirate text-base">ルームコード</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-pirate text-ghost-orange tracking-[0.3em] drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={`
                px-4 py-2 rounded-lg font-pirate text-base
                ${copied
                  ? 'bg-teal-600 text-navy-900'
                  : 'bg-navy-700 text-teal-400 border border-teal-600/50 hover:bg-teal-600/20'
                }
                transition-all duration-200
              `}
            >
              {copied ? 'コピーしました！' : 'コードをコピー'}
            </button>
            <div className="mt-6">
              <p className="text-teal-400/70 font-pirate text-lg animate-pulse">
                相手を待っています...
              </p>
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setLobbyState('menu');
                setRoomCode('');
              }}
              className={BACK_BTN + ' mt-4'}
            >
              ← 戻る
            </button>
          </div>
        )}

        {lobbyState === 'joining' && (
          <div className="text-center space-y-4 w-full max-w-xs">
            <p className="text-teal-400 font-pirate text-base">ルームコードを入力</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="4桁の数字"
              className="
                w-full px-4 py-3 rounded-xl text-center font-pirate text-3xl tracking-[0.3em]
                bg-navy-700 text-cream border border-teal-600/50
                placeholder:text-teal-600/30 placeholder:text-xl placeholder:tracking-normal
                focus:outline-none focus:border-teal-400 focus:shadow-[0_0_15px_rgba(45,212,191,0.2)]
                transition-all
              "
              autoFocus
            />
            {error && (
              <p className="text-red-400 font-pirate text-sm">{error}</p>
            )}
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 4}
              className={`
                ${BTN_PRIMARY}
                ${joinCode.length !== 4 ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              入室する
            </button>
            <button
              onClick={() => {
                setLobbyState('menu');
                setJoinCode('');
                setError('');
              }}
              className={BACK_BTN + ' mt-2'}
            >
              ← 戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
