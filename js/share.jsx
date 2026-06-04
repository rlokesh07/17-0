// share.jsx — build share text and open social / native share for season results.

function gameUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.href.split('#')[0].split('?')[0];
}

function formatSquadForShare(squad) {
  if (!squad || !SLOTS) return [];
  return SLOTS.map((slot) => {
    const p = squad[slot.key];
    if (!p) return null;
    const t = p.fromTeam;
    const year =
      p.fromYear != null ? `'${String(p.fromYear).slice(-2)}` : '';
    const origin = t ? `${t.abbr.toUpperCase()}${year ? ` ${year}` : ''}` : '';
    const meta = [origin, p.pos].filter(Boolean).join(' · ');
    return `${slot.label} ${p.name}${meta ? ` · ${meta}` : ''} · ${p.ovr}`;
  }).filter(Boolean);
}

function buildSharePayload(season) {
  const { wins, losses, perfect } = season;
  const record = `${wins}–${losses}`;
  const headline = perfect
    ? '🏆 17–0 — Perfect season!'
    : (season.message || `${record}`);

  const lines = [
    `Can you go 17-0? I finished ${record}.`,
    headline,
  ];

  const roster = formatSquadForShare(season.squad);
  if (roster.length) {
    lines.push('', 'My squad:', ...roster);
  }

  const url = gameUrl();
  const text = lines.join('\n');
  const title = perfect ? '17–0 · Can you go 17-0?' : `${record} · Can you go 17-0?`;
  const fullText = url ? `${text}\n\n${url}` : text;

  return { title, text, url, fullText, record, perfect };
}

function openPopup(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');
}

function shareToX(season) {
  const { fullText } = buildSharePayload(season);
  openPopup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`);
}

function shareToFacebook(season) {
  const { url, text } = buildSharePayload(season);
  if (!url) {
    return copyShareText(season);
  }
  const params = new URLSearchParams({ u: url, quote: text });
  openPopup(`https://www.facebook.com/sharer/sharer.php?${params}`);
}

function shareToWhatsApp(season) {
  const { fullText } = buildSharePayload(season);
  openPopup(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
}

function shareToLinkedIn(season) {
  const { url, title } = buildSharePayload(season);
  if (!url) return copyShareText(season);
  const params = new URLSearchParams({ url, mini: 'true', title });
  openPopup(`https://www.linkedin.com/sharing/share-offsite/?${params}`);
}

async function copyShareText(season) {
  const { fullText } = buildSharePayload(season);
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

async function shareScoreNative(season) {
  const { title, fullText, url } = buildSharePayload(season);
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

async function shareScore(season) {
  const native = await shareScoreNative(season);
  if (native) return native;
  return copyShareText(season);
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
