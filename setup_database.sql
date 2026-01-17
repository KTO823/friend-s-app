-- 1. 基礎清理 (確保環境乾淨)
DROP TABLE IF EXISTS public.ledgers CASCADE;
DROP TABLE IF EXISTS public.gifts CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. 個人檔案 (Profiles)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    birthday DATE,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 群組系統 (Groups & Invitation)
CREATE TABLE public.groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 6), -- 自動生成 6 碼邀請碼
    creator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 群組成員 (Group Members)
CREATE TABLE public.group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT,
    role TEXT DEFAULT 'member', -- 預留角色欄位 (admin/member)
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 5. 禮物願望 (Gifts - 支援認領保密)
CREATE TABLE public.gifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    item_name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
    is_reserved BOOLEAN DEFAULT FALSE,
    reserved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 嚴謹帳務 (Ledgers - 支援雙向確認)
CREATE TABLE public.ledgers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    creditor_id UUID REFERENCES auth.users(id) NOT NULL, -- 收款人
    debtor_id UUID REFERENCES auth.users(id) NOT NULL,   -- 付款人
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'settled')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS 安全防護 (核心邏輯：僅限群組成員存取)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

-- Profile: 任何人可讀 (為了顯示名字)，自己可改
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert profile" ON public.profiles FOR INSERT WITH CHECK (true);

-- Groups: 群組成員可見
CREATE POLICY "View groups" ON public.groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid()) OR
    auth.uid() = creator_id -- 創建者可見 (防止創建後尚未加入時的空窗期)
);
CREATE POLICY "Create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Group Members: 成員可見
CREATE POLICY "View members" ON public.group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Join groups" ON public.group_members FOR INSERT WITH CHECK (true); -- 允許加入

-- Gifts & Ledgers: 僅限同群組成員
CREATE POLICY "Group isolation for gifts" ON public.gifts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = gifts.group_id AND user_id = auth.uid())
);

CREATE POLICY "Group isolation for ledgers" ON public.ledgers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = ledgers.group_id AND user_id = auth.uid())
);

-- 8. 自動同步 Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username) VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
