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

// 找到原本的 switchTab，替換成這段：
function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('trip-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none';
  const debtView = document.getElementById('debt-view');
  if(debtView) debtView.style.display = 'none';

  document.getElementById(tabId + '-view').style.display = 'block';

  const headerTitle = document.getElementById('main-header-title');
  if (tabId === 'birthday') {
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

// === 💸 結算中心渲染邏輯 ===
window.renderDebts = function(debts, currentUserId) {
  const list = document.getElementById('debt-list');
  list.innerHTML = '';
  
  if (!currentUserId) return;

  // 計算我墊付的總額 (未結清的)
  const myCredits = debts.filter(d => d.creditorId === currentUserId && !d.isSettled);
  const totalCredit = myCredits.reduce((sum, d) => sum + d.amount, 0);
  document.getElementById('my-credit-total').textContent = totalCredit.toLocaleString();

  // 列出與我相關的帳目 (我欠人的，或別人欠我的)
  const myRelatedDebts = debts.filter(d => d.creditorId === currentUserId || d.debtorId === currentUserId);
  const activeDebts = myRelatedDebts.filter(d => !d.isSettled);
  const settledDebts = myRelatedDebts.filter(d => d.isSettled);
  const sortedDebts = [...activeDebts, ...settledDebts]; // 已結清的沉底

  if (sortedDebts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">目前沒有任何帳目紀錄。</p>';
    return;
  }

  sortedDebts.forEach(d => {
    const isSettled = d.isSettled;
    const isIOwe = d.debtorId === currentUserId; // 是我欠別人錢
    
    // 找出對方的名字 (從 globalUsers)
    const otherPersonId = isIOwe ? d.creditorId : d.debtorId;
    const otherUser = window.globalUsers?.find(u => u.id === otherPersonId);
    const otherName = otherUser ? otherUser.name : (isIOwe ? d.creditorName : '朋友');

    let statusHtml = '';
    if (isSettled) {
       statusHtml = `<span class="tag-soft">已結清</span>`;
    } else {
       if (isIOwe) {
           statusHtml = `<button class="secondary-btn" style="padding: 6px 12px; font-size: 13px;" onclick="alert('請私下轉帳給 ${otherName} 後，請對方按下確認結清喔！')">待還款</button>`;
       } else {
           statusHtml = `<button class="primary-btn" style="padding: 6px 12px; font-size: 13px;" onclick="settleDebt('${d.id}')">標記結清</button>`;
       }
    }

    const card = document.createElement('div');
    card.className = isSettled ? 'card archived' : 'card';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';
    
    card.innerHTML = `
      <div style="flex: 1; text-align: left;">
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
          ${isIOwe ? `<span style="color:#e74c3c; font-weight:bold;">你要給</span> ${otherName}` : `${otherName} <span style="color:#27ae60; font-weight:bold;">應給你</span>`}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #2c2c2c;">${d.item}</div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: ${isIOwe ? '#e74c3c' : '#2c2c2c'};">NT$ ${d.amount}</div>
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
  
  // 動態生成朋友核取方塊
  const cbContainer = document.getElementById('debtor-checkboxes');
  cbContainer.innerHTML = '';
  const friends = window.globalUsers.filter(u => u.id !== window.auth.currentUser.uid);
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
     
     // 嘗試找名字
     const u = window.globalUsers.find(user => user.id === d.debtorId);
     if(u) balances[d.debtorId].name = u.name;
  });

  let hasDebt = false;
  for(let id in balances) {
     if(balances[id].owes > 0) {
        report += `👀 ${balances[id].name || '某朋友'} 總共還欠 ${balances[id].owes} 元\n`;
        hasDebt = true;
     }
  }
  
  if(!hasDebt) report += "大家都互不相欠，太棒啦！";
  alert(report);
});

// === 💸 結算中心專屬邏輯 (請貼在 app.js 最底下) ===
window.renderDebts = function(debts, currentUserId) {
  const list = document.getElementById('debt-list');
  if (!list) return;
  list.innerHTML = '';

  if (!currentUserId) return;

  const myCredits = debts.filter(d => d.creditorId === currentUserId && !d.isSettled);
  const totalCredit = myCredits.reduce((sum, d) => sum + d.amount, 0);
  const creditEl = document.getElementById('my-credit-total');
  if (creditEl) creditEl.textContent = totalCredit.toLocaleString();

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
       statusHtml = `<span class="tag-soft">已結清</span>`;
    } else {
       if (isIOwe) {
           statusHtml = `<button class="secondary-btn" style="padding: 6px 12px; font-size: 13px;" onclick="alert('請私下轉帳給 ${otherName} 後，請對方按下確認結清喔！')">待還款</button>`;
       } else {
           statusHtml = `<button class="primary-btn" style="padding: 6px 12px; font-size: 13px; background-color: #2c2c2c; color: white;" onclick="settleDebt('${d.id}')">標記結清</button>`;
       }
    }

    const card = document.createElement('div');
    card.className = isSettled ? 'card archived' : 'card';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';

    card.innerHTML = `
      <div style="flex: 1; text-align: left;">
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
          ${isIOwe ? `<span style="color:#e74c3c; font-weight:bold;">你要給</span> ${otherName}` : `${otherName} <span style="color:#27ae60; font-weight:bold;">應給你</span>`}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #2c2c2c;">${d.item}</div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: ${isIOwe ? '#e74c3c' : '#2c2c2c'};">NT$ ${d.amount}</div>
      </div>
      <div>${statusHtml}</div>
    `;
    list.appendChild(card);
  });
}

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
        report += `👀 ${balances[id].name || '某朋友'} 總共還欠 ${balances[id].owes} 元\n`;
        hasDebt = true;
     }
  }
  if(!hasDebt) report += "大家都互不相欠，太棒啦！";
  alert(report);
});