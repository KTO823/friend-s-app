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
  let isFirst = true; // 用來判斷是不是最靠近的生日

  users.forEach(u => {
    if (!u.birthday) return;
    count++;
    const daysLeft = calculateDaysLeft(u.birthday);
    let daysText = daysLeft === 0 ? "就是今天！" : `居然只剩 ${daysLeft} 天`;
    
    // 判斷是否為第一名
    const isClosest = isFirst;
    isFirst = false;

    let daysColor = daysLeft <= 7 ? "#ff6b6b" : "#4a4a4a";
    if (isClosest) daysColor = "#ff9f43"; // 第一名使用專屬亮橘色
    
    // 動態計算頭像字體大小
    const avatarText = u.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px';
    else if (avatarText.length >= 5) avatarSize = '16px'; 
    else if (avatarText.length >= 3) avatarSize = '20px';
    
    // 如果是第一名，加上皇冠與專屬 Class
    const displayName = isClosest ? `${u.name}` : u.name;
    const cardClass = isClosest ? 'card closest-birthday' : 'card';

    const card = document.createElement('div');
    card.className = cardClass;
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div>
          <p class="card-title" style="${isClosest ? 'font-weight: bold; color: #ff9f43;' : ''}">${displayName}</p>
          <p class="card-subtitle">${u.birthday}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: bold; font-size: ${isClosest ? '24px' : '20px'};">${daysText}</div>
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
        <button class="primary-btn" onclick="openProxyRequest('${t.destination}')" style="flex: 1; padding: 8px; background-color: #ff9f43;">📝 許願代購</button>      </div>
    `;
    list.appendChild(card);
  });
}

// 控制許願池彈出視窗的開關
const giftModal = document.getElementById('gift-modal');
document.getElementById('open-gift-modal-btn')?.addEventListener('click', () => {
  document.getElementById('gift-modal-title').textContent = "新增許願商品";
  document.getElementById('gift-note').value = ""; // 清空備註
  giftModal.classList.add('active');
});
document.getElementById('close-gift-modal-btn')?.addEventListener('click', () => giftModal.classList.remove('active'));

// 全域函數：從行程板點擊「許願代購」時觸發
window.openProxyRequest = function(destination) {
  switchTab('gift'); // 切換到禮物頁面
  document.getElementById('gift-modal-title').textContent = `請託代購：${destination}`;
  document.getElementById('gift-note').value = `代購地點：${destination}`; // 自動填寫備註
  giftModal.classList.add('active');
};

// 渲染禮物清單
window.renderGifts = function(gifts) {
  const list = document.getElementById('gift-list');
  list.innerHTML = '';

  if (gifts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">許願池空空的，快來新增吧！</p>';
    return;
  }

  gifts.forEach(g => {
    // 判斷有沒有附上連結
    const linkHtml = g.link ? `<a href="${g.link}" target="_blank" style="color: #ff9f43; text-decoration: none; font-size: 14px; display: block; margin-top: 5px;">🔗 參考連結</a>` : '';
    const priceText = g.price ? `$${g.price}` : '未標價';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px; width: 100%;">
        <div class="avatar-circle" style="width: 40px; height: 40px; min-width: 40px;">
          <span style="font-size: 20px;">${g.avatar || '😎'}</span>
        </div>
        <div style="flex: 1;">
          <p class="card-title">${g.name} 許願了</p>
          <p class="card-subtitle" style="color: #333; font-weight: bold; font-size: 16px;">${g.itemName}</p>
        </div>
        <div style="font-weight: bold; color: #666;">
          ${priceText}
        </div>
      </div>
      
      ${g.note ? `<div style="background: #f9f9f9; padding: 8px 12px; border-radius: 6px; width: 100%; box-sizing: border-box; margin-bottom: 5px; font-size: 13px; color: #666;">備註：${g.note}</div>` : ''}
      ${linkHtml}
    `;
    list.appendChild(card);
  });
}