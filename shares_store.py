"""Persist shared season squads for local dev (mirrors Vercel KV share:* keys)."""

from __future__ import annotations

import json
import re
import secrets
from datetime import UTC, datetime
from pathlib import Path

SHARES_PATH = Path(__file__).parent / "data" / "shares.json"
SHARE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,24}$")


def _load() -> dict:
    if not SHARES_PATH.exists():
        return {"version": 1, "shares": {}}
    with open(SHARES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data.get("shares"), dict):
        return {"version": 1, "shares": {}}
    return data


def _save(data: dict) -> None:
    SHARES_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = SHARES_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    tmp.replace(SHARES_PATH)


def _validate_squad(squad: dict) -> None:
    if not isinstance(squad, dict) or not squad:
        raise ValueError("squad is required")
    if len(squad) > 11:
        raise ValueError("squad must have at most 11 players")
    for slot, p in squad.items():
        if not isinstance(p, dict) or not p.get("name"):
            raise ValueError(f"name required for {slot}")
        if p.get("ovr") is None:
            raise ValueError(f"ovr required for {slot}")


def create_share(body: dict) -> dict:
    wins = int(body["wins"])
    losses = int(body["losses"])
    if wins < 0 or wins > 17 or losses < 0 or losses > 17 or wins + losses != 17:
        raise ValueError("wins and losses must sum to 17")
    squad = body.get("squad")
    _validate_squad(squad)

    share_id = secrets.token_urlsafe(6)
    games = body.get("games") or []
    if not isinstance(games, list):
        raise ValueError("games must be an array")

    payload = {
        "id": share_id,
        "wins": wins,
        "losses": losses,
        "perfect": bool(body.get("perfect")),
        "message": (body.get("message") or "")[:120] or None,
        "squad": squad,
        "games": [
            {
                "wk": int(g.get("wk", 0)),
                "abbr": str(g.get("abbr", "")),
                "win": bool(g.get("win")),
            }
            for g in games[:17]
        ],
        "createdAt": datetime.now(UTC).isoformat(),
    }

    data = _load()
    data["shares"][share_id] = payload
    _save(data)
    return {"id": share_id, "createdAt": payload["createdAt"]}


def get_share(share_id: str) -> dict | None:
    if not share_id or not SHARE_ID_RE.match(share_id):
        return None
    data = _load()
    return data.get("shares", {}).get(share_id)
