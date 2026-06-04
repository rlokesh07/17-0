"""Tests for curated lineup."""

from lineup_builder import build_curated_lineup


def _player(name, pos, score, pid=None, raw=None):
    return {
        "id": pid or name,
        "name": name,
        "position": pos,
        "score": score,
        "fantasy": score,
        "production": score,
        "year": 2020,
        "stats": [],
        "rawStats": raw or {},
    }


def test_curated_shape():
    players = [
        _player("QB1", "QB", 300),
        _player("RB1", "RB", 200),
        _player("WR1", "WR", 180),
        _player("WR2", "WR", 170),
        _player("WR3", "WR", 160),
        _player("WR4", "WR", 50),
        _player("TE1", "TE", 150),
        _player("OL1", "T", 5),
        _player("OL2", "G", 4),
        _player("D1", "CB", 120),
        _player("D2", "LB", 110),
        _player("D3", "DE", 100),
        _player("D4", "S", 20),
        _player("K1", "K", 99),
        _player("P1", "P", 85),
    ]
    lineup = build_curated_lineup(players, "Patriots", 2020)
    roles = [p["displayRole"] for p in lineup]
    assert roles == [
        "QB", "RB", "WR1", "WR2", "WR3", "TE", "OL",
        "CB", "LB", "DE", "K",
    ]
    assert "P1" not in [p["name"] for p in lineup]
    assert "WR4" not in [p["name"] for p in lineup]
    ol = next(p for p in lineup if p["displayRole"] == "OL")
    assert ol["aggregate"] is True
    assert "subtext" not in ol
    assert "members" not in ol
