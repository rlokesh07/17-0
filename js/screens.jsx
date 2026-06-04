// screens.jsx — Intro, Draft (two wheels + shortlist), Squad review, Sim, Result.
// Globals: React, Wheel, TEAMS, TEAM_BY_ID, YEARS, SLOTS, GROUP_SLOTS,
//   pickSlotKey, tierOf, teamRatings, percentile, simSeason, perfectOdds, fetchShortlist.

const { useState, useRef, useEffect } = React;

const TIER_HEX = { elite: 'var(--accent)', great: '#38bdf8', good: '#7c93ab', avg: '#5b6b7d', bad: '#46586b' };
const tcol = (ovr) => TIER_HEX[tierOf(ovr).key];

// ── atoms ─────────────────────────────────────────────────────
function TeamBadge({ team, size = 42 }) {
  if (!team) return null;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: team.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px solid rgba(255,255,255,0.12)',
      boxSizing: 'border-box',
    }}>
      <span style={{
        fontFamily: '"Saira Condensed",sans-serif',
        fontWeight: 800,
        fontSize: Math.max(10, size * 0.34),
        color: '#fff',
        letterSpacing: 0.5,
      }}>
        {team.abbr.toUpperCase()}
      </span>
    </div>
  );
}

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
function IntroScreen({ onStart, dataReady, dataError }) {
  return (
    <div style={{ ...sx.page, justifyContent: 'space-between' }}>
      <div style={{ paddingTop: 16 }}>
        <Mono style={{ color: 'var(--accent)' }}>Spin · Draft · Simulate</Mono>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 'clamp(72px, 14vw, 120px)', lineHeight: 0.82, letterSpacing: -2, marginTop: 12, color: 'var(--txt)' }}>17<span style={{ color: 'var(--accent)' }}>–</span>0</div>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 600, fontSize: 24, letterSpacing: 0.5, color: 'var(--txt)', marginTop: 6, textTransform: 'uppercase' }}>Build the Perfect Season</div>
        <p style={{ fontFamily: '"Saira",sans-serif', fontSize: 16, lineHeight: 1.5, color: 'var(--muted)', marginTop: 16, maxWidth: 330 }}>
          Spin for a franchise. Spin for a season, 1999 to now. Draft one star from
          that exact team-year — then do it ten more times. Lock your eleven and find
          out if your all-era roster can run the table.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '6px 0' }}>
        {[['11', 'picks'], ['32×27', 'team-years'], ['17–0', 'goal']].map(([n, l]) => (
          <div key={l} style={sx.statCard}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: n.length > 3 ? 26 : 38, lineHeight: 1, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{n}</div>
            <Mono style={{ marginTop: 5 }}>{l}</Mono>
          </div>
        ))}
      </div>
      {dataError && (
        <p style={{ fontFamily: '"Saira",sans-serif', fontSize: 14, color: '#fb7185', marginBottom: 12, textAlign: 'center' }}>
          {dataError}
        </p>
      )}
      <Btn primary disabled={!dataReady} onClick={onStart}>
        {dataReady ? 'Start Drafting →' : (dataError ? 'Fix data & refresh' : 'Loading players…')}
      </Btn>
    </div>
  );
}

// ── 2. DRAFT ──────────────────────────────────────────────────
function DraftScreen({ onDone, accent, dataError }) {
  const [squad, setSquad] = useState({});
  const [phase, setPhase] = useState('idle'); // idle | spinning | loading | choosing
  const [team, setTeam] = useState(null);
  const [year, setYear] = useState(null);
  const [shortlist, setShortlist] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [years, setYears] = useState(() => (window.YEARS?.length ? window.YEARS : YEARS));
  const [validPicks, setValidPicks] = useState(() =>
    (typeof getValidDraftPicks === 'function' ? getValidDraftPicks() : [])
  );
  const [skipsLeft, setSkipsLeft] = useState(1);

  const teamRef = useRef(null), yearRef = useRef(null);
  const pending = useRef(null), restCount = useRef(0);
  const fetchGen = useRef(0);
  const autoSpinAfterPick = useRef(false);

  useEffect(() => {
    if (typeof loadSpinnerIndex !== 'function') return;
    loadSpinnerIndex().then((idx) => {
      if (idx?.years?.length) setYears(idx.years.map(Number));
      if (typeof getValidDraftPicks === 'function') setValidPicks(getValidDraftPicks());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoSpinAfterPick.current || phase !== 'idle' || dataError || !validPicks.length) return;
    autoSpinAfterPick.current = false;
    const t = setTimeout(() => spin(), 80);
    return () => clearTimeout(t);
  }, [phase, dataError, validPicks.length]);

  const filled = Object.keys(squad).length;
  const wheelSize = typeof window !== 'undefined' && window.innerWidth >= 720 ? 200 : 168;

  function resetToWheels() {
    fetchGen.current += 1;
    setTeam(null);
    setYear(null);
    setShortlist(null);
    setFetchError(null);
    setPhase('idle');
  }

  function skipSpin() {
    if (skipsLeft <= 0) return;
    setSkipsLeft(0);
    autoSpinAfterPick.current = true;
    resetToWheels();
  }

  function spin() {
    if (phase !== 'idle' || dataError || !validPicks.length) return;
    const pick = validPicks[Math.floor(Math.random() * validPicks.length)];
    if (!pick?.team) return;
    pending.current = { team: pick.team, year: pick.year };
    restCount.current = 0;
    fetchGen.current += 1;
    setTeam(null);
    setYear(null);
    setShortlist(null);
    setFetchError(null);
    setPhase('spinning');
    teamRef.current?.spinTo(pick.teamIndex, 5);
    yearRef.current?.spinTo(pick.yearIndex, 6);
  }
  function onRest() {
    restCount.current += 1;
    if (restCount.current < 2) return;
    const pick = pending.current;
    if (!pick?.team || pick.year == null) return;
    const { team: pickedTeam, year: pickedYear } = pick;
    const gen = ++fetchGen.current;
    setTeam(pickedTeam);
    setYear(pickedYear);
    setPhase('loading');
    setFetchError(null);
    setShortlist(null);
    fetchShortlist(pickedTeam.id, pickedYear)
      .then((res) => {
        if (gen !== fetchGen.current) return;
        const players = res.players || [];
        if (!players.length) {
          resetToWheels();
          return;
        }
        setShortlist(players);
        setPhase('choosing');
      })
      .catch(() => {
        if (gen !== fetchGen.current) return;
        setFetchError('Failed to load players for this team-year.');
        setShortlist([]);
        setPhase('choosing');
      });
  }
  function pick(p) {
    const slotKey = pickSlotKey(squad, p);
    if (!slotKey || !team || year == null) return;
    const ns = { ...squad, [slotKey]: { ...p, fromTeam: team, fromYear: year } };
    setSquad(ns);
    if (Object.keys(ns).length >= SLOTS.length) { onDone(ns); return; }
    autoSpinAfterPick.current = true;
    resetToWheels();
  }

  const showPickList = (phase === 'loading' || phase === 'choosing') && team != null && year != null;

  return (
    <div style={{
      ...sx.page,
      paddingBottom: 14,
      overflow: showPickList ? 'hidden' : 'auto',
    }}>
      {/* progress — stays fixed while player list scrolls */}
      <div style={{
        flexShrink: 0,
        ...(showPickList ? sx.draftStickyHead : null),
      }}>
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
      </div>

      {!showPickList ? (
        // ── wheels + spin ──
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 700, fontSize: 23, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {filled === 0 ? 'Draw a team-season' : `${SLOTS.length - filled} ${SLOTS.length - filled === 1 ? 'slot' : 'slots'} to fill`}
            </div>
            <div style={{ fontFamily: '"Saira",sans-serif', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>Spin both wheels, then steal one of their stars.</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(16px, 4vw, 48px)', flexWrap: 'wrap' }}>
            <Wheel ref={teamRef} items={TEAMS} size={wheelSize} accent={accent} onRest={onRest} label="Franchise"
              segFill={(t) => t.color}
              hub={(idx) => idx == null
                ? <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, color: '#2c3a49' }}>?</span>
                : <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--txt)', letterSpacing: 1 }}>{TEAMS[idx].abbr.toUpperCase()}</span>} />
            <Wheel ref={yearRef} items={years} size={wheelSize} accent={accent} onRest={onRest} label="Season"
              segFill={(y, i) => (y % 5 === 0 ? '#33475c' : (i % 2 ? '#1c2733' : '#243240'))}
              hub={(idx) => <span style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: idx == null ? 30 : 30, color: idx == null ? '#2c3a49' : 'var(--txt)' }}>{idx == null ? '?' : years[idx]}</span>} />
          </div>
          <Btn primary disabled={phase === 'spinning' || !!dataError || !validPicks.length} onClick={spin}>
            {phase === 'spinning' ? 'Spinning…' : (filled === 0 ? 'Spin Both →' : 'Spin Again →')}
          </Btn>
        </div>
      ) : (
        // ── team banner (fixed) + scrollable shortlist ──
        <div style={sx.draftPickPane}>
          <div style={{ ...sx.banner, borderColor: team?.color || 'var(--line)' }}>
            {team && <TeamBadge team={team} size={42} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--txt)', lineHeight: 1, textTransform: 'uppercase' }}>
                {team ? team.name : 'Loading…'}
              </div>
              <Mono style={{ marginTop: 3 }}>{year} Season · pick one</Mono>
            </div>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 30, color: 'var(--accent)' }}>{String(year).slice(2)}</div>
          </div>

          <div style={sx.draftPlayerScroll}>
            {phase === 'loading'
              ? [0, 1, 2, 3].map(i => <div key={i} style={{ ...sx.skel, animationDelay: `${i * 0.1}s` }} />)
              : fetchError
                ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#fb7185', fontFamily: '"Saira",sans-serif' }}>{fetchError}</div>
              : (shortlist || []).map(p => {
                    const slotOpen = !!pickSlotKey(squad, p);
                    return <PlayerCard key={p.id} p={p} disabled={!slotOpen} onClick={() => slotOpen && pick(p)} />;
                  })}
          </div>

          {skipsLeft > 0 && (
            <div style={{ flexShrink: 0, marginTop: 10 }}>
              <Btn ghost onClick={skipSpin}>↺ Skip · Spin Again (1 left)</Btn>
            </div>
          )}
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
                  <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 10.5, color: 'var(--muted)' }}>{t ? `${t.name} ’${String(p.fromYear).slice(2)}` : ''} · {p.pos}</span>
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
          <div key={g.wk} style={{ ...sx.game, borderColor: g.win ? 'rgba(255,122,61,0.4)' : 'rgba(251,113,133,0.35)' }}>
            <div style={{ width: 36 }}><Mono style={{ fontSize: 11 }}>W{g.wk}</Mono></div>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: '"IBM Plex Mono",monospace',
                fontWeight: 600,
                fontSize: 18,
                color: g.win ? 'var(--accent)' : '#fb7185',
                animation: g === live ? 'slideIn .25s ease' : 'none',
              }}
            >
              {g.us}–{g.them}
            </div>
            <div style={{ width: 28, textAlign: 'center', fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 16, color: g.win ? 'var(--accent)' : '#fb7185' }}>{g.win ? 'W' : 'L'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. RESULT ─────────────────────────────────────────────────
function GlobalStatsPanel({ season, globalStats }) {
  if (!globalStats || !globalStats.totalSeasons) {
    return (
      <Mono style={{ marginTop: 14, color: "var(--muted)", fontSize: 10 }}>
        Global stats unavailable — run via serve_app.py to track results across players.
      </Mono>
    );
  }

  const rows = globalStats.distribution || [];
  const mine = rows.find((row) => row.wins === season.wins);
  const topRows = rows.filter((row) => row.pct >= 0.1 || row.wins === season.wins).slice(0, 8);

  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <Mono style={{ color: "var(--muted)", fontSize: 10 }}>
        Global results · {globalStats.totalSeasons.toLocaleString()} seasons
      </Mono>
      {mine && (
        <div
          style={{
            fontFamily: '"Saira Condensed",sans-serif',
            fontWeight: 700,
            fontSize: 15,
            marginTop: 8,
            color: "var(--accent)",
          }}
        >
          Your {season.wins}–{season.losses} · {mine.pct.toFixed(1)}% of all players
        </div>
      )}
      <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
        {topRows.map((row) => {
          const highlight = row.wins === season.wins;
          return (
            <div
              key={row.wins}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 44px",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: highlight ? "var(--txt)" : "var(--muted)",
              }}
            >
              <span style={{ fontFamily: '"IBM Plex Mono",monospace' }}>
                {row.wins}-{row.losses}
              </span>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, row.pct)}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: highlight ? "var(--accent)" : "rgba(126,143,163,0.55)",
                  }}
                />
              </div>
              <span style={{ fontFamily: '"IBM Plex Mono",monospace', textAlign: "right" }}>
                {row.pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultScreen({ season, onRestart }) {
  const { wins, losses, pf, pa, diff, perfect } = season;
  const [globalStats, setGlobalStats] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const stats =
        typeof recordSeasonResult === "function"
          ? await recordSeasonResult(season)
          : typeof fetchGlobalStats === "function"
            ? await fetchGlobalStats()
            : null;
      if (!cancelled) setGlobalStats(stats);
    })();
    return () => {
      cancelled = true;
    };
  }, [season.recordId]);

  return (
    <div style={sx.page}>
      {perfect && <Confetti />}
      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <Mono style={{ color: perfect ? 'var(--accent)' : 'var(--muted)' }}>{perfect ? 'Perfection Achieved' : 'Final · Regular Season'}</Mono>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 112, lineHeight: 0.85, marginTop: 5, color: perfect ? 'var(--accent)' : 'var(--txt)', textShadow: perfect ? '0 0 40px var(--accent-glow)' : 'none' }}>{wins}<span style={{ color: 'var(--muted)', fontWeight: 700 }}>–</span>{losses}</div>
        <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 600, fontSize: 19, marginTop: 7, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt)' }}>{perfect ? '🏆 17–0 · Immortal' : (season.message || verdict(wins))}</div>
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
          <div key={g.wk} style={{ aspectRatio: '1', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: g.win ? 'rgba(255,122,61,0.14)' : 'rgba(251,113,133,0.12)', border: `1px solid ${g.win ? 'rgba(255,122,61,0.45)' : 'rgba(251,113,133,0.4)'}` }}>
            <div style={{ fontFamily: '"Saira Condensed",sans-serif', fontWeight: 800, fontSize: 18, color: g.win ? 'var(--accent)' : '#fb7185', lineHeight: 1 }}>{g.win ? 'W' : 'L'}</div>
            <div style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{g.us}-{g.them}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <ShareScorePanel season={season} />
      <GlobalStatsPanel season={season} globalStats={globalStats} />
      {season.strengthPercentile != null && (
        <Mono style={{ marginTop: 10, color: 'var(--muted)', fontSize: 10 }}>
          DEBUG · weighted {season.rosterStrength} ({season.strengthPercentile}th pct) · avg OVR {season.averageOvr} · strength range ~550–1080
        </Mono>
      )}
      <Btn primary onClick={onRestart} style={{ marginTop: 12 }}>Run It Back →</Btn>
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
function ShareBtn({ children, onClick, style, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        flex: 1,
        border: '1.5px solid var(--line)',
        borderRadius: 12,
        padding: '12px 10px',
        cursor: 'pointer',
        background: 'var(--surface)',
        color: 'var(--txt)',
        fontFamily: '"Saira Condensed",sans-serif',
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform .1s ease, border-color .1s ease',
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  );
}

function WhatsAppIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ShareScorePanel({ season }) {
  const [status, setStatus] = useState(null);
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (!status) return undefined;
    const t = setTimeout(() => setStatus(null), 2800);
    return () => clearTimeout(t);
  }, [status]);

  async function runShare(fn) {
    const res = await fn(season);
    if (res?.cancelled) return;
    if (res?.ok) setStatus(res.method === 'copy' ? 'Copied to clipboard!' : 'Shared!');
    else setStatus('Could not share — try Copy');
  }

  return (
    <div style={{ marginTop: 14 }}>
      <Mono style={{ marginBottom: 8 }}>Share your score</Mono>
      <Btn
        primary
        onClick={() => runShare(canNative ? shareScoreNative : copyShareText)}
        style={{ marginBottom: 8 }}
      >
        {canNative ? 'Share →' : 'Copy score →'}
      </Btn>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <ShareBtn onClick={() => shareToX(season)} label="Share on X">𝕏</ShareBtn>
        <ShareBtn
          onClick={() => shareToWhatsApp(season)}
          label="Share on WhatsApp"
          style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
        >
          <WhatsAppIcon size={24} />
        </ShareBtn>
        <ShareBtn
          onClick={() => shareToFacebook(season)}
          label="Share on Facebook"
          style={{ background: '#1877F2', borderColor: '#1877F2', color: '#fff' }}
        >
          <FacebookIcon size={24} />
        </ShareBtn>
        <ShareBtn onClick={() => runShare(copyShareText)} label="Copy score">Copy</ShareBtn>
      </div>
      {status && (
        <Mono style={{ marginTop: 10, color: 'var(--accent)', textAlign: 'center', fontSize: 10 }}>
          {status}
        </Mono>
      )}
    </div>
  );
}

function Confetti() {
  const cols = ['#ff7a3d', '#38bdf8', '#fbbf24', '#fff'];
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 30 }}>
    {Array.from({ length: 36 }, (_, i) => i).map(i => (
      <div key={i} style={{ position: 'absolute', top: -20, left: `${(i * 37) % 100}%`, width: 7, height: 11, background: cols[i % cols.length], opacity: 0.9, borderRadius: 1, animation: `fall ${1.6 + (i % 5) * 0.3}s linear ${(i % 7) * 0.12}s infinite` }} />
    ))}
  </div>;
}

const sx = {
  page: { flex: 1, minHeight: 0, boxSizing: 'border-box', padding: '28px clamp(16px, 4vw, 32px) 32px', display: 'flex', flexDirection: 'column', overflow: 'auto' },
  draftStickyHead: {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    background: 'var(--bg)',
    paddingBottom: 4,
    boxShadow: '0 10px 18px -14px rgba(0,0,0,0.85)',
  },
  draftPickPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    marginTop: 16,
    gap: 14,
  },
  draftPlayerScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingRight: 4,
    marginRight: -4,
  },
  statCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '11px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  banner: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--surface)', border: '1.5px solid', borderRadius: 14 },
  odds: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 15px', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--line)' },
  game: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: 'var(--surface)', border: '1px solid', borderRadius: 10 },
  skel: { height: 62, borderRadius: 13, marginBottom: 8, background: 'linear-gradient(90deg,#131c26,#1a2532,#131c26)', backgroundSize: '200% 100%', animation: 'shimmer 1.1s linear infinite' },
};

Object.assign(window, { IntroScreen, DraftScreen, SquadScreen, SimScreen, ResultScreen });
