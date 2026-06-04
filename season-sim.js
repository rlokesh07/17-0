/**
 * 17-game season simulator for the spinner roster game.
 *
 * Roster strength is a weighted sum of player OVRs (see ROSTER_WEIGHTS).
 * Outcomes are sampled from calibrated win-total distributions, then shuffled
 * into a week-by-week log.
 */
(function (global) {
  const GAMES = 17;
  const SIM_DIFFICULTY = "balanced";

  /** Weight multipliers by role tier (highest → lowest importance). */
  const ROSTER_WEIGHTS = {
    QB: 1.4,
    BEST_WR: 1.25,
    OL_RB: 1.12,
    DEF_HIGH: 1.08,
    DEF_LOW: 0.8,
    SKILL_MID: 1.0,
    SKILL_LOW: 0.9,
    K: 0.55,
  };

  /** Weakest intentional builds (~55 avg OVR) through best top-pick rosters. */
  const STRENGTH_FLOOR = 550;
  const STRENGTH_CEILING = 1080;

  /** P(>=N wins) anchors — aggregate tuned to simulate_playthroughs.py targets. */
  const WIN_TOTAL_ANCHORS = [
    {
      t: 0.0,
      atLeast: {
        5: 1, 6: 0.65, 7: 0.38, 8: 0.2, 9: 0.1, 10: 0.05, 11: 0.025, 12: 0.012, 13: 0.005,
        14: 0.002, 15: 0.0008, 16: 0.0002, 17: 0.00003,
      },
    },
    {
      t: 0.13,
      atLeast: {
        5: 1, 6: 0.4, 7: 0.18, 8: 0.08, 9: 0.035, 10: 0.015, 11: 0.007, 12: 0.003, 13: 0.0012,
        14: 0.0005, 15: 0.00015, 16: 0.00005, 17: 0.00001,
      },
    },
    {
      t: 0.545,
      atLeast: {
        5: 1, 6: 0.985, 7: 0.965, 8: 0.935, 9: 0.865, 10: 0.755, 11: 0.625, 12: 0.485,
        13: 0.305, 14: 0.185, 15: 0.085, 16: 0.032, 17: 0.006,
      },
    },
    {
      t: 0.757,
      atLeast: {
        5: 1, 6: 0.98955, 7: 0.9755, 8: 0.9525, 9: 0.9, 10: 0.8145, 11: 0.7125, 12: 0.597,
        13: 0.467225, 14: 0.352125, 15: 0.2159, 16: 0.1027, 17: 0.01265,
      },
    },
    {
      t: 0.834,
      atLeast: {
        5: 1, 6: 0.998, 7: 0.995, 8: 0.985, 9: 0.965, 10: 0.925, 11: 0.875, 12: 0.805,
        13: 0.7685, 14: 0.6625, 15: 0.459, 16: 0.234, 17: 0.025,
      },
    },
    {
      t: 0.895,
      atLeast: {
        5: 1, 6: 0.998, 7: 0.995, 8: 0.985, 9: 0.965, 10: 0.925, 11: 0.875, 12: 0.805,
        13: 0.756537, 14: 0.659062, 15: 0.459, 16: 0.276075, 17: 0.0294,
      },
    },
    {
      t: 0.976,
      atLeast: {
        5: 1, 6: 0.998, 7: 0.995, 8: 0.985, 9: 0.965, 10: 0.925, 11: 0.875, 12: 0.805,
        13: 0.74675, 14: 0.65625, 15: 0.459, 16: 0.3105, 17: 0.033,
      },
    },
    {
      t: 1.0,
      atLeast: {
        5: 1, 6: 1, 7: 1, 8: 0.999775, 9: 0.979475, 10: 0.938875, 11: 0.888125, 12: 0.817075,
        13: 0.757951, 14: 0.666094, 15: 0.465885, 16: 0.315157, 17: 0.033495,
      },
    },
  ];

  /** Empirical weighted-strength quantiles (random shortlist picks; top end capped at best builds). */
  const STRENGTH_PERCENTILE_POINTS = [
    { pct: 5, strength: 737.5 },
    { pct: 10, strength: 754.7 },
    { pct: 25, strength: 784.7 },
    { pct: 50, strength: 817.7 },
    { pct: 75, strength: 850.7 },
    { pct: 90, strength: 880.1 },
    { pct: 95, strength: 896.9 },
    { pct: 99, strength: 928.6 },
    { pct: 100, strength: 1080 },
  ];

  const ROSTER_SLOT_KEYS = [
    "QB", "RB", "WR1", "WR2", "WR3", "TE", "OL", "DP1", "DP2", "DP3", "K",
  ];

  const TIER_LABELS = ["vs weaker opponent", "standard week", "vs stronger opponent"];

  function strengthNorm(totalScore) {
    return Math.max(0, Math.min(1, (totalScore - STRENGTH_FLOOR) / (STRENGTH_CEILING - STRENGTH_FLOOR)));
  }

  function lerp(a, b, x) {
    return a + (b - a) * x;
  }

  function interpolateAtLeast(t, targetWins) {
    const anchors = WIN_TOTAL_ANCHORS;
    if (t <= anchors[0].t) return anchors[0].atLeast[targetWins] ?? 0;
    for (let i = 1; i < anchors.length; i++) {
      const left = anchors[i - 1];
      const right = anchors[i];
      if (t <= right.t) {
        const span = right.t - left.t || 1;
        const frac = (t - left.t) / span;
        const lv = left.atLeast[targetWins] ?? 0;
        const rv = right.atLeast[targetWins] ?? lv;
        return lerp(lv, rv, frac);
      }
    }
    const last = anchors[anchors.length - 1].atLeast;
    return last[targetWins] ?? 0;
  }

  /** Sample final win total from calibrated cumulative distribution. */
  function sampleSeasonWins(totalScore) {
    const t = strengthNorm(totalScore);
    const r = Math.random();

    const pAtLeast = (n) => interpolateAtLeast(t, n);

    for (let wins = 17; wins >= 5; wins -= 1) {
      if (r < pAtLeast(wins)) return wins;
    }
    return 5;
  }

  function shuffledWeekTiers() {
    const tiers = [0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1];
    for (let i = tiers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
    }
    return tiers;
  }

  function buildWeekLog(wins) {
    const losses = GAMES - wins;
    const results = Array(GAMES).fill(false);
    for (let i = 0; i < wins; i++) results[i] = true;
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    const tiers = shuffledWeekTiers();
    const t = strengthNorm(wins * 120 + 900);
    const baseProb = 50 + t * 22;

    return results.map((win, idx) => {
      const tier = tiers[idx];
      const tierLabel = TIER_LABELS[tier];
      const winProb = win
        ? Math.round(baseProb + (tier === 0 ? 8 : tier === 2 ? -8 : 0) + (Math.random() - 0.5) * 6)
        : Math.round(baseProb + (tier === 2 ? 6 : tier === 0 ? -6 : 0) + (Math.random() - 0.5) * 6);
      return {
        week: idx + 1,
        win,
        winProb: Math.max(8, Math.min(92, winProb)),
        tier,
        tierLabel,
      };
    });
  }

  function simulateSeason(totalScore, difficultyKey) {
    const _ = difficultyKey || SIM_DIFFICULTY;
    const wins = sampleSeasonWins(totalScore);
    const games = buildWeekLog(wins);
    const probSum = games.reduce((s, g) => s + g.winProb, 0);

    return {
      wins,
      losses: GAMES - wins,
      games,
      avgWinProb: Math.round((probSum / GAMES) * 10) / 10,
      rosterStrength: totalScore,
      difficulty: SIM_DIFFICULTY,
      strengthNorm: Math.round(strengthNorm(totalScore) * 1000) / 1000,
    };
  }

  function estimatePerfectSeasonOdds(totalScore, difficultyKey, trials = 3000) {
    if (totalScore <= 0) return 0;
    const _ = difficultyKey || SIM_DIFFICULTY;
    let perfect = 0;
    for (let i = 0; i < trials; i++) {
      if (sampleSeasonWins(totalScore) === GAMES) perfect += 1;
    }
    return perfect / trials;
  }

  function playerOvr(player) {
    if (!player) return 0;
    const ovr = Number(player.ovr);
    return Number.isFinite(ovr) ? ovr : 0;
  }

  function rosterAverageOvr(squad) {
    if (!squad || typeof squad !== "object") return 0;
    let sum = 0;
    let count = 0;
    for (const key of ROSTER_SLOT_KEYS) {
      if (!squad[key]) continue;
      sum += playerOvr(squad[key]);
      count += 1;
    }
    return count ? Math.round((sum / count) * 10) / 10 : 0;
  }

  /**
   * Weighted roster strength from squad slots (QB, WR1–3, RB, TE, OL, DP1–3, K).
   * Rank within position groups each sim — weights follow tier, not slot label.
   */
  function rosterStrength(squad) {
    if (!squad || typeof squad !== "object") return 0;

    const ovr = (key) => playerOvr(squad[key]);
    let total = 0;

    if (squad.QB) total += ovr("QB") * ROSTER_WEIGHTS.QB;

    const wrKeys = ["WR1", "WR2", "WR3"];
    const wrs = wrKeys
      .filter((k) => squad[k])
      .map((k) => ({ key: k, ovr: ovr(k) }))
      .sort((a, b) => b.ovr - a.ovr);
    if (wrs[0]) total += wrs[0].ovr * ROSTER_WEIGHTS.BEST_WR;

    if (squad.OL) total += ovr("OL") * ROSTER_WEIGHTS.OL_RB;
    if (squad.RB) total += ovr("RB") * ROSTER_WEIGHTS.OL_RB;

    const defKeys = ["DP1", "DP2", "DP3"];
    const defs = defKeys
      .filter((k) => squad[k])
      .map((k) => ({ key: k, ovr: ovr(k) }))
      .sort((a, b) => b.ovr - a.ovr);
    for (let i = 0; i < defs.length; i++) {
      const w =
        i < 2 ? ROSTER_WEIGHTS.DEF_HIGH : ROSTER_WEIGHTS.DEF_LOW;
      total += defs[i].ovr * w;
    }

    const remainingSkill = wrs.slice(1);
    if (squad.TE) remainingSkill.push({ key: "TE", ovr: ovr("TE") });
    remainingSkill.sort((a, b) => b.ovr - a.ovr);
    if (remainingSkill[0]) total += remainingSkill[0].ovr * ROSTER_WEIGHTS.SKILL_MID;
    for (let i = 1; i < remainingSkill.length; i++) {
      total += remainingSkill[i].ovr * ROSTER_WEIGHTS.SKILL_LOW;
    }

    if (squad.K) total += ovr("K") * ROSTER_WEIGHTS.K;

    return Math.round(total * 10) / 10;
  }

  /** Map weighted roster strength to an empirical percentile (1–100). */
  function rosterStrengthPercentile(strength) {
    const pts = STRENGTH_PERCENTILE_POINTS;
    if (strength <= pts[0].strength) {
      const span = pts[0].strength - STRENGTH_FLOOR || 1;
      const frac = Math.max(0, (strength - STRENGTH_FLOOR) / span);
      return Math.max(1, Math.round(frac * pts[0].pct));
    }
    if (strength >= pts[pts.length - 1].strength) return 100;
    for (let i = 1; i < pts.length; i++) {
      const left = pts[i - 1];
      const right = pts[i];
      if (strength <= right.strength) {
        const span = right.strength - left.strength || 1;
        const frac = (strength - left.strength) / span;
        return Math.round(left.pct + frac * (right.pct - left.pct));
      }
    }
    return 100;
  }

  function formatRecord(wins, losses) {
    return `${wins}-${losses}`;
  }

  function outcomeMessage(wins, losses) {
    if (wins === 17) {
      return "17-0 — Perfect season! You actually did it.";
    }
    if (wins === 16) {
      return "16-1 — One bad Sunday. So close to perfection.";
    }
    if (wins === 15) {
      return "15-2 — Strong year. The dream stayed alive late.";
    }
    if (wins >= 13) {
      return `${formatRecord(wins, losses)} — Playoff team, but not immortal.`;
    }
    if (wins >= 10) {
      return `${formatRecord(wins, losses)} — Respectable, but 17-0 was never real.`;
    }
    return `${formatRecord(wins, losses)} — Rough year. Roster wasn't built for history.`;
  }

  global.SeasonSim = {
    GAMES,
    SIM_DIFFICULTY,
    ROSTER_WEIGHTS,
    STRENGTH_FLOOR,
    STRENGTH_CEILING,
    strengthNorm,
    simulateSeason,
    estimatePerfectSeasonOdds,
    rosterStrength,
    rosterAverageOvr,
    rosterStrengthPercentile,
    formatRecord,
    outcomeMessage,
  };
})(typeof window !== "undefined" ? window : globalThis);
