// screens.jsx — Intro, Draft (two wheels + shortlist), Squad review, Sim, Result.
// Globals: React, Wheel, TEAMS, TEAM_BY_ID, logoUrl, YEARS, SLOTS, GROUP_SLOTS,
//   openSlotForGroup, tierOf, teamRatings, percentile, simSeason, perfectOdds, fetchShortlist.

const { useState, useRef, useEffect } = React;

const TIER_HEX = { elite: '#22d3a8', great: '#38bdf8', good: '#7c93ab', avg: '#5b6b7d', bad: '#46586b' };
const tcol = (ovr) => TIER_HEX[tierOf(ovr).key];

// ── atoms ─────────────────────────────────────────────────────
function Mono({ children, style }) {
  return <div style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', ...style }}>{children}</div>;
}
function Btn({ children, onClick, primary, ghost, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', border: 'none', cursor: disabled ? 'default' : 'pointer',
      padding: '16px 20px', borderRadius: 14,
      fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 21, letterSpacing: 1.5, textTransform: 'uppercase',
      background: disabled ? '#1b2530' : (primary ? 'var(--accent)' : 'transparent'),
      color: disabled ? '#46586b' : (primary ? '#04140f' : 'var(--txt)'),
      boxShadow: primary && !disabled ? '0 0 26px var(--accent-glow)' : 'none',
      border: primary ? 'none' : '1.5px solid var(--line)',
      transition: 'transform .12s ease', ...style,
    }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.975)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >{children}</button>
  );
}
function Bar({ value, color }) {
  return <div style={{ height: 7, borderRadius: 4, background: '#16202c', overflow: 'hidden' }}>
    <div style={{ width: `${value}%`, height: '100%', borderRadius: 4, background: color || 'var(--accent)', transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} />
  </div>;
}
// headshot with a clean jersey/initials fallback on the team color
function Avatar({ player, size = 46 }) {
  const [err, setErr] = useState(false);
  const team = TEAM_BY_ID[player.teamId];
  const bg = team ? team.color : '#1f2b38';
  const common = { width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.12)' };
  if (player.headshot && !err) {
    return <img src={player.headshot} onError={() => setErr(true)} style={{ ...common, background: bg }} alt="" />;
  }
  return (
    <div style={{ ...common, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: size * 0.42, color: '#fff' }}>{player.jersey ?? player.name[0]}</span>
    </div>
  );
}

// ── 1. INTRO ──────────────────────────────────────────────────
function IntroScreen({ onStart }) {
  return (
    <div style={{ ...sx.page, justifyContent: 'space-between' }}>
      <div style={{ paddingTop: 16 }}>
        <Mono style={{ color: 'var(--accent)' }}>Spin · Draft · Simulate</Mono>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 120, lineHeight: 0.82, letterSpacing: -2, marginTop: 12, color: 'var(--txt)' }}>17<span style={{ color: 'var(--accent)' }}>–</span>0</div>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 600, fontSize: 24, letterSpacing: 0.5, color: 'var(--txt)', marginTop: 6, textTransform: 'uppercase' }}>Build the Perfect Season</div>
        <p style={{ fontFamily: '"Saira",sans-serif', fontSize: 16, lineHeight: 1.5, color: 'var(--muted)', marginTop: 16, maxWidth: 330 }}>
          Spin for a franchise. Spin for a season, 1999 to now. Draft one star from
          that exact team-year — then do it eight more times. Lock your nine and find
          out if your all-era roster can run the table.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '6px 0' }}>
        {[['9', 'picks'], ['32×27', 'team-years'], ['17–0', 'goal']].map(([n, l]) => (
          <div key={l} style={sx.statCard}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: n.length > 3 ? 26 : 38, lineHeight: 1, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{n}</div>
            <Mono style={{ marginTop: 5 }}>{l}</Mono>
          </div>
        ))}
      </div>
      <Btn primary onClick={onStart}>Start Drafting →</Btn>
    </div>
  );
}

// ── 2. DRAFT ──────────────────────────────────────────────────
function DraftScreen({ onDone, accent }) {
  const [squad, setSquad] = useState({});
  const [phase, setPhase] = useState('idle'); // idle | spinning | loading | choosing
  const [team, setTeam] = useState(null);
  const [year, setYear] = useState(null);
  const [shortlist, setShortlist] = useState(null);

  const teamRef = useRef(null), yearRef = useRef(null);
  const pending = useRef(null), restCount = useRef(0);

  const filled = Object.keys(squad).length;

  function spin() {
    if (phase !== 'idle') return;
    const ti = Math.floor(Math.random() * TEAMS.length);
    const yi = Math.floor(Math.random() * YEARS.length);
    pending.current = { team: TEAMS[ti], year: YEARS[yi] };
    restCount.current = 0;
    setShortlist(null);
    setPhase('spinning');
    teamRef.current.spinTo(ti, 5);
    yearRef.current.spinTo(yi, 6);
  }
  function onRest() {
    restCount.current += 1;
    if (restCount.current < 2) return;
    const { team, year } = pending.current;
    setTeam(team); setYear(year);
    setPhase('loading');
    fetchShortlist(team.id, year).then(res => {
      setShortlist(res.players || []);
      setPhase('choosing');
    });
  }
  function pick(p) {
    const slotKey = openSlotForGroup(squad, p.group);
    if (!slotKey) return;
    const ns = { ...squad, [slotKey]: { ...p, fromTeam: team, fromYear: year } };
    setSquad(ns);
    if (Object.keys(ns).length >= SLOTS.length) { onDone(ns); return; }
    setPhase('idle');
  }

  const collapsed = phase === 'loading' || phase === 'choosing';

  return (
    <div style={{ ...sx.page, paddingBottom: 14 }}>
      {/* progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono style={{ color: 'var(--accent)' }}>The Draft</Mono>
        <Mono>{filled} / {SLOTS.length} locked</Mono>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
        {SLOTS.map(s => {
          const sel = squad[s.key];
          return (
            <div key={s.key} style={{
              flex: 1, height: 30, borderRadius: 7, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              background: sel ? 'var(--surface)' : 'transparent',
              border: `1px ${sel ? 'solid' : 'dashed'} ${sel ? tcol(sel.ovr) : 'var(--line)'}`,
            }}>
              <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 8, color: sel ? tcol(sel.ovr) : 'var(--muted)', letterSpacing: 0.5 }}>{s.label}</span>
              {sel && <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 12, color: 'var(--txt)', lineHeight: 1 }}>{sel.ovr}</span>}
            </div>
          );
        })}
      </div>

      {!collapsed ? (
        // ── wheels + spin ──
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 23, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {filled === 0 ? 'Draw a team-season' : `${SLOTS.length - filled} ${SLOTS.length - filled === 1 ? 'slot' : 'slots'} to fill`}
            </div>
            <div style={{ fontFamily: '"Saira",sans-serif', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>Spin both wheels, then steal one of their stars.</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Wheel ref={teamRef} items={TEAMS} size={152} accent={accent} onRest={onRest} label="Franchise"
              segFill={(t) => t.color}
              hub={(idx) => idx == null
                ? <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, color: '#2c3a49' }}>?</span>
                : <img src={logoUrl(TEAMS[idx].abbr)} style={{ width: '78%', height: '78%', objectFit: 'contain' }} alt="" />} />
            <Wheel ref={yearRef} items={YEARS} size={152} accent={accent} onRest={onRest} label="Season"
              segFill={(y, i) => (y % 5 === 0 ? '#33475c' : (i % 2 ? '#1c2733' : '#243240'))}
              hub={(idx) => <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: idx == null ? 30 : 30, color: idx == null ? '#2c3a49' : 'var(--txt)' }}>{idx == null ? '?' : YEARS[idx]}</span>} />
          </div>
          <Btn primary disabled={phase === 'spinning'} onClick={spin}>
            {phase === 'spinning' ? 'Spinning…' : (filled === 0 ? 'Spin Both →' : 'Spin Again →')}
          </Btn>
        </div>
      ) : (
        // ── result banner + shortlist ──
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ ...sx.banner, borderColor: team.color }}>
            <img src={logoUrl(team.abbr)} style={{ width: 42, height: 42, objectFit: 'contain' }} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--txt)', lineHeight: 1, textTransform: 'uppercase' }}>{team.city} {team.name}</div>
              <Mono style={{ marginTop: 3 }}>{year} Season · pick one</Mono>
            </div>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, color: 'var(--accent)' }}>{String(year).slice(2)}</div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', marginTop: 10, marginRight: -4, paddingRight: 4 }}>
            {phase === 'loading'
              ? [0, 1, 2, 3].map(i => <div key={i} style={{ ...sx.skel, animationDelay: `${i * 0.1}s` }} />)
              : shortlist.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontFamily: '"Saira",sans-serif' }}>No tracked stars for this team-year. Spin again.</div>
                : shortlist.map(p => {
                    const slotOpen = !!openSlotForGroup(squad, p.group);
                    return <PlayerCard key={p.id} p={p} disabled={!slotOpen} onClick={() => slotOpen && pick(p)} />;
                  })}
          </div>

          <div style={{ marginTop: 10 }}>
            <Btn ghost onClick={() => setPhase('idle')}>↺ Skip · Spin Again</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ p, disabled, onClick }) {
  const c = tcol(p.ovr);
  return (
    <div onClick={onClick} className="pcard" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8,
      background: 'var(--surface)', border: `1px solid ${disabled ? 'var(--line)' : 'var(--line)'}`,
      borderRadius: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.42 : 1,
      transition: 'transform .1s ease, border-color .1s ease',
    }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.985)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <Avatar player={p} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 19, color: 'var(--txt)', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
          <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 9, color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{p.pos}</span>
          <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.stat}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, color: c, lineHeight: 1 }}>{p.ovr}</div>
        <div style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 7.5, letterSpacing: 1, color: c }}>{disabled ? 'SLOT FULL' : tierOf(p.ovr).label}</div>
      </div>
    </div>
  );
}

// ── 3. SQUAD REVIEW ───────────────────────────────────────────
function SquadScreen({ squad, opts, onSim, onRestart }) {
  const rt = teamRatings(squad);
  const odds = perfectOdds(squad, opts);
  const oddsLabel = odds >= 0.01 ? `${(odds * 100).toFixed(1)}%` : `1 in ${Math.round(1 / odds).toLocaleString()}`;
  return (
    <div style={{ ...sx.page, paddingBottom: 12 }}>
      <Mono style={{ color: 'var(--accent)' }}>Roster Locked</Mono>
      <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 32, lineHeight: 1, color: 'var(--txt)', textTransform: 'uppercase', marginTop: 3 }}>Your All-Era Squad</div>

      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
        {[['OVR', rt.ovr, 'var(--accent)'], ['OFF', rt.off, '#38bdf8'], ['DEF', rt.def, '#fb7185']].map(([l, v, c]) => (
          <div key={l} style={{ ...sx.statCard, flex: 1, alignItems: 'flex-start' }}>
            <Mono>{l}</Mono>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 42, lineHeight: 1, color: c, marginTop: 2 }}>{v}</div>
            <div style={{ width: '100%', marginTop: 7 }}><Bar value={v} color={c} /></div>
            <Mono style={{ fontSize: 9, marginTop: 5, letterSpacing: 1 }}>{percentile(v)}th pct</Mono>
          </div>
        ))}
      </div>

      <div style={sx.odds}>
        <div><Mono style={{ whiteSpace: 'nowrap' }}>Modeled odds of 17–0</Mono>
          <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--txt)', lineHeight: 1, marginTop: 3 }}>{oddsLabel}</div></div>
        <Mono style={{ textAlign: 'right', maxWidth: 120, lineHeight: 1.5 }}>vs. a brutal<br />17-game gauntlet</Mono>
      </div>

      <div style={{ flex: 1, overflow: 'auto', marginTop: 11, marginRight: -4, paddingRight: 4 }}>
        {SLOTS.map(s => {
          const p = squad[s.key]; if (!p) return null;
          const t = p.fromTeam;
          return (
            <div key={s.key} style={sx.row}>
              <div style={{ width: 30 }}><Mono style={{ color: s.side === 'OFF' ? '#38bdf8' : '#fb7185', fontSize: 11 }}>{s.label}</Mono></div>
              <Avatar player={p} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--txt)', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  {t && <img src={logoUrl(t.abbr)} style={{ width: 13, height: 13, objectFit: 'contain' }} alt="" />}
                  <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 10.5, color: 'var(--muted)' }}>{t ? t.abbr.toUpperCase() : ''} ’{String(p.fromYear).slice(2)} · {p.pos}</span>
                </div>
              </div>
              <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 24, color: tcol(p.ovr), minWidth: 30, textAlign: 'right' }}>{p.ovr}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 11 }}>
        <Btn onClick={onRestart} style={{ flex: '0 0 38%' }}>New Draft</Btn>
        <Btn primary onClick={onSim} style={{ flex: 1 }}>Sim Season →</Btn>
      </div>
    </div>
  );
}

// ── 4. SIM ────────────────────────────────────────────────────
function SimScreen({ season, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= season.games.length) { const t = setTimeout(onDone, 720); return () => clearTimeout(t); }
    const t = setTimeout(() => setN(n + 1), n === 0 ? 320 : 230);
    return () => clearTimeout(t);
  }, [n]);
  const shown = season.games.slice(0, n);
  const w = shown.filter(g => g.win).length, l = shown.length - w;
  const live = shown.length ? shown[shown.length - 1] : null;
  return (
    <div style={sx.page}>
      <Mono style={{ color: 'var(--accent)' }}>Simulating · Regular Season</Mono>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 5 }}>
        <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 78, lineHeight: 0.9, color: 'var(--accent)' }}>{w}</span>
        <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 48, color: 'var(--muted)' }}>–</span>
        <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 78, lineHeight: 0.9, color: l ? '#fb7185' : 'var(--muted)' }}>{l}</span>
        <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{shown.length}/17</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', marginTop: 12, marginRight: -4, paddingRight: 4, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-end' }}>
        {shown.slice().reverse().map(g => (
          <div key={g.wk} style={{ ...sx.game, borderColor: g.win ? 'rgba(34,211,168,0.4)' : 'rgba(251,113,133,0.35)', animation: g === live ? 'slideIn .25s ease' : 'none' }}>
            <div style={{ width: 30 }}><Mono style={{ fontSize: 11 }}>W{g.wk}</Mono></div>
            <div style={{ flex: 1, fontFamily: '"Saira Condensed",sans-serif', fontWeight: 600, fontSize: 18, color: 'var(--txt)', textTransform: 'uppercase' }}>{g.city}</div>
            <div style={{ fontFamily: '"IBM Plex Mono",monospace', fontWeight: 600, fontSize: 16, color: g.win ? 'var(--accent)' : '#fb7185' }}>{g.us}–{g.them}</div>
            <div style={{ width: 22, textAlign: 'center', fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 16, color: g.win ? 'var(--accent)' : '#fb7185' }}>{g.win ? 'W' : 'L'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. RESULT ─────────────────────────────────────────────────
function ResultScreen({ season, onRestart }) {
  const { wins, losses, pf, pa, diff, perfect } = season;
  return (
    <div style={sx.page}>
      {perfect && <Confetti />}
      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <Mono style={{ color: perfect ? 'var(--accent)' : 'var(--muted)' }}>{perfect ? 'Perfection Achieved' : 'Final · Regular Season'}</Mono>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 112, lineHeight: 0.85, marginTop: 5, color: perfect ? 'var(--accent)' : 'var(--txt)', textShadow: perfect ? '0 0 40px var(--accent-glow)' : 'none' }}>{wins}<span style={{ color: 'var(--muted)', fontWeight: 700 }}>–</span>{losses}</div>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 600, fontSize: 19, marginTop: 7, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt)' }}>{perfect ? '🏆 17–0 · Immortal' : verdict(wins)}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {[['PF', pf], ['PA', pa], ['DIFF', (diff >= 0 ? '+' : '') + diff]].map(([l, v]) => (
          <div key={l} style={{ ...sx.statCard, flex: 1 }}>
            <Mono>{l}</Mono>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, lineHeight: 1, color: l === 'DIFF' ? (diff >= 0 ? 'var(--accent)' : '#fb7185') : 'var(--txt)', marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <Mono style={{ marginTop: 16 }}>Game Log</Mono>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 8 }}>
        {season.games.map(g => (
          <div key={g.wk} style={{ aspectRatio: '1', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: g.win ? 'rgba(34,211,168,0.14)' : 'rgba(251,113,133,0.12)', border: `1px solid ${g.win ? 'rgba(34,211,168,0.45)' : 'rgba(251,113,133,0.4)'}` }}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 18, color: g.win ? 'var(--accent)' : '#fb7185', lineHeight: 1 }}>{g.win ? 'W' : 'L'}</div>
            <div style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{g.us}-{g.them}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <Btn primary onClick={onRestart}>Run It Back →</Btn>
    </div>
  );
}
function verdict(w) {
  if (w >= 15) return 'So close · Contender';
  if (w >= 12) return 'Playoff Team';
  if (w >= 9) return 'In The Hunt';
  if (w >= 6) return 'Rebuilding';
  return 'Top Draft Pick';
}
function Confetti() {
  const cols = ['#22d3a8', '#38bdf8', '#fbbf24', '#fff'];
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 30 }}>
    {Array.from({ length: 36 }, (_, i) => i).map(i => (
      <div key={i} style={{ position: 'absolute', top: -20, left: `${(i * 37) % 100}%`, width: 7, height: 11, background: cols[i % cols.length], opacity: 0.9, borderRadius: 1, animation: `fall ${1.6 + (i % 5) * 0.3}s linear ${(i % 7) * 0.12}s infinite` }} />
    ))}
  </div>;
}

const sx = {
  page: { height: '100%', boxSizing: 'border-box', padding: '60px 18px 42px', display: 'flex', flexDirection: 'column' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '11px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  banner: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--surface)', border: '1.5px solid', borderRadius: 14 },
  odds: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 15px', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--line)' },
  game: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: 'var(--surface)', border: '1px solid', borderRadius: 10 },
  skel: { height: 62, borderRadius: 13, marginBottom: 8, background: 'linear-gradient(90deg,#131c26,#1a2532,#131c26)', backgroundSize: '200% 100%', animation: 'shimmer 1.1s linear infinite' },
};

Object.assign(window, { IntroScreen, DraftScreen, SquadScreen, SimScreen, ResultScreen });
