#!/usr/bin/env python3
"""Simulate many full games: random spin + pick highest OVR (how a trying player drafts)."""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

from calibrate_sim import (
    ANCHORS,
    CEIL,
    FLOOR,
    INDEX_SLOT_HINTS,
    ROSTER_WEIGHTS,
    SLOT_KEYS,
    interp_at_least,
    roster_strength,
    sample_wins,
    strength_norm,
)

# Mirror js/teams.jsx names (index keys use full team name)
TEAM_NAMES = [
    "Cardinals", "Falcons", "Ravens", "Bills", "Panthers", "Bears", "Bengals", "Browns",
    "Cowboys", "Broncos", "Lions", "Packers", "Texans", "Colts", "Jaguars", "Chiefs",
    "Raiders", "Chargers", "Rams", "Dolphins", "Vikings", "Patriots", "Saints", "Giants",
    "Jets", "Eagles", "Steelers", "49ers", "Seahawks", "Buccaneers", "Titans", "Commanders",
]

SLOT_HINT_MAP = {
    "Defensive Player 1": "DP1",
    "Defensive Player 2": "DP2",
    "Defensive Player 3": "DP3",
}

DEF_POS = {
    "DE", "DT", "DL", "NT", "LB", "OLB", "ILB", "MLB", "CB", "DB", "S", "FS", "SS", "SAF",
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
    if p in DEF_POS or p.startswith("DEF"):
        return "DEF"
    if p == "K":
        return "K"
    return None


GROUP_SLOTS = {
    "QB": ["QB"],
    "RB": ["RB"],
    "WR": ["WR1", "WR2", "WR3"],
    "TE": ["TE"],
    "OL": ["OL"],
    "DEF": ["DP1", "DP2", "DP3"],
    "K": ["K"],
}


def open_slot_for_group(squad: dict, group: str) -> str | None:
    for key in GROUP_SLOTS.get(group, []):
        if key not in squad:
            return key
    return None


def pick_slot_key(squad: dict, player: dict) -> str | None:
    hint = player.get("slotHint")
    mapped = SLOT_HINT_MAP.get(hint) if hint else None
    mapped = mapped or hint
    if mapped and mapped in SLOT_KEYS and mapped not in squad:
        return mapped
    group = slot_hint_to_group(hint, player.get("position") or player.get("displayRole"))
    if group:
        return open_slot_for_group(squad, group)
    return None


def player_ovr(p: dict) -> float:
    return float(p.get("ovr") or p.get("percentile") or 50)


def lineup_to_players(lineup: list[dict]) -> list[dict]:
    out = []
    for p in lineup:
        pos = p.get("position") or p.get("displayRole") or "?"
        group = slot_hint_to_group(p.get("slotHint"), pos)
        if not group:
            continue
        out.append({
            **p,
            "group": group,
            "ovr": player_ovr(p),
        })
    return sorted(out, key=lambda x: -x["ovr"])


def build_valid_picks(index: dict) -> list[tuple[str, int, list[dict]]]:
    picks = []
    for year in index.get("years", []):
        by_team = index["players"].get(str(year), {})
        for name in TEAM_NAMES:
            lu = by_team.get(name) or []
            players = lineup_to_players(lu)
            if players:
                picks.append((name, int(year), players))
    return picks


def best_pick(squad: dict, players: list[dict]) -> tuple[str, dict] | None:
    best: tuple[float, str, dict] | None = None
    for p in players:
        slot = pick_slot_key(squad, p)
        if not slot:
            continue
        o = p["ovr"]
        if best is None or o > best[0]:
            best = (o, slot, p)
    return (best[1], best[2]) if best else None


def play_one_game(valid_picks: list, rng: random.Random, *, respins_per_slot: int = 40) -> dict:
    """One run: random team-year each pick; take highest OVR for an open slot; re-spin if no fit."""
    squad: dict[str, dict] = {}
    while len(squad) < len(SLOT_KEYS):
        choice = None
        for _ in range(respins_per_slot):
            name, year, players = rng.choice(valid_picks)
            choice = best_pick(squad, players)
            if choice:
                slot, p = choice
                squad[slot] = {**p, "fromYear": year, "fromTeam": name}
                break
        if not choice:
            return {"incomplete": True}

    strength = roster_strength(squad)
    wins = sample_wins(strength)
    return {
        "wins": wins,
        "losses": 17 - wins,
        "strength": strength,
        "avg_ovr": round(sum(player_ovr(squad[k]) for k in SLOT_KEYS) / len(SLOT_KEYS), 1),
        "squad": squad,
    }


def main() -> None:
    index_path = Path(__file__).parent / "data" / "spinner-index.json"
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)

    valid_picks = build_valid_picks(index)
    print(f"Valid team-year spins: {len(valid_picks)}")
    print(f"Sim model: FLOOR={FLOOR} CEIL={CEIL} (weighted OVR roster strength)\n")

    n_runs = 10_000
    rng = random.Random(20260604)

    wins_hist: Counter[int] = Counter()
    strengths: list[float] = []
    incomplete = 0

    for _ in range(n_runs):
        g = play_one_game(valid_picks, rng)
        if g.get("incomplete"):
            incomplete += 1
            continue
        wins_hist[g["wins"]] += 1
        strengths.append(g["strength"])

    played = n_runs - incomplete
    strengths.sort()

    print(f"=== {played:,} full games (pick highest OVR each spin) ===\n")
    print("Record distribution:")
    for w in range(17, 8, -1):
        c = wins_hist[w]
        bar = "█" * int(c / played * 50)
        print(f"  {w:2d}-{17-w:<2d}  {c/played*100:5.1f}%  {bar}")

    print("\nBuckets:")
    perfect = wins_hist[17] / played * 100
    one_loss = wins_hist[16] / played * 100
    playoff = sum(wins_hist[w] for w in range(13, 18)) / played * 100
    sub_500 = sum(wins_hist[w] for w in range(9, 13)) / played * 100
    print(f"  17-0:        {perfect:.2f}%")
    print(f"  16-1:        {one_loss:.2f}%")
    print(f"  13+ wins:    {playoff:.1f}%")
    print(f"  12-5 or worse: {sub_500:.1f}%")

    mean_s = sum(strengths) / len(strengths)
    p50 = strengths[len(strengths) // 2]
    print(f"\nRoster strength (weighted OVR):")
    print(f"  min={strengths[0]:.1f}  p25={strengths[len(strengths)//4]:.1f}  "
          f"median={p50:.1f}  mean={mean_s:.1f}  "
          f"p75={strengths[3*len(strengths)//4]:.1f}  max={strengths[-1]:.1f}")

    # 50 "sessions" of 20 games — like grinding the game
    print("\n=== 50 batches × 20 games (trying, fresh seed each batch) ===")
    batch_17 = []
    batch_best = []
    for b in range(50):
        brng = random.Random(1000 + b)
        bw = []
        for _ in range(20):
            g = play_one_game(valid_picks, brng)
            if g.get("incomplete"):
                continue
            bw.append(g["wins"])
        if not bw:
            continue
        batch_17.append(sum(1 for x in bw if x == 17))
        batch_best.append(max(bw))
    print(f"  17-0 per 20-game session: mean={sum(batch_17)/50:.2f}  max={max(batch_17)}")
    print(f"  Best record in session:   mean={sum(batch_best)/50:.1f} wins  "
          f"ever 17-0 in session={sum(1 for x in batch_best if x==17)/50*100:.0f}%")


if __name__ == "__main__":
    main()
