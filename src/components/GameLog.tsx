import type { LogEntry, DieValue } from '../types/game';

interface GameLogProps {
  log: LogEntry[];
  turn: number;
  player1Name: string;
  player2Name: string;
  player1Roll: DieValue[];
  player2Roll: DieValue[];
}

export default function GameLog({
  log, turn, player1Name, player2Name, player1Roll, player2Roll,
}: GameLogProps) {
  // Filter to current turn only
  const currentTurnLogs = log.filter(e => e.turn === turn);

  // Split messages by player
  const p1Msgs: string[] = [];
  const p2Msgs: string[] = [];

  for (const entry of currentTurnLogs) {
    const m = entry.message;
    // "出目" lines contain the player name followed by の出目
    if (m.startsWith(`${player1Name}の出目`)) {
      // Skip — we show roll from props instead
      continue;
    }
    if (m.startsWith(`${player2Name}の出目`)) {
      continue;
    }
    if (m.startsWith(`${player1Name}`)) {
      p1Msgs.push(m);
    } else if (m.startsWith(`${player2Name}`)) {
      p2Msgs.push(m);
    }
    // Shared messages (e.g. "両者とも...") are skipped for column layout
  }

  const rollStr = (roll: DieValue[]) =>
    roll.length > 0 ? `[${roll.join(', ')}]` : '';

  const hasRolled = player1Roll.length > 0 || player2Roll.length > 0;

  return (
    <div className="w-full bg-navy-900/50 rounded-lg border border-teal-600/20 overflow-hidden">
      {/* Turn header */}
      <div className="text-center text-[10px] text-teal-400/60 border-b border-teal-600/15 py-0.5">
        ターン {turn}
      </div>

      {/* 2-column body */}
      <div className="flex h-[72px]">
        {/* Left: Player 1 */}
        <div className="flex-1 px-2 py-1 text-xs leading-relaxed overflow-hidden">
          {hasRolled ? (
            <>
              <div className="text-teal-400/80 truncate">
                出目：{rollStr(player1Roll)}
              </div>
              {p1Msgs.map((m, i) => (
                <div key={i} className="text-cream/80 truncate">{m}</div>
              ))}
            </>
          ) : (
            <div className="text-teal-600/40 pt-2 text-center">{player1Name}</div>
          )}
        </div>

        {/* Center divider */}
        <div className="w-px bg-teal-600/20 self-stretch" />

        {/* Right: Player 2 */}
        <div className="flex-1 px-2 py-1 text-xs leading-relaxed overflow-hidden">
          {hasRolled ? (
            <>
              <div className="text-teal-400/80 truncate">
                出目：{rollStr(player2Roll)}
              </div>
              {p2Msgs.map((m, i) => (
                <div key={i} className="text-cream/80 truncate">{m}</div>
              ))}
            </>
          ) : (
            <div className="text-teal-600/40 pt-2 text-center">{player2Name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
