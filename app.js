// 動態更新 Header 標題
function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('trip-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none';

  document.getElementById(tabId + '-view').style.display = 'block';

  const headerTitle = document.getElementById('main-header-title');
  if (tabId === 'birthday') {
    headerTitle.innerHTML = '🎂 生日倒數';
    if (window.loadBirthdays) window.loadBirthdays();
  } else if (tabId === 'gift') {
    headerTitle.innerHTML = '🎁 許願池與禮物';
  } else if (tabId === 'trip') {
    headerTitle.innerHTML = '✈️ 行程與代購';
  } else if (tabId === 'settings') {
    headerTitle.innerHTML = '⚙️ 個人設定';
  }
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

    let daysColor = daysLeft <= 7 ? "#ef4444" : "#333";
    if (isClosest) daysColor = "#f97316";
    
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
          <p class="card-title" style="${isClosest ? 'color: #f97316;' : ''}">${displayName}</p>
          <p class="card-subtitle">${u.birthday}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: 700; font-size: ${isClosest ? '24px' : '20px'};">${daysText}</div>
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
      exchangeHtml = `<div style="display: inline-block; background: #f8fafc; color: #64748b; padding: 6px 10px; border-radius: 6px; font-size: 13px; font-weight: 600;">💱 ${text}</div>`;
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

    const tripProxies = window.globalGifts.filter(g => g.type === 'proxy' && g.tripId === t.id);
    let proxyHtml = '';
    if (tripProxies.length > 0) {
      proxyHtml += `<div style="width: 100%; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px; text-align: left;">`;
      proxyHtml += `<p style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #333;">🛒 朋友託付的代購：</p>`;
      
      tripProxies.forEach(p => {
        const isPublisher = (t.uid === currentUserId);
        let statusBtn = '';
        if (isPublisher) {
            statusBtn = p.status === 'purchased' 
              ? `<span style="background: #f0fdf4; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">✅ 已買到</span>`
              : `<button onclick="purchaseProxy('${p.id}')" style="background: #333; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">標記已買</button>`;
        } else {
            statusBtn = p.status === 'purchased' ? '✅ 朋友已買到' : '⏳ 尚未購買';
        }

        proxyHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
              <div style="font-size: 14px; flex: 1; padding-right: 10px;">
                <span style="font-weight: 600; color: #333;">${p.name}：</span>${p.itemName}
                ${p.price ? `<div style="color: #ef4444; font-size: 12px; margin-top: 4px;">預估：$${p.price}</div>` : ''}
              </div>
              <div>${statusBtn}</div>
          </div>`;
      });
      proxyHtml += `</div>`;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    
    card.innerHTML = `
      ${actionsHtml}
      <div style="background: #eff6ff; color: #3b82f6; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">✈️ 即將啟程</div>
      
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 15px; padding-right: 50px; box-sizing: border-box;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title">${t.name} 要去 <strong style="color: #000;">${t.destination}</strong></p>
          <p class="card-subtitle">日期：${t.date}</p>
        </div>
      </div>
      
      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; text-align: left;">
        ${exchangeHtml}
        ${t.note ? `<div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 14px; color: #475569; line-height: 1.5;">備註：${t.note}</div>` : ''}
      </div>

      <div style="display: flex; gap: 10px; width: 100%;">
        <a href="${mapUrl}" target="_blank" class="secondary-btn" style="text-align: center; text-decoration: none; flex: 1; padding: 10px 0; font-size: 14px; border-radius: 8px; font-weight: bold;">📍 附近地圖</a>
        <button class="primary-btn" onclick="openProxyRequest('${t.destination}', '${t.id}')" style="flex: 1; padding: 10px 0; background-color: #3b82f6; font-size: 14px; border-radius: 8px;">📝 許願代購</button>
      </div>
      ${proxyHtml}
    `;
    list.appendChild(card);
  });
}

window.renderGifts = function(gifts, currentUserId) {
  const list = document.getElementById('gift-list');
  list.innerHTML = '';
  const generalGifts = gifts.filter(g => g.type !== 'proxy');

  if (generalGifts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">許願池空空的，快來新增吧！</p>';
    return;
  }
  
  generalGifts.forEach(g => {
    const linkHtml = g.link ? `<a href="${g.link}" target="_blank" style="display: inline-block; margin-top: 4px; padding: 6px 12px; background-color: #f8fafc; color: #3b82f6; text-decoration: none; font-size: 13px; border-radius: 6px; font-weight: 600;">🔗 參考連結</a>` : '';
    const priceText = g.price ? `$${g.price}` : '未標價';
    const tagHtml = g.type === 'birthday' ? `<span style="background: #fdf2f8; color: #ec4899; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 12px; display: inline-block;">🎂 ${g.birthdayYear} 生日願望</span>` : '';
    
    let actionsHtml = '';
    if (g.uid === currentUserId) {
      actionsHtml = `
        <div class="card-actions">
          <button class="icon-btn" onclick="editGift('${g.id}')" title="修改">✏️</button>
          <button class="icon-btn" onclick="deleteGift('${g.id}')" title="刪除">🗑️</button>
        </div>
      `;
    }

    let claimHtml = '';
    if (g.uid !== currentUserId) {
         if (g.claimedBy) {
             claimHtml = `<div style="background: #f0fdf4; color: #16a34a; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: bold; margin-top: 12px; text-align: center; border: 1px solid #bbf7d0;">🎁 你已認領準備此禮物！</div>`;
         } else {
             claimHtml = `<button onclick="claimGift('${g.id}')" style="margin-top: 12px; width: 100%; background: #333; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold;">🙋‍♂️ 我來準備這個驚喜</button>`;
         }
    } else {
         claimHtml = `<div style="color: #94a3b8; font-size: 13px; margin-top: 15px; text-align: center; font-style: italic;">⏳ 期待中... (系統會為你隱藏朋友的認領狀態)</div>`;
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
      ${tagHtml}
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 15px; padding-right: 50px; box-sizing: border-box;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${avatarText}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title">${g.name} 許願了</p>
          <p class="card-subtitle" style="color: #000; font-weight: 700; font-size: 16px;">${g.itemName}</p>
        </div>
      </div>

      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <div style="font-weight: 600; color: #ef4444; font-size: 15px;">預估價格：${priceText}</div>
        ${g.note ? `<div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 14px; color: #475569; line-height: 1.5;">備註：${g.note}</div>` : ''}
        <div>${linkHtml}</div>
        ${claimHtml}
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
  window.targetTripId = null;
  document.getElementById('gift-type').value = 'general';
  document.getElementById('gift-type').disabled = false;
  document.getElementById('birthday-year-container').style.display = 'none';
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

window.openProxyRequest = function(destination, tripId) {
  switchTab('gift');
  window.editingGiftId = null;
  window.targetTripId = tripId;
  document.getElementById('gift-modal-title').textContent = `請託代購：${destination}`;
  document.getElementById('gift-type').value = 'proxy'; 
  document.getElementById('gift-type').disabled = true;
  document.getElementById('birthday-year-container').style.display = 'none';
  document.getElementById('gift-note').value = `綁定代購地點：${destination}`;
  giftModal.classList.add('active');
  document.body.classList.add('modal-open');
};