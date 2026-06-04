"""Offensive line unit score from team run game and pass protection."""

from __future__ import annotations

import polars as pl

OL_POSITIONS = frozenset({"OL", "T", "G", "C", "OT", "OG", "T/G", "G/T"})

# Team-level proxies (individual OL have almost no box-score stats in nflverse).
RUSH_YARD_PTS = 0.06
RUSH_TD_PTS = 8.0
SACKS_ALLOWED_BASELINE = 50
SACKS_ALLOWED_PTS_PER = 2.5
SNAP_BONUS_CAP = 35.0
SNAP_BONUS_DIVISOR = 180.0


def ol_unit_score(
    *,
    rushing_yards: float,
    rushing_tds: float,
    qb_sacks_suffered: float,
    ol_offense_snaps: float = 0.0,
) -> float:
    """Score the OL as a unit for one team-season (higher = better run + protection)."""
    rush_pts = max(rushing_yards, 0) * RUSH_YARD_PTS
    td_pts = max(rushing_tds, 0) * RUSH_TD_PTS
    protection_pts = max(0, SACKS_ALLOWED_BASELINE - qb_sacks_suffered) * SACKS_ALLOWED_PTS_PER
    snap_pts = min(SNAP_BONUS_CAP, max(ol_offense_snaps, 0) / SNAP_BONUS_DIVISOR)
    return rush_pts + td_pts + protection_pts + snap_pts


def team_oline_metrics(
    stats: pl.DataFrame, year: int, codes: list[str]
) -> dict[str, float]:
    """Pull team run game and QB pressure stats for this franchise season."""
    if not codes:
        return {
            "rushing_yards": 0.0,
            "rushing_tds": 0.0,
            "qb_sacks_suffered": 0.0,
            "ol_offense_snaps": 0.0,
        }

    rows = stats.filter(
        (pl.col("season") == year) & pl.col("recent_team").is_in(codes)
    )
    if rows.is_empty():
        return {
            "rushing_yards": 0.0,
            "rushing_tds": 0.0,
            "qb_sacks_suffered": 0.0,
            "ol_offense_snaps": 0.0,
        }

    qb_rows = rows.filter(pl.col("position") == "QB")
    sacks = float(qb_rows["sacks_suffered"].sum()) if "sacks_suffered" in qb_rows.columns else 0.0

    rush_yds = float(rows["rushing_yards"].sum()) if "rushing_yards" in rows.columns else 0.0
    rush_tds = float(rows["rushing_tds"].sum()) if "rushing_tds" in rows.columns else 0.0

    return {
        "rushing_yards": rush_yds,
        "rushing_tds": rush_tds,
        "qb_sacks_suffered": sacks,
        "ol_offense_snaps": 0.0,
    }


def ol_snaps_for_team(snaps: pl.DataFrame, year: int, codes: list[str]) -> float:
    """Sum offensive snaps for linemen (2012+ snap-count data only)."""
    if snaps.is_empty() or not codes:
        return 0.0
    rows = snaps.filter(
        (pl.col("season") == year)
        & pl.col("team").is_in(codes)
        & pl.col("position").is_in(list(OL_POSITIONS))
    )
    if rows.is_empty() or "offense_snaps" not in rows.columns:
        return 0.0
    return float(rows["offense_snaps"].sum())


def ol_stat_lines(metrics: dict[str, float], linemen: int, score: float) -> list[dict]:
    lines: list[dict] = [
        {"label": "Rush Yds", "value": int(metrics["rushing_yards"])},
        {"label": "Rush TD", "value": int(metrics["rushing_tds"])},
        {
            "label": "QB Sacks",
            "value": int(metrics["qb_sacks_suffered"])
            if metrics["qb_sacks_suffered"] == int(metrics["qb_sacks_suffered"])
            else round(metrics["qb_sacks_suffered"], 1),
        },
        {"label": "Linemen", "value": linemen},
        {"label": "Unit pts", "value": round(score, 1)},
    ]
    if metrics.get("ol_offense_snaps", 0) > 0:
        lines.insert(
            3,
            {"label": "OL Snaps", "value": int(metrics["ol_offense_snaps"])},
        )
    return lines
