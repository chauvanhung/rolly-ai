import os
import sys
from datetime import datetime, timedelta, timezone

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine
from app.models import Base
from app.services.rbac import ensure_demo_super_admin, ensure_permissions_and_roles
from app.services.crud import make_slug
from app.models import (
    Category, Tag, Teacher, Sutra, SutraChapter, DharmaTalk,
    Lecture, Event, Retreat, CharityProgram, NewsPost, MediaAsset,
    ContactMessage, Subscriber
)

def run_seed():
    db = SessionLocal()
    try:
        # Create all tables first
        Base.metadata.create_all(bind=engine)
        
        # Ensure RBAC roles and super admin
        ensure_permissions_and_roles(db)
        ensure_demo_super_admin(db)
        
        # Clean existing data if any (only for fresh seed, optional)
        # For safety, we only seed if Category table is empty.
        if db.query(Category).count() > 0:
            print("Database already contains seed data. Skipping...")
            return
            
        print("Starting Database Seeding...")

        # 1. Categories
        cats_data = [
            # Sutras
            {"name": "Kinh Nguyên Thủy", "slug": "kinh-nguyen-thuy", "module": "sutras", "sort_order": 1},
            {"name": "Kinh Đại Thừa", "slug": "kinh-dai-thua", "module": "sutras", "sort_order": 2},
            {"name": "Kinh Nhật Tụng", "slug": "kinh-nhat-tung", "module": "sutras", "sort_order": 3},
            # Dharma Talks
            {"name": "Phật Pháp Căn Bản", "slug": "phat-phap-can-ban", "module": "dharma_talks", "sort_order": 1},
            {"name": "Phật Pháp Ứng Dụng", "slug": "phat-phap-ung-dung", "module": "dharma_talks", "sort_order": 2},
            {"name": "Hỏi Đáp Phật Pháp", "slug": "hoi-dap-phat-phap", "module": "dharma_talks", "sort_order": 3},
            # Lectures
            {"name": "Khóa Tu Mùa Hè", "slug": "khoa-tu-mua-he", "module": "lectures", "sort_order": 1},
            {"name": "Pháp Thoại Định Kỳ", "slug": "phap-thoai-dinh-ky", "module": "lectures", "sort_order": 2},
            # News
            {"name": "Thông Báo", "slug": "thong-bao", "module": "news_posts", "sort_order": 1},
            {"name": "Tin Hoạt Động", "slug": "tin-hoat-dong", "module": "news_posts", "sort_order": 2},
        ]
        categories: dict[str, Category] = {}
        for c in cats_data:
            cat = Category(**c)
            db.add(cat)
            db.flush()
            categories[c["slug"]] = cat

        # 2. Tags
        tags_data = ["Tứ Diệu Đế", "Bát Chánh Đạo", "Thiền Định", "Chánh Niệm", "Nhân Quả", "Từ Bi", "Trí Tuệ", "Vô Thường"]
        tags: dict[str, Tag] = {}
        for t_name in tags_data:
            tag = Tag(name=t_name, slug=make_slug(t_name))
            db.add(tag)
            db.flush()
            tags[t_name] = tag

        # 3. Teachers
        teachers_data = [
            {
                "name": "Thiền sư Thích Nhất Hạnh",
                "slug": "thich-nhat-hanh",
                "avatar_url": "/api/uploads/seeds/teacher_tnh.jpg",
                "bio": "Thiền sư Thích Nhất Hạnh là một bậc thầy hướng dẫn tâm linh, một nhà văn, nhà thơ và một nhà hoạt động xã hội vì hòa bình nổi tiếng thế giới. Thầy là người sáng lập Đạo tràng Mai Thôn và dòng tu Tiếp Hiện.",
                "organization": "Đạo tràng Mai Thôn, Pháp",
                "status": "published",
            },
            {
                "name": "Hòa thượng Thích Trí Quảng",
                "slug": "thich-tri-quang",
                "avatar_url": "/api/uploads/seeds/teacher_ttq.jpg",
                "bio": "Đại lão Hòa thượng Thích Trí Quảng hiện là Pháp chủ Giáo hội Phật giáo Việt Nam. Ngài là một nhà Phật học lỗi lạc, có đóng góp to lớn cho sự phát triển của Phật giáo Việt Nam cận đại.",
                "organization": "Chùa Huê Nghiêm, TP. Hồ Chí Minh",
                "status": "published",
            },
            {
                "name": "Thiền sư Thích Thanh Từ",
                "slug": "thich-thanh-tu",
                "avatar_url": "/api/uploads/seeds/teacher_ttt.jpg",
                "bio": "Hòa thượng Thích Thanh Từ là người có công khôi phục dòng Thiền Trúc Lâm Yên Tử tại Việt Nam. Ngài đã sáng lập nhiều thiền viện lớn trong và ngoài nước nhằm hướng dẫn tu học thiền tông.",
                "organization": "Thiền viện Trúc Lâm Đà Lạt",
                "status": "published",
            },
            {
                "name": "Thượng tọa Thích Chân Tính",
                "slug": "thich-chan-tinh",
                "avatar_url": "/api/uploads/seeds/teacher_tct.jpg",
                "bio": "Thượng tọa Thích Chân Tính là trụ trì Chùa Hoằng Pháp, người khởi xướng và tổ chức thành công các Khóa tu Phật thất, Khóa tu Mùa hè dành cho học sinh, sinh viên trên cả nước.",
                "organization": "Chùa Hoằng Pháp, Hóc Môn",
                "status": "published",
            }
        ]
        teachers: list[Teacher] = []
        for t in teachers_data:
            teacher = Teacher(**t)
            db.add(teacher)
            db.flush()
            teachers.append(teacher)

        # 4. Sutras (6 Kinh)
        sutras_data = [
            {
                "title": "Kinh Pháp Cú (Dhammapada)",
                "slug": "kinh-phap-cu",
                "sutra_group": "Nguyên Thủy",
                "translator": "Hòa thượng Thích Minh Châu",
                "source": "Kinh Tạng Pali - Tiểu Bộ Kinh",
                "summary": "Kinh Pháp Cú là tập hợp 423 câu thơ ngắn gọn do Đức Phật thuyết giảng trong nhiều dịp khác nhau. Đây là cuốn kinh phổ biến nhất trong hệ thống Phật học Nguyên Thủy.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Kinh Pháp Cú đúc kết những lời dạy đạo đức và tâm linh của Đức Phật, hướng dẫn con người xa lìa ác nghiệp, thực hành thiện pháp để đạt bình an.",
                "cover_url": "/api/uploads/seeds/sutra_phapcu.jpg",
                "pdf_url": "/api/uploads/seeds/kinh_phap_cu.pdf",
                "reading_minutes": 45,
                "category_id": categories["kinh-nguyen-thuy"].id,
                "tags_csv": "Trí Tuệ,Từ Bi,Nhân Quả",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Phẩm Song Yếu (Yamaka-vagga)", "body": "1. Trong các pháp, tâm dẫn đầu, tâm làm chủ, tâm tạo tác. Nếu nói hoặc làm với tâm ô nhiễm, sự đau khổ sẽ theo sau như bánh xe lăn theo chân con vật kéo.\n2. Trong các pháp, tâm dẫn đầu, tâm làm chủ, tâm tạo tác. Nếu nói hoặc làm với tâm thanh tịnh, niềm vui sướng sẽ theo sau như bóng không rời hình.", "sort_order": 1},
                    {"title": "Phẩm Không Phóng Dật (Appamada-vagga)", "body": "21. Không phóng dật là đường sống, phóng dật là đường chết. Người không phóng dật không bao giờ chết, kẻ phóng dật giống như đã chết rồi.", "sort_order": 2}
                ]
            },
            {
                "title": "Kinh Chuyển Pháp Luân",
                "slug": "kinh-chuyen-phap-luan",
                "sutra_group": "Nguyên Thủy",
                "translator": "Hòa thượng Thích Minh Châu",
                "source": "Kinh Tạng Pali - Tương Ưng Bộ Kinh",
                "summary": "Bài kinh đầu tiên Đức Phật giảng thuyết cho năm anh em Kiều Trần Như tại Vườn Lộc Uyển, thiết lập nền tảng của Tứ Diệu Đế và Con Đường Bát Chánh.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Đức Phật chỉ rõ hai cực đoan cần tránh là lợi dưỡng và khổ hạnh, đồng thời khai thị Trung Đạo đem lại nhãn quan, tri kiến đưa đến tịch tịnh.",
                "cover_url": "/api/uploads/seeds/sutra_chuyenphapluan.jpg",
                "reading_minutes": 20,
                "category_id": categories["kinh-nguyen-thuy"].id,
                "tags_csv": "Tứ Diệu Đế,Bát Chánh Đạo",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Khai Thị Trung Đạo", "body": "Có hai cực đoan này, này các Tỷ-kheo, một người xuất gia không nên thực hành. Thế nào là hai? Một là say đắm trong các dục lạc, điều ấy thấp hèn, phàm phu. Hai là tự hành hạ khổ hạnh, điều ấy đau khổ, không xứng đáng.", "sort_order": 1},
                    {"title": "Tứ Thánh Đế", "body": "Đây là Thánh đế về Khổ, này các Tỷ-kheo: Sanh là khổ, già là khổ, bệnh là khổ, chết là khổ... Đây là Thánh đế về Khổ tập: Chính là ái đưa đến tái sanh... Đây là Thánh đế về Khổ diệt: Chính là sự đoạn diệt vô dư của ái... Đây là Thánh đế về Khổ diệt đạo: Chính là con đường tám ngành cao quý.", "sort_order": 2}
                ]
            },
            {
                "title": "Kinh Vô Ngã Tướng",
                "slug": "kinh-vo-nga-tuong",
                "sutra_group": "Nguyên Thủy",
                "translator": "Hòa thượng Thích Minh Châu",
                "source": "Kinh Tạng Pali - Tương Ưng Bộ Kinh",
                "summary": "Bài kinh thứ hai của Đức Phật giảng giải về tính chất vô ngã của năm uẩn (Sắc, Thọ, Tưởng, Hành, Thức), giúp các vị tỳ-kheo chứng đắc A-la-hán.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Ngũ uẩn đều vô thường, khổ và vô ngã. Thấy rõ như vậy thì không còn chấp trước vào sắc thân hay tâm ý là tôi hay của tôi.",
                "cover_url": "/api/uploads/seeds/sutra_vongatuong.jpg",
                "reading_minutes": 15,
                "category_id": categories["kinh-nguyen-thuy"].id,
                "tags_csv": "Trí Tuệ,Vô Thường",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Vô Ngã của Ngũ Uẩn", "body": "Sắc, này các Tỷ-kheo, là vô ngã. Nếu sắc là ngã, sắc không phải gánh chịu bệnh hoạn, và người ta có thể ra lệnh cho sắc: 'Hãy như thế này, chớ có như thế kia.' Nhưng vì sắc là vô ngã, nên sắc phải gánh chịu bệnh hoạn...", "sort_order": 1}
                ]
            },
            {
                "title": "Kinh Từ Bi (Karaniya Metta Sutta)",
                "slug": "kinh-tu-bi",
                "sutra_group": "Nguyên Thủy",
                "translator": "Hòa thượng Thích Minh Châu",
                "source": "Kinh Tạng Pali - Tiểu Bộ Kinh",
                "summary": "Kinh dạy về phương pháp tu tập tình thương yêu rộng lớn không bờ bến đối với tất cả chúng sanh, tạo năng lượng hòa bình và sự bảo hộ lành mạnh.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Mong sao cho tất cả chúng sanh được an vui và thái bình, được tràn đầy hạnh phúc, bất luận là chúng sanh nào.",
                "cover_url": "/api/uploads/seeds/sutra_tubi.jpg",
                "reading_minutes": 10,
                "category_id": categories["kinh-nguyen-thuy"].id,
                "tags_csv": "Từ Bi",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Nguyện Từ Bi", "body": "Như mẹ hiền bảo bọc con thơ, dù chỉ có một con duy nhất, vẫn hết lòng bảo vệ con mình. Cũng vậy, đối với tất cả chúng sanh, hãy trải rộng tấm lòng từ bi vô lượng...", "sort_order": 1}
                ]
            },
            {
                "title": "Kinh Phước Đức (Mangala Sutta)",
                "slug": "kinh-phuoc-duc",
                "sutra_group": "Nguyên Thủy",
                "translator": "Thiền sư Thích Nhất Hạnh dịch",
                "source": "Kinh Tạng Pali - Tiểu Bộ Kinh",
                "summary": "Mười bài kệ nói về những điềm lành lớn nhất, những việc làm thiết thực kiến tạo cuộc sống hạnh phúc và thanh tịnh ngay tại hiện đời.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Không thân cận kẻ ngu, chỉ gần gũi người trí, tôn kính bậc đáng kính, là điềm lành lớn nhất.",
                "cover_url": "/api/uploads/seeds/sutra_phuocduc.jpg",
                "reading_minutes": 10,
                "category_id": categories["kinh-nhat-tung"].id,
                "tags_csv": "Nhân Quả",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Điềm Lành Lớn Nhất", "body": "Sống trong môi trường tốt, được tạo tác duyên lành, được đi trên đường chánh, là điềm lành lớn nhất... Hiếu thảo với cha mẹ, yêu thương gia đình mình, hành nghề không tổn hại, là điềm lành lớn nhất.", "sort_order": 1}
                ]
            },
            {
                "title": "Kinh Sám Hối Hồng Danh",
                "slug": "kinh-sam-hoi-hong-danh",
                "sutra_group": "Đại Thừa",
                "translator": "Hòa thượng Thích Trí Quang dịch",
                "source": "Nghi thức tụng niệm Đại thừa",
                "summary": "Nghi thức lạy và tụng danh hiệu của chư Phật nhằm thanh tịnh ba nghiệp (thân, khẩu, ý), hóa giải chướng ngại tâm linh và thăng hoa trí tuệ.",
                "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Chí tâm đảnh lễ chư Phật mười phương thế giới, cầu xin sám hối mọi lỗi lầm do vô minh từ muôn kiếp.",
                "cover_url": "/api/uploads/seeds/sutra_samhoi.jpg",
                "reading_minutes": 30,
                "category_id": categories["kinh-nhat-tung"].id,
                "tags_csv": "Thiền Định",
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "chapters": [
                    {"title": "Đảnh Lễ Hồng Danh", "body": "Nam mô Phổ Quang Phật, Nam mô Phổ Minh Phật, Nam mô Phổ Tịnh Phật... Nguyện chư Phật gia hộ cho chúng con tiêu trừ mọi tội chướng nghiệp chướng từ vô thủy đến nay.", "sort_order": 1}
                ]
            }
        ]
        for s in sutras_data:
            ch_list = s.pop("chapters")
            sutra = Sutra(**s)
            db.add(sutra)
            db.flush()
            for ch in ch_list:
                chapter = SutraChapter(sutra_id=sutra.id, **ch)
                db.add(chapter)
            db.flush()

        # 5. Dharma Talks (8 Bài pháp)
        talks_data = [
            {"title": "Ý nghĩa của Vô Thường", "excerpt": "Hiểu rõ về tính vô thường của vạn vật giúp ta bớt bám chấp, mở lòng đón nhận và trân quý phút giây hiện tại.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Vô thường không phải là một quan niệm bi quan, mà là một sự thật giúp giải phóng ta khỏi những khổ đau khi cố gắng níu giữ những thứ luôn thay đổi...", "author_id": teachers[0].id, "category_id": categories["phat-phap-can-ban"].id, "tags_csv": "Vô Thường,Trí Tuệ"},
            {"title": "Khổ và con đường Diệt Khổ (Tứ Diệu Đế)", "excerpt": "Tứ Diệu Đế là giáo lý cốt lõi mở đường cho sự chấm dứt các nỗi đau khổ và đạt tới tự tại.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Đức Phật chỉ ra bản chất của Khổ, nguyên nhân của Khổ là tham ái, sự chấm dứt Khổ là Niết-bàn, và con đường đưa đến Khổ diệt là Bát Chánh Đạo...", "author_id": teachers[1].id, "category_id": categories["phat-phap-can-ban"].id, "tags_csv": "Tứ Diệu Đế,Trí Tuệ"},
            {"title": "Bát Chánh Đạo: Con đường sống tỉnh thức", "excerpt": "Tám chi phần của con đường chân chánh giúp hướng dẫn suy nghĩ, hành động và tâm thức tiến đến chánh định.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Gồm Chánh kiến, Chánh tư duy, Chánh ngữ, Chánh nghiệp, Chánh mạng, Chánh tinh tấn, Chánh niệm, Chánh định. Đây là cẩm nang sống tỉnh giác hằng ngày...", "author_id": teachers[1].id, "category_id": categories["phat-phap-can-ban"].id, "tags_csv": "Bát Chánh Đạo,Chánh Niệm"},
            {"title": "Hiểu về Nghiệp và Luân Hồi", "excerpt": "Nhân quả nghiệp báo vận hành như một quy luật tự nhiên, định hình tương lai qua từng ý niệm hiện tại.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Nghiệp không phải định mệnh áp đặt. Nghiệp là hành động có ý chủ động. Thay đổi nghiệp nhân hiện tại sẽ chuyển hóa nghiệp quả tương lai...", "author_id": teachers[2].id, "category_id": categories["phat-phap-can-ban"].id, "tags_csv": "Nhân Quả"},
            {"title": "Thiền và Chánh Niệm trong đời sống hằng ngày", "excerpt": "Thiền không chỉ ngồi yên, thiền là sự nhận biết rõ ràng từng việc ta đang làm trong giây phút hiện tại.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Khi đi biết mình đang đi, thở biết đang thở, làm việc biết đang làm việc. Đó là chánh niệm đưa lại bình an và định lực trong tâm hồn...", "author_id": teachers[0].id, "category_id": categories["phat-phap-ung-dung"].id, "tags_csv": "Thiền Định,Chánh Niệm"},
            {"title": "Đạo Hiếu trong Phật giáo", "excerpt": "Tri ân và báo ân cha mẹ là nền tảng đạo đức căn bản nhất của người học Phật.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Báo hiếu không chỉ ở khía cạnh vật chất mà còn ở việc hướng dẫn cha mẹ quy hướng Tam bảo, biết tu tập và tin sâu nhân quả thiện lành...", "author_id": teachers[3].id, "category_id": categories["phat-phap-ung-dung"].id, "tags_csv": "Từ Bi"},
            {"title": "Sống từ bi giữa cuộc đời đầy biến động", "excerpt": "Từ bi là năng lượng mát lành che chở tâm hồn ta trước những tổn thương và đem lại hạnh phúc cho mọi người.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Từ là đem lại niềm vui, Bi là trút bỏ đau khổ. Từ bi phải đi đôi với trí tuệ để tình thương có hiệu quả thực chất và bền vững...", "author_id": teachers[0].id, "category_id": categories["phat-phap-ung-dung"].id, "tags_csv": "Từ Bi"},
            {"title": "Phật pháp cho người trẻ: Tìm lại bình yên", "excerpt": "Ứng dụng những lời dạy hiền hòa của Phật giáo để vượt qua stress, áp lực học tập và định hướng cuộc đời.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Người trẻ đối diện nhiều xáo động của xã hội hiện đại. Học Phật giúp các bạn định tĩnh tâm hồn, sống sâu sắc và nuôi dưỡng lý tưởng cao đẹp...", "author_id": teachers[3].id, "category_id": categories["hoi-dap-phat-phap"].id, "tags_csv": "Trí Tuệ,Chánh Niệm"}
        ]
        for t in talks_data:
            talk = DharmaTalk(
                slug=make_slug(t["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **t
            )
            db.add(talk)
        db.flush()

        # 6. Lectures (8 Video + 6 Audio)
        lectures_data = [
            # Videos
            {"title": "Chánh niệm là cốt tủy của thiền tập", "description": "Thiền sư Thích Nhất Hạnh chia sẻ sâu sắc về vai trò của chánh niệm và hơi thở trong thực tập thiền.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[0].id, "duration_seconds": 1800, "series_name": "Nghệ thuật sống chánh niệm", "series_order": 1, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Chánh Niệm,Thiền Định"},
            {"title": "Làm thế nào để chuyển hóa cơn giận", "description": "Phương pháp nhận diện, ôm ấp và chuyển hóa năng lượng sân hận theo tinh thần Phật giáo ứng dụng.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[0].id, "duration_seconds": 2100, "series_name": "Nghệ thuật sống chánh niệm", "series_order": 2, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Từ Bi,Chánh Niệm"},
            {"title": "Ý nghĩa của tình thương không điều kiện", "description": "Khám phá lòng từ bi vô lượng, tình thương đích thực vượt trên sự chiếm hữu và ích kỷ thông thường.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[0].id, "duration_seconds": 2400, "series_name": "Nghệ thuật sống chánh niệm", "series_order": 3, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Từ Bi"},
            {"title": "Tìm lại chính mình trong từng hơi thở", "description": "Bài thiền hướng dẫn cụ thể về hơi thở ý thức nhằm đưa tâm về với thân trong giây phút hiện tại.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[0].id, "duration_seconds": 1500, "series_name": "Nghệ thuật sống chánh niệm", "series_order": 4, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Chánh Niệm,Thiền Định"},
            {"title": "Nhận diện những hạt giống hạnh phúc", "description": "Bài pháp thoại hướng dẫn cách chăm sóc các hạt giống thiện lành, yêu thương trong chiều sâu tâm thức.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[3].id, "duration_seconds": 3200, "series_name": "Khóa tu Ươm Mầm Từ Bi", "series_order": 1, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Từ Bi"},
            {"title": "Thiết lập bình an trong gia đình", "description": "Chia sẻ về cách ứng xử, lắng nghe sâu và ái ngữ để hòa giải mâu thuẫn giữa các thành viên gia đình.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[3].id, "duration_seconds": 2800, "series_name": "Khóa tu Ươm Mầm Từ Bi", "series_order": 2, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Từ Bi"},
            {"title": "Lắng nghe để hiểu và thương", "description": "Kỹ năng thực hành lắng nghe sâu (nhĩ căn viên thông) để thấu hiểu nỗi khổ niềm đau của người đối diện.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[3].id, "duration_seconds": 3000, "series_name": "Khóa tu Ươm Mầm Từ Bi", "series_order": 3, "category_id": categories["khoa-tu-mua-he"].id, "tags_csv": "Từ Bi,Chánh Niệm"},
            {"title": "Đối diện với sinh tử không sợ hãi", "description": "Hòa thượng Thích Trí Quảng giảng giải giáo lý về sinh tử và phương pháp giữ tâm an định trước vô thường.", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "teacher_id": teachers[1].id, "duration_seconds": 3600, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Trí Tuệ,Vô Thường"},
            
            # Audios
            {"title": "Con đường Bát Chánh Đạo - Phần 1", "description": "Giảng giải chi tiết về Chánh kiến và Chánh tư duy, hai ngọn hải đăng trí tuệ định hướng đường tu học.", "audio_url": "/api/uploads/seeds/audio_batchanhdao1.mp3", "teacher_id": teachers[1].id, "duration_seconds": 2700, "series_name": "Giáo lý căn bản", "series_order": 1, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Bát Chánh Đạo,Trí Tuệ"},
            {"title": "Con đường Bát Chánh Đạo - Phần 2", "description": "Đi sâu vào Chánh ngữ, Chánh nghiệp, Chánh mạng - khía cạnh đạo đức thực tiễn trong cuộc sống.", "audio_url": "/api/uploads/seeds/audio_batchanhdao2.mp3", "teacher_id": teachers[1].id, "duration_seconds": 2850, "series_name": "Giáo lý căn bản", "series_order": 2, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Bát Chánh Đạo"},
            {"title": "Nuôi dưỡng lòng từ bi", "description": "Phương pháp thiền rải tâm từ đến mọi người xung quanh, bắt đầu từ bản thân cho đến muôn loài chúng sanh.", "audio_url": "/api/uploads/seeds/audio_nuoiduongtubi.mp3", "teacher_id": teachers[2].id, "duration_seconds": 1800, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Từ Bi"},
            {"title": "Tứ Vô Lượng Tâm", "description": "Nghiên cứu về bốn tâm cao thượng: Từ, Bi, Hỷ, Xả và cách mở rộng biên giới của tấm lòng.", "audio_url": "/api/uploads/seeds/audio_tuvoluongtam.mp3", "teacher_id": teachers[2].id, "duration_seconds": 2400, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Từ Bi"},
            {"title": "Sức mạnh của sự buông xả", "description": "Làm thế nào để buông bỏ gánh nặng phiền não, lo âu quá khứ và tương lai nhằm an trú hạnh phúc hiện tại.", "audio_url": "/api/uploads/seeds/audio_buongxa.mp3", "teacher_id": teachers[2].id, "duration_seconds": 2000, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Thiền Định,Vô Thường"},
            {"title": "Vượt qua nỗi cô đơn và lo lắng", "description": "Ứng dụng thiền định và sự hiểu biết chân chánh để đối diện và xoa dịu những cơn sóng cảm xúc tiêu cực.", "audio_url": "/api/uploads/seeds/audio_vượtquacodon.mp3", "teacher_id": teachers[2].id, "duration_seconds": 2200, "category_id": categories["phap-thoai-dinh-ky"].id, "tags_csv": "Thiền Định,Chánh Niệm"}
        ]
        for l in lectures_data:
            lec = Lecture(
                slug=make_slug(l["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **l
            )
            db.add(lec)
        db.flush()

        # 7. Events (4 Sự kiện Phật sự)
        events_data = [
            {"title": "Đại lễ Phật Đản (Vesak 2026)", "description": "Chào mừng ngày Đức Phật đản sanh, thành đạo và nhập Niết-bàn. Đại lễ gồm các nghi thức diễu hành xe hoa, tụng kinh Khánh đản và tắm Phật tôn kính.", "location": "Chánh Điện chùa Huê Nghiêm", "start_at": datetime.now(timezone.utc) + timedelta(days=10, hours=8), "end_at": datetime.now(timezone.utc) + timedelta(days=10, hours=12), "capacity": 500, "registration_open": False},
            {"title": "Đại lễ Vu Lan Báo Hiếu", "description": "Lễ hội văn hóa Phật giáo tưởng nhớ công ơn sinh thành dưỡng dục của cha mẹ. Chương trình có nghi thức cài hoa hồng và dâng y cúng dường chư Tăng.", "location": "Khuôn viên chùa Huê Nghiêm", "start_at": datetime.now(timezone.utc) + timedelta(days=30, hours=7), "end_at": datetime.now(timezone.utc) + timedelta(days=30, hours=11), "capacity": 600, "registration_open": False},
            {"title": "Lễ Quy Y Tam Bảo định kỳ", "description": "Truyền thọ ngũ giới và làm lễ chính thức trở thành Phật tử tại gia cho những thiện nam tín nữ phát tâm tu học.", "location": "Nhà Tổ", "start_at": datetime.now(timezone.utc) + timedelta(days=15, hours=9), "end_at": datetime.now(timezone.utc) + timedelta(days=15, hours=11), "capacity": 100, "registration_open": True},
            {"title": "Khóa tu Một Ngày An Lạc tháng 7", "description": "Ngày tu tập định kỳ dành cho Phật tử đạo tràng, gồm tụng kinh niệm Phật, nghe pháp thoại và thiền hành chánh niệm.", "location": "Giảng Đường Huệ Đăng", "start_at": datetime.now(timezone.utc) + timedelta(days=5, hours=8), "end_at": datetime.now(timezone.utc) + timedelta(days=5, hours=17), "capacity": 200, "registration_open": True}
        ]
        for e in events_data:
            evt = Event(
                slug=make_slug(e["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **e
            )
            db.add(evt)
        db.flush()

        # 8. Retreats (3 Khóa tu)
        retreats_data = [
            {
                "title": "Khóa tu Mùa Hè 'Ươm Mầm Từ Bi'",
                "description": "Khóa tu dưỡng tâm tính dành cho thanh thiếu niên học sinh, sinh viên nhằm bồi dưỡng đạo đức, học cách hiếu kính cha mẹ và quản lý cảm xúc trước áp lực cuộc sống.",
                "schedule_json": json.dumps([
                    {"time": "05:00", "activity": "Thức chúng & Thiền hành buổi sáng"},
                    {"time": "07:30", "activity": "Dùng điểm tâm chánh niệm"},
                    {"time": "08:30", "activity": "Nghe giảng sư chia sẻ giáo lý"},
                    {"time": "11:30", "activity": "Dùng cơm trưa trong im lặng"},
                    {"time": "14:00", "activity": "Sinh hoạt tập thể & Hỏi đáp tâm lý"},
                    {"time": "18:00", "activity": "Dùng cơm tối"},
                    {"time": "19:30", "activity": "Thiền hướng dẫn & Tụng kinh Từ Bi"}
                ]),
                "teacher_id": teachers[3].id,
                "location": "Thiền viện Trúc Lâm Đà Lạt",
                "start_at": datetime.now(timezone.utc) + timedelta(days=20),
                "end_at": datetime.now(timezone.utc) + timedelta(days=25),
                "capacity": 150,
                "registration_open": True,
                "cover_url": "/api/uploads/seeds/retreat_summer.jpg"
            },
            {
                "title": "Khóa tu Thiền Chánh Niệm 7 ngày",
                "description": "Khóa tu thiền chuyên sâu học và thực hành thiền tọa, thiền hành, và thiền trà trong im lặng hoàn toàn (Noble Silence). Thích hợp cho những vị muốn làm sạch tâm ý và gia tăng định lực.",
                "schedule_json": json.dumps([
                    {"time": "04:30", "activity": "Nghe chuông & Ngồi thiền"},
                    {"time": "07:00", "activity": "Dùng điểm tâm"},
                    {"time": "09:00", "activity": "Pháp thoại thiền tập"},
                    {"time": "11:30", "activity": "Dùng ngọ chay"},
                    {"time": "14:30", "activity": "Tọa thiền & Trình pháp cùng giảng sư"},
                    {"time": "19:00", "activity": "Ngồi thiền & Chỉ tịnh"}
                ]),
                "teacher_id": teachers[0].id,
                "location": "Đạo tràng Mai Thôn, Pháp",
                "start_at": datetime.now(timezone.utc) + timedelta(days=40),
                "end_at": datetime.now(timezone.utc) + timedelta(days=47),
                "capacity": 50,
                "registration_open": True,
                "cover_url": "/api/uploads/seeds/retreat_meditation.jpg"
            },
            {
                "title": "Khóa tu Xuất Gia Gieo Duyên 3 ngày",
                "description": "Cơ hội thử trải nghiệm đời sống xuất gia thực thụ của các bậc tăng lữ, thọ nhận giới luật sa-di, cạo tóc (tự nguyện) hoặc đắp y học oai nghi tế hạnh.",
                "schedule_json": json.dumps([
                    {"time": "04:00", "activity": "Tụng kinh hô chuông"},
                    {"time": "08:00", "activity": "Học oai nghi xuất gia"},
                    {"time": "11:00", "activity": "Thọ trai khu khất thực"},
                    {"time": "14:00", "activity": "Lao tác công quả tĩnh lặng"}
                ]),
                "teacher_id": teachers[2].id,
                "location": "Thiền viện Trúc Lâm Yên Tử",
                "start_at": datetime.now(timezone.utc) - timedelta(days=5),
                "end_at": datetime.now(timezone.utc) - timedelta(days=2),
                "capacity": 80,
                "registration_open": False,
                "cover_url": "/api/uploads/seeds/retreat_monk.jpg"
            }
        ]
        for r in retreats_data:
            rt = Retreat(
                slug=make_slug(r["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **r
            )
            db.add(rt)
        db.flush()

        # 9. Charity programs (3 Thiện nguyện)
        charity_data = [
            {
                "title": "Áo ấm cho em - Hỗ trợ trẻ em vùng cao",
                "description": "Chương trình quyên góp và mang áo phao ấm, sách vở, sữa dinh dưỡng tới học sinh nghèo hiếu học tại các xã biên giới của tỉnh Hà Giang trước thềm mùa đông lạnh.",
                "progress_note": "Đã hoàn thành khảo sát thực tế tại 3 điểm trường tiểu học. Đang tiếp nhận quyên góp hiện kim và hiện vật áo khoác mới.",
                "report": "Báo cáo sơ bộ: Dự kiến trao tặng 300 phần quà. Mọi khoản thu chi sẽ được công khai minh bạch bằng chứng từ hóa đơn sau khi hoàn tất.",
                "total_income": 75000000.00,
                "total_expense": 12000000.00,
                "program_status": "active",
                "cover_url": "/api/uploads/seeds/charity_aoam.jpg"
            },
            {
                "title": "Nồi cháo yêu thương - Tiếp sức bệnh nhân nghèo",
                "description": "Hoạt động nấu và phát cháo dinh dưỡng chay miễn phí vào sáng thứ Bảy hằng tuần cho các bệnh nhân có hoàn cảnh khó khăn đang điều trị tại Bệnh viện Ung bướu.",
                "progress_note": "Chương trình được vận hành đều đặn hằng tuần nhờ tấm lòng đóng góp của các Phật tử và đội ngũ thiện nguyện viên chuẩn bị từ 3h sáng.",
                "report": "Báo cáo tháng 6: Đã phát thành công hơn 2000 suất cháo ấm nóng chất lượng.",
                "total_income": 15000000.00,
                "total_expense": 14500000.00,
                "program_status": "active",
                "cover_url": "/api/uploads/seeds/charity_chao.jpg"
            },
            {
                "title": "Xây cầu dân sinh Bồ Đề - Xóa chia cắt vùng sâu",
                "description": "Chương trình xây mới cầu bê tông dân sinh thay thế cầu khỉ ọp ẹp nguy hiểm tại ấp vùng sâu miền Tây Nam Bộ, giúp các em nhỏ đến trường an toàn.",
                "report": "Báo cáo tổng kết: Cầu Bồ Đề đã khánh thành và bàn giao cho bà con địa phương vào ngày 12/06. Cầu dài 22m, rộng 2.5m chịu tải 2.5 tấn. Tổng kinh phí xây dựng được tài trợ trọn gói.",
                "total_income": 120000000.00,
                "total_expense": 120000000.00,
                "program_status": "completed",
                "cover_url": "/api/uploads/seeds/charity_cau.jpg"
            }
        ]
        for c in charity_data:
            cp = CharityProgram(
                slug=make_slug(c["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **c
            )
            db.add(cp)
        db.flush()

        # 10. News posts (6 Tin tức & thông báo)
        news_data = [
            {"title": "Thông báo đăng ký tham gia Khóa tu Mùa Hè 2026", "excerpt": "Ban Tổ chức chính thức mở cổng đăng ký trực tuyến Khóa tu Mùa Hè dành cho các bạn trẻ học sinh, sinh viên bắt đầu từ hôm nay.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Khóa tu diễn ra tại Thiền viện Trúc Lâm Đà Lạt. Số lượng giới hạn 150 học viên, đăng ký sẽ đóng khi đủ chỉ tiêu. Ban Tổ chức khuyên học viên chuẩn bị trang phục trang nghiêm...", "category_id": categories["thong-bao"].id, "is_pinned": True},
            {"title": "Kết quả chương trình thiện nguyện 'Áo ấm cho em'", "excerpt": "Tổng kết chuyến đi thiện nguyện đầy ấm áp tại Hà Giang của phái đoàn nhà chùa và các nhà hảo tâm.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Đoàn đã trao tận tay 300 suất quà gồm áo phao ấm, sách vở học tập và tiền hỗ trợ học bổng cho các em nhỏ khó khăn. Xin chân thành cảm ơn các vị đồng hành cống hiến...", "category_id": categories["tin-hoat-dong"].id, "is_pinned": False},
            {"title": "Chương trình Đại lễ Phật Đản Vesak Phật lịch 2570", "excerpt": "Thông tin chi tiết về thời gian biểu, địa điểm và nội dung các buổi tụng kinh khánh đản, lễ tắm Phật thiêng liêng.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Đại lễ Phật Đản sẽ chính thức khai mạc vào ngày 15 tháng 4 Âm lịch. Kính mời toàn thể quý Phật tử gần xa đồng mặc y phục trang nhã tề tựu cúng dường chư Phật...", "category_id": categories["thong-bao"].id, "is_pinned": True},
            {"title": "Bản tin sinh hoạt đạo tràng và Phật sự tháng 7", "excerpt": "Các hoạt động tụng kinh niệm Phật định kỳ, khóa học giáo lý buổi tối và kế hoạch phóng sinh sắp tới.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Đạo tràng tiếp tục duy trì tụng Kinh Pháp Hoa vào lúc 19h mỗi tối. Khóa học giáo lý căn bản do Thượng tọa giảng dạy cũng chào đón thêm nhiều Phật tử mới tham học...", "category_id": categories["tin-hoat-dong"].id, "is_pinned": False},
            {"title": "Thông báo Lễ Quy Y Tam Bảo tháng 8", "excerpt": "Nhà chùa nhận đăng ký Quy Y Tam Bảo cho quý nam nữ Phật tử mong muốn nương tựa ba ngôi báu Phật-Pháp-Tăng.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Lễ truyền thọ Tam quy và Ngũ giới sẽ được tổ chức trang nghiêm tại Nhà Tổ. Người đăng ký cần nộp 2 ảnh 3x4 và điền tờ khai thông tin tại bàn thư ký trước ngày lễ...", "category_id": categories["thong-bao"].id, "is_pinned": False},
            {"title": "Lịch học lớp giáo lý Phật học căn bản định kỳ", "excerpt": "Thông báo thời gian và nội dung chương trình học Phật pháp sơ cấp dành cho người mới bắt đầu.", "body": "Nội dung mẫu, chưa phải bản kinh chính thức. Lớp học diễn ra vào mỗi tối chủ nhật hằng tuần tại Giảng đường Huệ Đăng. Chương trình học tập trung nghiên cứu cuộc đời Đức Phật, Tứ Thánh Đế và Bát Chánh Đạo...", "category_id": categories["thong-bao"].id, "is_pinned": False}
        ]
        for n in news_data:
            np = NewsPost(
                slug=make_slug(n["title"]),
                status="published",
                published_at=datetime.now(timezone.utc),
                **n
            )
            db.add(np)
        db.flush()

        # 11. MediaAssets (12 tài liệu/ảnh mẫu)
        media_data = [
            {"file_name": "temple_main.jpg", "title": "Cảnh quan Chánh điện", "description": "Không gian Chánh điện chùa trang nghiêm thanh tịnh vào buổi sáng.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/temple_main.jpg", "size_bytes": 120450, "folder": "/"},
            {"file_name": "lotus_calm.jpg", "title": "Hoa sen nở rạng ngời", "description": "Bông sen trắng tinh khôi nở trong hồ nước chùa.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/lotus_calm.jpg", "size_bytes": 85600, "folder": "/"},
            {"file_name": "buddha_statue.jpg", "title": "Tượng Bổn Sư Thích Ca", "description": "Tượng Phật Thích Ca Mâu Ni thiền định tĩnh lặng.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/buddha_statue.jpg", "size_bytes": 145900, "folder": "/"},
            {"file_name": "meditating.jpg", "title": "Thiền tập buổi sớm", "description": "Hình ảnh Phật tử tọa thiền trong không gian thanh tịnh.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/meditating.jpg", "size_bytes": 98400, "folder": "/"},
            {"file_name": "charity_giving.jpg", "title": "Trao quà thiện nguyện", "description": "Hoạt động phát quà áo ấm cho trẻ em nghèo Hà Giang.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/charity_giving.jpg", "size_bytes": 132100, "folder": "/"},
            {"file_name": "retreat_walking.jpg", "title": "Thiền hành tĩnh lặng", "description": "Khóa sinh khóa tu đi thiền hành chánh niệm quanh khuôn viên.", "kind": "image", "mime_type": "image/jpeg", "url": "/api/uploads/seeds/retreat_walking.jpg", "size_bytes": 111500, "folder": "/"},
            {"file_name": "kinh_phap_cu.pdf", "title": "Kinh Pháp Cú PDF", "description": "Bản dịch Việt ngữ đầy đủ của Hòa thượng Thích Minh Châu dạng PDF.", "kind": "pdf", "mime_type": "application/pdf", "url": "/api/uploads/seeds/kinh_phap_cu.pdf", "size_bytes": 2045600, "folder": "/documents"},
            {"file_name": "nghi_thuc_tung_niem.pdf", "title": "Nghi Thức Tụng Niệm PDF", "description": "Nghi thức các thời khóa tụng kinh nhật tụng phổ biến.", "kind": "pdf", "mime_type": "application/pdf", "url": "/api/uploads/seeds/nghi_thuc_tung_niem.pdf", "size_bytes": 1560200, "folder": "/documents"},
            {"file_name": "kinh_tu_bi.pdf", "title": "Kinh Từ Bi Việt dịch PDF", "description": "Văn bản Việt ngữ Kinh Từ Bi tụng niệm hằng ngày.", "kind": "pdf", "mime_type": "application/pdf", "url": "/api/uploads/seeds/kinh_tu_bi.pdf", "size_bytes": 950400, "folder": "/documents"},
            {"file_name": "phap_thoai_batchanhdao.mp3", "title": "Pháp thoại Bát Chánh Đạo Audio", "description": "File âm thanh bài giảng Bát Chánh Đạo chất lượng cao.", "kind": "audio", "mime_type": "audio/mpeg", "url": "/api/uploads/seeds/audio_batchanhdao1.mp3", "size_bytes": 15460200, "folder": "/audios"},
            {"file_name": "phap_thoai_buongxa.mp3", "title": "Sức mạnh buông xả Audio", "description": "File âm thanh bài giảng về sự buông bỏ phiền não.", "kind": "audio", "mime_type": "audio/mpeg", "url": "/api/uploads/seeds/audio_buongxa.mp3", "size_bytes": 12890500, "folder": "/audios"},
            {"file_name": "phap_thoai_tuvoluongtam.mp3", "title": "Tứ Vô Lượng Tâm Audio", "description": "Bài giảng âm thanh nghiên cứu về bốn tâm vô lượng.", "kind": "audio", "mime_type": "audio/mpeg", "url": "/api/uploads/seeds/audio_tuvoluongtam.mp3", "size_bytes": 14220100, "folder": "/audios"},
        ]
        for m in media_data:
            ma = MediaAsset(**m)
            db.add(ma)
        db.flush()

        # 12. Some Subscribers & Contacts for admin showcase
        sub_data = [
            {"email": "phattu1@gmail.com", "full_name": "Nguyễn Văn An", "interests": "sutras,retreats"},
            {"email": "phattu2@yahoo.com", "full_name": "Trần Thị Bình", "interests": "charity"}
        ]
        for s in sub_data:
            sub = Subscriber(**s)
            db.add(sub)
            
        contact_data = [
            {"full_name": "Phạm Văn Cường", "email": "cuong@gmail.com", "phone": "0987654321", "subject": "Hỏi về lịch Quy Y Tam Bảo", "body": "Kính thưa quý thầy, con muốn hỏi trong tháng 8 có lịch truyền thọ Tam Quy Ngũ Giới nào không ạ? Con xin cảm ơn."},
            {"full_name": "Lê Thị Dung", "email": "dung@outlook.com", "phone": "0912345678", "subject": "Đóng đóng công quả khóa tu", "body": "A Di Đà Phật, con muốn xin phép đăng ký làm công quả hỗ trợ chuẩn bị thức ăn cho Khóa tu Mùa hè sắp tới, kính mong quý thầy duyệt giúp con."}
        ]
        for c in contact_data:
            msg = ContactMessage(**c)
            db.add(msg)

        db.commit()
        print("Database Seeding Completed Successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
