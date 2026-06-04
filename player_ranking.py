"""Cross-position player ranking from box-score stats (single season).

Offense / TE / RB / WR / QB: standard box-score weights (yards + TDs; no PPR).
Defense: boosted IDP-style box-score weights.
Kickers: kicking stat weights. Punters: fixed floor.
"""

from __future__ import annotations

from collections import defaultdict

# Standard weights for offense and fallback box-score scoring.
STAT_POINTS: dict[str, float] = {
    "passing_yards": 0.04,
    "passing_tds": 4.0,
    "passing_interceptions": -2.0,
    "rushing_yards": 0.1,
    "rushing_tds": 6.0,
    "receiving_yards": 0.1,
    "receiving_tds": 6.0,
    "def_tackles_solo": 0.5,
    "def_tackle_assists": 0.25,
    "def_sacks": 2.0,
    "def_interceptions": 3.0,
    "def_tds": 6.0,
    "fg_made": 3.0,
}

# Stronger IDP-style weights so elite defenders land near good WR2 / TE seasons.
DEF_STAT_POINTS: dict[str, float] = {
    "def_tackles_solo": 1.25,
    "def_tackle_assists": 0.625,
    "def_sacks": 5.0,
    "def_interceptions": 8.0,
    "def_tds": 12.0,
}

SAFETY_POSITIONS = frozenset({"S", "FS", "SS", "SAF"})
LB_POSITIONS = frozenset({"LB", "OLB", "ILB", "MLB"})
DL_POSITIONS = frozenset({"DE", "DT", "DL", "NT"})
OL_SKILL_POSITIONS = frozenset({"OL", "T", "G", "C", "OT", "OG", "T/G", "G/T"})

DEF_POSITIONS = SAFETY_POSITIONS | LB_POSITIONS | DL_POSITIONS | frozenset({"CB", "DB"})
K_STAT_POINTS: dict[str, float] = {
    "fg_made": 4.5,
    "fg_att": 0.4,
    "pat_made": 1.5,
}
PUNTER_FLOOR = 85.0

# WR seasons: receiving production only (no rushing yards/TDs).
WR_STAT_POINTS: dict[str, float] = {
    "receiving_yards": 0.1,
    "receiving_tds": 6.0,
}


def is_wr_position(position: str | None) -> bool:
    pos = _pos_upper(position)
    return pos == "WR" or pos.startswith("WR")


def is_defensive_position(position: str | None) -> bool:
    if not position:
        return False
    return position.upper() in DEF_POSITIONS


def production_score(
    stats: dict[str, float],
    *,
    defensive: bool = False,
    kicking: bool = False,
    wr_receiving: bool = False,
) -> float:
    if kicking:
        weights = K_STAT_POINTS
    elif wr_receiving:
        weights = WR_STAT_POINTS
    else:
        weights = DEF_STAT_POINTS if defensive else STAT_POINTS
    total = 0.0
    for key, weight in weights.items():
        val = stats.get(key, 0.0) or 0.0
        if val:
            total += float(val) * weight
    return total


def is_kicker_position(position: str | None) -> bool:
    return _pos_upper(position) == "K"


def is_punter_position(position: str | None) -> bool:
    return _pos_upper(position) == "P"


def _pos_upper(position: str | None) -> str:
    return (position or "").upper()


def rank_score(
    *,
    fantasy_points: float,
    stats: dict[str, float],
    position: str | None = None,
    seasons: int = 0,
) -> tuple[float, float, float]:
    """Return (score, production, tenure_bonus)."""
    _ = seasons
    if is_defensive_position(position):
        production = production_score(stats, defensive=True)
        return production, production, 0.0

    if is_kicker_position(position):
        production = production_score(stats, kicking=True)
        return production, production, 0.0

    if is_punter_position(position):
        production = max(production_score(stats, defensive=False), PUNTER_FLOOR)
        return production, production, 0.0

    _ = fantasy_points
    if is_wr_position(position):
        production = production_score(stats, wr_receiving=True)
        return production, production, 0.0

    production = production_score(stats, defensive=False)
    return production, production, 0.0


OVR_GROUPS = frozenset({"QB", "RB", "WR", "TE", "DEF"})
OVR_MIN = 48
OVR_TOP_BAND = 0.10  # share of pool in 90–98 (rank #1 is always 99)


def position_group(position: str | None) -> str:
    """Bucket positions for global OVR distribution."""
    if not position:
        return "DEF"
    pos = position.upper()
    if pos == "QB":
        return "QB"
    if pos in {"RB", "HB", "FB"}:
        return "RB"
    if pos == "WR" or pos.startswith("WR"):
        return "WR"
    if pos == "TE":
        return "TE"
    if pos in DEF_POSITIONS:
        return "DEF"
    return "DEF"


def score_for_percentile(player: dict) -> float:
    return float(player.get("score") or player.get("production") or 0)


PERCENTILE_OFFENSE_GROUPS = frozenset({"QB", "RB", "WR", "TE"})


def percentile_group(player: dict) -> str | None:
    """Position bucket for all-time percentile and display-score ranks."""
    if player.get("aggregate"):
        return "OL"
    pos = _pos_upper(player.get("position"))
    if not pos:
        return None
    if pos == "QB":
        return "QB"
    if pos in {"RB", "HB", "FB"}:
        return "RB"
    if pos == "WR" or pos.startswith("WR"):
        return "WR"
    if pos == "TE":
        return "TE"
    if pos == "K":
        return "K"
    if pos in OL_SKILL_POSITIONS:
        return "OL"
    if pos in SAFETY_POSITIONS:
        return "S"
    if pos in LB_POSITIONS:
        return "LB"
    if pos in DL_POSITIONS:
        return "DL"
    if pos == "CB":
        return "CB"
    if pos == "DB":
        return "DB"
    return None


SCORE_MIN = 48
TAIL_TOP = 96  # highest display score after the fixed 99/98/97 buckets


def rank_to_display_score(rank_index: int, pool_size: int) -> int:
    """Map global rank (0 = best) to display score.

    Fixed elite head across the full corpus: 1×99, 2×98, 5×97 when large enough.
    Everyone else spreads from TAIL_TOP down to SCORE_MIN.
    """
    if pool_size <= 0:
        return 50
    if rank_index == 0:
        return 99
    if rank_index <= 2:
        return 98
    if rank_index <= 7:
        return 97

    tail_size = pool_size - 8
    if tail_size <= 0:
        return 97
    if tail_size == 1:
        return SCORE_MIN

    tail_rank = rank_index - 8
    t = tail_rank / (tail_size - 1)
    return round(TAIL_TOP - t * (TAIL_TOP - SCORE_MIN))


def percentile_to_display_score(percentile: int) -> int:
    """Legacy helper — approximate mapping from percentile only (no rank buckets)."""
    _ = percentile
    return 50


def score_to_percentile(rank_index: float, pool_size: int) -> int:
    """Map rank within a position-group pool (0 = best) to 1–99 percentile."""
    if pool_size <= 0:
        return 50
    if pool_size == 1:
        return 50
    pct = 100 * (pool_size - rank_index) / pool_size
    return max(1, min(99, round(pct)))


def _rating_sort_key(player: dict) -> tuple:
    return (
        -score_for_percentile(player),
        int(player.get("year") or 0),
        (player.get("name") or "").lower(),
    )


def assign_position_group_ratings(players: list[dict]) -> None:
    """Set ``percentile`` and ``ovr`` from ranks within each position group.

    Intended for the draft pool (curated lineup picks), not every player on a
    season roster — backups would otherwise inflate starter percentiles.
    """
    by_group: dict[str, list[dict]] = defaultdict(list)
    for player in players:
        group = percentile_group(player)
        if group is None:
            continue
        by_group[group].append(player)

    for group_players in by_group.values():
        group_players.sort(key=_rating_sort_key)
        pool_size = len(group_players)

        for rank_index, player in enumerate(group_players):
            player["ovr"] = rank_to_display_score(rank_index, pool_size)

        idx = 0
        while idx < pool_size:
            score = score_for_percentile(group_players[idx])
            end = idx + 1
            while end < pool_size and score_for_percentile(group_players[end]) == score:
                end += 1
            mid_rank = (idx + end - 1) / 2
            pct = score_to_percentile(mid_rank, pool_size)
            for player in group_players[idx:end]:
                player["percentile"] = pct
            idx = end


def assign_season_percentile(players: list[dict]) -> None:
    """Backward-compatible alias."""
    assign_position_group_ratings(players)


def assign_global_display_scores(players: list[dict]) -> None:
    """Backward-compatible alias."""
    assign_position_group_ratings(players)


def rank_index_to_ovr(rank_index: int, pool_size: int) -> int:
    """Legacy Madden-style mapping kept for tests."""
    if pool_size <= 0:
        return OVR_MIN
    if pool_size == 1:
        return 99
    if rank_index == 0:
        return 99

    pct = rank_index / (pool_size - 1)
    if pct <= OVR_TOP_BAND:
        band_pct = pct / OVR_TOP_BAND
        return round(98 - band_pct * 8)

    tail_pct = (pct - OVR_TOP_BAND) / (1.0 - OVR_TOP_BAND)
    return round(89 - tail_pct * (89 - OVR_MIN))


def assign_ovr_by_position_group(players: list[dict]) -> None:
    """Legacy global OVR assignment across all seasons."""
    by_group: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for idx, player in enumerate(players):
        if player.get("aggregate"):
            continue
        group = position_group(player.get("position"))
        if group not in OVR_GROUPS:
            continue
        by_group[group].append((idx, score_for_percentile(player)))

    for ranked in by_group.values():
        ranked.sort(key=lambda item: -item[1])
        pool_size = len(ranked)
        for rank_index, (player_idx, _) in enumerate(ranked):
            players[player_idx]["ovr"] = rank_index_to_ovr(rank_index, pool_size)


def collect_index_player_rows(index: dict) -> list[dict]:
    """Flatten year → team → lineup into one list (same dict refs)."""
    rows: list[dict] = []
    for teams in index.values():
        for lineup in teams.values():
            rows.extend(lineup)
    return rows
