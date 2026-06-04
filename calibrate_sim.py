#!/usr/bin/env python3
"""Monte Carlo check for season-sim calibration (11-pick roster game)."""

from __future__ import annotations

import json
import random
from pathlib import Path

# Mirror season-sim.js
ROSTER_WEIGHTS = {
    "QB": 1.4,
    "BEST_WR": 1.25,
    "OL_RB": 1.12,
    "DEF_HIGH": 1.08,
    "DEF_LOW": 0.8,
    "SKILL_MID": 1.0,
    "SKILL_LOW": 0.9,
    "K": 0.55,
}

FLOOR, CEIL = 550, 1080

# Target aggregate win mix from simulate_playthroughs.py (max-OVR draft, no skip).
PLAYTHROUGH_WIN_TARGETS: dict[int, float] = {
    17: 0.025,
    16: 0.20,
    15: 0.20,
    14: 0.20,
    13: 0.10,
    12: 0.08,
    11: 0.07,
    10: 0.05,
    9: 0.04,
    8: 0.02,
    7: 0.01,
    6: 0.003,
    5: 0.002,
}

WEAK_ROSTER_ANCHOR = {
    5: 1.0,
    6: 0.65,
    7: 0.38,
    8: 0.20,
    9: 0.10,
    10: 0.05,
    11: 0.025,
    12: 0.012,
    13: 0.005,
    14: 0.002,
    15: 0.0008,
    16: 0.0002,
    17: 0.00003,
}

WEAK_ROSTER_MID = {
    5: 1.0,
    6: 0.40,
    7: 0.18,
    8: 0.08,
    9: 0.035,
    10: 0.015,
    11: 0.007,
    12: 0.003,
    13: 0.0012,
    14: 0.0005,
    15: 0.00015,
    16: 0.00005,
    17: 0.00001,
}

# Weakest auto-drafted roster (~839 strength) through best build (~1067).
PLAYTHROUGH_LOW = {
    5: 1.0,
    6: 0.985,
    7: 0.965,
    8: 0.935,
    9: 0.865,
    10: 0.755,
    11: 0.625,
    12: 0.485,
    13: 0.305,
    14: 0.185,
    15: 0.085,
    16: 0.032,
    17: 0.006,
}


def playthrough_target_cumulative() -> dict[int, float]:
    total = 0.0
    cumulative: dict[int, float] = {}
    for wins in range(17, 4, -1):
        total += PLAYTHROUGH_WIN_TARGETS[wins]
        cumulative[wins] = total
    cumulative[5] = 1.0
    return cumulative


def _enforce_monotone(cumulative: dict[int, float]) -> dict[int, float]:
    out = dict(cumulative)
    out[5] = 1.0
    for wins in range(16, 4, -1):
        out[wins] = max(out[wins], out[wins + 1])
    return out


def _lerp_cumulative(
    left: dict[int, float], right: dict[int, float], frac: float
) -> dict[int, float]:
    return _enforce_monotone(
        {wins: left[wins] + (right[wins] - left[wins]) * frac for wins in left}
    )


def build_playthrough_anchors() -> list[tuple[float, dict[int, float]]]:
    """P(>=N wins) anchors tuned to PLAYTHROUGH_WIN_TARGETS + strength scaling."""
    target = playthrough_target_cumulative()
    mid = _enforce_monotone(
        {
            **target,
            16: min(1.0, target[16] * 1.04),
            15: min(1.0, target[15] * 1.08),
            14: min(1.0, target[14] * 1.06),
            13: min(1.0, target[13] * 1.06),
        }
    )
    high = _enforce_monotone(
        {
            **target,
            17: min(1.0, target[17] * 1.32),
            16: min(1.0, target[16] * 1.38),
            15: min(1.0, target[15] * 1.08),
            14: min(1.0, target[14] * 1.05),
            13: min(1.0, target[13] * 1.03),
        }
    )
    top = _enforce_monotone({wins: min(1.0, high[wins] * 1.015) for wins in high})

    return [
        (0.0, WEAK_ROSTER_ANCHOR),
        (0.13, WEAK_ROSTER_MID),
        (0.545, PLAYTHROUGH_LOW),
        (0.757, _lerp_cumulative(PLAYTHROUGH_LOW, mid, 0.35)),
        (0.834, mid),
        (0.895, _lerp_cumulative(mid, high, 0.55)),
        (0.976, high),
        (1.0, top),
    ]


ANCHORS = build_playthrough_anchors()

SLOT_KEYS = [
    "QB",
    "RB",
    "WR1",
    "WR2",
    "WR3",
    "TE",
    "OL",
    "DP1",
    "DP2",
    "DP3",
    "K",
]

INDEX_SLOT_HINTS = [
    "QB",
    "RB",
    "WR1",
    "WR2",
    "WR3",
    "TE",
    "OL",
    "Defensive Player 1",
    "Defensive Player 2",
    "Defensive Player 3",
    "K",
]


def player_ovr(player: dict) -> float:
    return float(player.get("ovr") or player.get("score") or 0)


def roster_strength(squad: dict[str, dict]) -> float:
    def ovr(key: str) -> float:
        return player_ovr(squad[key]) if key in squad else 0.0

    total = 0.0
    if "QB" in squad:
        total += ovr("QB") * ROSTER_WEIGHTS["QB"]

    wrs = sorted(
        [{"key": k, "ovr": ovr(k)} for k in ("WR1", "WR2", "WR3") if k in squad],
        key=lambda x: -x["ovr"],
    )
    if wrs:
        total += wrs[0]["ovr"] * ROSTER_WEIGHTS["BEST_WR"]

    if "OL" in squad:
        total += ovr("OL") * ROSTER_WEIGHTS["OL_RB"]
    if "RB" in squad:
        total += ovr("RB") * ROSTER_WEIGHTS["OL_RB"]

    defs = sorted(
        [{"key": k, "ovr": ovr(k)} for k in ("DP1", "DP2", "DP3") if k in squad],
        key=lambda x: -x["ovr"],
    )
    for i, d in enumerate(defs):
        w = ROSTER_WEIGHTS["DEF_HIGH"] if i < 2 else ROSTER_WEIGHTS["DEF_LOW"]
        total += d["ovr"] * w

    remaining = wrs[1:]
    if "TE" in squad:
        remaining.append({"key": "TE", "ovr": ovr("TE")})
    remaining.sort(key=lambda x: -x["ovr"])
    if remaining:
        total += remaining[0]["ovr"] * ROSTER_WEIGHTS["SKILL_MID"]
    for p in remaining[1:]:
        total += p["ovr"] * ROSTER_WEIGHTS["SKILL_LOW"]

    if "K" in squad:
        total += ovr("K") * ROSTER_WEIGHTS["K"]

    return round(total, 1)


def strength_norm(score: float) -> float:
    return max(0.0, min(1.0, (score - FLOOR) / (CEIL - FLOOR)))


def interp_at_least(t: float, n: int) -> float:
    if t <= ANCHORS[0][0]:
        return ANCHORS[0][1].get(n, 0)
    for i in range(1, len(ANCHORS)):
        t0, a0 = ANCHORS[i - 1]
        t1, a1 = ANCHORS[i]
        if t <= t1:
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0
            v0 = a0.get(n, 0)
            v1 = a1.get(n, v0)
            return v0 + (v1 - v0) * f
    return ANCHORS[-1][1].get(n, 0)


def sample_wins(score: float) -> int:
    t = strength_norm(score)
    r = random.random()
    for wins in range(17, 4, -1):
        if r < interp_at_least(t, wins):
            return wins
    return 5


def lineup_to_squad(lineup: list[dict]) -> dict[str, dict]:
    squad: dict[str, dict] = {}
    for slot_key, hint in zip(SLOT_KEYS, INDEX_SLOT_HINTS):
        for p in lineup:
            if p.get("slotHint") == hint or (
                slot_key.startswith("WR")
                and p.get("displayRole") == slot_key
            ):
                squad[slot_key] = p
                break
    return squad


def sim_game_roster_strengths(index: dict, n: int) -> list[float]:
    all_lineups = [
        (y, t, lu)
        for y, teams in index["players"].items()
        for t, lu in teams.items()
        if lu
    ]

    strengths: list[float] = []
    for _ in range(n):
        random.shuffle(all_lineups)
        squad: dict[str, dict] = {}
        for _y, _t, lu in all_lineups:
            if len(squad) == len(SLOT_KEYS):
                break
            for slot_key, hint in zip(SLOT_KEYS, INDEX_SLOT_HINTS):
                if slot_key in squad:
                    continue
                cands = [p for p in lu if p.get("slotHint") == hint]
                if not cands:
                    continue
                squad[slot_key] = max(cands, key=player_ovr)
                break
        if len(squad) == len(SLOT_KEYS):
            strengths.append(roster_strength(squad))
    return strengths


def sim_pick_max_roster_strengths(index: dict, n: int) -> list[float]:
    """Model actual UI behavior: each spin, take the highest OVR on that team-year list."""
    lineups = [
        lu
        for teams in index["players"].values()
        for lu in teams.values()
        if lu
    ]
    strengths: list[float] = []
    for _ in range(n):
        chosen = random.sample(lineups, len(SLOT_KEYS))
        ovrs = sorted((max(player_ovr(p) for p in lu) for lu in chosen), reverse=True)
        squad = {
            slot: {"ovr": ovrs[i]}
            for i, slot in enumerate(SLOT_KEYS)
        }
        strengths.append(roster_strength(squad))
    return strengths


def main() -> None:
    random.seed(42)
    index_path = Path(__file__).parent / "data" / "spinner-index.json"
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)

    strengths = sim_pick_max_roster_strengths(index, 5000)
    strengths.sort()
    p10 = strengths[int(len(strengths) * 0.1)]
    p90 = strengths[int(len(strengths) * 0.9)]
    print("Pick-highest-OVR draft model (matches UI):")
    print(
        f"  weighted: min={strengths[0]:.1f} p10={p10:.1f} "
        f"mean={sum(strengths)/len(strengths):.1f} p90={p90:.1f} max={strengths[-1]:.1f}"
    )
    print(f"  Suggested FLOOR={FLOOR} CEIL={CEIL}")

    print("\n=== Win distribution at strength checkpoints ===")
    checkpoints = [
        ("weak (~55 OVR)", 616.8),
        ("50th pct (~818)", 817.7),
        ("top-pick median (~1038)", strengths[len(strengths) // 2]),
        ("top-pick p95", strengths[int(len(strengths) * 0.95)]),
        ("best build", strengths[-1]),
    ]
    for label, s in checkpoints:
        n = 20_000
        dist = {w: sum(1 for _ in range(n) if sample_wins(s) == w) / n for w in range(5, 18)}
        top = " ".join(f"{w}-{17-w}={dist[w]*100:.1f}%" for w in [13, 14, 15, 16, 17])
        print(f"  {label} {s:.0f} (t={strength_norm(s):.2f}): 5-12={dist[5]*100:.1f}% {top}")

    print("\n=== Simulated top-pick game rosters (5000 runs) ===")
    wins_hist = {w: 0 for w in range(5, 18)}
    for s in strengths:
        wins_hist[sample_wins(s)] += 1
    n = len(strengths)
    for w in range(17, 4, -1):
        pct = wins_hist[w] / n * 100
        if pct >= 0.1:
            print(f"  {w}-{17-w}: {pct:.1f}%")


if __name__ == "__main__":
    main()
