-- 1. 建立 UUID 擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 建立 Profiles 表格 (包含專業金融與個人資訊欄位)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  birthday DATE, -- 強制使用 DATE 格式
  avatar_url TEXT,
  bank_code TEXT, -- 獨立銀行代碼 (3碼)
  bank_account TEXT, -- 獨立銀行帳號
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立 Groups 表格
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL, -- 系統自動生成大寫 6 碼
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

-- 5. 建立 Ledgers 表格 (專業帳務紀錄)
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

-- 6. 建立 Gifts 表格 (驚喜願望清單)
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

-- 7. 啟動 RLS 安全防護
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- 8. RLS 策略重構 (解決無法修改與建立群組的問題)

-- Profiles 策略
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups 策略 (修正建立群組失敗的問題)
DROP POLICY IF EXISTS "Group members can view group" ON public.groups;
CREATE POLICY "Group members can view group" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.groups.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can create a group" ON public.groups;
CREATE POLICY "Anyone can create a group" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Group Members 策略
DROP POLICY IF EXISTS "Members can view group fellows" ON public.group_members;
CREATE POLICY "Members can view group fellows" ON public.group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.group_members.group_id AND gm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ledgers & Gifts 策略
DROP POLICY IF EXISTS "Group visible ledgers" ON public.ledgers;
CREATE POLICY "Group visible ledgers" ON public.ledgers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.ledgers.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Parties can update ledgers" ON public.ledgers;
CREATE POLICY "Parties can update ledgers" ON public.ledgers FOR UPDATE USING (auth.uid() = creditor_id OR auth.uid() = debtor_id);

DROP POLICY IF EXISTS "Members can insert ledgers" ON public.ledgers;
CREATE POLICY "Members can insert ledgers" ON public.ledgers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.ledgers.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Group visible gifts" ON public.gifts;
CREATE POLICY "Group visible gifts" ON public.gifts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.gifts.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can manage gifts" ON public.gifts;
CREATE POLICY "Members can manage gifts" ON public.gifts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.gifts.group_id AND user_id = auth.uid())
);

-- 9. 自動化機制：6 碼大寫邀請碼
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
CREATE TRIGGER trigger_set_invite_code BEFORE INSERT ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

-- 10. 自動化機制：註冊時自動建立 Profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. 關鍵 RPC 函數：透過邀請碼加入群組 (解決 RLS 權限死結)
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
