const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from','in','into','is','of','on','or','the','to','with'
]);

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function keywordScore(keyword) {
  const words = keyword.split(/\s+/).filter(Boolean);
  let score = 100;
  if (words.length > 5) score -= 25;
  if (words.length === 1 && STOPWORDS.has(keyword)) score -= 100;
  if (/^\d+$/.test(keyword)) score -= 80;
  return score;
}

export function qualityCheck(raw) {
  const title = cleanText(raw?.title, 200);
  const description = cleanText(raw?.description, 500);
  const input = Array.isArray(raw?.keywords)
    ? raw.keywords
    : String(raw?.keywords || '').split(',');

  const seen = new Set();
  const keywords = [];
  const removed = [];

  for (const item of input) {
    const keyword = String(item).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!keyword) continue;
    if (STOPWORDS.has(keyword) || keywordScore(keyword) < 0) {
      removed.push(keyword);
      continue;
    }
    if (seen.has(keyword)) {
      removed.push(keyword);
      continue;
    }
    seen.add(keyword);
    keywords.push(keyword);
  }

  keywords.sort((a, b) => keywordScore(b) - keywordScore(a));

  const warnings = [];
  if (!title) warnings.push('Title is empty.');
  if (title.length < 20) warnings.push('Title may be too short for useful stock metadata.');
  if (!description) warnings.push('Description is empty.');
  if (keywords.length < 10) warnings.push('Fewer than 10 usable keywords remain.');
  if (keywords.length > 50) warnings.push('Keyword list was reduced to 50.');

  return {
    title,
    description,
    keywords: keywords.slice(0, 50),
    category: cleanText(raw?.category, 100),
    quality: {
      keywordCount: Math.min(keywords.length, 50),
      removedCount: removed.length,
      warnings,
      readyForReview: Boolean(title && description && keywords.length >= 10)
    }
  };
}
