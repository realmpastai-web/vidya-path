// Best-effort guesses of level and subject from a playlist title.
// These only pre-fill proposals; a person confirms every one before it goes live.

const CLASS = /(?:class|grade|std\.?|standard|कक्षा|ತರಗತಿ)\s*[-:]?\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s*(?:class|grade|std|standard)|(\d{1,2})\s*ನೇ\s*ತರಗತಿ/i;

const SUBJECTS = [
  ['computers', /\b(ai|artificial intelligence|coding|scratch|computer|programming|robot)|कंप्यूटर|ಕಂಪ್ಯೂಟರ್/i],
  ['maths', /\b(math|maths|mathematics|arithmetic|algebra|geometry|fractions?|numbers?|counting)\b|गणित|ಗಣಿತ/i],
  ['science', /\b(science|evs|physics|chemistry|biology|experiment)|विज्ञान|ವಿಜ್ಞಾನ|ಪರಿಸರ/i],
  ['english', /\b(spoken english|learn english|english speaking|grammar|phonics)\b/i],
  ['reading', /\b(alphabet|abc|letters|varnamala|reading|writing|handwriting)\b|वर्णमाला|अक्षर|ಅಕ್ಷರ|ವರ್ಣಮಾಲೆ/i],
  ['stories', /\b(stor(y|ies)|rhymes?|songs?|tales?|moral)\b|कहानी|कहानियाँ|कविता|ಕಥೆ|ಹಾಡು/i],
  ['life', /\b(health|hygiene|safety|yoga|nutrition|life skills?)\b|स्वास्थ्य|ಆರೋಗ್ಯ/i]
];

export function levelForClass(n) {
  if (n >= 1 && n <= 2) return 'foundation';
  if (n >= 3 && n <= 5) return 'primary';
  if (n >= 6 && n <= 8) return 'middle';
  if (n >= 9 && n <= 10) return 'secondary';
  return null;
}

export function guess(title) {
  const m = CLASS.exec(title);
  let level = m ? levelForClass(Number(m[1] || m[2] || m[3])) : null;
  if (!level && /\b(nursery|kindergarten|lkg|ukg|preschool|toddlers?|kids rhymes)\b|बालगीत|ಶಿಶು/i.test(title)) level = 'start';
  const hit = SUBJECTS.find(([, re]) => re.test(title));
  return { level, subject: hit ? hit[0] : null };
}
