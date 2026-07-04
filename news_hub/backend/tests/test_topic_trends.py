"""Tests for topic_trends (Google News RSS per-topic) with mocked HTTP."""
import httpx
import pytest

from app import topic_trends as tt


def _rss(items):
    body = "".join(
        f"""
        <item>
          <title>{t}</title>
          <link>{u}</link>
          <pubDate>Sat, 04 Jul 2026 08:00:00 GMT</pubDate>
          <source url="http://x">{s}</source>
        </item>"""
        for (t, u, s) in items
    )
    return f"""<?xml version="1.0"?>
    <rss version="2.0"><channel>{body}</channel></rss>"""


def _install_mock(monkeypatch, rss_text):
    """Route every httpx GET through a MockTransport returning rss_text."""

    def handler(request):
        return httpx.Response(200, text=rss_text)

    real_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        kwargs.pop("headers", None)
        real_init(self, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)


def test_dedupe_key_normalizes():
    a = tt._dedupe_key("Faker 'đọ dáng' cùng Ronaldo")
    b = tt._dedupe_key("faker đọ dáng cùng ronaldo!!!")
    assert a == b


def test_split_title_removes_source():
    title, src = tt._split_title("Tiêu đề tin - VnExpress")
    assert title == "Tiêu đề tin"
    assert src == "VnExpress"


def test_split_title_no_dash():
    title, src = tt._split_title("Tiêu đề không nguồn")
    assert title == "Tiêu đề không nguồn"
    assert src == ""


async def test_refresh_dedupes_titles(monkeypatch):
    # Same headline from two sources -> should collapse to one item.
    rss = _rss([
        ("Tin nóng hôm nay - Báo A", "http://a/1", "Báo A"),
        ("Tin nóng hôm nay - Báo B", "http://b/2", "Báo B"),
        ("Tin khác - Báo C", "http://c/3", "Báo C"),
    ])
    _install_mock(monkeypatch, rss)
    tt._CACHE["topics"] = []
    tt._CACHE["fetched_at"] = 0.0

    topics = await tt.refresh_topic_trends(force=True, limit=6)
    assert len(topics) == len(tt.TOPIC_QUERIES)
    first = topics[0]
    titles = [i["title"] for i in first["items"]]
    assert titles.count("Tin nóng hôm nay") == 1
    assert "Tin khác" in titles


async def test_status_reports_counts(monkeypatch):
    rss = _rss([("Chỉ một tin - Báo A", "http://a/1", "Báo A")])
    _install_mock(monkeypatch, rss)
    tt._CACHE["topics"] = []
    tt._CACHE["fetched_at"] = 0.0

    await tt.refresh_topic_trends(force=True)
    status = tt.topic_trends_status()
    assert status["topic_count"] == len(tt.TOPIC_QUERIES)
    assert status["age_seconds"] is not None
    assert all(v == 1 for v in status["items_per_topic"].values())


async def test_empty_feed_keeps_cache(monkeypatch):
    # Seed cache, then serve empty feed -> cache should be preserved.
    tt._CACHE["topics"] = [{"key": "x", "label": "X", "icon": "", "items": [{"title": "old"}]}]
    tt._CACHE["fetched_at"] = 1.0
    _install_mock(monkeypatch, _rss([]))

    topics = await tt.refresh_topic_trends(force=True)
    assert topics == tt._CACHE["topics"]
    assert topics[0]["items"][0]["title"] == "old"
