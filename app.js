function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('debt-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none'; // 新增這行

  document.getElementById(tabId + '-view').style.display = 'block';
}

// 暫存的生日資料陣列
let birthdays = [];

// 計算還有幾天生日
function calculateDaysLeft(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const bday = new Date(dateString);
  let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  
  if (today > nextBday) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = Math.abs(nextBday - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

// 把資料渲染成畫面
function renderBirthdays() {
  const list = document.getElementById('birthday-list');
  list.innerHTML = '';
  
  // 依照倒數天數排序 (天數少的在最上面)
  birthdays.sort((a, b) => calculateDaysLeft(a.date) - calculateDaysLeft(b.date));
  
  birthdays.forEach(b => {
    const daysLeft = calculateDaysLeft(b.date);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <p class="card-title">${b.name}</p>
        <p class="card-subtitle">${b.date}</p>
      </div>
      <div class="countdown">
        剩 ${daysLeft} 天
      </div>
    `;
    list.appendChild(card);
  });
}

// 點擊新增按鈕時執行的動作
function addBirthday() {
  const nameInput = document.getElementById('bd-name');
  const dateInput = document.getElementById('bd-date');
  
  if (!nameInput.value || !dateInput.value) {
    alert('請填寫完整名稱與日期！');
    return;
  }
  
  birthdays.push({
    name: nameInput.value,
    date: dateInput.value
  });
  
  nameInput.value = '';
  dateInput.value = '';
  
  renderBirthdays();
}