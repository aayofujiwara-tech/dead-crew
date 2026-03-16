interface RuleScreenProps {
  onBack: () => void;
}

export default function RuleScreen({ onBack }: RuleScreenProps) {
  return (
    <div className="min-h-screen bg-navy-900 text-cream flex flex-col relative overflow-y-auto [-webkit-overflow-scrolling:touch]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[8%] text-4xl opacity-10 animate-float">👻</div>
        <div className="absolute top-[40%] left-[5%] text-3xl opacity-10 animate-float" style={{ animationDelay: '1.2s' }}>💀</div>
        <div className="absolute bottom-[15%] right-[12%] text-3xl opacity-10 animate-float" style={{ animationDelay: '0.6s' }}>⚓</div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 px-5 py-8 max-w-lg mx-auto w-full">
        <h1 className="font-pirate text-3xl text-ghost-orange mb-1 text-center">デッドクルー</h1>
        <p className="font-pirate text-lg text-teal-400 mb-8 text-center">2人用ルール</p>

        {/* 基本ルール */}
        <Section title="基本ルール">
          <Rule text="プレイヤー数：2人" />
          <Rule text="スタートダイス：各5個" />
          <Rule text="2ラウンド先取でマッチ勝利" />
        </Section>

        {/* 勝利条件 */}
        <Section title="勝利条件">
          <Rule text="手持ちダイスが0になったらラウンド勝利" />
          <Rule text="両者同時に0の場合は引き分け（勝利カウントなし）" />
        </Section>

        {/* 通常の出目効果 */}
        <Section title="通常の出目効果">
          <div className="space-y-2">
            <DieEffect die="1" effect="除外（成仏）" desc="そのダイスをゲームから除外する" />
            <DieEffect die="6" effect="相手に渡す" desc="そのダイスを相手に押し付ける" />
            <DieEffect die="2〜5" effect="効果なし" desc="何も起きない" />
          </div>
        </Section>

        {/* ぞろ目の特殊効果 */}
        <Section title="ぞろ目の特殊効果">
          <div className="space-y-3">
            <TripleEffect
              dice="2 × 3個"
              name="入れ替え"
              desc="両者の手持ちダイスを全部入れ替える"
              note="選択式：する・しないを選べる"
            />
            <TripleEffect
              dice="3 × 3個"
              name="呪い（3個）"
              desc="除外済みダイスを3個、相手に追加する"
              note="除外済みが足りない場合はあるだけ追加"
            />
            <TripleEffect
              dice="4 × 3個"
              name="呪い（4個）"
              desc="除外済みダイスを4個、相手に追加する"
              note="除外済みが足りない場合はあるだけ追加"
            />
            <TripleEffect
              dice="5 × 3個"
              name="選択"
              desc="「自分のダイスを2個除外」or「1個相手に押し付け」"
              note="選択式：どちらかを選ぶ"
            />
          </div>
        </Section>

        {/* 即勝利条件 */}
        <Section title="即勝利条件">
          <p className="text-teal-400/70 text-xs mb-3">通常の処理より先にチェックされる</p>
          <div className="space-y-2">
            <Rule text="5個ぞろ目 ― 全て同じ目" />
            <Rule text="4個ぞろ目 ― 4個が同じ目（手持ち4〜5個のとき）" />
            <Rule text="フルハウス ― 3個ぞろ目＋2個ぞろ目（手持ち5個のとき）" />
          </div>
        </Section>

        {/* 選択式効果の処理ルール */}
        <Section title="選択式効果の処理ルール">
          <div className="space-y-2">
            <Rule text="相手の出目を確認してから効果を宣言する" />
            <Rule text="両者同時に選択式効果がある場合、それぞれ1個ダイスを振り高い目を出した方が先に解決する" />
            <Rule text="同じ目の場合は振り直し" />
          </div>
        </Section>

        {/* Back button */}
        <div className="flex justify-center pt-6 pb-4">
          <button
            onClick={onBack}
            className="
              px-8 py-3 rounded-xl font-pirate text-lg
              bg-navy-700 text-teal-400 border border-teal-600/50
              hover:bg-teal-600/20 hover:border-teal-400 transition-all duration-75
            "
          >
            タイトルに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-pirate text-xl text-ghost-orange mb-3 border-b border-teal-600/20 pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-teal-500 mt-0.5 flex-shrink-0">▸</span>
      <span className="text-cream/90">{text}</span>
    </div>
  );
}

function DieEffect({ die, effect, desc }: { die: string; effect: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 bg-navy-800/50 rounded-lg px-3 py-2">
      <span className="font-pirate text-lg text-ghost-orange flex-shrink-0 w-10 text-center">{die}</span>
      <div>
        <span className="text-cream text-sm font-bold">{effect}</span>
        <p className="text-teal-400/70 text-xs">{desc}</p>
      </div>
    </div>
  );
}

function TripleEffect({ dice, name, desc, note }: { dice: string; name: string; desc: string; note: string }) {
  return (
    <div className="bg-navy-800/50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-pirate text-sm text-ghost-orange">{dice}</span>
        <span className="text-cream text-sm font-bold">{name}</span>
      </div>
      <p className="text-cream/80 text-xs">{desc}</p>
      <p className="text-teal-400/60 text-xs mt-0.5">{note}</p>
    </div>
  );
}
