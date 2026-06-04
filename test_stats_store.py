"""Tests for global season stats storage."""

import json

import stats_store


def test_record_win_updates_counts(tmp_path, monkeypatch):
    stats_path = tmp_path / "season-stats.json"
    monkeypatch.setattr(stats_store, "STATS_PATH", stats_path)

    first = stats_store.record_win(14)
    assert first["totalSeasons"] == 1
    assert first["distribution"][3]["wins"] == 14
    assert first["distribution"][3]["count"] == 1
    assert first["distribution"][3]["pct"] == 100.0

    second = stats_store.record_win(17)
    assert second["totalSeasons"] == 2
    assert second["distribution"][0]["wins"] == 17
    assert second["distribution"][0]["count"] == 1
    assert second["distribution"][0]["pct"] == 50.0
    assert second["distribution"][3]["pct"] == 50.0

    saved = json.loads(stats_path.read_text(encoding="utf-8"))
    assert saved["byWins"]["14"] == 1
    assert saved["byWins"]["17"] == 1


def test_get_stats_returns_zeroed_distribution(tmp_path, monkeypatch):
    stats_path = tmp_path / "season-stats.json"
    monkeypatch.setattr(stats_store, "STATS_PATH", stats_path)

    payload = stats_store.get_stats()
    assert payload["totalSeasons"] == 0
    assert len(payload["distribution"]) == 13
    assert payload["distribution"][-1]["wins"] == 5
    assert payload["distribution"][-1]["pct"] == 0.0
