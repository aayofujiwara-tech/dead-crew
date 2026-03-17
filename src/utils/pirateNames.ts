const PIRATE_NAMES = [
  'ボーンズ',
  'シルバー',
  'レッドビアード',
  'ブラックジャック',
  'ストーム',
  'シャドウ',
  'フック',
  'スカル',
  'サンダー',
  'ファントム',
  'クラーケン',
  'ヴェノム',
  'ブラッド',
  'ダークウェーブ',
  'ゴースト',
  'レイス',
  'デスウィンド',
  'アイアンクロー',
  'ドレッド',
  'ワイルドシー',
];

export function randomPirateName(): string {
  const name = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
  return `キャプテン・${name}`;
}
