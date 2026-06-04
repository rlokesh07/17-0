"""Build curated pick lists: QB, RB, 3 WR, TE, OL unit, top 3 DEF, K."""

from __future__ import annotations

from collections import defaultdict

from ol_ranking import ol_stat_lines, ol_unit_score
from player_ranking import is_defensive_position

OL_POSITIONS = frozenset({"OL", "T", "G", "C", "OT", "OG", "T/G", "G/T"})
RB_POSITIONS = frozenset({"RB", "HB", "FB"})
WR_POSITIONS = frozenset({"WR"})


def _pos_upper(position: str | None) -> str:
    return (position or "").upper()


def bucket(position: str | None) -> str | None:
    pos = _pos_upper(position)
    if pos == "QB":
        return "qb"
    if pos in RB_POSITIONS:
        return "rb"
    if pos in WR_POSITIONS:
        return "wr"
    if pos == "TE":
        return "te"
    if pos in OL_POSITIONS:
        return "ol"
    if is_defensive_position(pos):
        return "def"
    if pos == "K":
        return "k"
    return None


def build_ol_entry(
    ol_players: list[dict],
    team: str,
    year: int,
    ol_metrics: dict[str, float],
) -> dict | None:
    if not ol_players:
        return None

    score = round(
        ol_unit_score(
            rushing_yards=ol_metrics["rushing_yards"],
            rushing_tds=ol_metrics["rushing_tds"],
            qb_sacks_suffered=ol_metrics["qb_sacks_suffered"],
            ol_offense_snaps=ol_metrics.get("ol_offense_snaps", 0.0),
        ),
        1,
    )

    return {
        "id": f"ol:{team}:{year}",
        "name": "Offensive Line",
        "position": "OL",
        "displayRole": "OL",
        "slotHint": "OL",
        "aggregate": True,
        "year": year,
        "fantasy": 0.0,
        "production": score,
        "score": score,
        "headshot": None,
        "stats": ol_stat_lines(ol_metrics, len(ol_players), score),
    }


def _pick_entry(player: dict, *, slot_hint: str, display_role: str) -> dict:
    entry = {k: v for k, v in player.items() if k != "rawStats"}
    entry["slotHint"] = slot_hint
    entry["displayRole"] = display_role
    return entry


def build_curated_lineup(
    players: list[dict],
    team: str,
    year: int,
    *,
    ol_metrics: dict[str, float] | None = None,
    ol_entry: dict | None = None,
) -> list[dict]:
    """Return ordered pick list for the spinner UI."""
    buckets: dict[str, list[dict]] = defaultdict(list)
    for p in players:
        b = bucket(p.get("position"))
        if b:
            buckets[b].append(p)

    for key in buckets:
        buckets[key].sort(key=lambda x: (-x["score"], x["name"]))

    lineup: list[dict] = []

    if buckets["qb"]:
        lineup.append(_pick_entry(buckets["qb"][0], slot_hint="QB", display_role="QB"))

    if buckets["rb"]:
        lineup.append(_pick_entry(buckets["rb"][0], slot_hint="RB", display_role="RB"))

    for i, wr in enumerate(buckets["wr"][:3]):
        role = f"WR{i + 1}"
        lineup.append(_pick_entry(wr, slot_hint=role, display_role=role))

    if buckets["te"]:
        lineup.append(_pick_entry(buckets["te"][0], slot_hint="TE", display_role="TE"))

    if ol_entry:
        lineup.append(
            _pick_entry(ol_entry, slot_hint="OL", display_role="OL")
        )
    else:
        metrics = ol_metrics or {
            "rushing_yards": 0.0,
            "rushing_tds": 0.0,
            "qb_sacks_suffered": 0.0,
            "ol_offense_snaps": 0.0,
        }
        built_ol = build_ol_entry(buckets["ol"], team, year, metrics)
        if built_ol:
            lineup.append(built_ol)

    for i, defender in enumerate(buckets["def"][:3]):
        slot = f"Defensive Player {i + 1}"
        pos_label = _pos_upper(defender.get("position")) or "?"
        lineup.append(_pick_entry(defender, slot_hint=slot, display_role=pos_label))

    if buckets["k"]:
        lineup.append(_pick_entry(buckets["k"][0], slot_hint="K", display_role="K"))

    return lineup
