-- 1. 建立擴充功能 (UUID 支援)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 建立 Profiles 表格 (包含銀行與生日資訊)
-- 使用 IF NOT EXISTS 防止重複建立錯誤
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  birthday DATE,
  avatar_url TEXT,
  bank_code TEXT, -- 銀行代碼 (例如：822)
  bank_account TEXT, -- 銀行帳號
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立 Groups 表格 (包含自動生成邀請碼機制)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL, -- 6碼大寫邀請碼
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 建立 Group Members 表格
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 5. 建立 Ledgers 表格 (帳務管理)
CREATE TABLE IF NOT EXISTS public.ledgers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  creditor_id UUID REFERENCES public.profiles(id), -- 債權人
  debtor_id UUID REFERENCES public.profiles(id),   -- 債務人
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'settling', 'settled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 建立 Gifts 表格 (願望清單)
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  is_reserved BOOLEAN DEFAULT FALSE,
  reserved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 啟動 Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- 8. RLS 策略設定 (先刪除舊有的以防衝突)

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Groups
DROP POLICY IF EXISTS "Group members can view group" ON public.groups;
CREATE POLICY "Group members can view group" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.groups.id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Anyone can create a group" ON public.groups;
CREATE POLICY "Anyone can create a group" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Group Members
DROP POLICY IF EXISTS "Members can view group fellows" ON public.group_members;
CREATE POLICY "Members can view group fellows" ON public.group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.group_members.group_id AND gm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Group management policy" ON public.group_members;
CREATE POLICY "Group management policy" ON public.group_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.group_members.group_id AND user_id = auth.uid())
);

-- Ledgers
DROP POLICY IF EXISTS "Group visible ledgers" ON public.ledgers;
CREATE POLICY "Group visible ledgers" ON public.ledgers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.ledgers.group_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Involved parties can update ledgers" ON public.ledgers;
CREATE POLICY "Involved parties can update ledgers" ON public.ledgers FOR UPDATE USING (
  auth.uid() = creditor_id OR auth.uid() = debtor_id
);
DROP POLICY IF EXISTS "Members can insert ledgers" ON public.ledgers;
CREATE POLICY "Members can insert ledgers" ON public.ledgers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.ledgers.group_id AND user_id = auth.uid())
);

-- Gifts
DROP POLICY IF EXISTS "Group visible gifts" ON public.gifts;
CREATE POLICY "Group visible gifts" ON public.gifts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.gifts.group_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members can manage gifts" ON public.gifts;
CREATE POLICY "Members can manage gifts" ON public.gifts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.gifts.group_id AND user_id = auth.uid())
);

-- 9. 輔助函數：自動生成邀請碼
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. 觸發器：建立群組時自動生成邀請碼
CREATE OR REPLACE FUNCTION public.set_invite_code() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_code ON public.groups;
CREATE TRIGGER trigger_set_invite_code
BEFORE INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

-- 11. 觸發器：Auth Signup 時自動建立 Profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. 關鍵 RPC 函數：透過邀請碼加入群組
CREATE OR REPLACE FUNCTION public.join_group_by_invite(code TEXT)
RETURNS UUID AS $$
DECLARE
  target_group_id UUID;
BEGIN
  SELECT id INTO target_group_id FROM public.groups WHERE invite_code = UPPER(code);
  
  IF target_group_id IS NULL THEN
    RAISE EXCEPTION '邀請碼無效';
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = target_group_id AND user_id = auth.uid()) THEN
    RETURN target_group_id;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (target_group_id, auth.uid());

  RETURN target_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
