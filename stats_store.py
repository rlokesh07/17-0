"""Persistent aggregate season-result counters (wins 5–17)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

STATS_PATH = Path(__file__).parent / "data" / "season-stats.json"


def empty_stats() -> dict:
    return {
        "version": 1,
        "updatedAt": None,
        "totalSeasons": 0,
        "byWins": {str(w): 0 for w in range(5, 18)},
    }


def load_stats() -> dict:
    if not STATS_PATH.exists():
        return empty_stats()
    with open(STATS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    base = empty_stats()
    base["totalSeasons"] = int(data.get("totalSeasons") or 0)
    base["updatedAt"] = data.get("updatedAt")
    for w in range(5, 18):
        base["byWins"][str(w)] = int(data.get("byWins", {}).get(str(w), 0))
    return base


def save_stats(data: dict) -> None:
    STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    data["updatedAt"] = datetime.now(UTC).isoformat()
    tmp = STATS_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    tmp.replace(STATS_PATH)


def format_response(stats: dict) -> dict:
    total = int(stats.get("totalSeasons") or 0)
    distribution = []
    for wins in range(17, 4, -1):
        count = int(stats.get("byWins", {}).get(str(wins), 0))
        pct = round(count / total * 1000) / 10 if total else 0.0
        distribution.append(
            {
                "wins": wins,
                "losses": 17 - wins,
                "count": count,
                "pct": pct,
            }
        )
    return {
        "totalSeasons": total,
        "updatedAt": stats.get("updatedAt"),
        "distribution": distribution,
    }


def get_stats() -> dict:
    return format_response(load_stats())


def record_win(wins: int) -> dict:
    if not isinstance(wins, int) or wins < 5 or wins > 17:
        raise ValueError("wins must be an integer from 5 to 17")
    stats = load_stats()
    stats["byWins"][str(wins)] = int(stats["byWins"].get(str(wins), 0)) + 1
    stats["totalSeasons"] = int(stats.get("totalSeasons") or 0) + 1
    save_stats(stats)
    return format_response(stats)
