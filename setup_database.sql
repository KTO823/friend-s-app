
-- 清理舊資料 (順序需注意外鍵約束，從子表開始刪除)
DROP VIEW IF EXISTS view_post_details;
DROP TABLE IF EXISTS post_tag_relation;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. 使用者表 (Users)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 文章分類表 (Categories)
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE NOT NULL, -- 用於 URL 的友善名稱
    description TEXT
);

-- 3. 文章主表 (Posts)
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    author_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT, -- 文章摘要
    cover_image TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    view_count INT DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 標籤表 (Tags - 多對多關係)
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 5. 文章與標籤關聯表 (Post-Tag Join Table)
CREATE TABLE post_tag_relation (
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 6. 評論表 (Comments)
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    parent_id INT REFERENCES comments(comment_id), -- 用於支援巢狀回覆
    content TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. 建立視圖：方便快速取得文章完整資訊 (包含作者與分類名稱)
CREATE VIEW view_post_details AS
SELECT 
    p.post_id, p.title, p.slug, p.status, p.created_at,
    u.username AS author_name,
    c.name AS category_name
FROM posts p
JOIN users u ON p.author_id = u.user_id
LEFT JOIN categories c ON p.category_id = c.category_id;

-- 8. 插入初始化資料
INSERT INTO users (username, email, password_hash) VALUES 
('admin', 'admin@example.com', 'argon2_hashed_string'),
('writer_01', 'writer@example.com', 'argon2_hashed_string');

INSERT INTO categories (name, slug) VALUES 
('程式開發', 'programming'),
('人工智慧', 'ai'),
('科技生活', 'tech-life');

INSERT INTO tags (name) VALUES ('SQL'), ('Tutorial'), ('Database');

INSERT INTO posts (author_id, category_id, title, slug, content, status) VALUES 
(1, 1, '如何設定 SQL 資料庫', 'how-to-setup-sql', '這是內容本文...', 'published');

INSERT INTO post_tag_relation (post_id, tag_id) VALUES (1, 1), (1, 2);
