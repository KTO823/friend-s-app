// 這個函數負責處理底部導航欄的點擊切換
function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('debt-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none';

  document.getElementById(tabId + '-view').style.display = 'block';
  
  // 每次切換回生日頁面時，重新抓一次最新資料
  if (tabId === 'birthday' && window.loadBirthdays) {
    window.loadBirthdays();
  }
}

// 計算還有幾天生日
function calculateDaysLeft(dateString) {
  if (!dateString) return 999; // 避錯處理
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const bday = new Date(dateString);
  let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  
  if (today > nextBday) {
    nextBday.setFullYear(today.getFullYear() + 1); // 如果今年生日過了，算明年的
  }
  
  const diffTime = Math.abs(nextBday - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

// 接收來自 Firebase 的資料並渲染成畫面
window.renderBirthdaysFromData = function(users) {
  const list = document.getElementById('birthday-list');
  list.innerHTML = '';
  
  // 依照倒數天數排序 (天數少的在最上面)
  users.sort((a, b) => calculateDaysLeft(a.birthday) - calculateDaysLeft(b.birthday));
  
  let count = 0;
  
  users.forEach(u => {
    if (!u.birthday) return; // 如果有人登入了但沒設定生日，就先不顯示
    count++;
    
    const daysLeft = calculateDaysLeft(u.birthday);
    let daysText = daysLeft === 0 ? "就是今天！" : `剩 ${daysLeft} 天`;
    let daysColor = daysLeft <= 7 ? "#ff6b6b" : "#4a4a4a"; // 一週內變紅色提醒
    
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 32px; width: 40px; text-align: center;">
          ${u.avatar || '😎'}
        </div>
        <div>
          <p class="card-title">${u.name}</p>
          <p class="card-subtitle">${u.birthday}</p>
        </div>
      </div>
      <div class="countdown" style="color: ${daysColor}; font-weight: bold;">
        ${daysText}
      </div>
    `;
    list.appendChild(card);
  });

  if (count === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999;">目前還沒有人設定生日喔！</p>';
  }
}