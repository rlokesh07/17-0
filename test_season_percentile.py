"""Tests for position-group percentile and display scoring."""

from collections import Counter

from player_ranking import (
    assign_position_group_ratings,
    percentile_group,
    rank_to_display_score,
    score_to_percentile,
)


def test_fixed_top_buckets_per_position_group():
    players = [
        {"name": f"wr{i:02d}", "position": "WR", "year": 2000 + i, "score": 200 - i}
        for i in range(20)
    ]
    assign_position_group_ratings(players)
    counts = Counter(p["ovr"] for p in players)
    assert counts[99] == 1
    assert counts[98] == 2
    assert counts[97] == 5


def test_each_position_group_gets_its_own_99():
    players = [
        {"name": "qb", "position": "QB", "year": 2020, "score": 400},
        {"name": "wr", "position": "WR", "year": 2020, "score": 390},
        {"name": "cb", "position": "CB", "year": 2020, "score": 180},
    ]
    assign_position_group_ratings(players)
    assert sum(1 for p in players if p["ovr"] == 99) == 3


def test_all_time_rank_not_reset_each_year():
    players = [
        {"name": "old", "position": "RB", "year": 2010, "score": 300},
        {"name": "new", "position": "RB", "year": 2020, "score": 250},
    ]
    assign_position_group_ratings(players)
    assert players[0]["percentile"] > players[1]["percentile"]
    assert players[0]["ovr"] == 99
    assert players[1]["ovr"] == 98


def test_tied_scores_share_percentile():
    players = [
        {"name": "a", "position": "WR", "year": 2021, "score": 200},
        {"name": "b", "position": "WR", "year": 2022, "score": 200},
        {"name": "c", "position": "WR", "year": 2023, "score": 100},
    ]
    assign_position_group_ratings(players)
    assert players[0]["percentile"] == players[1]["percentile"]
    assert players[0]["ovr"] == 99
    assert players[1]["ovr"] == 98


def test_combined_defensive_and_line_groups():
    players = [
        {"name": "fs", "position": "FS", "year": 2020, "score": 200},
        {"name": "ss", "position": "SS", "year": 2021, "score": 180},
        {"name": "olb", "position": "OLB", "year": 2020, "score": 190},
        {"name": "mlb", "position": "MLB", "year": 2021, "score": 170},
        {"name": "de", "position": "DE", "year": 2020, "score": 160},
        {"name": "dt", "position": "DT", "year": 2021, "score": 140},
        {"name": "t", "position": "T", "year": 2020, "score": 5},
        {"name": "ol", "position": "OL", "year": 2021, "score": 400, "aggregate": True},
    ]
    assign_position_group_ratings(players)
    assert percentile_group(players[0]) == "S"
    assert percentile_group(players[1]) == "S"
    assert percentile_group(players[2]) == "LB"
    assert percentile_group(players[3]) == "LB"
    assert percentile_group(players[4]) == "DL"
    assert percentile_group(players[5]) == "DL"
    assert percentile_group(players[6]) == "OL"
    assert percentile_group(players[7]) == "OL"
    assert players[7]["ovr"] == 99
    assert players[0]["ovr"] == 99


def test_defense_pools_keep_cb_separate_from_db():
    players = [
        {"name": "cb1", "position": "CB", "year": 2020, "score": 200},
        {"name": "db1", "position": "DB", "year": 2020, "score": 180},
    ]
    assign_position_group_ratings(players)
    assert players[0]["ovr"] == 99
    assert players[1]["ovr"] == 99


def test_kickers_get_position_group_ratings():
    players = [
        {"name": "elite", "position": "K", "year": 2020, "score": 200},
        {"name": "avg", "position": "K", "year": 2021, "score": 120},
        {"name": "weak", "position": "K", "year": 2022, "score": 60},
    ]
    assign_position_group_ratings(players)
    assert percentile_group(players[0]) == "K"
    assert players[0]["ovr"] == 99
    assert players[1]["ovr"] == 98
    assert players[2]["ovr"] == 98


def test_rank_to_display_score_boundaries():
    assert rank_to_display_score(0, 100) == 99
    assert rank_to_display_score(1, 100) == 98
    assert rank_to_display_score(2, 100) == 98
    assert rank_to_display_score(7, 100) == 97
    assert rank_to_display_score(8, 100) == 96


def test_score_to_percentile_boundaries():
    assert score_to_percentile(0, 100) == 99
    assert score_to_percentile(99, 100) == 1
