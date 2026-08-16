export interface SpeechPersonaOptions {
  gender?: 'female' | 'male' | 'doll';
  speakerRole?: string;
  dollName?: string;
  voiceId?: string;
  nodeIndex?: number;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

// Pre-initialize and cache available voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getSystemChineseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices.filter((v) => v.lang.includes('zh') || v.lang.includes('CN') || v.name.includes('Chinese'));
}

export function findBestVoiceMatch(gender: 'female' | 'male' | 'doll', speakerRole?: string): SpeechSynthesisVoice | null {
  const voices = getSystemChineseVoices();
  if (voices.length === 0) return null;

  const roleText = (speakerRole || '').toLowerCase();

  // Explicit check for male role or voice ID
  if (gender === 'male' || roleText.includes('男') || roleText.includes('云健') || roleText.includes('云希')) {
    const maleVoice = voices.find(
      (v) =>
        v.name.includes('Yunjian') ||
        v.name.includes('Yunxi') ||
        v.name.includes('Yunyang') ||
        v.name.includes('Kangkang') ||
        v.name.includes('Zhiwei') ||
        v.name.toLowerCase().includes('male')
    );
    if (maleVoice) return maleVoice;
  }

  // Explicit check for female role or voice ID
  if (gender === 'female' || roleText.includes('女') || roleText.includes('晓晓') || roleText.includes('晓伊')) {
    const femaleVoice = voices.find(
      (v) =>
        v.name.includes('Xiaoxiao') ||
        v.name.includes('Xiaoyi') ||
        v.name.includes('Huihui') ||
        v.name.includes('Yaoyao') ||
        v.name.toLowerCase().includes('female')
    );
    if (femaleVoice) return femaleVoice;
  }

  // General fallback for Chinese voices
  return voices[0] || null;
}

export function speakTextWithPersona(
  text: string,
  options: SpeechPersonaOptions = {},
  onEndCallback?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEndCallback) setTimeout(onEndCallback, 3000);
    return;
  }

  // Cancel ongoing speech to avoid queue stacking
  window.speechSynthesis.cancel();

  const cleanText = (text || '').trim();
  if (!cleanText) {
    if (onEndCallback) onEndCallback();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN';

  const role = options.speakerRole || '';
  const dollName = options.dollName || '';

  // Determine Gender for News Presenter
  let targetGender: 'female' | 'male' | 'doll' = options.gender || 'female';
  if (role.includes('男')) targetGender = 'male';
  else if (role.includes('女')) targetGender = 'female';
  else if (options.nodeIndex !== undefined && (role.includes('交替') || localStorage.getItem('enable_alternate_gender') !== 'false')) {
    targetGender = options.nodeIndex % 2 === 1 ? 'male' : 'female';
  }

  // Match voice from browser voices
  const bestVoice = findBestVoiceMatch(targetGender, role);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  // Pitch & Rate Persona Tuning
  if (targetGender === 'male') {
    utterance.pitch = 0.85;
    utterance.rate = 1.0;
  } else if (targetGender === 'female') {
    utterance.pitch = 1.15;
    utterance.rate = 1.05;
  } else {
    // Doll Persona Tuning
    if (dollName.includes('草莓熊')) {
      utterance.pitch = 1.28;
      utterance.rate = 0.92;
    } else if (dollName.includes('新之助') || dollName.includes('小新')) {
      utterance.pitch = 1.38;
      utterance.rate = 1.12;
    } else if (dollName.includes('小丸子')) {
      utterance.pitch = 1.22;
      utterance.rate = 1.0;
    } else if (dollName.includes('胡迪')) {
      utterance.pitch = 0.92;
      utterance.rate = 1.02;
    } else {
      utterance.pitch = 1.2;
      utterance.rate = 1.0;
    }
  }

  utterance.onend = () => {
    if (onEndCallback) onEndCallback();
  };

  utterance.onerror = () => {
    if (onEndCallback) onEndCallback();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopCurrentSynth(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function playSynthPreset(
  presetKey: string,
  durationSeconds?: number | string,
  onEndCallback?: () => void
): void {
  speakTextWithPersona(`音频音效试听：${presetKey}`, { speakerRole: String(presetKey) }, onEndCallback);
}
