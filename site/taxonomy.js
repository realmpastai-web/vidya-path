/*
 * Single source of truth for languages, levels, subjects and UI text.
 * Loaded by the site as a plain script and by the build scripts through require().
 * Hindi and Kannada strings need a native-speaker review before launch.
 */
(function (root) {
  var TAXONOMY = {
    languages: [
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
      { code: 'en', name: 'English', native: 'English' }
    ],
    levels: [
      { id: 'start', icon: '🌱', label: { en: 'Start (age 3–6)', hi: 'शुरुआत (3–6 साल)', kn: 'ಆರಂಭ (3–6 ವರ್ಷ)' } },
      { id: 'foundation', icon: '🌿', label: { en: 'Class 1–2', hi: 'कक्षा 1–2', kn: 'ತರಗತಿ 1–2' } },
      { id: 'primary', icon: '🌳', label: { en: 'Class 3–5', hi: 'कक्षा 3–5', kn: 'ತರಗತಿ 3–5' } },
      { id: 'middle', icon: '⛰️', label: { en: 'Class 6–8', hi: 'कक्षा 6–8', kn: 'ತರಗತಿ 6–8' } },
      { id: 'secondary', icon: '🎓', label: { en: 'Class 9–10', hi: 'कक्षा 9–10', kn: 'ತರಗತಿ 9–10' } }
    ],
    subjects: [
      { id: 'stories', icon: '📖', label: { en: 'Stories & rhymes', hi: 'कहानियाँ और गीत', kn: 'ಕಥೆ ಮತ್ತು ಹಾಡು' } },
      { id: 'reading', icon: '🔤', label: { en: 'Reading & writing', hi: 'पढ़ना-लिखना', kn: 'ಓದು-ಬರಹ' } },
      { id: 'maths', icon: '🔢', label: { en: 'Maths', hi: 'गणित', kn: 'ಗಣಿತ' } },
      { id: 'science', icon: '🔬', label: { en: 'Science', hi: 'विज्ञान', kn: 'ವಿಜ್ಞಾನ' } },
      { id: 'english', icon: '🗣️', label: { en: 'Spoken English', hi: 'अंग्रेज़ी बोलना', kn: 'ಇಂಗ್ಲಿಷ್ ಮಾತು' } },
      { id: 'life', icon: '🧼', label: { en: 'Health & life', hi: 'सेहत और जीवन', kn: 'ಆರೋಗ್ಯ ಮತ್ತು ಜೀವನ' } },
      { id: 'computers', icon: '🤖', label: { en: 'Computers & AI', hi: 'कंप्यूटर और AI', kn: 'ಕಂಪ್ಯೂಟರ್ ಮತ್ತು AI' } }
    ],
    ui: {
      en: {
        chooseLanguage: 'Choose your language',
        chooseLevel: 'Where do you want to start?',
        chooseSubject: 'What do you want to learn?',
        tv: 'Play TV',
        lowData: 'Low data',
        search: 'Search',
        searchHint: 'Type a word',
        back: 'Back',
        prev: 'Previous',
        next: 'Next',
        videos: 'videos',
        tapToPlay: 'Tap to play',
        done: 'Well done! You finished everything here.',
        again: 'Play again',
        empty: 'Nothing here yet.',
        noResults: 'No videos found.',
        loading: 'Loading…',
        playerError: 'The video player could not load. Check your internet and try again.',
        report: 'Wrong video? Tell us'
      },
      hi: {
        chooseLanguage: 'अपनी भाषा चुनें',
        chooseLevel: 'कहाँ से शुरू करें?',
        chooseSubject: 'क्या सीखना है?',
        tv: 'टीवी चलाओ',
        lowData: 'कम डेटा',
        search: 'खोजें',
        searchHint: 'कोई शब्द लिखें',
        back: 'वापस',
        prev: 'पिछला',
        next: 'अगला',
        videos: 'वीडियो',
        tapToPlay: 'चलाने के लिए दबाएँ',
        done: 'शाबाश! यहाँ सब पूरा हो गया।',
        again: 'फिर से चलाओ',
        empty: 'अभी यहाँ कुछ नहीं है।',
        noResults: 'कोई वीडियो नहीं मिला।',
        loading: 'खुल रहा है…',
        playerError: 'वीडियो नहीं खुल पाया। इंटरनेट देखें और फिर कोशिश करें।',
        report: 'गलत वीडियो? हमें बताएँ'
      },
      kn: {
        chooseLanguage: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
        chooseLevel: 'ಎಲ್ಲಿಂದ ಶುರು ಮಾಡೋಣ?',
        chooseSubject: 'ಏನು ಕಲಿಯೋಣ?',
        tv: 'ಟಿವಿ ಹಾಕಿ',
        lowData: 'ಕಡಿಮೆ ಡೇಟಾ',
        search: 'ಹುಡುಕಿ',
        searchHint: 'ಒಂದು ಪದ ಬರೆಯಿರಿ',
        back: 'ಹಿಂದೆ',
        prev: 'ಹಿಂದಿನದು',
        next: 'ಮುಂದಿನದು',
        videos: 'ವೀಡಿಯೊಗಳು',
        tapToPlay: 'ಪ್ಲೇ ಮಾಡಲು ಒತ್ತಿ',
        done: 'ಶಾಭಾಷ್! ಇಲ್ಲಿರುವುದೆಲ್ಲಾ ಮುಗಿಯಿತು.',
        again: 'ಮತ್ತೆ ಪ್ಲೇ ಮಾಡಿ',
        empty: 'ಇಲ್ಲಿ ಇನ್ನೂ ಏನೂ ಇಲ್ಲ.',
        noResults: 'ಯಾವ ವೀಡಿಯೊ ಸಿಗಲಿಲ್ಲ.',
        loading: 'ತೆರೆಯುತ್ತಿದೆ…',
        playerError: 'ವೀಡಿಯೊ ತೆರೆಯಲಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ನೋಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        report: 'ತಪ್ಪು ವೀಡಿಯೊ? ನಮಗೆ ತಿಳಿಸಿ'
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TAXONOMY;
  else root.TAXONOMY = TAXONOMY;
})(typeof window !== 'undefined' ? window : this);
