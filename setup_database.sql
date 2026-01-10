-- 1. 建立使用者資料表 (延伸 Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. 建立「送禮任務表」 (一對一送禮債務)
-- 記錄誰指定誰買什麼，以及累計價值
CREATE TABLE IF NOT EXISTS gift_tasks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id uuid REFERENCES profiles(id),     -- 發起人 (通常是壽星自己指定)
  assignee_id uuid REFERENCES profiles(id),    -- 被指派要送禮的人 (欠禮物的人)
  item_name text NOT NULL,                     -- 禮物名稱
  estimated_price numeric DEFAULT 0,            -- 預計/實際價值 (用於累計統計)
  status text DEFAULT 'pending',               -- 狀態: pending (待處理), buying (購買中), delivered (已送達)
  is_surprise boolean DEFAULT false,           -- 是否開啟驚喜模式 (隱藏進度)
  reveal_date date,                            -- 解鎖日期 (生日當天)
  created_at timestamp with time zone DEFAULT now()
);

-- 3. 建立「代購現金債務表」 (純金錢往來)
-- 處理幫忙代購產生的現金差額
CREATE TABLE IF NOT EXISTS cash_debts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text,                            -- 代購品名 (如：代購鋼彈)
  amount numeric NOT NULL,                     -- 總金額
  image_url text,                              -- 收據/圖片路徑 (Storage)
  payer_id uuid REFERENCES profiles(id),       -- 墊錢的人 (代購者)
  debtor_id uuid REFERENCES profiles(id),      -- 欠錢的人 (委託者)
  is_settled boolean DEFAULT false,            -- 是否已結清
  created_at timestamp with time zone DEFAULT now()
);

-- 4. 開啟資料列級別安全性 (RLS)
-- 確保只有你們 3 個授權使用者可以存取
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_debts ENABLE ROW LEVEL SECURITY;

-- 5. 建立基礎 RLS 策略 (允許登入使用者讀寫)
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage their own profile" ON profiles FOR ALL TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to manage gift_tasks" ON gift_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage cash_debts" ON cash_debts FOR ALL TO authenticated USING (true);

-- 6. 建立統計視圖 (用於儀表板：累計總價值)
-- 這個視圖會自動計算每個人送出與收到的總額
CREATE OR REPLACE VIEW user_gift_stats AS
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(sent.total_sent, 0) as total_value_sent,
    COALESCE(received.total_received, 0) as total_value_received
FROM profiles p
LEFT JOIN (
    SELECT assignee_id, SUM(estimated_price) as total_sent 
    FROM gift_tasks WHERE status = 'delivered' GROUP BY assignee_id
) sent ON p.id = sent.assignee_id
LEFT JOIN (
    SELECT creator_id, SUM(estimated_price) as total_received 
    FROM gift_tasks WHERE status = 'delivered' GROUP BY creator_id
) received ON p.id = received.creator_id;