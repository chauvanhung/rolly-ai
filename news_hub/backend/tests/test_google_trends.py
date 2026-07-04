"""Tests for google_trends (Google Trends VN RSS) with mocked HTTP."""
import httpx

from app import google_trends as gt


HT = "https://trends.google.com/trending/rss"

SAMPLE = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:ht="{HT}" version="2.0">
  <channel>
    <item>
      <title>sầu riêng</title>
      <ht:approx_traffic>2000+</ht:approx_traffic>
      <ht:picture>http://img/1.jpg</ht:picture>
      <ht:news_item>
        <ht:news_item_title>Giá sầu riêng tăng mạnh</ht:news_item_title>
        <ht:news_item_url>http://news/1</ht:news_item_url>
        <ht:news_item_source>VnExpress</ht:news_item_source>
      </ht:news_item>
    </item>
    <item>
      <title>bão số 1</title>
      <ht:approx_traffic>100000+</ht:approx_traffic>
      <ht:picture>http://img/2.jpg</ht:picture>
      <ht:news_item>
        <ht:news_item_title>Bão đổ bộ Quảng Ninh</ht:news_item_title>
        <ht:news_item_url>http://news/2</ht:news_item_url>
        <ht:news_item_source>Dân trí</ht:news_item_source>
      </ht:news_item>
    </item>
  </channel>
</rss>"""


def _install_mock(monkeypatch, rss_text):
    def handler(request):
        return httpx.Response(200, text=rss_text)

    real_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        kwargs.pop("headers", None)
        real_init(self, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)


def test_traffic_to_int():
    assert gt._traffic_to_int("500+") == 500
    assert gt._traffic_to_int("2K+") == 2000
    assert gt._traffic_to_int("1M+") == 1_000_000
    assert gt._traffic_to_int("") == 0


async def test_parse_and_sort(monkeypatch):
    _install_mock(monkeypatch, SAMPLE)
    gt._CACHE["trends"] = []
    gt._CACHE["fetched_at"] = 0.0

    trends = await gt.refresh_search_trends(force=True)
    assert len(trends) == 2
    # Sorted by traffic desc -> bão số 1 (100000) first
    assert trends[0]["term"] == "bão số 1"
    assert trends[0]["traffic_value"] == 100000
    assert trends[0]["related"][0]["source"] == "Dân trí"
    assert trends[1]["term"] == "sầu riêng"


async def test_cache_used(monkeypatch):
    _install_mock(monkeypatch, SAMPLE)
    gt._CACHE["trends"] = [{"term": "cached", "traffic_value": 1, "related": []}]
    import time
    gt._CACHE["fetched_at"] = time.time()

    trends = await gt.refresh_search_trends(force=False)
    assert trends[0]["term"] == "cached"
