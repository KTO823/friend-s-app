function switchTab(tabId) {
  document.getElementById('birthday-view').style.display = 'none';
  document.getElementById('gift-view').style.display = 'none';
  document.getElementById('debt-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'none'; // 新增這行

  document.getElementById(tabId + '-view').style.display = 'block';
}