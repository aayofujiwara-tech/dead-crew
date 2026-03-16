interface MatchScoreProps {
  score: number;
  inverted?: boolean;
}

export default function MatchScore({ score, inverted }: MatchScoreProps) {
  return (
    <div className={`flex gap-1.5 ${inverted ? 'rotate-180' : ''}`}>
      {[0, 1].map(i => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
            i < score
              ? 'bg-ghost-orange border-ghost-orange shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              : 'border-teal-600/40 bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}
