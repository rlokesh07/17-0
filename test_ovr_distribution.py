"""Tests for global per-position OVR distribution."""

from player_ranking import assign_ovr_by_position_group, rank_index_to_ovr


def test_only_one_99_per_group():
    players = [
        {"position": "QB", "score": 400 - i, "name": f"qb{i}"}
        for i in range(100)
    ]
    assign_ovr_by_position_group(players)
    assert sum(1 for p in players if p["ovr"] == 99) == 1
    assert players[0]["ovr"] == 99


def test_top_ten_percent_in_nineties():
    players = [
        {"position": "RB", "score": 300 - i, "name": f"rb{i}"}
        for i in range(200)
    ]
    assign_ovr_by_position_group(players)
    in_90s = sum(1 for p in players if 90 <= p["ovr"] <= 99)
    assert 18 <= in_90s <= 22  # ~10% of 200, plus wiggle room


def test_rank_index_boundaries():
    assert rank_index_to_ovr(0, 500) == 99
    assert rank_index_to_ovr(499, 500) == 48
    assert 90 <= rank_index_to_ovr(25, 500) <= 98
