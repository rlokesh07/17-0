"""Tests for cross-position ranking."""

from player_ranking import production_score, rank_score


def test_qb_uses_passing_stats_not_fantasy():
    stats = {"passing_yards": 4000, "passing_tds": 30, "passing_interceptions": 10}
    score, production, tenure = rank_score(
        fantasy_points=312.4, stats=stats, position="QB"
    )
    expected = production_score(stats)
    assert score == expected
    assert production == expected
    assert tenure == 0.0
    assert score != 312.4


def test_production_from_stats_when_no_fantasy():
    stats = {
        "receiving_yards": 1000,
        "receiving_tds": 10,
        "receptions": 80,
    }
    score, production, tenure = rank_score(fantasy_points=0.0, stats=stats)
    assert production == production_score(stats)
    assert score == production
    assert tenure == 0.0
    assert production == 160.0  # yards + TDs only; receptions ignored


def test_defender_uses_boosted_weights():
    stats = {"def_tackles_solo": 60, "def_sacks": 7, "def_interceptions": 1, "def_tds": 1}
    score, production, _ = rank_score(fantasy_points=0.0, stats=stats, position="ILB")
    assert score == production_score(stats, defensive=True)
    assert score > production_score(stats, defensive=False)


def test_kicker_boosted():
    score, _, _ = rank_score(
        fantasy_points=0.0,
        stats={"fg_made": 30, "fg_att": 32},
        position="K",
    )
    assert score >= 30 * 4.5


def test_punter_floor():
    score, _, _ = rank_score(fantasy_points=0.4, stats={}, position="P")
    assert score >= 85.0


def test_offense_uses_stats_not_fantasy():
    score, production, _ = rank_score(
        fantasy_points=200.0, stats={}, position="WR"
    )
    assert score == 0.0
    assert production == 0.0

    stats = {"receiving_yards": 1000, "receiving_tds": 10, "receptions": 80}
    score2, production2, _ = rank_score(
        fantasy_points=200.0, stats=stats, position="WR"
    )
    assert score2 == 160.0
    assert production2 == 160.0
    assert score2 != 200.0


def test_wr_ignores_rushing_stats():
    stats = {
        "receiving_yards": 892,
        "receiving_tds": 7,
        "rushing_yards": 225,
        "rushing_tds": 5,
    }
    score, production, _ = rank_score(fantasy_points=0.0, stats=stats, position="WR")
    assert score == 131.2  # 892 * 0.1 + 7 * 6
    assert production == score
