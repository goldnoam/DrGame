
export enum Language {
  ENGLISH = 'en',
  HEBREW = 'he',
  CHINESE = 'zh',
  HINDI = 'hi',
  FRENCH = 'fr',
  GERMAN = 'de',
  RUSSIAN = 'ru'
}

export enum GameGenre {
  ANY = 'any',
  ACTION = 'action',
  PUZZLE = 'puzzle',
  STRATEGY = 'strategy',
  RPG = 'rpg',
  ARCADE = 'arcade',
  SIMULATION = 'simulation',
  SPORTS = 'sports'
}

export interface GameControl {
  icon: 'arrows' | 'wasd' | 'mouse' | 'space' | 'click' | 'other';
  label: string; // e.g., "Move", "Shoot"
  keyName?: string; // For 'other' type
}

export interface GameHistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  genre: GameGenre;
  code: string;
  controls: GameControl[];
  rating?: number;
}

export interface Translation {
  title: string;
  subtitle: string;
  placeholder: string;
  dragDrop: string;
  or: string;
  generateBtn: string;
  generating: string;
  previewBtn: string;
  previewing: string;
  previewTitle: string;
  previewSubtitle: string;
  closePreview: string;
  generateFromPreview: string;
  error: string;
  errorSafety: string;
  errorUnknown: string;
  errorApiKey: string;
  gameReady: string;
  fullscreen: string;
  close: string;
  feedback: string;
  copyright: string;
  genreLabel: string;
  genres: Record<GameGenre, string>;
  share: string;
  shareSuccess: string;
  historyTitle: string;
  historyEmpty: string;
  play: string;
  delete: string;
  confirmDelete: string;
  cancel: string;
  openHistory: string;
  copyPrompt: string;
  copied: string;
  controls: string;
  rateGame: string;
  controlIcons: {
    arrows: string;
    wasd: string;
    mouse: string;
    click: string;
    space: string;
  };
  download: string;
  downloadSuccess: string;
  editGame: string;
  editorTitle: string;
  apply: string;
  reset: string;
  // New keys
  copyCode: string;
  codeCopied: string;
  quickSave: string;
  quickLoad: string;
  stateSaved: string;
  stateLoaded: string;
  noSavedState: string;
}

export interface GameGenerationResponse {
  html: string;
  controls: GameControl[];
}
