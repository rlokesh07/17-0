#!/usr/bin/env python3
"""Build year × team top-player index for the spinner UI."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import nflreadpy as nfl
import polars as pl

from lineup_builder import bucket, build_curated_lineup, build_ol_entry
from ol_ranking import ol_snaps_for_team, team_oline_metrics
from player_ranking import assign_position_group_ratings, percentile_group, rank_score

STAT_START_YEAR = 1999

SPINNER_TEAMS = [
    "Cardinals", "Falcons", "Ravens", "Bills", "Panthers", "Bears",
    "Bengals", "Browns", "Cowboys", "Broncos", "Lions", "Packers",
    "Texans", "Colts", "Jaguars", "Chiefs", "Raiders", "Chargers",
    "Rams", "Dolphins", "Vikings", "Patriots", "Saints", "Giants",
    "Jets", "Eagles", "Steelers", "49ers", "Seahawks", "Buccaneers",
    "Titans", "Commanders",
]

# Build all rostered players internally, then expose curated lineup only.

EXCLUDED_POSITIONS = frozenset({"P"})

AGG_STATS = [
    "completions",
    "attempts",
    "passing_yards",
    "passing_tds",
    "passing_interceptions",
    "carries",
    "rushing_yards",
    "rushing_tds",
    "receptions",
    "targets",
    "receiving_yards",
    "receiving_tds",
    "def_tackles_solo",
    "def_tackle_assists",
    "def_sacks",
    "def_interceptions",
    "def_tds",
    "fg_made",
    "fg_att",
]

STAT_BY_POSITION: dict[str, list[tuple[str, str]]] = {
    "QB": [
        ("passing_yards", "Pass Yds"),
        ("passing_tds", "Pass TD"),
        ("passing_interceptions", "INT"),
        ("completions", "Cmp"),
        ("attempts", "Att"),
    ],
    "RB": [
        ("rushing_yards", "Rush Yds"),
        ("rushing_tds", "Rush TD"),
        ("receptions", "Rec"),
        ("receiving_yards", "Rec Yds"),
        ("carries", "Carries"),
    ],
    "FB": [
        ("rushing_yards", "Rush Yds"),
        ("rushing_tds", "Rush TD"),
        ("receptions", "Rec"),
        ("receiving_yards", "Rec Yds"),
    ],
    "HB": [
        ("rushing_yards", "Rush Yds"),
        ("rushing_tds", "Rush TD"),
        ("receptions", "Rec"),
        ("receiving_yards", "Rec Yds"),
    ],
    "WR": [
        ("receptions", "Rec"),
        ("receiving_yards", "Rec Yds"),
        ("receiving_tds", "Rec TD"),
        ("targets", "Targets"),
    ],
    "TE": [
        ("receptions", "Rec"),
        ("receiving_yards", "Rec Yds"),
        ("receiving_tds", "Rec TD"),
        ("targets", "Targets"),
    ],
    "K": [("fg_made", "FG Made"), ("fg_att", "FG Att")],
    "DEF": [
        ("tackles", "Tackles"),
        ("def_sacks", "Sacks"),
        ("def_interceptions", "INT"),
        ("def_tds", "Def TD"),
    ],
}

DEFAULT_STATS = [
    ("receptions", "Rec"),
    ("receiving_yards", "Rec Yds"),
    ("rushing_yards", "Rush Yds"),
    ("def_sacks", "Sacks"),
]


def team_codes_for_season(team: str, season: int) -> list[str]:
    """Map spinner team label to nflverse team abbreviations for a given season."""
    if team == "Colts":
        return ["BAL"] if season < 1984 else ["IND"]
    if team == "Ravens":
        return ["BAL"] if season >= 1996 else []
    if team == "Titans":
        return ["HOU"] if season < 1997 else ["TEN"]
    if team == "Cardinals":
        if season < 1988:
            return ["STL", "CRD"]
        if season < 1994:
            return ["PHX", "ARI", "ARZ", "AZ"]
        return ["ARI", "ARZ", "AZ", "PHX"]
    if team == "Rams":
        if season <= 1994:
            return ["RAM", "LA", "LAR"]
        if season <= 2015:
            return ["STL", "LA", "LAR", "RAM"]
        return ["LA", "LAR", "RAM"]
    if team == "Raiders":
        return ["OAK", "LV", "LVR", "RAI"]
    if team == "Chargers":
        return ["SD", "SDG", "LAC"]
    if team == "Patriots":
        return ["NE", "NWE", "BOS"]
    if team == "49ers":
        return ["SF", "SFO"]
    if team == "Commanders":
        return ["WAS", "WSH", "WFT"]
    if team == "Browns":
        return ["CLE", "CLV"]
    if team == "Texans":
        return ["HOU"] if season >= 2002 else []
    if team == "Panthers":
        return ["CAR"] if season >= 1995 else []
    if team == "Jaguars":
        return ["JAX", "JAC"] if season >= 1995 else []

    static = {
        "Falcons": ["ATL"],
        "Bills": ["BUF"],
        "Bears": ["CHI"],
        "Bengals": ["CIN"],
        "Cowboys": ["DAL", "COW"],
        "Broncos": ["DEN"],
        "Lions": ["DET"],
        "Packers": ["GB", "GNB"],
        "Chiefs": ["KC", "KAN"],
        "Dolphins": ["MIA"],
        "Vikings": ["MIN"],
        "Saints": ["NO", "NOR", "NOS"],
        "Giants": ["NYG"],
        "Jets": ["NYJ"],
        "Eagles": ["PHI"],
        "Steelers": ["PIT"],
        "Seahawks": ["SEA"],
        "Buccaneers": ["TB", "TAM"],
    }
    return static.get(team, [])


def json_safe(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(type(obj))


def position_group(position: str | None) -> str:
    if not position:
        return "DEF"
    pos = position.upper()
    if pos in STAT_BY_POSITION:
        return pos
    if pos in {"DE", "DT", "DL", "NT", "LB", "OLB", "ILB", "MLB", "CB", "DB", "S", "FS", "SS", "SAF"}:
        return "DEF"
    return pos


def build_stat_lines(position: str | None, totals: dict[str, float]) -> list[dict]:
    group = position_group(position)
    schema = STAT_BY_POSITION.get(group, DEFAULT_STATS)
    lines: list[dict] = []
    for key, label in schema:
        if key == "tackles":
            value = totals.get("def_tackles_solo", 0) + totals.get("def_tackle_assists", 0)
        else:
            value = totals.get(key, 0)
        if value and value > 0:
            lines.append(
                {
                    "label": label,
                    "value": int(value) if float(value).is_integer() else round(value, 1),
                }
            )
    return lines


def team_season_stat_maps(
    stats: pl.DataFrame, year: int, codes: list[str]
) -> tuple[dict[str, float], dict[str, dict[str, float]]]:
    """Per-player fantasy and counting stats for one season on this team only."""
    fantasy: dict[str, float] = {}
    totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    if not codes:
        return fantasy, {}
    season_rows = stats.filter(
        (pl.col("season") == year) & pl.col("recent_team").is_in(codes)
    )
    for row in season_rows.iter_rows(named=True):
        pid = row["player_id"]
        fantasy[pid] = row.get("fantasy_points_ppr") or 0.0
        for col in AGG_STATS:
            if col not in row:
                continue
            val = row[col]
            if val is not None and val == val:
                totals[pid][col] += float(val)
    return fantasy, {k: dict(v) for k, v in totals.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-o",
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "spinner-index.json",
    )
    args = parser.parse_args()

    end_year = nfl.get_current_season()
    years = list(range(STAT_START_YEAR, end_year + 1))

    roster_path = Path(__file__).resolve().parent / "data" / "rosters.csv"
    print("Loading rosters...")
    rosters = pl.read_csv(roster_path, infer_schema_length=5000)

    print("Loading player stats (1999+)...")
    stats = nfl.load_player_stats(seasons=True, summary_level="reg")
    stat_cols = [
        "player_id",
        "season",
        "recent_team",
        "position",
        "sacks_suffered",
        "fantasy_points_ppr",
        *AGG_STATS,
    ]
    stats = stats.select([c for c in stat_cols if c in stats.columns])

    snap_counts = pl.DataFrame()
    if end_year >= 2012:
        print("Loading OL snap counts (2012+)...")
        try:
            snap_counts = nfl.load_snap_counts(
                seasons=list(range(2012, end_year + 1))
            )
        except (ValueError, OSError) as err:
            print(f"  snap counts skipped: {err}")

    index: dict[str, dict[str, list[dict]]] = {}
    all_player_rows: list[dict] = []
    year_snapshots: dict[str, dict] = {}
    curated_rows: list[dict] = []

    for year in years:
        year_key = str(year)
        print(f"  {year}...")

        team_players: dict[str, list[dict]] = {}
        team_ol_metrics: dict[str, dict[str, float]] = {}
        year_pool: list[dict] = []

        for team in SPINNER_TEAMS:
            codes = team_codes_for_season(team, year)
            if not codes:
                team_players[team] = []
                continue

            season_fantasy, season_totals = team_season_stat_maps(stats, year, codes)

            team_rows = rosters.filter(
                (pl.col("season") == year) & pl.col("team").is_in(codes)
            )

            if team_rows.is_empty():
                team_players[team] = []
                continue

            team_rows = team_rows.filter(pl.col("full_name").is_not_null())
            team_rows = team_rows.with_columns(
                pl.when(pl.col("gsis_id").is_not_null() & (pl.col("gsis_id") != ""))
                .then(pl.col("gsis_id"))
                .otherwise(
                    pl.concat_str(
                        [
                            pl.lit("name:"),
                            pl.col("full_name"),
                            pl.lit("|"),
                            pl.col("birth_date").cast(pl.Utf8).fill_null(""),
                        ]
                    )
                )
                .alias("player_key")
            )

            grouped = team_rows.group_by("player_key").agg(
                pl.col("full_name").first().alias("name"),
                pl.col("gsis_id").drop_nulls().first().alias("gsis_id"),
                pl.col("position").drop_nulls().mode().first().alias("position"),
                pl.col("headshot_url").drop_nulls().last().alias("headshot"),
            )

            players: list[dict] = []
            for row in grouped.iter_rows(named=True):
                player_key = row["player_key"]
                if not player_key or not row["name"]:
                    continue
                pos = row["position"]
                if isinstance(pos, list):
                    pos = pos[0] if pos else None
                if pos and pos.upper() in EXCLUDED_POSITIONS:
                    continue
                gsis_id = row["gsis_id"]
                fp = season_fantasy.get(gsis_id, 0.0) if gsis_id else 0.0
                totals = season_totals.get(gsis_id, {}) if gsis_id else {}
                stat_lines = build_stat_lines(pos, totals)
                score, production, _ = rank_score(
                    fantasy_points=fp, stats=totals, position=pos
                )
                players.append(
                    {
                        "id": player_key,
                        "name": row["name"],
                        "position": pos,
                        "year": year,
                        "fantasy": round(fp, 1),
                        "production": round(production, 1),
                        "score": round(score, 1),
                        "headshot": row["headshot"],
                        "stats": stat_lines,
                        "rawStats": totals,
                    }
                )

            ol_metrics = team_oline_metrics(stats, year, codes)
            if not snap_counts.is_empty():
                ol_metrics["ol_offense_snaps"] = ol_snaps_for_team(
                    snap_counts, year, codes
                )

            team_players[team] = players
            team_ol_metrics[team] = ol_metrics
            year_pool.extend(players)

        default_ol_metrics = {
            "rushing_yards": 0.0,
            "rushing_tds": 0.0,
            "qb_sacks_suffered": 0.0,
            "ol_offense_snaps": 0.0,
        }
        ol_by_team: dict[str, dict] = {}
        for team, players in team_players.items():
            if not players:
                continue
            metrics = team_ol_metrics.get(team, default_ol_metrics)
            ol_players = [p for p in players if bucket(p.get("position")) == "ol"]
            ol_entry = build_ol_entry(ol_players, team, year, metrics)
            if ol_entry:
                ol_by_team[team] = ol_entry
                year_pool.append(ol_entry)

        all_player_rows.extend(year_pool)
        year_snapshots[year_key] = {
            "team_players": team_players,
            "team_ol_metrics": team_ol_metrics,
            "ol_by_team": ol_by_team,
        }

    print("Building curated lineups...")
    for year_key, snap in year_snapshots.items():
        year = int(year_key)
        index[year_key] = {}
        team_players = snap["team_players"]
        team_ol_metrics = snap["team_ol_metrics"]
        ol_by_team = snap["ol_by_team"]
        for team in SPINNER_TEAMS:
            players = team_players.get(team, [])
            if not players:
                index[year_key][team] = []
                continue
            lineup = build_curated_lineup(
                players,
                team,
                year,
                ol_metrics=team_ol_metrics.get(team),
                ol_entry=ol_by_team.get(team),
            )
            index[year_key][team] = lineup
            curated_rows.extend(lineup)

    print(
        "Assigning position-group ratings (draft pool only, "
        "1×99 / 2×98 / 5×97 per group)..."
    )
    assign_position_group_ratings(curated_rows)
    by_group: dict[str, Counter] = defaultdict(Counter)
    for player in curated_rows:
        group = percentile_group(player)
        ovr = player.get("ovr")
        if group and ovr is not None:
            by_group[group][ovr] += 1
    for group in sorted(by_group):
        counts = by_group[group]
        print(
            f"  {group}: 99={counts[99]}, 98={counts[98]}, 97={counts[97]}"
        )

    payload = {
        "lineupFormat": "qb,rb,wr3,te,ol,def3,k",
        "statStartYear": STAT_START_YEAR,
        "endYear": end_year,
        "years": years,
        "teams": SPINNER_TEAMS,
        "players": index,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), default=json_safe)

    print(f"Wrote {args.out} ({args.out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
