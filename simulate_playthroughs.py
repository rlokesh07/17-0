#!/usr/bin/env python3
"""Simulate full 11-pick drafts + season sim (matches UI: max OVR per spin)."""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

from calibrate_sim import (
    CEIL,
    FLOOR,
    INDEX_SLOT_HINTS,
    PLAYTHROUGH_WIN_TARGETS,
    ROSTER_WEIGHTS,
    SLOT_KEYS,
    player_ovr,
    roster_strength,
    sample_wins,
    strength_norm,
)

DEF_POS = frozenset(
    {"DE", "DT", "DL", "NT", "LB", "OLB", "ILB", "MLB", "CB", "DB", "S", "FS", "SS", "SAF"}
)

SLOT_HINT_MAP = {
    "Defensive Player 1": "DP1",
    "Defensive Player 2": "DP2",
    "Defensive Player 3": "DP3",
}

GROUP_SLOTS = {
    "QB": ["QB"],
    "RB": ["RB"],
    "WR": ["WR1", "WR2", "WR3"],
    "TE": ["TE"],
    "OL": ["OL"],
    "DEF": ["DP1", "DP2", "DP3"],
    "K": ["K"],
}


def slot_hint_to_group(slot_hint: str | None, position: str | None) -> str | None:
    hint = (slot_hint or "").strip()
    if hint == "QB":
        return "QB"
    if hint == "RB":
        return "RB"
    if hint.startswith("WR"):
        return "WR"
    if hint == "TE":
        return "TE"
    if hint == "OL":
        return "OL"
    if hint.startswith("Defensive"):
        return "DEF"
    if hint == "K":
        return "K"
    p = (position or "").upper()
    if p == "QB":
        return "QB"
    if p in {"RB", "HB", "FB"}:
        return "RB"
    if p == "WR" or p.startswith("WR"):
        return "WR"
    if p == "TE":
        return "TE"
    if p == "OL":
        return "OL"
    if p in DEF_POS:
        return "DEF"
    if p == "K":
        return "K"
    return None


def open_slot_for_group(squad: dict, group: str | None) -> str | None:
    if not group:
        return None
    for key in GROUP_SLOTS.get(group, []):
        if key not in squad:
            return key
    return None


def pick_slot_key(squad: dict, player: dict) -> str | None:
    hint = player.get("slotHint") or player.get("displayRole")
    mapped = SLOT_HINT_MAP.get(hint, hint)
    if mapped in SLOT_KEYS and mapped not in squad:
        return mapped
    group = slot_hint_to_group(hint, player.get("position"))
    return open_slot_for_group(squad, group)


def shortlist_players(lineup: list[dict]) -> list[dict]:
    out = []
    for p in lineup:
        if p.get("aggregate"):
            group = "OL"
        else:
            group = slot_hint_to_group(p.get("slotHint"), p.get("position"))
        if not group:
            continue
        out.append({**p, "group": group, "ovr": player_ovr(p)})
    out.sort(key=lambda x: -x["ovr"])
    return out


def best_pick(squad: dict, lineup: list[dict]) -> dict | None:
    eligible = [p for p in shortlist_players(lineup) if pick_slot_key(squad, p)]
    if not eligible:
        return None
    return max(eligible, key=lambda p: p["ovr"])


def build_valid_picks(index: dict) -> list[tuple[int, str, list[dict]]]:
    picks = []
    for year_str, teams in index["players"].items():
        year = int(year_str)
        for team, lineup in teams.items():
            if lineup and shortlist_players(lineup):
                picks.append((year, team, lineup))
    return picks


def draft_squad(
    valid_picks: list[tuple[int, str, list[dict]]],
    *,
    use_skip: bool,
    skip_ovr_threshold: float = 88,
) -> dict[str, dict] | None:
    squad: dict[str, dict] = {}
    skips_left = 1 if use_skip else 0
    spins = 0
    max_spins = 40

    while len(squad) < len(SLOT_KEYS) and spins < max_spins:
        spins += 1
        year, team, lineup = random.choice(valid_picks)
        pick = best_pick(squad, lineup)
        if pick is None:
            continue

        if (
            use_skip
            and skips_left > 0
            and pick["ovr"] < skip_ovr_threshold
            and len(squad) < len(SLOT_KEYS) - 2
        ):
            skips_left -= 1
            continue

        slot = pick_slot_key(squad, pick)
        if not slot:
            continue
        squad[slot] = {**pick, "fromTeam": team, "fromYear": year}

    return squad if len(squad) == len(SLOT_KEYS) else None


def play_one(valid_picks: list, *, use_skip: bool = False) -> dict | None:
    squad = draft_squad(valid_picks, use_skip=use_skip)
    if not squad:
        return None
    strength = roster_strength(squad)
    wins = sample_wins(strength)
    avg_ovr = round(sum(player_ovr(squad[k]) for k in SLOT_KEYS) / len(SLOT_KEYS), 1)
    return {
        "wins": wins,
        "strength": strength,
        "avg_ovr": avg_ovr,
        "squad": squad,
    }


def run_monte_carlo(n: int = 10_000, *, use_skip: bool = False, seed: int = 42) -> None:
    random.seed(seed)
    index_path = Path(__file__).parent / "data" / "spinner-index.json"
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)

    valid_picks = build_valid_picks(index)
    print(f"Valid team-years: {len(valid_picks)}")
    print(f"Strategy: each spin → pick highest OVR with an open slot")
    print(f"Skip: {'once if best board OVR < 88' if use_skip else 'never'}")
    print(f"Runs: {n}\n")

    results = []
    failures = 0
    for _ in range(n):
        r = play_one(valid_picks, use_skip=use_skip)
        if r is None:
            failures += 1
            continue
        results.append(r)

    if failures:
        print(f"Warning: {failures} incomplete drafts dropped\n")

    wins_hist = Counter(r["wins"] for r in results)
    strengths = sorted(r["strength"] for r in results)
    avg_ovrs = sorted(r["avg_ovr"] for r in results)
    m = len(results)

    print("=== Win record distribution (target from PLAYTHROUGH_WIN_TARGETS) ===")
    for w in range(17, 4, -1):
        pct = wins_hist[w] / m * 100
        tgt = PLAYTHROUGH_WIN_TARGETS.get(w, 0) * 100
        bar = "█" * int(pct / 2)
        delta = pct - tgt
        sign = "+" if delta >= 0 else ""
        print(
            f"  {w:2d}-{17-w:<2d}  {wins_hist[w]:5d}  "
            f"({pct:5.1f}%  tgt {tgt:4.1f}%  {sign}{delta:.1f})  {bar}"
        )

    perfect = wins_hist[17] / m * 100
    playoff = sum(wins_hist[w] for w in range(13, 18)) / m * 100
    print(f"\n  17-0 perfect:     {perfect:.2f}% (target {PLAYTHROUGH_WIN_TARGETS[17]*100:.1f}%)")
    print(f"  13+ wins (13-4+): {playoff:.1f}% (target {sum(PLAYTHROUGH_WIN_TARGETS[w] for w in range(13,18))*100:.1f}%)")
    print(f"  10-7 or worse:    {sum(wins_hist[w] for w in range(9, 11)) / m * 100:.1f}%")

    def pctile(arr: list[float], p: float) -> float:
        return arr[int((len(arr) - 1) * p)]

    print("\n=== Roster strength (weighted OVR sim input) ===")
    print(
        f"  min={strengths[0]:.1f}  p10={pctile(strengths, 0.10):.1f}  "
        f"p25={pctile(strengths, 0.25):.1f}  median={pctile(strengths, 0.50):.1f}  "
        f"p75={pctile(strengths, 0.75):.1f}  p90={pctile(strengths, 0.90):.1f}  max={strengths[-1]:.1f}"
    )
    print(f"  mean={sum(strengths)/m:.1f}  (calibrated floor={FLOOR}, ceil={CEIL})")

    print("\n=== Average OVR across 11 starters ===")
    print(
        f"  min={avg_ovrs[0]:.1f}  median={pctile(avg_ovrs, 0.50):.1f}  "
        f"mean={sum(avg_ovrs)/m:.1f}  max={avg_ovrs[-1]:.1f}"
    )

    print("\n=== Wins by strength band ===")
    bands = [(1012, 1025), (1025, 1035), (1035, 1045), (1045, 1055), (1055, 1080)]
    for lo, hi in bands:
        sub = [r for r in results if lo <= r["strength"] < hi]
        if not sub:
            continue
        wh = Counter(x["wins"] for x in sub)
        mean_w = sum(x["wins"] for x in sub) / len(sub)
        p17 = wh[17] / len(sub) * 100
        print(
            f"  {lo:.0f}-{hi:.0f}: n={len(sub):4d}  avg wins={mean_w:.2f}  "
            f"17-0={p17:.1f}%  16-1={wh[16]/len(sub)*100:.1f}%  15-2={wh[15]/len(sub)*100:.1f}%"
        )


if __name__ == "__main__":
    run_monte_carlo(10_000, use_skip=False)
    print("\n" + "=" * 60 + "\n")
    run_monte_carlo(10_000, use_skip=True, seed=43)
