import type { LogEntry } from '../types/game';
import { useRef, useEffect } from 'react';

interface GameLogProps {
  log: LogEntry[];
}

export default function GameLog({ log }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  const recentLogs = log.slice(-5);

  return (
    <div
      ref={scrollRef}
      className="w-full max-h-28 overflow-y-auto text-xs sm:text-sm space-y-0.5 px-2 py-1 bg-navy-900/50 rounded-lg border border-teal-600/20 scrollbar-thin"
    >
      {recentLogs.map(entry => (
        <div
          key={entry.id}
          className={`${
            entry.message.startsWith('---') || entry.message.startsWith('===')
              ? 'text-ghost-orange font-bold'
              : entry.message.includes('即勝利')
                ? 'text-yellow-400 font-bold'
                : entry.message.includes('→')
                  ? 'text-cream/90'
                  : 'text-teal-400/80'
          }`}
        >
          {entry.message}
        </div>
      ))}
      {recentLogs.length === 0 && (
        <div className="text-teal-600/50 text-center py-2">航海日誌...</div>
      )}
    </div>
  );
}
