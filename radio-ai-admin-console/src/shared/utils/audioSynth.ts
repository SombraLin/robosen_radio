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
  return cachedVoices.filter(
    (v) => v.lang.includes('zh') || v.lang.includes('CN') || v.name.includes('Chinese')
  );
}

export function findBestVoiceMatch(
  gender: 'female' | 'male' | 'doll',
  speakerRole?: string
): SpeechSynthesisVoice | null {
  const voices = getSystemChineseVoices();
  if (voices.length === 0) return null;

  const roleText = (speakerRole || '').toLowerCase();

  // Explicit check for male role or voice ID
  if (
    gender === 'male' ||
    roleText.includes('男') ||
    roleText.includes('云健') ||
    roleText.includes('云希')
  ) {
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
  if (
    gender === 'female' ||
    roleText.includes('女') ||
    roleText.includes('晓晓') ||
    roleText.includes('晓伊')
  ) {
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
  else if (
    options.nodeIndex !== undefined &&
    (role.includes('交替') || localStorage.getItem('enable_alternate_gender') !== 'false')
  ) {
    targetGender = options.nodeIndex % 2 === 1 ? 'male' : 'female';
  }

  // Match voice from browser voices
  const bestVoice = findBestVoiceMatch(targetGender, role);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  // Adjust pitch and rate for doll character
  if (options.gender === 'doll' || dollName) {
    if (dollName.includes('小新')) {
      utterance.pitch = 1.35;
      utterance.rate = 0.95;
    } else if (dollName.includes('草莓熊')) {
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
    } else if (dollName.includes('丸子')) {
      utterance.pitch = 1.25;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
    }
  } else {
    // Standard broadcaster rates
    utterance.pitch = targetGender === 'male' ? 0.95 : 1.05;
    utterance.rate = 1.05;
  }

  utterance.onend = () => {
    if (onEndCallback) onEndCallback();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    if (onEndCallback) onEndCallback();
  };

  window.speechSynthesis.speak(utterance);
}
