// share.jsx — build share text and open social / native share for season results.

function buildSharePayload(season, shareUrl) {
  const { wins, losses, perfect } = season;
  const record = `${wins}–${losses}`;
  const headline = perfect
    ? '🏆 17–0 — Perfect season!'
    : (season.message || `${record}`);

  const lines = [
    `Can you go 17-0? I finished ${record}.`,
    headline,
    'See my squad:',
  ];

  const url = shareUrl || '';
  const text = lines.join('\n');
  const title = perfect ? '17–0 · Can you go 17-0?' : `${record} · Can you go 17-0?`;
  const fullText = url ? `${text}\n\n${url}` : text;

  return { title, text, url, fullText, record, perfect };
}

function openPopup(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');
}

function shareToX(season, shareUrl) {
  const { fullText } = buildSharePayload(season, shareUrl);
  openPopup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`);
}

function shareToFacebook(season, shareUrl) {
  const { url, text } = buildSharePayload(season, shareUrl);
  if (!url) {
    return copyShareText(season, shareUrl);
  }
  const params = new URLSearchParams({ u: url, quote: text });
  openPopup(`https://www.facebook.com/sharer/sharer.php?${params}`);
}

function shareToWhatsApp(season, shareUrl) {
  const { fullText } = buildSharePayload(season, shareUrl);
  openPopup(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
}

function shareToLinkedIn(season, shareUrl) {
  const { url, title } = buildSharePayload(season, shareUrl);
  if (!url) return copyShareText(season, shareUrl);
  const params = new URLSearchParams({ url, mini: 'true', title });
  openPopup(`https://www.linkedin.com/sharing/share-offsite/?${params}`);
}

async function copyShareText(season, shareUrl) {
  const { fullText } = buildSharePayload(season, shareUrl);
  try {
    await navigator.clipboard.writeText(fullText);
    return { ok: true, method: 'copy' };
  } catch {
    const ta = document.createElement('textarea');
    ta.value = fullText;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return { ok, method: 'copy' };
  }
}

async function shareScoreNative(season, shareUrl) {
  const { title, fullText, url } = buildSharePayload(season, shareUrl);
  if (!navigator.share) return null;
  try {
    const payload = url
      ? { title, text: fullText.replace(`\n\n${url}`, ''), url }
      : { title, text: fullText };
    await navigator.share(payload);
    return { ok: true, method: 'native' };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, cancelled: true };
    return null;
  }
}

async function shareScore(season, shareUrl) {
  const native = await shareScoreNative(season, shareUrl);
  if (native) return native;
  return copyShareText(season, shareUrl);
}

Object.assign(window, {
  buildSharePayload,
  shareScore,
  shareScoreNative,
  shareToX,
  shareToFacebook,
  shareToWhatsApp,
  shareToLinkedIn,
  copyShareText,
});
