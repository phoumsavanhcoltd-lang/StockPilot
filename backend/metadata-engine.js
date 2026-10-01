const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from','in','into','is','of','on','or','the','to','with'
]);

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isUsableKeyword(keyword) {
  const words = keyword.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  if (STOPWORDS.has(keyword)) return false;
  if (/^\d+$/.test(keyword)) return false;
  return true;
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
    if (!isUsableKeyword(keyword)) {
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

  const warnings = [];
  if (!title) warnings.push('Title is empty.');
  if (title.length < 20) warnings.push('Title may be too short for useful stock metadata.');
  if (!description) warnings.push('Description is empty.');
  if (keywords.length < 10) warnings.push('Fewer than 10 usable keywords remain.');
  if (keywords.length > 50) warnings.push(`Keyword list was reduced from ${keywords.length} to 50.`);
  if (description && description.length < 40) warnings.push('Description may be too short.');

  const finalKeywords = keywords.slice(0, 50);
  let score = 100;
  if (!title) score -= 30; else if (title.length < 20) score -= 10;
  if (!description) score -= 25; else if (description.length < 40) score -= 5;
  if (finalKeywords.length < 10) score -= 30;
  else if (finalKeywords.length < 25) score -= 10;
  score -= Math.min(10, removed.length);
  score = Math.max(0, score);

  return {
    title,
    description,
    keywords: finalKeywords,
    category: cleanText(raw?.category, 100),
    quality: {
      score,
      keywordCount: finalKeywords.length,
      removedCount: removed.length,
      warnings,
      readyForReview: Boolean(title && description && finalKeywords.length >= 10)
    }
  };
}
