#!/usr/bin/env python3
"""Sanity-check cross-position rankings for sample team-seasons."""

from __future__ import annotations

import json
from pathlib import Path

DEF_POS = {
    "CB", "DE", "LB", "DT", "S", "FS", "SS", "OLB", "ILB", "MLB", "DB", "DL", "NT", "SAF",
}
OFF_SKILL = {"QB", "RB", "HB", "FB", "WR", "TE"}


def load_index():
    path = Path(__file__).parent / "data" / "spinner-index.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def summarize(team: str, year: str, players: list[dict], expect_top: list[str]) -> dict:
    names = [p["name"] for p in players]
    top10 = players[:10]
    defs = [p for p in players if p.get("position") in DEF_POS]
    best_def = defs[0] if defs else None
    issues = []
    for exp in expect_top:
        if exp not in names[:15]:
            rank = names.index(exp) + 1 if exp in names else None
            issues.append(f"expected star '{exp}' not in top 15 (rank={rank})")
    # Backup QBs above starter?
    qbs = [p for p in players if p.get("position") == "QB"]
    if len(qbs) >= 2 and qbs[0]["score"] < qbs[1]["score"]:
        issues.append("backup QB ranked above starter")
    # All-zero scores dominating?
    zeros = sum(1 for p in players if p["score"] == 0)
    return {
        "team": team,
        "year": year,
        "roster_size": len(players),
        "top5": [(p["name"], p["position"], p["score"]) for p in players[:5]],
        "best_def": (
            (best_def["name"], best_def["position"], best_def["score"], names.index(best_def["name"]) + 1)
            if best_def
            else None
        ),
        "def_count": len(defs),
        "zero_score_count": zeros,
        "issues": issues,
    }


def main() -> None:
    data = load_index()
    samples = [
        ("Patriots", "2007", ["Tom Brady", "Randy Moss", "Wes Welker"]),
        ("Chiefs", "2023", ["Patrick Mahomes", "Travis Kelce"]),
        ("Ravens", "2019", ["Lamar Jackson", "Mark Andrews"]),
        ("Cowboys", "2014", ["DeMarco Murray", "Dez Bryant"]),
        ("Bills", "2021", ["Josh Allen", "Stefon Diggs"]),
        ("49ers", "2012", ["Colin Kaepernick", "Frank Gore"]),
    ]
    print("=== Expected star checks (top 15) ===\n")
    all_issues = []
    for team, year, expect in samples:
        players = data["players"].get(year, {}).get(team, [])
        s = summarize(team, year, players, expect)
        all_issues.extend(s["issues"])
        print(f"{year} {team} ({s['roster_size']} players)")
        print("  Top 5:", s["top5"])
        print("  Best defender:", s["best_def"], f"({s['def_count']} defenders on roster)")
        if s["zero_score_count"]:
            print(f"  {s['zero_score_count']} players with score 0 (typically OL/LS)")
        if s["issues"]:
            print("  ISSUES:", s["issues"])
        print()

    print("=== Cross-position balance (top offensive vs top defensive) ===\n")
    for team, year, _ in samples[:3]:
        players = data["players"][year][team]
        top_off = next((p for p in players if p.get("position") in OFF_SKILL), None)
        top_def = next((p for p in players if p.get("position") in DEF_POS), None)
        if top_off and top_def:
            ratio = top_off["score"] / top_def["score"] if top_def["score"] else float("inf")
            print(
                f"{year} {team}: best offense {top_off['name']} ({top_off['score']:.1f}) "
                f"vs best defense {top_def['name']} ({top_def['score']:.1f}) — "
                f"{ratio:.1f}x gap"
            )

    print("\n=== Anomalies: high rank with no stats ===\n")
    weird = 0
    for year in ["2007", "2015", "2023"]:
        for team in ["Patriots", "Chiefs"]:
            for i, p in enumerate(data["players"][year][team][:25]):
                if i < 10 and not p.get("stats") and p["score"] == 0:
                    print(f"  #{i+1} {year} {team}: {p['name']} ({p['position']}) score=0 no stats")
                    weird += 1
    if not weird:
        print("  None in top 10 of sampled teams.")

    print("\n=== Verdict ===")
    if not all_issues:
        print("Star players land in top 15 for all sampled seasons — rankings look plausible.")
    else:
        print(f"{len(all_issues)} expectation mismatches — review cases above.")


if __name__ == "__main__":
    main()
