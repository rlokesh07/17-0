// app.jsx — state machine, theme vars. Full-page layout (no phone frame).

const ACCENT = "#ff7a3d";
const SIM_OPTS = {};

const THEME_VARS = {
  "--bg": "#0c1219",
  "--surface": "#131c26",
  "--line": "#1f2b38",
  "--txt": "#eef4fb",
  "--muted": "#7e8fa3",
  "--accent": ACCENT,
  "--accent-glow": "rgba(255, 122, 61, 0.45)",
};

function AppShell({ children }) {
  return (
    <div className="app-outer">
      <main className="app-shell" style={THEME_VARS}>
        {children}
      </main>
    </div>
  );
}

function App() {
  const shareIdFromPath =
    typeof getShareIdFromPath === "function" ? getShareIdFromPath() : null;
  const [routeShareId, setRouteShareId] = React.useState(shareIdFromPath);
  const [stage, setStage] = React.useState("intro");
  const [squad, setSquad] = React.useState(null);
  const [season, setSeason] = React.useState(null);
  const [dataReady, setDataReady] = React.useState(false);
  const [dataError, setDataError] = React.useState(null);

  React.useEffect(() => {
    const onPop = () => {
      setRouteShareId(
        typeof getShareIdFromPath === "function" ? getShareIdFromPath() : null
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  React.useEffect(() => {
    if (routeShareId) return;
    if (typeof loadSpinnerIndex !== "function") {
      setDataError("Player data module failed to load.");
      return;
    }
    loadSpinnerIndex()
      .then(() => {
        setDataReady(true);
        setDataError(null);
      })
      .catch(() => {
        setDataError(
          "Could not load data/spinner-index.json — run a local server and build_spinner_index.py."
        );
      });
  }, [routeShareId]);

  function startDraft() {
    if (routeShareId) {
      window.history.pushState({}, "", "/");
      setRouteShareId(null);
    }
    setSquad(null);
    setSeason(null);
    setStage("draft");
  }

  function draftDone(s) {
    if (!window.SeasonSim) {
      setDataError("Season simulator failed to load.");
      return;
    }
    setSquad(s);
    setSeason(simSeason(s, SIM_OPTS));
    setStage("sim");
  }

  if (routeShareId) {
    return (
      <AppShell>
        <SharePageScreen shareId={routeShareId} onPlay={startDraft} />
      </AppShell>
    );
  }

  let screen;
  if (stage === "intro") {
    screen = (
      <IntroScreen
        onStart={startDraft}
        dataReady={dataReady}
        dataError={dataError}
      />
    );
  } else if (stage === "draft") {
    screen = (
      <DraftScreen
        key="draft"
        onDone={draftDone}
        accent={ACCENT}
        dataError={dataError}
      />
    );
  } else if (stage === "sim") {
    screen = (
      <SimScreen
        key={String(season?.wins) + "-" + season?.rosterStrength}
        season={season}
        onDone={() => setStage("result")}
      />
    );
  } else if (stage === "result") {
    screen = <ResultScreen season={season} onRestart={startDraft} />;
  }

  return <AppShell>{screen}</AppShell>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
