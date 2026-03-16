import type { PendingChoice, PlayerId } from '../types/game';

interface ChoiceDialogProps {
  choice: PendingChoice;
  playerName: string;
  onChoose: (player: PlayerId, value: string) => void;
  inverted?: boolean;
}

export default function ChoiceDialog({ choice, playerName, onChoose, inverted }: ChoiceDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`
        bg-navy-700 border-2 border-teal-500 rounded-xl p-6 max-w-sm w-full
        shadow-[0_0_30px_rgba(45,212,191,0.2)]
        ${inverted ? 'rotate-180' : ''}
      `}>
        <h3 className="font-pirate text-xl text-ghost-orange mb-2 text-center">
          {playerName}の選択
        </h3>
        <p className="text-teal-400 text-sm mb-4 text-center">
          {getEffectDescription(choice.effect.type)}
        </p>
        <div className="space-y-2">
          {choice.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChoose(choice.player, option.value)}
              className="
                w-full py-3 px-4 rounded-lg
                bg-navy-800 border border-teal-600/50
                hover:bg-teal-600/20 hover:border-teal-400
                transition-all duration-200
                text-left
              "
            >
              <div className="text-cream font-bold text-sm">{option.label}</div>
              <div className="text-teal-400/70 text-xs">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getEffectDescription(type: string): string {
  switch (type) {
    case 'swap_all': return '2のぞろ目！ダイスを入れ替える？';
    case 'add_removed_3': return '3のぞろ目！除外済みダイスを3個相手に送れる！';
    case 'add_removed_4': return '4のぞろ目！除外済みダイスを4個相手に送れる！';
    case 'five_choice': return '5のぞろ目！どちらの効果を使う？';
    default: return '';
  }
}
