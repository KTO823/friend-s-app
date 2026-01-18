-- 1. 確保所有 RLS (列級安全性) 都已啟用
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

-- 2. 清除舊的策略 (避免名稱衝突)
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read all groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can create groups" ON public.groups;
DROP POLICY IF EXISTS "Read members" ON public.group_members;
DROP POLICY IF EXISTS "Join groups" ON public.group_members;
DROP POLICY IF EXISTS "Read gifts" ON public.gifts;
DROP POLICY IF EXISTS "Add gifts" ON public.gifts;
DROP POLICY IF EXISTS "Update gifts" ON public.gifts;
DROP POLICY IF EXISTS "Read ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "Add ledgers" ON public.ledgers;

-- 3. 重新建立完整策略

-- [Profiles] 個人檔案
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- [Groups] 群組
CREATE POLICY "Read all groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);

-- [Group Members] 群組成員
CREATE POLICY "Read members" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- [Gifts] 禮物 (重要：讓大家能看到禮物、新增禮物、認領禮物)
CREATE POLICY "Read gifts" ON public.gifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Add gifts" ON public.gifts FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Update gifts" ON public.gifts FOR UPDATE TO authenticated USING (true); -- 允許認領修改

-- [Ledgers] 帳務 (重要：讓大家能看到帳務、新增帳務)
CREATE POLICY "Read ledgers" ON public.ledgers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Add ledgers" ON public.ledgers FOR INSERT TO authenticated WITH CHECK (auth.uid() = creditor_id);
