"""Synchronize every accessible episode of the exact official Epicoco Spotify show.

Uses only the documented Spotify Web API and metadata; never downloads audio.
Needs Spotify app credentials as GitHub Actions secrets. If missing or the API
fails, keep the previously verified catalogue unchanged.
"""
from __future__ import annotations
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx

LOG = logging.getLogger(__name__)
ROOT = Path(__file__).parent
TARGET = ROOT / "site" / "podcast_catalog.json"
SHOW_ID = "3zi4rUpHdKFicPVbJ4pvXM"
ID_RE = re.compile(r"^[A-Za-z0-9]{22}$")
BASE = "https://api.spotify.com/v1"
MARKET = "IT"
PAGE_SIZE = 50
MAX_PAGES = 200


def authorized_token(client: httpx.Client, client_id: str, secret: str) -> str:
    response = client.post("https://accounts.spotify.com/api/token",
                           data={"grant_type": "client_credentials"},
                           auth=(client_id, secret), timeout=15)
    response.raise_for_status()
    token = response.json().get("access_token")
    if not isinstance(token, str) or not token:
        raise ValueError("Access token Spotify assente")
    return token


def spotify_get(client: httpx.Client, url: str, token: str, params=None):
    if not url.startswith(BASE + "/"):
        raise ValueError("Spotify API URL non verificato")
    for attempt in range(3):
        response = client.get(url, params=params,
                              headers={"Authorization": "Bearer " + token},
                              timeout=httpx.Timeout(20, connect=8))
        if response.status_code == 429 and attempt < 2:
            try:
                delay = float(response.headers.get("Retry-After", "1"))
            except ValueError:
                delay = 1
            time.sleep(min(max(delay, 1), 8))
            continue
        if response.status_code >= 500 and attempt < 2:
            time.sleep(1 + attempt)
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError("Spotify API temporaneamente non disponibile")


def fetch_all(client: httpx.Client, token: str) -> tuple[list[dict], int]:
    show = spotify_get(client, BASE + "/shows/" + SHOW_ID, token,
                       {"market": MARKET})
    if show.get("id") != SHOW_ID or show.get("type") != "show":
        raise ValueError("Il catalogo non corrisponde al podcast selezionato")
    LOG.info("Spotify show verified: %s", show.get("name", "")[:110])
    episodes, seen = [], set()
    total = None
    for page in range(MAX_PAGES):
        response = spotify_get(client, BASE + "/shows/" + SHOW_ID + "/episodes",
                               token, {"market": MARKET, "limit": PAGE_SIZE,
                                       "offset": page * PAGE_SIZE})
        if total is None:
            total = response.get("total")
            if not isinstance(total, int) or total < 0:
                raise ValueError("Numero totale episodi non valido")
        items = response.get("items")
        if not isinstance(items, list):
            raise ValueError("Pagina Spotify malformata")
        for episode in items:
            if not isinstance(episode, dict):
                continue
            eid = episode.get("id", "")
            title = episode.get("name", "")
            if not ID_RE.fullmatch(eid) or not isinstance(title, str) or not title.strip():
                continue
            if eid in seen:
                continue
            if episode.get("type", "episode") != "episode":
                continue
            seen.add(eid)
            description = episode.get("description", "")
            episodes.append({
                "id": eid,
                "title": title.strip()[:259],
                "description": (description if isinstance(description, str) else "")[:2800],
                "release_date": episode.get("release_date", ""),
                "topics": []
            })
        if not response.get("next"):
            break
        if not items:
            raise ValueError("Spotify ha indicato una pagina successiva ma ha restituito una pagina vuota")
    else:
        raise ValueError("Il catalogo supera il limite di sicurezza delle pagine: non pubblicato")
    if not episodes:
        raise ValueError("Nessuna puntata restituita: il catalogo precedente è conservato")
    return episodes, total


def build_catalog(episodes: list[dict], total: int, old: dict) -> dict:
    curated = {x.get("id"): x for x in old.get("episodes", []) if isinstance(x, dict)}
    combined = []
    for episode in episodes:
        original = curated.get(episode["id"], {})
        item = dict(episode)
        if isinstance(original.get("topics"), list):
            item["topics"] = [t for t in original["topics"] if isinstance(t, str)]
        combined.append(item)
    return {
        "show_id": SHOW_ID,
        "show_url": "https://open.spotify.com/show/" + SHOW_ID,
        "show_title": "Don Luigi Maria Epicoco",
        "source": "Spotify Web API ufficiale · episodi del canale specificato",
        "catalog_scope": "spotify_official_show",
        "complete": len(combined) == total,
        "total_episodes": total,
        "market": MARKET,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "episodes": combined,
    }


def main():
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "").strip()
    secret = os.getenv("SPOTIFY_CLIENT_SECRET", "").strip()
    if not client_id or not secret:
        print("Podcast Spotify: credenziali API non configurate; catalogo verificato esistente conservato.")
        return
    try:
        old = json.loads(TARGET.read_text(encoding="utf-8"))
        if old.get("show_id") != SHOW_ID:
            raise ValueError("ID del podcast originale errato")
        with httpx.Client(follow_redirects=False) as client:
            token = authorized_token(client, client_id, secret)
            episodes, total = fetch_all(client, token)
        new = build_catalog(episodes, total, old)
        # Compare actual episode metadata, do not commit a new timestamp
        # on each scheduled execution if the show has not changed.
        comparable = lambda d: {
            "show_id": d.get("show_id"),
            "catalog_scope": d.get("catalog_scope"),
            "complete": d.get("complete"),
            "total_episodes": d.get("total_episodes"),
            "episodes": d.get("episodes")
        }
        if comparable(new) == comparable(old):
            print("Podcast Spotify: catalogo invariato, puntate:", len(episodes))
            return
        text = json.dumps(new, ensure_ascii=False, separators=(",", ":")) + "\n"
        tmp = TARGET.with_suffix(".tmp")
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(TARGET)
        print("Podcast Spotify: sincronizzate", len(episodes), "puntate su", total,
              "· archivio completo:", new["complete"])
    except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError, RuntimeError) as exc:
        # Never destroy the existing catalogue on temporary API failures.
        LOG.warning("Spotify API non disponibile (%s): catalogo conservato.", type(exc).__name__)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
