#!/usr/bin/env node
// Writes a made-up index into site/data so the pages can be tried without an API key.
// The video ids are fake, so nothing will actually play.
import path from 'node:path';
import { ROOT, taxonomy } from './lib/catalog.mjs';
import { buildShards } from './lib/transform.mjs';
import { writeShards } from './build-index.mjs';

const plan = [
  ['hi', 'start', 'stories', 'हिंदी बालगीत', 'नमूना चैनल', 6],
  ['hi', 'start', 'reading', 'वर्णमाला सीखें', 'नमूना चैनल', 5],
  ['hi', 'start', 'maths', 'गिनती 1 से 20', 'नमूना चैनल', 4],
  ['hi', 'primary', 'maths', 'कक्षा 3 गणित: जोड़ और घटाव', 'नमूना विद्यालय', 8],
  ['hi', 'primary', 'maths', 'कक्षा 4 गणित: भिन्न', 'नमूना विद्यालय', 6],
  ['hi', 'primary', 'science', 'कक्षा 5 विज्ञान: पौधे', 'नमूना विद्यालय', 5],
  ['hi', 'primary', 'computers', 'बच्चों के लिए AI', 'नमूना चैनल', 3],
  ['kn', 'start', 'stories', 'ಕನ್ನಡ ಶಿಶುಗೀತೆಗಳು', 'ಮಾದರಿ ಚಾನೆಲ್', 5],
  ['kn', 'start', 'reading', 'ಕನ್ನಡ ವರ್ಣಮಾಲೆ', 'ಮಾದರಿ ಚಾನೆಲ್', 4],
  ['kn', 'primary', 'maths', '3ನೇ ತರಗತಿ ಗಣಿತ', 'ಮಾದರಿ ಶಾಲೆ', 6],
  ['en', 'start', 'stories', 'Nursery rhymes', 'Sample Channel', 5],
  ['en', 'primary', 'computers', 'AI for kids', 'Sample Channel', 4]
];

const entries = [];
const fetched = new Map();
plan.forEach(([lang, level, subject, title, channel, count], i) => {
  const playlistId = 'PLfixture' + String(i).padStart(8, '0');
  entries.push({ playlistId, lang, level, subject });
  fetched.set(playlistId, {
    title,
    channel,
    videos: Array.from({ length: count }, (_, n) => ({
      id: ('fx' + String(i).padStart(3, '0') + String(n).padStart(3, '0') + 'xxxxx').slice(0, 11),
      title: `${title} ${n + 1}`,
      seconds: 120 + n * 37
    }))
  });
});

writeShards(buildShards(entries, fetched, taxonomy, new Date().toISOString()), path.join(ROOT, 'site', 'data'));
console.log('Wrote a made-up index to site/data.');
