#!/usr/bin/env python3
"""Download NFL player data from nflverse and write JSON + CSV."""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path

import nflreadpy as nfl


def players_to_records(df) -> list[dict]:
    """Polars frame -> JSON-serializable list of dicts."""
    records = df.to_dicts()
    for row in records:
        for key, val in row.items():
            if isinstance(val, (date, datetime)):
                row[key] = val.isoformat()
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch NFL player data from nflverse")
    parser.add_argument(
        "-o",
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "data",
        help="Output directory (default: ./data)",
    )
    parser.add_argument(
        "--rosters",
        action="store_true",
        help="Also download seasonal rosters (1999–present, larger file)",
    )
    args = parser.parse_args()

    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading master player list (nflverse load_players)...")
    players = nfl.load_players()
    records = players_to_records(players)

    json_path = out_dir / "players.json"
    csv_path = out_dir / "players.csv"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    players.write_csv(csv_path)

    print(f"  {len(records):,} players")
    print(f"  {json_path}")
    print(f"  {csv_path}")

    if args.rosters:
        print("Loading seasonal rosters (1999–present)...")
        rosters = nfl.load_rosters(seasons=True)
        rosters_json = out_dir / "rosters.json"
        rosters_csv = out_dir / "rosters.csv"
        roster_records = players_to_records(rosters)
        with open(rosters_json, "w", encoding="utf-8") as f:
            json.dump(roster_records, f, indent=2, ensure_ascii=False)
        rosters.write_csv(rosters_csv)
        print(f"  {len(roster_records):,} roster rows")
        print(f"  {rosters_json}")
        print(f"  {rosters_csv}")


if __name__ == "__main__":
    main()
