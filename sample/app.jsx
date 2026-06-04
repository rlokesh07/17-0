// app.jsx — state machine, theme vars, tweaks. Mounts into #root.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#22d3a8",
  "difficulty": "Pro",
  "variance": 7
}/*EDITMODE-END*/;

const DIFF_ADJ = { Easy: -8, Pro: 0, Brutal: 8 };
const GLOW = { "#22d3a8": "rgba(34,211,168,0.45)", "#38bdf8": "rgba(56,189,248,0.45)", "#fbbf24": "rgba(251,191,36,0.4)", "#a78bfa": "rgba(167,139,250,0.45)" };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [stage, setStage] = React.useState('intro'); // intro|draft|squad|sim|result
  const [squad, setSquad] = React.useState(null);
  const [season, setSeason] = React.useState(null);

  const opts = { oppAdj: DIFF_ADJ[t.difficulty] ?? 0, variance: t.variance };

  function startDraft() { setSquad(null); setSeason(null); setStage('draft'); }
  function draftDone(s) { setSquad(s); setStage('squad'); }
  function runSim() { setSeason(simSeason(squad, opts)); setStage('sim'); }

  const themeVars = {
    '--bg': '#0c1219', '--surface': '#131c26', '--line': '#1f2b38',
    '--txt': '#eef4fb', '--muted': '#7e8fa3',
    '--accent': t.accent, '--accent-glow': GLOW[t.accent] || 'rgba(34,211,168,0.45)',
  };

  let screen;
  if (stage === 'intro') screen = <IntroScreen onStart={startDraft} />;
  else if (stage === 'draft') screen = <DraftScreen key="draft" onDone={draftDone} accent={t.accent} />;
  else if (stage === 'squad') screen = <SquadScreen squad={squad} opts={opts} onSim={runSim} onRestart={startDraft} />;
  else if (stage === 'sim') screen = <SimScreen key={season.games[0].us + '-' + season.pf} season={season} onDone={() => setStage('result')} />;
  else if (stage === 'result') screen = <ResultScreen season={season} onRestart={startDraft} />;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 16 }}>
      <IOSDevice dark>
        <div style={{ ...themeVars, position: 'absolute', inset: 0, background: 'var(--bg)', color: 'var(--txt)' }}>
          {screen}
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Look" />
        <TweakColor label="Accent" value={t.accent}
          options={['#22d3a8', '#38bdf8', '#fbbf24', '#a78bfa']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Season Sim" />
        <TweakRadio label="Schedule" value={t.difficulty}
          options={['Easy', 'Pro', 'Brutal']}
          onChange={v => setTweak('difficulty', v)} />
        <TweakSlider label="Game variance" value={t.variance} min={2} max={14} step={1} unit=" pts"
          onChange={v => setTweak('variance', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
