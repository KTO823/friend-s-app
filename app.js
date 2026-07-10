function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('trip-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none';

  document.getElementById(tabId + '-view').style.display = 'block';
  if (tabId === 'birthday' && window.loadBirthdays) window.loadBirthdays();
}

function calculateDaysLeft(dateString) {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(dateString);
  let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (today > nextBday) nextBday.setFullYear(today.getFullYear() + 1);
  return Math.ceil(Math.abs(nextBday - today) / (1000 * 60 * 60 * 24)); 
}

window.renderBirthdaysFromData = function(users) {
  const list = document.getElementById('birthday-list');
  list.innerHTML = '';
  users.sort((a, b) => calculateDaysLeft(a.birthday) - calculateDaysLeft(b.birthday));
  
  let count = 0;
  let isFirst = true;

  users.forEach(u => {
    if (!u.birthday) return;
    count++;
    const daysLeft = calculateDaysLeft(u.birthday);
    let daysText = daysLeft === 0 ? "就是今天！" : `剩 ${daysLeft} 天`;
    
    const isClosest = isFirst;
    isFirst = false;

    let daysColor = daysLeft <= 7 ? "#ff6b6b" : "#4a4a4a";
    if (isClosest) daysColor = "#ff9f43";
    
    const avatarText = u.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px';
    else if (avatarText.length >= 5) avatarSize = '16px'; 
    else if (avatarText.length >= 3) avatarSize = '20px';
    
    const displayName = isClosest ? `👑 ${u.name}` : u.name;
    const cardClass = isClosest ? 'card closest-birthday' : 'card';

    const card = document.createElement('div');
    card.className = cardClass;
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title" style="${isClosest ? 'font-weight: bold; color: #ff9f43;' : ''} margin: 0 0 4px 0;">${displayName}</p>
          <p class="card-subtitle" style="margin: 0;">${u.birthday}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: bold; font-size: ${isClosest ? '24px' : '20px'};">${daysText}</div>
    `;
    list.appendChild(card);
  });

  if (count === 0) list.innerHTML = '<p style="text-align: center; color: #999;">目前還沒有人設定生日喔！</p>';
}

window.renderTrips = function(trips, currentUserId) {
  const list = document.getElementById('trip-list');
  list.innerHTML = '';

  if (trips.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">目前沒有人公佈行程喔！</p>';
    return;
  }

  trips.forEach(t => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination)}`;
    
    const avatarText = t.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px';
    else if (avatarText.length >= 5) avatarSize = '16px';
    else if (avatarText.length >= 3) avatarSize = '20px';

    let exchangeHtml = '';
    if (t.tripType === 'international' && t.exchangeInfo) {
      const ex = t.exchangeInfo;
      let text = '';
      if (ex.mode === 'publish') text = `發佈日匯率 (1 ${ex.currency} = ${ex.rate.toFixed(4)} TWD)`;
      else if (ex.mode === 'custom') text = `自訂匯率 (1 ${ex.currency} = ${ex.rate} TWD)`;
      else if (ex.mode === 'purchase') text = `依購買當天匯率結算 (${ex.currency})`;
      exchangeHtml = `<div style="display: inline-block; background: #fff3e0; color: #d35400; padding: 6px 10px; border-radius: 4px; font-size: 13px; font-weight: bold;">💱 ${text}</div>`;
    }

    let actionsHtml = '';
    if (t.uid === currentUserId) {
      actionsHtml = `
        <div class="card-actions">
          <button class="icon-btn" onclick="editTrip('${t.id}')" title="修改">✏️</button>
          <button class="icon-btn" onclick="deleteTrip('${t.id}')" title="刪除">🗑️</button>
        </div>
      `;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    
    card.innerHTML = `
      ${actionsHtml}
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 12px; padding-right: 50px; box-sizing: border-box;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title" style="margin: 0 0 4px 0;">${t.name} 要去 <strong>${t.destination}</strong></p>
          <p class="card-subtitle" style="margin: 0;">日期：${t.date}</p>
        </div>
      </div>
      
      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; text-align: left;">
        ${exchangeHtml}
        ${t.note ? `<div style="background: #f4f6f8; padding: 10px 12px; border-radius: 6px; font-size: 14px; color: #555; line-height: 1.5;">備註：${t.note}</div>` : ''}
      </div>

      <div style="display: flex; gap: 10px; width: 100%;">
        <a href="${mapUrl}" target="_blank" class="secondary-btn" style="text-align: center; text-decoration: none; flex: 1; padding: 10px 0; font-size: 14px; border-radius: 8px;">📍 附近地圖</a>
        <button class="primary-btn" onclick="openProxyRequest('${t.destination}')" style="flex: 1; padding: 10px 0; background-color: #ff9f43; font-size: 14px; border-radius: 8px;">📝 許願代購</button>
      </div>
    `;
    list.appendChild(card);
  });
}

window.renderGifts = function(gifts, currentUserId) {
  const list = document.getElementById('gift-list');
  list.innerHTML = '';
  if (gifts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">許願池空空的，快來新增吧！</p>';
    return;
  }
  gifts.forEach(g => {
    const linkHtml = g.link ? `<a href="${g.link}" target="_blank" style="display: inline-block; margin-top: 4px; padding: 6px 12px; background-color: #fff3e0; color: #ff9f43; text-decoration: none; font-size: 13px; border-radius: 4px; font-weight: 500;">🔗 前往參考連結</a>` : '';
    const priceText = g.price ? `$${g.price}` : '未標價';
    
    let actionsHtml = '';
    if (g.uid === currentUserId) {
      actionsHtml = `
        <div class="card-actions">
          <button class="icon-btn" onclick="editGift('${g.id}')" title="修改">✏️</button>
          <button class="icon-btn" onclick="deleteGift('${g.id}')" title="刪除">🗑️</button>
        </div>
      `;
    }

    const avatarText = g.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px';
    else if (avatarText.length >= 5) avatarSize = '16px'; 
    else if (avatarText.length >= 3) avatarSize = '20px';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    card.innerHTML = `
      ${actionsHtml}
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 12px; padding-right: 50px; box-sizing: border-box;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title" style="margin: 0 0 4px 0;">${g.name} 許願了</p>
          <p class="card-subtitle" style="margin: 0; color: #333; font-weight: bold; font-size: 16px;">${g.itemName}</p>
        </div>
      </div>

      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <div style="font-weight: 600; color: #ff6b6b; font-size: 15px;">預估價格：${priceText}</div>
        ${g.note ? `<div style="background: #f4f6f8; padding: 10px 12px; border-radius: 6px; font-size: 14px; color: #555; line-height: 1.5;">備註：${g.note}</div>` : ''}
        <div>${linkHtml}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

const tripModal = document.getElementById('trip-modal');
document.getElementById('open-trip-modal-btn')?.addEventListener('click', () => {
  window.editingTripId = null;
  document.getElementById('add-trip-btn').textContent = "發佈行程並寄信通知";
  document.getElementById('trip-dest').value = '';
  document.getElementById('trip-date').value = '';
  document.getElementById('trip-note').value = '';
  tripModal.classList.add('active');
  document.body.classList.add('modal-open');
});

document.getElementById('close-trip-modal-btn')?.addEventListener('click', () => {
  tripModal.classList.remove('active');
  document.body.classList.remove('modal-open');
});

const giftModal = document.getElementById('gift-modal');
document.getElementById('open-gift-modal-btn')?.addEventListener('click', () => {
  window.editingGiftId = null;
  document.getElementById('add-gift-btn').textContent = "丟入許願池";
  document.getElementById('gift-modal-title').textContent = "新增許願商品";
  document.getElementById('gift-name').value = '';
  document.getElementById('gift-link').value = '';
  document.getElementById('gift-price').value = '';
  document.getElementById('gift-note').value = ""; 
  giftModal.classList.add('active');
  document.body.classList.add('modal-open');
});

document.getElementById('close-gift-modal-btn')?.addEventListener('click', () => {
  giftModal.classList.remove('active');
  document.body.classList.remove('modal-open');
});

window.openProxyRequest = function(destination) {
  switchTab('gift');
  window.editingGiftId = null;
  document.getElementById('gift-modal-title').textContent = `請託代購：${destination}`;
  document.getElementById('gift-note').value = `綁定代購地點：${destination}`;
  giftModal.classList.add('active');
  document.body.classList.add('modal-open');
};