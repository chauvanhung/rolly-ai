"""
RSS sources for the news hub.

All feeds are free and require no API key. Each entry maps a source and a
topic so the aggregator can group and rank articles.
"""
from __future__ import annotations

# topic keys: moi (latest), the-gioi (world), kinh-doanh (business),
# the-thao (sports), giai-tri (entertainment), cong-nghe (tech),
# suc-khoe (health), phap-luat (law)

RSS_FEEDS: list[dict[str, str]] = [
    # VnExpress
    {"source": "VnExpress", "topic": "moi", "url": "https://vnexpress.net/rss/tin-moi-nhat.rss"},
    {"source": "VnExpress", "topic": "the-gioi", "url": "https://vnexpress.net/rss/the-gioi.rss"},
    {"source": "VnExpress", "topic": "kinh-doanh", "url": "https://vnexpress.net/rss/kinh-doanh.rss"},
    {"source": "VnExpress", "topic": "the-thao", "url": "https://vnexpress.net/rss/the-thao.rss"},
    {"source": "VnExpress", "topic": "giai-tri", "url": "https://vnexpress.net/rss/giai-tri.rss"},
    {"source": "VnExpress", "topic": "cong-nghe", "url": "https://vnexpress.net/rss/so-hoa.rss"},
    {"source": "VnExpress", "topic": "suc-khoe", "url": "https://vnexpress.net/rss/suc-khoe.rss"},
    {"source": "VnExpress", "topic": "phap-luat", "url": "https://vnexpress.net/rss/phap-luat.rss"},

    # Tuoi Tre
    {"source": "Tuoi Tre", "topic": "moi", "url": "https://tuoitre.vn/rss/tin-moi-nhat.rss"},
    {"source": "Tuoi Tre", "topic": "the-gioi", "url": "https://tuoitre.vn/rss/the-gioi.rss"},
    {"source": "Tuoi Tre", "topic": "kinh-doanh", "url": "https://tuoitre.vn/rss/kinh-doanh.rss"},
    {"source": "Tuoi Tre", "topic": "the-thao", "url": "https://tuoitre.vn/rss/the-thao.rss"},
    {"source": "Tuoi Tre", "topic": "giai-tri", "url": "https://tuoitre.vn/rss/giai-tri.rss"},
    {"source": "Tuoi Tre", "topic": "cong-nghe", "url": "https://tuoitre.vn/rss/nhip-song-so.rss"},

    # Thanh Nien
    {"source": "Thanh Nien", "topic": "moi", "url": "https://thanhnien.vn/rss/home.rss"},
    {"source": "Thanh Nien", "topic": "the-gioi", "url": "https://thanhnien.vn/rss/the-gioi.rss"},
    {"source": "Thanh Nien", "topic": "the-thao", "url": "https://thanhnien.vn/rss/the-thao.rss"},

    # Dan Tri
    {"source": "Dan Tri", "topic": "moi", "url": "https://dantri.com.vn/rss/home.rss"},
    {"source": "Dan Tri", "topic": "kinh-doanh", "url": "https://dantri.com.vn/rss/kinh-doanh.rss"},
    {"source": "Dan Tri", "topic": "cong-nghe", "url": "https://dantri.com.vn/rss/suc-manh-so.rss"},

    # VietnamNet
    {"source": "VietnamNet", "topic": "moi", "url": "https://vietnamnet.vn/rss/tin-moi-nong.rss"},
    {"source": "VietnamNet", "topic": "the-gioi", "url": "https://vietnamnet.vn/rss/the-gioi.rss"},
]

TOPICS: dict[str, str] = {
    "moi": "Mới nhất",
    "the-gioi": "Thế giới",
    "kinh-doanh": "Kinh doanh",
    "the-thao": "Thể thao",
    "giai-tri": "Giải trí",
    "cong-nghe": "Công nghệ",
    "suc-khoe": "Sức khỏe",
    "phap-luat": "Pháp luật",
}
