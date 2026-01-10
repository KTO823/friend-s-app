-- 1. 清理舊有的部落格相關資料 (確保環境乾淨)
DROP VIEW IF EXISTS view_post_details CASCADE;
DROP TABLE IF EXISTS post_tag_relation CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS gifts CASCADE;

-- 2. 建立 Profiles (對應 Supabase Auth 使用者)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立禮物資料表 (對應前端 gift_app.html 的需求)
CREATE TABLE public.gifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    estimated_price INTEGER DEFAULT 0,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'buying' CHECK (status IN ('buying', 'delivered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 啟用 RLS 安全政策
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- 5. 設定權限政策
-- 允許登入使用者查看所有禮物
CREATE POLICY "允許已驗證用戶查看禮物" ON public.gifts 
    FOR SELECT USING (auth.role() = 'authenticated');

-- 僅允許使用者新增自己的禮物
CREATE POLICY "使用者僅能新增自己的禮物" ON public.gifts 
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 6. 自動同步註冊使用者到 Profiles (選用，增加系統穩定性)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
