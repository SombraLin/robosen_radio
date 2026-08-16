export type ThemeId = 'apple-blue' | 'apple-light' | 'apple-dark' | 'gold' | 'cyber' | 'emerald' | 'crimson' | 'violet' | 'amber' | 'ivory';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subName: string;
  accentColor: string;
  bgColor: string;
  cardColor: string;
  subcardColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  isLight?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'apple-blue',
    name: '苹果经典蓝',
    subName: 'Apple Classic Blue',
    accentColor: '#0071E3',
    bgColor: '#EFF5FD',
    cardColor: '#FFFFFF',
    subcardColor: '#E2EEFA',
    textColor: '#1D1D1F',
    mutedColor: '#516377',
    borderColor: 'rgba(0, 113, 227, 0.15)',
    isLight: true,
  },
  {
    id: 'apple-light',
    name: '苹果极简白',
    subName: 'Apple Minimal Light',
    accentColor: '#0071E3',
    bgColor: '#F5F5F7',
    cardColor: '#FFFFFF',
    subcardColor: '#F2F2F7',
    textColor: '#1D1D1F',
    mutedColor: '#6E6E73',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    isLight: true,
  },
  {
    id: 'apple-dark',
    name: '苹果柔和蓝黑',
    subName: 'Apple Slate Navy',
    accentColor: '#3898FF',
    bgColor: '#162032',
    cardColor: '#1E2C42',
    subcardColor: '#283954',
    textColor: '#F5F7FA',
    mutedColor: '#8FA3BF',
    borderColor: 'rgba(56, 152, 255, 0.18)',
  },
  {
    id: 'gold',
    name: '黑金典藏',
    subName: 'Classic Gold',
    accentColor: '#A38E6D',
    bgColor: '#0D0D0D',
    cardColor: '#141414',
    subcardColor: '#1A1A1A',
    textColor: '#E5E5E5',
    mutedColor: '#888888',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  {
    id: 'cyber',
    name: '霓虹赛博',
    subName: 'Cyberpunk Cyan',
    accentColor: '#00E5FF',
    bgColor: '#080F1E',
    cardColor: '#0F172A',
    subcardColor: '#1E293B',
    textColor: '#F1F5F9',
    mutedColor: '#94A3B8',
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  {
    id: 'emerald',
    name: '翡翠帝国',
    subName: 'Imperial Jade',
    accentColor: '#2EC4B6',
    bgColor: '#081410',
    cardColor: '#0E201B',
    subcardColor: '#162E27',
    textColor: '#E8F6F4',
    mutedColor: '#7E9E98',
    borderColor: 'rgba(46, 196, 182, 0.2)',
  },
  {
    id: 'crimson',
    name: '绯红之夜',
    subName: 'Deep Crimson',
    accentColor: '#E63946',
    bgColor: '#140A0C',
    cardColor: '#1F1014',
    subcardColor: '#2A181C',
    textColor: '#FDF0F0',
    mutedColor: '#A38084',
    borderColor: 'rgba(230, 57, 70, 0.2)',
  },
  {
    id: 'violet',
    name: '紫罗兰极光',
    subName: 'Aurora Violet',
    accentColor: '#9D4EDD',
    bgColor: '#0E0917',
    cardColor: '#171024',
    subcardColor: '#221833',
    textColor: '#F5EEFE',
    mutedColor: '#9E8CB3',
    borderColor: 'rgba(157, 78, 221, 0.2)',
  },
  {
    id: 'amber',
    name: '琥珀金秋',
    subName: 'Golden Amber',
    accentColor: '#FF9F1C',
    bgColor: '#140F0A',
    cardColor: '#1F1710',
    subcardColor: '#2A2016',
    textColor: '#FFF8F0',
    mutedColor: '#A89580',
    borderColor: 'rgba(255, 159, 28, 0.2)',
  },
  {
    id: 'ivory',
    name: '极简温润',
    subName: 'Warm Ivory',
    accentColor: '#8C6D46',
    bgColor: '#F5F3EF',
    cardColor: '#FFFFFF',
    subcardColor: '#EFECE6',
    textColor: '#1F1E1B',
    mutedColor: '#6B6862',
    borderColor: 'rgba(0, 0, 0, 0.12)',
    isLight: true,
  },
];

export function applyTheme(themeId: ThemeId) {
  const theme = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];
  const root = document.documentElement;

  root.setAttribute('data-theme', theme.id);

  // Apply CSS custom properties
  root.style.setProperty('--bg-primary', theme.bgColor);
  root.style.setProperty('--bg-card', theme.cardColor);
  root.style.setProperty('--bg-subcard', theme.subcardColor);
  root.style.setProperty('--accent', theme.accentColor);
  root.style.setProperty('--text-primary', theme.textColor);
  root.style.setProperty('--text-muted', theme.mutedColor);
  root.style.setProperty('--border-color', theme.borderColor);

  try {
    localStorage.setItem('editorial_theme', themeId);
  } catch (e) {
    // Ignore storage errors if sandboxed
  }
}
