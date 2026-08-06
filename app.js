// 安全處理：把使用者輸入的文字轉成安全格式，避免有人打惡意程式碼進去搗亂
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 產生「目前沒有資料」時的溫馨提示畫面
function emptyStateHtml(icon, title, subtitle) {
  return `
    <div style="text-align: center; padding: 60px 20px; color: #bbb;">
      <div style="font-size: 44px; margin-bottom: 12px;">${icon}</div>
      <div style="font-size: 15px; color: #999; font-weight: 500; margin-bottom: 6px;">${title}</div>
      <div style="font-size: 13px; color: #bbb;">${subtitle}</div>
    </div>
  `;
}


// 用來取代系統的 showToast()：跳出一個自己畫的小提示條，幾秒後自動消失
window.showToast = function(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) { console.log(message); return; }
  const toast = document.createElement('div');
  const isError = type === 'error' || /失敗|錯誤/.test(message);
  const isSuccess = type === 'success';
  toast.className = 'toast' + (isError ? ' toast-error' : (isSuccess ? ' toast-success' : ''));
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  const duration = Math.min(8000, Math.max(2800, message.length * 70));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// 用來取代系統的 confirm()：跳出自己畫的確認視窗，回傳 Promise<boolean>
window.showConfirm = function(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) { resolve(window.confirm(message)); return; }
    document.getElementById('confirm-modal-message').textContent = message;
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    const okBtn = document.getElementById('confirm-modal-ok-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

    function cleanup(result) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
};


// 新手導覽控制
window.onload = function() {
  if (!localStorage.getItem('hasSeenTutorial')) {
    document.getElementById('tutorial-modal').classList.add('active');
    document.body.classList.add('modal-open');
  }
};

window.closeTutorial = function() {
  document.getElementById('tutorial-modal').classList.remove('active');
  document.body.classList.remove('modal-open');
  localStorage.setItem('hasSeenTutorial', 'true');
};

window.updateTutorialDots = function() {
  const slider = document.getElementById('tutorial-slider');
  const dots = document.getElementById('tutorial-dots').children;
  const index = Math.round(slider.scrollLeft / slider.offsetWidth);
  for(let i=0; i<dots.length; i++) {
    dots[i].className = i === index ? 'dot active' : 'dot';
  }
};

// 動態更新 Header 標題與切換分頁
function switchTab(tabId) {
  // 切換前，先把所有分頁都隱藏
  document.getElementById('groups-view').style.display = 'none';
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('trip-view').style.display = 'none';
  document.getElementById('debt-view').style.display = 'none'; // 👈 就是補上這一行，讓結算畫面乖乖隱藏！
  document.getElementById('settings-view').style.display = 'none';

  // 只顯示被點擊的那個分頁
  document.getElementById(tabId + '-view').style.display = 'block';

  // 更新最下方導覽列的選中樣式，讓使用者知道自己在哪一頁
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('nav-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');

  // 更新最上方的標題
  const headerTitle = document.getElementById('main-header-title');
  if (tabId === 'groups') {
    if (window.showGroupsList) window.showGroupsList();
    else headerTitle.innerHTML = '👥 我的群組';
  } else if (tabId === 'birthday') {
    headerTitle.innerHTML = '🎂 生日倒數';
    if (window.loadBirthdays) window.loadBirthdays();
  } else if (tabId === 'gift') {
    headerTitle.innerHTML = '🎁 許願池與禮物';
  } else if (tabId === 'trip') {
    headerTitle.innerHTML = '✈️ 行程與代購';
  } else if (tabId === 'debt') {
    headerTitle.innerHTML = '💰 結算中心';
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

  const withBirthday = users.filter(u => u.birthday);
  if (withBirthday.length === 0) {
    list.innerHTML = emptyStateHtml('🎂', '目前還沒有任何生日紀錄', '快去邀請朋友加入，或到「設定」填上自己的生日吧！');
    return;
  }

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
    
    const safeName = escapeHtml(u.name);
    const safeAvatar = escapeHtml(avatarText);
    const displayName = isClosest ? `👑 ${safeName}` : safeName;
    const cardClass = isClosest ? 'card closest-birthday' : 'card';

    const card = document.createElement('div');
    card.className = cardClass;
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="avatar-circle">
          <span style="font-size: ${avatarSize};">${safeAvatar}</span>
        </div>
        <div style="text-align: left;">
          <p class="card-title" style="${isClosest ? 'color: #f97316;' : ''}">${displayName}</p>
          <p class="card-subtitle">${escapeHtml(u.birthday)}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: 700; font-size: ${isClosest ? '24px' : '20px'};">${daysText}</div>
    `;
    list.appendChild(card);
  });
}

// 這裡補回了遺失的 renderTrips 開頭，並去除了花俏的旅遊風標籤
window.renderTrips = function(trips, currentUserId) {
  const list = document.getElementById('trip-list');
  list.innerHTML = '';

  if (trips.length === 0) {
    list.innerHTML = emptyStateHtml('✈️', '目前還沒有任何行程', '按右下角的 + 按鈕，公佈你的下一趟旅行吧！');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTrips = trips.filter(t => t.date >= todayStr);
  const pastTrips = trips.filter(t => t.date < todayStr);
  const sortedTrips = [...activeTrips, ...pastTrips];

  sortedTrips.forEach(t => {
    const isPast = t.date < todayStr;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination)}`;
    const avatarText = t.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px'; else if (avatarText.length >= 5) avatarSize = '16px'; else if (avatarText.length >= 3) avatarSize = '20px';

    let exchangeHtml = '';
    if (t.tripType === 'international' && t.exchangeInfo) {
      const ex = t.exchangeInfo;
      let text = '';
      if (ex.mode === 'publish') text = `發佈日匯率 (1 ${ex.currency} = ${ex.rate.toFixed(4)} TWD)`;
      else if (ex.mode === 'custom') text = `自訂匯率 (1 ${ex.currency} = ${ex.rate} TWD)`;
      else if (ex.mode === 'purchase') text = `依購買當天匯率 (${ex.currency})`;
      exchangeHtml = `<div style="color: #888; font-size: 12px; margin-top: 6px;">💱 ${text}</div>`;
    }

    let actionsHtml = '';
    if (t.uid === currentUserId) {
      actionsHtml = `<div class="card-actions"><button class="icon-btn" onclick="editTrip('${t.id}')">✏️</button><button class="icon-btn" onclick="deleteTrip('${t.id}')">🗑️</button></div>`;
    }

    const tripProxies = window.globalGifts.filter(g => g.type === 'proxy' && g.tripId === t.id);
    let proxyHtml = '';
    if (tripProxies.length > 0) {
      proxyHtml += `<div style="width: 100%; margin-top: 15px; border-top: 1px solid #f0f0f0; padding-top: 15px; text-align: left;">`;
      proxyHtml += `<p style="font-size: 13px; font-weight: 500; color: #666; margin: 0 0 12px 0;">🛒 朋友託付代購</p>`;
      
      tripProxies.forEach(p => {
        const isPublisher = (t.uid === currentUserId);
        let statusBtn = '';
        if (isPublisher) {
            if (p.status === 'purchased') statusBtn = `<span style="color: #4a7c59; font-size: 12px; font-weight: 500;">✅ 已買到${p.actualPrice ? ` (NT$${escapeHtml(p.actualPrice)})` : ''}</span>`;
            else if (p.status === 'failed') statusBtn = `<span style="color: #999; font-size: 12px; font-weight: 500;">❌ 沒買到</span>`;
            else statusBtn = `
              <div style="display:flex; gap:6px;">
                <button onclick="purchaseProxy('${p.id}')" style="background: #2c2c2c; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">已買</button>
                <button onclick="failProxy('${p.id}')" style="background: #f2f2f2; color: #666; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">沒買</button>
              </div>`;
        } else {
            if (p.status === 'purchased') statusBtn = `<span style="color:#4a7c59; font-size:12px;">✅ 朋友已買到${p.actualPrice ? ` (NT$${escapeHtml(p.actualPrice)})` : ''}</span>`;
            else if (p.status === 'failed') statusBtn = '<span style="color:#999; font-size:12px;">❌ 殘念沒買到</span>';
            else statusBtn = '<span style="color:#888; font-size:12px;">⏳ 尚未購買</span>';
        }

        const proxyLink = p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" style="color: #555; font-size: 12px; text-decoration: underline; margin-top: 4px; display: inline-block;">參考連結</a>` : '';

        // 喊單本人可以修改或取消委託（已買到之後就不能再改了）
        let requesterActions = '';
        if (p.uid === currentUserId && p.status !== 'purchased') {
          requesterActions = `<div style="display:flex; gap:6px; margin-top:8px;">
            <button class="icon-btn" onclick="editGift('${p.id}')" title="修改">✏️</button>
            <button class="icon-btn" onclick="deleteGift('${p.id}')" title="取消委託">🗑️</button>
          </div>`;
        }

        proxyHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #f5f5f5;">
              <div style="font-size: 14px; flex: 1; padding-right: 10px;">
                <span style="font-weight: 500; color: #333;">${escapeHtml(p.name)}：</span>${escapeHtml(p.itemName)}
                ${p.price ? `<div style="color: #999; font-size: 12px; margin-top: 4px;">預估 NT$${escapeHtml(p.price)}</div>` : ''}
                <div>${proxyLink}</div>
                ${requesterActions}
              </div>
              <div>${statusBtn}</div>

          </div>`;
      });
      proxyHtml += `</div>`;
    }

    const safeDest = escapeHtml(t.destination);

    const card = document.createElement('div');
    card.className = isPast ? 'card archived' : 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    card.innerHTML = `
      ${actionsHtml}
      <div style="display: flex; align-items: center; gap: 15px; width: 100%; margin-bottom: 12px; padding-right: 40px; box-sizing: border-box;">
        <div class="avatar-circle"><span style="font-size: ${avatarSize};">${escapeHtml(avatarText)}</span></div>
        <div style="text-align: left;">
          <div style="font-size: 12px; color: #999; margin-bottom: 4px;">${isPast ? '已結束行程' : '計畫中行程'}</div>
          <p class="card-title" style="font-size: 16px;">${escapeHtml(t.name)} 要去 <strong>${safeDest}</strong></p>
          <p class="card-subtitle" style="font-size: 13px; color: #888;">日期：${escapeHtml(t.date)}</p>
        </div>
      </div>
      <div style="width: 100%; text-align: left; margin-bottom: 15px;">
        ${exchangeHtml}
        ${t.note ? `<div style="background: #fafafa; padding: 12px; border-radius: 8px; font-size: 14px; color: #666; margin-top: 10px; border: 1px solid #f5f5f5;">備註：${escapeHtml(t.note)}</div>` : ''}
      </div>
      <div style="display: flex; gap: 10px; width: 100%;">
        <a href="${mapUrl}" target="_blank" class="secondary-btn" style="text-align: center; text-decoration: none; flex: 1; padding: 12px 0; font-size: 14px;">📍 附近地圖</a>
        <button class="primary-btn" data-dest="${safeDest}" data-trip-id="${t.id}" onclick="openProxyRequest(this.dataset.dest, this.dataset.tripId)" style="flex: 1; padding: 12px 0; font-size: 14px;">📝 許願代購</button>
      </div>
      ${proxyHtml}
    `;
    list.appendChild(card);
  });
};

window.renderGifts = function(gifts, currentUserId) {
  const list = document.getElementById('gift-list');
  list.innerHTML = '';
  const generalGifts = gifts.filter(g => g.type !== 'proxy');

  if (generalGifts.length === 0) {
    list.innerHTML = emptyStateHtml('🎁', '許願池空空的', '按右下角的 + 按鈕，新增你的第一個願望吧！');
    return;
  }
  
  // 自動沉底邏輯：已經收到的禮物排到最後面
  const activeGifts = generalGifts.filter(g => g.status !== 'received');
  const receivedGifts = generalGifts.filter(g => g.status === 'received');
  const sortedGifts = [...activeGifts, ...receivedGifts];

  sortedGifts.forEach(g => {
    const isReceived = g.status === 'received';
    const linkHtml = g.link ? `<a href="${escapeHtml(g.link)}" target="_blank" style="display: inline-block; margin-top: 4px; color: #555; text-decoration: underline; font-size: 13px;">參考連結</a>` : '';
    const priceText = g.price ? `NT$${g.price}` : '未標價';
    const tagHtml = g.type === 'birthday' ? `<div style="font-size: 12px; color: #888; margin-bottom: 6px;">🎂 ${g.birthdayYear} 生日願望</div>` : '';

    let actionsHtml = '';
    if (g.uid === currentUserId) actionsHtml = `<div class="card-actions"><button class="icon-btn" onclick="editGift('${g.id}')">✏️</button><button class="icon-btn" onclick="deleteGift('${g.id}')">🗑️</button></div>`;

    let claimHtml = '';
    if (isReceived) {
        if (g.uid === currentUserId) claimHtml = `<div style="background: #fafafa; color: #4a7c59; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 15px; text-align: center; border: 1px solid #eee;">✅ 願望已達成！順利收到禮物</div>`;
        else claimHtml = `<div style="background: #fafafa; color: #888; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 15px; text-align: center; border: 1px solid #eee;">✅ 朋友已經收到這個禮物</div>`;
    } else {
        if (g.uid !== currentUserId) {
             if (g.claimedBy) {
                 if (g.claimedBy === currentUserId) claimHtml = `<div style="background: #fafafa; color: #4a7c59; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 12px; text-align: center; border: 1px solid #eee;">✅ 你已認領準備此禮物</div>`;
                 else claimHtml = `<div style="background: #fafafa; color: #999; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 12px; text-align: center; border: 1px solid #eee;">🎁 已有朋友認領</div>`;
             } else claimHtml = `<button onclick="claimGift('${g.id}')" style="margin-top: 12px; width: 100%; background: #2c2c2c; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer;">🙋‍♂️ 認領這個願望</button>`;
        } else {
             if (g.claimedBy) {
                 claimHtml = `<div style="color: #666; font-size: 13px; margin-top: 15px; text-align: center;">🎉 神秘人已認領準備中</div>
                 <button onclick="confirmGiftReceived('${g.id}')" style="margin-top: 12px; width: 100%; background: #fff; color: #333; border: 1px solid #ddd; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer;">🎁 我收到禮物了</button>`;
             } else {
                 claimHtml = `<div style="color: #aaa; font-size: 13px; margin-top: 15px; text-align: center;">⏳ 期待中...</div>
                 <button onclick="confirmGiftReceived('${g.id}')" style="margin-top: 12px; width: 100%; background: #fff; color: #333; border: 1px solid #ddd; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer;">🎁 我已經拿到這個禮物</button>`;
             }
        }
    }

    const avatarText = g.avatar || '😎';
    let avatarSize = '26px';
    if (avatarText.length >= 8) avatarSize = '12px'; else if (avatarText.length >= 5) avatarSize = '16px'; else if (avatarText.length >= 3) avatarSize = '20px';

    const card = document.createElement('div');
    card.className = isReceived ? 'card archived' : 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';

    card.innerHTML = `
      ${actionsHtml}
      ${tagHtml}
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 15px; padding-right: 40px; box-sizing: border-box;">
        <div class="avatar-circle"><span style="font-size: ${avatarSize};">${escapeHtml(avatarText)}</span></div>
        <div style="text-align: left;">
          <p class="card-title">${escapeHtml(g.name)}</p>
          <p class="card-subtitle" style="color: #333; font-weight: 500; font-size: 15px;">${escapeHtml(g.itemName)}</p>
        </div>
      </div>
      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <div style="font-weight: 500; color: #666; font-size: 14px;">預估價格：${priceText}</div>
        ${g.note ? `<div style="background: #fafafa; padding: 12px; border-radius: 8px; font-size: 13px; color: #666; border: 1px solid #f5f5f5;">備註：${escapeHtml(g.note)}</div>` : ''}
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

// --- 沒買到按鈕功能 ---
window.failProxy = async function(giftId) {
  if (!(await showConfirm("確定沒買到嗎？這會標記為殘念喔！"))) return;
  try { await window.updateDoc(window.doc(window.db, "gifts", giftId), { status: 'failed' }); } catch(e) { showToast("標記失敗：" + e.message); }
};

// --- 顯示朋友的多個銀行帳號功能 ---
window.showBankAccounts = function(userId) {
  const user = window.globalUsers.find(u => u.id === userId);
  const container = document.getElementById('bank-accounts-container');
  if (!user || !user.payments || user.payments.length === 0) {
    showToast('對方尚未設定收款方式喔！');
    return;
  }
  container.innerHTML = '';
  user.payments.forEach(p => {
    const safeValue = escapeHtml(p.value);
    container.innerHTML += `
      <div style="background: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: left;">
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">${escapeHtml(p.type)}</div>
          <div style="font-weight: 500; color: #333; font-size: 15px;">${p.code ? escapeHtml(p.code) + ' - ' : ''}${safeValue}</div>
        </div>
        <button class="copy-pay-btn" data-value="${safeValue}" style="background: #2c2c2c; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-size: 13px; cursor: pointer;">複製</button>
      </div>
    `;
  });
  document.querySelectorAll('.copy-pay-btn').forEach(btn => {
    btn.onclick = () => {
      navigator.clipboard.writeText(btn.dataset.value);
      showToast('已複製！');
    };
  });
  document.getElementById('bank-modal').classList.add('active');
};

// === 💸 結算中心專屬邏輯 ===
window.renderDebts = function(debts, currentUserId) {
  const list = document.getElementById('debt-list');
  if (!list) return;
  list.innerHTML = '';

  if (!currentUserId) return;

  // 計算我墊付的總額 (未結清的)
  const myCredits = debts.filter(d => d.creditorId === currentUserId && !d.isSettled);
  const totalCredit = myCredits.reduce((sum, d) => sum + d.amount, 0);
  const creditEl = document.getElementById('my-credit-total');
  if (creditEl) creditEl.textContent = totalCredit.toLocaleString();

  const myRelatedDebts = debts.filter(d => d.creditorId === currentUserId || d.debtorId === currentUserId);

  if (myRelatedDebts.length === 0) {
    list.innerHTML = emptyStateHtml('💰', '目前沒有任何帳目', '幫朋友代購，或按右下角 + 記一筆帳，就會顯示在這裡。');
    return;
  }

  // 依「對方是誰、誰欠誰」分組，同一個人的帳目會集中在同一個格子裡
  const groups = {};
  myRelatedDebts.forEach(d => {
    const isIOwe = d.debtorId === currentUserId;
    const otherPersonId = isIOwe ? d.creditorId : d.debtorId;
    const key = otherPersonId + '_' + (isIOwe ? 'owe' : 'owed');
    if (!groups[key]) groups[key] = { otherPersonId, isIOwe, items: [] };
    groups[key].items.push(d);
  });

  // 還有未結清帳目的分組排前面
  const groupList = Object.values(groups).sort((a, b) => {
    const aActive = a.items.some(d => !d.isSettled) ? 1 : 0;
    const bActive = b.items.some(d => !d.isSettled) ? 1 : 0;
    return bActive - aActive;
  });

  groupList.forEach(group => {
    const { otherPersonId, isIOwe, items } = group;
    const otherUser = window.globalUsers?.find(u => u.id === otherPersonId);
    const otherName = escapeHtml(otherUser ? otherUser.name : (isIOwe ? items[0].creditorName : '朋友'));
    const otherAvatar = escapeHtml(otherUser?.avatar || '😎');

    // 有「連結／照片」的帳目，代表牽涉到實體商品，才需要另外追蹤東西有沒有交到手上；
    // 純粹分攤費用（沒有連結）的帳目不需要，錢一付清就算完成。
    const hasItemTracking = (d) => !!(d.sourceGiftId || d.link);
    const isFullyDone = (d) => d.isSettled && (!hasItemTracking(d) || d.itemReceived);
    const activeItems = items.filter(d => !isFullyDone(d));
    const settledItems = items.filter(isFullyDone);
    const activeTotal = activeItems.reduce((sum, d) => sum + d.amount, 0);

    let itemsHtml = '';
    activeItems.forEach(d => {
      const isMine = d.creditorId === currentUserId;
      const itemActionHtml = d.isSettled ? '' : (isIOwe
        ? `<button style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap;" onclick="event.stopPropagation(); showBankAccounts('${otherPersonId}')">💳 轉帳</button>`
        : `<button style="background: #2c2c2c; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap;" onclick="event.stopPropagation(); settleDebt('${d.id}')">確認收款</button>`);
      const ownerActionsHtml = isMine ? `
          <button class="icon-btn" style="width:26px;height:26px;font-size:12px; flex-shrink:0;" onclick="event.stopPropagation(); editDebt('${d.id}')" title="修改">✏️</button>
          <button class="icon-btn" style="width:26px;height:26px;font-size:12px; flex-shrink:0;" onclick="event.stopPropagation(); deleteDebt('${d.id}')" title="刪除">🗑️</button>` : '';
      const linkHtml = d.link ? `<a href="${escapeHtml(d.link)}" target="_blank" onclick="event.stopPropagation();" style="font-size:12px; color:#888; text-decoration:underline; display:inline-block; margin-top:4px;">🔗 查看圖片</a>` : '';

      // 錢/貨兩件事分開標示狀態
      let statusRow = '';
      if (hasItemTracking(d)) {
        const moneyBadge = d.isSettled
          ? `<span style="font-size:11px; color:#4a7c59; white-space:nowrap;">💰 已收款</span>`
          : `<span style="font-size:11px; color:#d9534f; white-space:nowrap;">💰 待付款</span>`;
        let itemBadge;
        if (d.itemReceived) {
          itemBadge = `<span style="font-size:11px; color:#4a7c59; white-space:nowrap;">📦 已拿到商品</span>`;
        } else if (isIOwe) {
          itemBadge = `<button style="background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; padding:2px 8px; border-radius:10px; font-size:11px; cursor:pointer; white-space:nowrap;" onclick="event.stopPropagation(); confirmItemReceived('${d.id}')">📦 確認收到商品</button>`;
        } else {
          itemBadge = `<span style="font-size:11px; color:#c2410c; white-space:nowrap;">📦 等待對方收貨</span>`;
        }
        statusRow = `<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:6px;">${moneyBadge}${itemBadge}</div>`;
      }

      itemsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding:12px 0; border-top:1px solid #f2f2f2;">
          <div style="text-align:left; min-width:0; flex:1;">
            <div style="font-size:14px; color:#333; word-break:break-word;">${escapeHtml(d.item)}</div>
            <div style="font-size:15px; font-weight:600; color:${isIOwe ? '#d9534f' : '#333'}; margin-top:2px;">NT$ ${d.amount}</div>
            ${linkHtml}
            ${statusRow}
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
            ${itemActionHtml}
            <div style="display:flex; gap:6px;">${ownerActionsHtml}</div>
          </div>
        </div>`;
    });

    const settledHtml = settledItems.map(d => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 0; border-top:1px solid #f2f2f2; opacity:0.5;">
          <div style="text-align:left; font-size:13px; color:#999; word-break:break-word;">${escapeHtml(d.item)} · NT$ ${d.amount}</div>
          <span style="font-size:12px; color:#aaa; white-space:nowrap; flex-shrink:0;">已完成</span>
        </div>`).join('');

    // 一次全部結清只處理「錢」，商品交付還是要個別確認，所以只在對方全部都還沒付款時才提供這顆按鈕
    const unpaidCount = activeItems.filter(d => !isIOwe && !d.isSettled).length;
    const bulkBtnHtml = (!isIOwe && unpaidCount > 1)
      ? `<button style="width:100%; margin-top:10px; background:#2c2c2c; color:white; border:none; padding:10px 0; border-radius:8px; font-size:13px; cursor:pointer;" onclick="event.stopPropagation(); settleAllForPerson('${otherPersonId}')">✅ ${otherName} 全部標記已收款（共 NT$${activeTotal.toLocaleString()}）</button>`
      : '';

    const card = document.createElement('div');
    card.className = activeItems.length === 0 ? 'card archived' : 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'stretch';

    card.innerHTML = `
      <div onclick="showBankAccounts('${otherPersonId}')" title="點擊查看對方帳號" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar-circle" style="width:36px; height:36px; min-width:36px;"><span style="font-size:16px;">${otherAvatar}</span></div>
          <div style="text-align:left;">
            <div style="font-size:15px; font-weight:600; color:#333;">${otherName}</div>
            <div style="font-size:12px; color:#999;">${isIOwe ? '待付給對方' : '對方應付款'}</div>
          </div>
        </div>
        ${activeItems.length > 0 ? `<div style="font-size:18px; font-weight:700; color:${isIOwe ? '#d9534f' : '#333'};">NT$ ${activeTotal.toLocaleString()}</div>` : `<span style="font-size:12px; color:#aaa;">已結清</span>`}
      </div>
      ${itemsHtml}
      ${settledHtml}
      ${bulkBtnHtml}
    `;
    list.appendChild(card);
  });
}

// 一次把某個人所有未結清帳目標記為已結清
window.settleAllForPerson = async function(personId) {
  const user = window.auth?.currentUser;
  if (!user) return;
  const targets = (window.globalDebts || []).filter(d => d.creditorId === user.uid && d.debtorId === personId && !d.isSettled);
  if (targets.length === 0) return;
  if (!(await showConfirm(`確定要把這位朋友的 ${targets.length} 筆帳目都標記為已結清嗎？`))) return;
  try {
    await Promise.all(targets.map(d => window.updateDoc(window.doc(window.db, "debts", d.id), { isSettled: true })));
  } catch (e) {
    showToast("操作失敗：" + e.message);
  }
};

// 記帳修改 / 刪除
window.editDebt = function(id) {
  const debt = window.globalDebts.find(d => d.id === id);
  if (!debt) return;
  window.editingDebtId = id;
  document.getElementById('debt-item').value = debt.item;
  document.getElementById('debt-amount').value = debt.amount;
  document.getElementById('debt-link').value = debt.link || '';
  const cbContainer = document.getElementById('debtor-checkboxes');
  cbContainer.innerHTML = '<p style="font-size:13px; color:#999; margin:0;">修改模式僅能調整項目名稱、金額與連結。若要更換欠款對象，請刪除後重新新增一筆。</p>';
  document.getElementById('add-debt-btn').textContent = "儲存修改";
  document.getElementById('debt-modal').classList.add('active');
  document.body.classList.add('modal-open');
};

window.deleteDebt = async function(id) {
  if (!(await showConfirm("確定要刪除這筆帳目嗎？"))) return;
  try {
    await window.deleteDoc(window.doc(window.db, "debts", id));
  } catch (e) {
    showToast("刪除失敗：" + e.message);
  }
};

// 結算彈出視窗控制
const debtModal = document.getElementById('debt-modal');
document.getElementById('open-debt-modal-btn')?.addEventListener('click', () => {
  window.editingDebtId = null;
  document.getElementById('add-debt-btn').textContent = "記上一筆";
  document.getElementById('debt-item').value = '';
  document.getElementById('debt-amount').value = '';
  document.getElementById('debt-link').value = '';

  const cbContainer = document.getElementById('debtor-checkboxes');
  cbContainer.innerHTML = '';
  const currentGroup = window.myGroups?.find(g => g.id === window.activeGroupId);
  const memberIds = currentGroup?.memberIds || [];
  const friends = (window.globalUsers?.filter(u => memberIds.includes(u.id) && u.id !== window.auth?.currentUser?.uid)) || [];
  if(friends.length === 0) cbContainer.innerHTML = '<span style="font-size:13px; color:#999;">這個群組還沒有其他成員喔，先邀請朋友加入吧！</span>';

  friends.forEach(f => {
    cbContainer.innerHTML += `
      <label style="display: block; margin-bottom: 8px; font-size: 15px; cursor: pointer;">
        <input type="checkbox" class="debtor-cb" value="${f.id}" style="margin-right: 8px; transform: scale(1.2);">
        ${escapeHtml(f.avatar || '😎')} ${escapeHtml(f.name)}
      </label>
    `;
  });

  debtModal.classList.add('active');
  document.body.classList.add('modal-open');
});

document.getElementById('close-debt-modal-btn')?.addEventListener('click', () => {
  window.editingDebtId = null;
  debtModal.classList.remove('active');
  document.body.classList.remove('modal-open');
});

// 偷偷看總結算
document.getElementById('secret-view-btn')?.addEventListener('click', () => {
  let report = "【大家目前的欠款總覽】\n\n";
  const balances = {};

  window.globalDebts.filter(d => !d.isSettled).forEach(d => {
     if(!balances[d.debtorId]) balances[d.debtorId] = { name: '', owes: 0 };
     balances[d.debtorId].owes += d.amount;
     const u = window.globalUsers.find(user => user.id === d.debtorId);
     if(u) balances[d.debtorId].name = u.name;
  });

  let hasDebt = false;
  for(let id in balances) {
     if(balances[id].owes > 0) {
        report += "👀 " + (balances[id].name || '某朋友') + " 總共還欠 " + balances[id].owes + " 元\n";
        hasDebt = true;
     }
  }
  if(!hasDebt) report += "大家都互不相欠，太棒啦！";
  showToast(report);
});