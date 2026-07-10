function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('trip-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none';

  document.getElementById(tabId + '-view').style.display = 'block';
  
  if (tabId === 'birthday' && window.loadBirthdays) {
    window.loadBirthdays();
  }
}

function calculateDaysLeft(dateString) {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(dateString);
  let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (today > nextBday) nextBday.setFullYear(today.getFullYear() + 1);
  const diffTime = Math.abs(nextBday - today);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
}

// 渲染生日列表
window.renderBirthdaysFromData = function(users) {
  const list = document.getElementById('birthday-list');
  list.innerHTML = '';
  users.sort((a, b) => calculateDaysLeft(a.birthday) - calculateDaysLeft(b.birthday));
  
  let count = 0;
  users.forEach(u => {
    if (!u.birthday) return;
    count++;
    const daysLeft = calculateDaysLeft(u.birthday);
    let daysText = daysLeft === 0 ? "就是今天！" : `剩 ${daysLeft} 天`;
    let daysColor = daysLeft <= 7 ? "#ff6b6b" : "#4a4a4a";
    
    // 動態計算頭像字體大小
    const avatarText = u.avatar || '😎';
    let avatarSize = '26px'; // 單一 Emoji 預設大小
    if (avatarText.length >= 8) avatarSize = '12px'; // 長顏文字
    else if (avatarText.length >= 5) avatarSize = '16px'; 
    else if (avatarText.length >= 3) avatarSize = '20px';
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div>
          <p class="card-title">${u.name}</p>
          <p class="card-subtitle">${u.birthday}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: bold;">${daysText}</div>
    `;
    list.appendChild(card);
  });

  if (count === 0) list.innerHTML = '<p style="text-align: center; color: #999;">目前還沒有人設定生日喔！</p>';
}

// 渲染行程與代購清單
window.renderTrips = function(trips) {
  const list = document.getElementById('trip-list');
  list.innerHTML = '';

  if (trips.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">目前沒有人公佈行程喔！</p>';
    return;
  }

  trips.forEach(t => {
    // 產生 Google Maps 搜尋連結
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination)}`;
    
    // 動態計算頭像字體大小
    const avatarText = t.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px';
    else if (avatarText.length >= 5) avatarSize = '16px';
    else if (avatarText.length >= 3) avatarSize = '20px';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; width: 100%;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="flex: 1;">
          <p class="card-title">${t.name} 要去 <strong>${t.destination}</strong></p>
          <p class="card-subtitle">日期：${t.date}</p>
        </div>
      </div>
      
      <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
        <p style="margin: 0; font-size: 14px; color: #666;">備註：${t.note || '無特別備註'}</p>
      </div>

      <div style="display: flex; gap: 10px; width: 100%;">
        <a href="${mapUrl}" target="_blank" class="secondary-btn" style="text-align: center; text-decoration: none; flex: 1; padding: 8px;">📍 附近地圖</a>
        <button class="primary-btn" style="flex: 1; padding: 8px; background-color: #ff9f43;">📝 許願代購</button>
      </div>
    `;
    list.appendChild(card);
  });
}