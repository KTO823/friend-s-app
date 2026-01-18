-- 1. 補上個人檔案缺少的欄位 (解決紅色報錯)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;

-- 2. 解鎖群組建立權限 (解決無法建立群組)
-- 修正：加入這行以刪除可能已經存在的同名 Policy，避免報錯
DROP POLICY IF EXISTS "Anyone can create groups" ON public.groups; 

-- 清除其他可能的舊名稱 (保留這些也沒問題)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Create groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can create a group" ON public.groups;

CREATE POLICY "Anyone can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);

-- 3. 讓創建者能立刻讀取群組
DROP POLICY IF EXISTS "View groups" ON public.groups;
CREATE POLICY "View groups" ON public.groups FOR SELECT USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
);

-- 4. 確保 RLS 啟用
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
