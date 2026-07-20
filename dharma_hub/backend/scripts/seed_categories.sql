-- Bổ sung danh mục bộ kinh + module khác (idempotent theo slug)
INSERT INTO categories (name, slug, description, module, sort_order, created_at, updated_at, is_deleted)
SELECT v.name, v.slug, v.description, v.module, v.sort_order, NOW(), NOW(), false
FROM (VALUES
  ('Nikāya · Trường Bộ', 'nikaya-truong-bo', 'Dīgha Nikāya — Kinh tạng Trường Bộ', 'sutras', 10),
  ('Nikāya · Trung Bộ', 'nikaya-trung-bo', 'Majjhima Nikāya — Kinh tạng Trung Bộ', 'sutras', 20),
  ('Nikāya · Tương Ưng Bộ', 'nikaya-tuong-ung-bo', 'Saṃyutta Nikāya — Kinh tạng Tương Ưng', 'sutras', 30),
  ('Nikāya · Tăng Chi Bộ', 'nikaya-tang-chi-bo', 'Aṅguttara Nikāya — Kinh tạng Tăng Chi', 'sutras', 40),
  ('Nikāya · Tiểu Bộ', 'nikaya-tieu-bo', 'Khuddaka Nikāya — Pháp Cú, Kinh Tập…', 'sutras', 50),
  ('Kinh Tịnh Độ', 'kinh-tinh-do', 'A Di Đà, Vô Lượng Thọ, Quán Vô Lượng Thọ…', 'sutras', 80),
  ('Thiền tông', 'kinh-thien-tong', 'Kinh / ngữ lục Thiền', 'sutras', 90),
  ('Luật tạng', 'luat-tang', 'Giới luật Tăng Ni', 'sutras', 110),
  ('Luận tạng', 'luan-tang', 'A-tỳ-đạt-ma / luận thư', 'sutras', 120),
  ('Giảng Kinh', 'giang-kinh', NULL, 'dharma_talks', 4),
  ('Lịch sử Phật giáo', 'lich-su-phat-giao', NULL, 'dharma_talks', 5),
  ('Giảng Kinh (audio/video)', 'giang-kinh-av', NULL, 'lectures', 3),
  ('Thiền / Chánh niệm', 'thien-chanh-niem', NULL, 'lectures', 4),
  ('Tịnh Độ / Niệm Phật', 'tinh-do-niem-phat', NULL, 'lectures', 5),
  ('Chưa phân loại', 'bai-giang-chua-phan-loai', NULL, 'lectures', 99),
  ('Lịch Phật sự', 'lich-phat-su', NULL, 'news_posts', 3),
  ('Khóa tu một ngày', 'khoa-tu-mot-ngay', NULL, 'retreats', 1),
  ('Khóa tu nhiều ngày', 'khoa-tu-nhieu-ngay', NULL, 'retreats', 2),
  ('Khóa tu mùa hè', 'khoa-tu-mua-he-retreat', NULL, 'retreats', 3)
) AS v(name, slug, description, module, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);

UPDATE categories SET name = 'Kinh Nguyên Thủy (chung)', sort_order = 60, description = 'Kinh Nguyên thủy chưa gán bộ cụ thể', updated_at = NOW()
WHERE slug = 'kinh-nguyen-thuy';
UPDATE categories SET sort_order = 70, description = 'Kinh điển Đại thừa (Pháp Hoa, Hoa Nghiêm, Lăng Nghiêm…)', updated_at = NOW()
WHERE slug = 'kinh-dai-thua';
UPDATE categories SET sort_order = 100, description = 'Kinh tụng phổ thông, nhật tụng', updated_at = NOW()
WHERE slug = 'kinh-nhat-tung';

-- Map category_id theo sutra_group (ưu tiên match cụ thể)
UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Trường Bộ%' AND c.slug = 'nikaya-truong-bo';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Trung Bộ%' AND c.slug = 'nikaya-trung-bo';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Tương Ưng%' AND c.slug = 'nikaya-tuong-ung-bo';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Tăng Chi%' AND c.slug = 'nikaya-tang-chi-bo';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Tiểu Bộ%' AND c.slug = 'nikaya-tieu-bo';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Tịnh Độ%' AND c.slug = 'kinh-tinh-do';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND s.sutra_group ILIKE '%Thiền%' AND c.slug = 'kinh-thien-tong';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND (s.sutra_group ILIKE '%Nhật Tụng%' OR s.sutra_group ILIKE '%tụng phổ thông%')
  AND c.slug = 'kinh-nhat-tung';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND (s.sutra_group ILIKE '%Đại thừa%' OR s.sutra_group ILIKE '%Đại Thừa%')
  AND c.slug = 'kinh-dai-thua';

UPDATE sutras s SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE s.is_deleted = false AND c.is_deleted = false AND c.module = 'sutras'
  AND c.slug = 'kinh-nguyen-thuy'
  AND (
    s.sutra_group ILIKE '%Nguyên Thủy%'
    OR s.sutra_group = 'Kinh tạng Nikāya'
  )
  AND s.sutra_group NOT ILIKE '%Trường%'
  AND s.sutra_group NOT ILIKE '%Trung%'
  AND s.sutra_group NOT ILIKE '%Tương%'
  AND s.sutra_group NOT ILIKE '%Tăng%';

-- Chuẩn hóa sutra_group = tên danh mục
UPDATE sutras s SET sutra_group = c.name, updated_at = NOW()
FROM categories c
WHERE s.category_id = c.id AND c.module = 'sutras' AND s.is_deleted = false;
