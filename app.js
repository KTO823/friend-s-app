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
            if (p.status === 'purchased') statusBtn = `<span style="color: #4a7c59; font-size: 12px; font-weight: 500;">✅ 已買到</span>`;
            else if (p.status === 'failed') statusBtn = `<span style="color: #999; font-size: 12px; font-weight: 500;">❌ 沒買到</span>`;
            else statusBtn = `
              <div style="display:flex; gap:6px;">
                <button onclick="purchaseProxy('${p.id}')" style="background: #2c2c2c; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">已買</button>
                <button onclick="failProxy('${p.id}')" style="background: #f2f2f2; color: #666; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">沒買</button>
              </div>`;
        } else {
            if (p.status === 'purchased') statusBtn = '<span style="color:#4a7c59; font-size:12px;">✅ 朋友已買到</span>';
            else if (p.status === 'failed') statusBtn = '<span style="color:#999; font-size:12px;">❌ 殘念沒買到</span>';
            else statusBtn = '<span style="color:#888; font-size:12px;">⏳ 尚未購買</span>';
        }

        const proxyLink = p.link ? `<a href="${p.link}" target="_blank" style="color: #555; font-size: 12px; text-decoration: underline; margin-top: 4px; display: inline-block;">參考連結</a>` : '';

        proxyHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #f5f5f5;">
              <div style="font-size: 14px; flex: 1; padding-right: 10px;">
                <span style="font-weight: 500; color: #333;">${p.name}：</span>${p.itemName}
                ${p.price ? `<div style="color: #999; font-size: 12px; margin-top: 4px;">預估 NT$${p.price}</div>` : ''}
                <div>${proxyLink}</div>
              </div>
              <div>${statusBtn}</div>
          </div>`;
      });
      proxyHtml += `</div>`;
    }

    const card = document.createElement('div');
    card.className = isPast ? 'card archived' : 'card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    card.innerHTML = `
      ${actionsHtml}
      <div style="display: flex; align-items: center; gap: 15px; width: 100%; margin-bottom: 12px; padding-right: 40px; box-sizing: border-box;">
        <div class="avatar-circle"><span style="font-size: ${avatarSize};">${avatarText}</span></div>
        <div style="text-align: left;">
          <div style="font-size: 12px; color: #999; margin-bottom: 4px;">${isPast ? '已結束行程' : '計畫中行程'}</div>
          <p class="card-title" style="font-size: 16px;">${t.name} 要去 <strong>${t.destination}</strong></p>
          <p class="card-subtitle" style="font-size: 13px; color: #888;">日期：${t.date}</p>
        </div>
      </div>
      <div style="width: 100%; text-align: left; margin-bottom: 15px;">
        ${exchangeHtml}
        ${t.note ? `<div style="background: #fafafa; padding: 12px; border-radius: 8px; font-size: 14px; color: #666; margin-top: 10px; border: 1px solid #f5f5f5;">備註：${t.note}</div>` : ''}
      </div>
      <div style="display: flex; gap: 10px; width: 100%;">
        <a href="${mapUrl}" target="_blank" class="secondary-btn" style="text-align: center; text-decoration: none; flex: 1; padding: 12px 0; font-size: 14px;">📍 附近地圖</a>
        <button class="primary-btn" onclick="openProxyRequest('${t.destination}', '${t.id}')" style="flex: 1; padding: 12px 0; font-size: 14px;">📝 許願代購</button>
      </div>
      ${proxyHtml}
    `;
    list.appendChild(card);
  });

window.renderGifts = function(gifts, currentUserId) {
  const list = document.getElementById('gift-list');
  list.innerHTML = '';
  const generalGifts = gifts.filter(g => g.type !== 'proxy');

  if (generalGifts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">許願池空空的，快來新增吧！</p>';
    return;
  }
  
  // 自動沉底邏輯：已經收到的禮物排到最後面
  const activeGifts = generalGifts.filter(g => g.status !== 'received');
  const receivedGifts = generalGifts.filter(g => g.status === 'received');
  const sortedGifts = [...activeGifts, ...receivedGifts];

  sortedGifts.forEach(g => {
    const isReceived = g.status === 'received';
    const linkHtml = g.link ? `<a href="${g.link}" target="_blank" style="display: inline-block; margin-top: 4px; color: #555; text-decoration: underline; font-size: 13px;">參考連結</a>` : '';
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
        <div class="avatar-circle"><span style="font-size: ${avatarSize};">${avatarText}</span></div>
        <div style="text-align: left;">
          <p class="card-title">${g.name}</p>
          <p class="card-subtitle" style="color: #333; font-weight: 500; font-size: 15px;">${g.itemName}</p>
        </div>
      </div>
      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <div style="font-weight: 500; color: #666; font-size: 14px;">預估價格：${priceText}</div>
        ${g.note ? `<div style="background: #fafafa; padding: 12px; border-radius: 8px; font-size: 13px; color: #666; border: 1px solid #f5f5f5;">備註：${g.note}</div>` : ''}
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

// --- 沒買到按鈕功能 ---
window.failProxy = async function(giftId) {
  if(!confirm("確定沒買到嗎？這會標記為殘念喔！")) return;
  try { await updateDoc(doc(window.db, "gifts", giftId), { status: 'failed' }); } catch(e) { alert("標記失敗：" + e.message); }
};

// --- 顯示朋友的多個銀行帳號功能 ---
window.showBankAccounts = function(userId) {
  const user = window.globalUsers.find(u => u.id === userId);
  const container = document.getElementById('bank-accounts-container');
  if (!user || !user.payments || user.payments.length === 0) {
    alert('對方尚未設定收款方式喔！');
    return;
  }
  container.innerHTML = '';
  user.payments.forEach(p => {
    container.innerHTML += `
      <div style="background: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: left;">
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">${p.type}</div>
          <div style="font-weight: 500; color: #333; font-size: 15px;">${p.code ? p.code + ' - ' : ''}${p.value}</div>
        </div>
        <button onclick="navigator.clipboard.writeText('${p.value}'); alert('已複製！');" style="background: #2c2c2c; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-size: 13px; cursor: pointer;">複製</button>
      </div>
    `;
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

  // 列出與我相關的帳目
  const myRelatedDebts = debts.filter(d => d.creditorId === currentUserId || d.debtorId === currentUserId);
  const activeDebts = myRelatedDebts.filter(d => !d.isSettled);
  const settledDebts = myRelatedDebts.filter(d => d.isSettled);
  const sortedDebts = [...activeDebts, ...settledDebts];

  if (sortedDebts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">目前沒有任何帳目紀錄。</p>';
    return;
  }

  sortedDebts.forEach(d => {
    const isSettled = d.isSettled;
    const isIOwe = d.debtorId === currentUserId;

    const otherPersonId = isIOwe ? d.creditorId : d.debtorId;
    const otherUser = window.globalUsers?.find(u => u.id === otherPersonId);
    const otherName = otherUser ? otherUser.name : (isIOwe ? d.creditorName : '朋友');

    let statusHtml = '';
    if (isSettled) {
       statusHtml = `<span style="font-size: 12px; color: #aaa;">已結清</span>`;
    } else {
       if (isIOwe) {
           statusHtml = `<button style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;" onclick="showBankAccounts('${otherPersonId}')">💳 轉帳</button>`;
       } else {
           statusHtml = `<button style="background: #2c2c2c; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;" onclick="settleDebt('${d.id}')">確認收款</button>`;
       }
    }

    const card = document.createElement('div');
    card.className = isSettled ? 'card archived' : 'card';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';

    // 💡 點擊左邊整塊文字區，就會直接呼叫 showBankAccounts 跳出帳號視窗！
    card.innerHTML = `
      <div style="flex: 1; text-align: left; cursor: pointer;" onclick="showBankAccounts('${otherPersonId}')" title="點擊查看對方帳號">
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
          ${isIOwe ? `<span style="color:#d9534f; font-weight:500;">待付給</span> ${otherName}` : `${otherName} <span style="color:#4a7c59; font-weight:500;">應付款</span>`}
        </div>
        <div style="font-size: 15px; font-weight: 500; color: #333;">${d.item}</div>
        <div style="font-size: 18px; font-weight: 600; margin-top: 4px; color: ${isIOwe ? '#d9534f' : '#333'};">NT$ ${d.amount}</div>
      </div>
      <div>${statusHtml}</div>
    `;
    list.appendChild(card);
  });
}

// 結算彈出視窗控制
const debtModal = document.getElementById('debt-modal');
document.getElementById('open-debt-modal-btn')?.addEventListener('click', () => {
  document.getElementById('debt-item').value = '';
  document.getElementById('debt-amount').value = '';

  const cbContainer = document.getElementById('debtor-checkboxes');
  cbContainer.innerHTML = '';
  const friends = window.globalUsers?.filter(u => u.id !== window.auth?.currentUser?.uid) || [];
  if(friends.length === 0) cbContainer.innerHTML = '<span style="font-size:13px; color:#999;">目前還沒有其他朋友加入設定喔</span>';

  friends.forEach(f => {
    cbContainer.innerHTML += `
      <label style="display: block; margin-bottom: 8px; font-size: 15px; cursor: pointer;">
        <input type="checkbox" class="debtor-cb" value="${f.id}" style="margin-right: 8px; transform: scale(1.2);">
        ${f.avatar || '😎'} ${f.name}
      </label>
    `;
  });

  debtModal.classList.add('active');
  document.body.classList.add('modal-open');
});

document.getElementById('close-debt-modal-btn')?.addEventListener('click', () => {
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
  alert(report);
});