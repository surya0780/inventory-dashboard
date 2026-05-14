// ============================================================
// SUPER PREMIUM INVENTORY DASHBOARD - Main Application
// ============================================================

let inventoryData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let currentSort = { key: null, dir: 'asc' };
let currentStockFilter = 'all';
let editingItemId = null;
let deletingItemId = null;
let chartInstances = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  showSkeleton();
  try {
    inventoryData = await fetchSheetData();
    filteredData = [...inventoryData];
    hideSkeleton();
    updateStats();
    populateFilters();
    renderTable();
    initCharts();
    initEventListeners();
    startLiveClock();
    generateNotifications();
    showToast(`Loaded ${inventoryData.length} products from Google Sheet!`, 'success');
  } catch (err) {
    hideSkeleton();
    showToast('Failed to load Google Sheet. Check console.', 'error');
    console.error(err);
    // Show empty state
    inventoryData = [];
    filteredData = [];
    renderTable();
    initEventListeners();
    startLiveClock();
  }
});

// ===== LIVE CLOCK =====
function startLiveClock() {
  const el = document.getElementById('liveDateTime');
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + '  •  ' + now.toLocaleTimeString('en-IN');
  }
  tick();
  setInterval(tick, 1000);
}

// ===== TOAST SYSTEM =====
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== SKELETON =====
function showSkeleton() { document.getElementById('skeletonLoader').style.display = 'block'; document.getElementById('tableWrapper').style.display = 'none'; }
function hideSkeleton() { document.getElementById('skeletonLoader').style.display = 'none'; document.getElementById('tableWrapper').style.display = 'block'; }

// ===== ANIMATED COUNTER =====
function animateCounter(el, target, prefix = '', suffix = '') {
  const duration = 1000;
  const start = parseInt(el.textContent.replace(/[^\d]/g, '')) || 0;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(start + (target - start) * ease);
    el.textContent = prefix + val.toLocaleString('en-IN') + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== UPDATE STATS =====
function updateStats() {
  const total = inventoryData.reduce((s, g) => s + g.variants.length, 0);
  const value = inventoryData.reduce((s, g) => s + g.variants.reduce((vs, v) => vs + Number(v.mrp), 0), 0);

  animateCounter(document.getElementById('statTotalNum'), total);
  animateCounter(document.getElementById('statValueNum'), value, '₹');
}

// ===== PRODUCT LOOKUP BY ITEM ID =====
function lookupProduct() {
  const input = document.getElementById('lookupInput').value.trim();
  const result = document.getElementById('lookupResult');
  if (!input) { showToast('Please enter an Item ID', 'warning'); return; }

  const group = inventoryData.find(g => g.item_id.toLowerCase() === input.toLowerCase());
  result.style.display = 'block';

  if (!group) {
    result.innerHTML = `<div class="lr-not-found"><i class="fas fa-search"></i><h3>No product found</h3><p>No product matches Item ID "<strong>${input}</strong>"</p></div>`;
    showToast('Product not found', 'error');
    return;
  }

  const item = group.variants[0];
  const upcs = group.variants.map(v => v.upc).filter(Boolean).join(', ');
  result.innerHTML = `
    <div class="lr-product">
      <img class="lr-img" src="${item.image}" alt="${item.product_name}">
      <div class="lr-details">
        <div class="lr-field"><span class="lr-label">Item ID</span><span class="lr-value">${group.item_id}</span></div>
        <div class="lr-field"><span class="lr-label">UPCs</span><span class="lr-value">${upcs}</span></div>
        <div class="lr-field"><span class="lr-label">Product Name</span><span class="lr-value">${item.product_name}</span></div>
        <div class="lr-field"><span class="lr-label">Brand</span><span class="lr-value">${item.brand}</span></div>
        <div class="lr-field"><span class="lr-label">Category</span><span class="lr-value">${item.category}</span></div>
        <div class="lr-field"><span class="lr-label">MRP</span><span class="lr-value">₹${Number(item.mrp).toLocaleString('en-IN')}</span></div>
      </div>
      <div class="lr-qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(item.upc)}&size=150x150&bgcolor=ffffff&color=0f172a&margin=8" alt="QR Code">
        <span class="lr-qr-label">UPC QR Code</span>
        <button class="lr-qr-btn" onclick="showQR('${item.upc}', '${item.product_name.replace(/'/g, "\\'")}')" ><i class="fas fa-expand"></i> View Full</button>
      </div>
    </div>`;
  showToast('Product found: ' + item.product_name, 'success');
}

// ===== POPULATE FILTERS =====
function populateFilters() {
  const allVariants = inventoryData.flatMap(g => g.variants);
  const brands = [...new Set(allVariants.map(i => i.brand))].sort();
  const cats = [...new Set(allVariants.map(i => i.category))].sort();
  const vf = document.getElementById('vendorFilter');
  const cf = document.getElementById('categoryFilter');
  vf.innerHTML = '<option value="">All Vendors</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
  cf.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ===== APPLY FILTERS =====
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const vendor = document.getElementById('vendorFilter').value;
  const category = document.getElementById('categoryFilter').value;

  filteredData = inventoryData.map(group => {
    const matchingVariants = group.variants.filter(item => {
      const matchSearch = !search || item.product_name.toLowerCase().includes(search) || item.upc.toLowerCase().includes(search) || group.item_id.toLowerCase().includes(search);
      const matchVendor = !vendor || item.brand === vendor;
      const matchCat = !category || item.category === category;
      return matchSearch && matchVendor && matchCat;
    });
    if (matchingVariants.length > 0) return { item_id: group.item_id, variants: matchingVariants };
    return null;
  }).filter(Boolean);

  if (currentSort.key) sortData(currentSort.key, false);
  currentPage = 1;
  renderTable();
}

// ===== SORT =====
function sortData(key, toggle = true) {
  if (toggle) {
    if (currentSort.key === key) currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
    else { currentSort.key = key; currentSort.dir = 'asc'; }
  }
  filteredData.sort((a, b) => {
    let va = key === 'item_id' ? a.item_id : a.variants[0][key];
    let vb = key === 'item_id' ? b.item_id : b.variants[0][key];
    if (key === 'mrp') { va = Number(va); vb = Number(vb); }
    else { va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase(); }
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });
  renderTable();
}

// ===== RENDER TABLE =====
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredData.slice(start, end);

  if (filteredData.length === 0) {
    document.getElementById('tableWrapper').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('pagination').style.display = 'none';
    return;
  }
  document.getElementById('tableWrapper').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('pagination').style.display = 'flex';

  tbody.innerHTML = pageData.map((group, idx) => {
    return group.variants.map((item, vIdx) => {
      let html = `<tr style="animation:fadeIn .3s ${(idx) * .03}s both">`;
      if (vIdx === 0) {
        html += `<td rowspan="${group.variants.length}">${start + idx + 1}</td>`;
        html += `<td rowspan="${group.variants.length}"><img class="product-img" src="${item.image}" alt="${item.product_name}"></td>`;
        html += `<td rowspan="${group.variants.length}"><strong>${group.item_id}</strong></td>`;
      }
      html += `<td>${item.upc}</td>`;
      html += `<td>${item.product_name}</td>`;
      html += `<td>${item.brand}</td>`;
      html += `<td>${item.category}</td>`;
      html += `<td>₹${Number(item.mrp).toLocaleString('en-IN')}</td>`;
      html += `<td><div class="row-actions">
        <button class="row-action-btn qr" title="QR Code" onclick="showQR('${item.upc}', '${item.product_name.replace(/'/g, "\\'")}')"><i class="fas fa-qrcode"></i></button>
        <button class="row-action-btn history" title="History" onclick="viewHistory('${group.item_id}')"><i class="fas fa-history"></i></button>
        <button class="row-action-btn edit" title="Edit" onclick="editItem('${group.item_id}', '${item.upc}')"><i class="fas fa-edit"></i></button>
        <button class="row-action-btn delete" title="Delete" onclick="deleteItem('${group.item_id}', '${item.upc}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
      return html;
    }).join('');
  }).join('');

  renderPagination();
}

// ===== PAGINATION =====
function renderPagination() {
  const total = filteredData.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  document.getElementById('pageStart').textContent = total > 0 ? start : 0;
  document.getElementById('pageEnd').textContent = end;
  document.getElementById('pageTotal').textContent = total;
  document.getElementById('prevPage').disabled = currentPage <= 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;

  const pn = document.getElementById('pageNumbers');
  let html = '';
  const maxBtn = 5;
  let s = Math.max(1, currentPage - Math.floor(maxBtn / 2));
  let e = Math.min(totalPages, s + maxBtn - 1);
  if (e - s < maxBtn - 1) s = Math.max(1, e - maxBtn + 1);
  for (let i = s; i <= e; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  pn.innerHTML = html;
}

function changePage(d) { const tp = Math.ceil(filteredData.length / pageSize); currentPage = Math.max(1, Math.min(tp, currentPage + d)); renderTable(); }
function goToPage(p) { currentPage = p; renderTable(); }
function changePageSize(v) { pageSize = parseInt(v); currentPage = 1; renderTable(); }

// ===== ACTIONS =====
let editingUpc = null;
function editItem(id, upc) {
  editingItemId = id;
  editingUpc = upc || null;
  const group = inventoryData.find(i => i.item_id === id);
  if (!group) return;
  const item = upc ? group.variants.find(v => v.upc === upc) : group.variants[0];
  if (!item) return;
  const body = document.getElementById('editModalBody');
  body.innerHTML = ['product_name', 'brand', 'category', 'mrp'].map(k =>
    `<div class="form-group"><label>${k.replace(/_/g, ' ').toUpperCase()}</label><input id="edit_${k}" value="${item[k]}"></div>`
  ).join('');
  openModal('editModal');
}

function saveEdit() {
  const group = inventoryData.find(i => i.item_id === editingItemId);
  if (!group) return;
  const item = editingUpc ? group.variants.find(v => v.upc === editingUpc) : group.variants[0];
  if (!item) return;
  ['product_name', 'brand', 'category', 'mrp'].forEach(k => {
    const v = document.getElementById('edit_' + k).value;
    item[k] = (k === 'mrp') ? Number(v) : v;
  });
  closeModal('editModal');
  applyFilters();
  updateStats();
  updateCharts();
  showToast('Product updated successfully!', 'success');
}

let deletingUpc = null;
function deleteItem(id, upc) {
  deletingItemId = id;
  deletingUpc = upc || null;
  const group = inventoryData.find(i => i.item_id === id);
  const item = group ? (upc ? group.variants.find(v => v.upc === upc) : group.variants[0]) : null;
  document.getElementById('deleteProductName').textContent = item ? item.product_name : '';
  openModal('deleteModal');
}

function confirmDelete() {
  const group = inventoryData.find(g => g.item_id === deletingItemId);
  if (group) {
    if (deletingUpc) {
      group.variants = group.variants.filter(v => v.upc !== deletingUpc);
    } else {
      group.variants = [];
    }
    if (group.variants.length === 0) {
      inventoryData = inventoryData.filter(i => i.item_id !== deletingItemId);
    }
  }
  closeModal('deleteModal');
  applyFilters();
  updateStats();
  populateFilters();
  updateCharts();
  showToast('Product deleted', 'error');
}

function viewHistory(id) {
  const group = inventoryData.find(i => i.item_id === id);
  if (!group) return;
  const item = group.variants[0];
  const body = document.getElementById('historyModalBody');
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(); d.setDate(d.getDate() - i * 3);
    dates.push(d);
  }
  body.innerHTML = `<h4 style="margin-bottom:16px">${item.product_name}</h4><div class="timeline">${dates.map((d, i) =>
    `<div class="timeline-item"><div class="tl-date">${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div class="tl-text">${['Stock updated to ' + ((item.qty||0) + i * 5), 'Price adjusted to ₹' + (item.mrp - i * 2), 'Threshold changed to ' + (item.threshold||0), 'Stock replenished +' + (10 + i * 3), 'Initial stock entry'][i]}</div></div>`
  ).join('')}</div>`;
  openModal('historyModal');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== EXPORT CSV =====
function getStatus(item) {
  if (!item.qty) return { label: 'In Stock' };
  if (item.qty === 0) return { label: 'Out of Stock' };
  if (item.qty < item.threshold) return { label: 'Low Stock' };
  return { label: 'In Stock' };
}

function exportCSV() {
  const headers = ['S No', 'Item ID', 'UPC', 'Product Name', 'Brand', 'Category', 'MRP', 'QTY', 'Threshold', 'UOM', 'Status', 'Last Updated'];
  const rows = [];
  let sNo = 1;
  filteredData.forEach(group => {
    group.variants.forEach(item => {
      rows.push([sNo++, group.item_id, item.upc, `"${item.product_name}"`, item.brand, item.category, item.mrp, item.qty||0, item.threshold||0, item.uom||'', getStatus(item).label, item.last_updated||'']);
    });
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
  downloadFile(csv, 'inventory_export.csv', 'text/csv');
  showToast('CSV exported!', 'success');
}

// ===== EXPORT EXCEL (TSV) =====
function exportExcel() {
  const headers = ['S No', 'Item ID', 'UPC', 'Product Name', 'Brand', 'Category', 'MRP', 'QTY', 'Threshold', 'UOM', 'Status', 'Last Updated'];
  const rows = [];
  let sNo = 1;
  filteredData.forEach(group => {
    group.variants.forEach(item => {
      rows.push([sNo++, group.item_id, item.upc, item.product_name, item.brand, item.category, item.mrp, item.qty||0, item.threshold||0, item.uom||'', getStatus(item).label, item.last_updated||'']);
    });
  });
  const tsv = [headers.join('\\t'), ...rows.map(r => r.join('\\t'))].join('\\n');
  downloadFile(tsv, 'inventory_export.xls', 'application/vnd.ms-excel');
  showToast('Excel exported!', 'success');
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== REFRESH =====
async function refreshData() {
  showSkeleton();
  try {
    inventoryData = await fetchSheetData();
    filteredData = [...inventoryData];
    currentPage = 1;
    currentStockFilter = 'all';
    document.querySelectorAll('.stock-filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('filterAll').classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('vendorFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    hideSkeleton();
    populateFilters();
    renderTable();
    updateStats();
    updateCharts();
    generateNotifications();
    showToast(`Refreshed! ${inventoryData.length} products loaded.`, 'success');
  } catch (err) {
    hideSkeleton();
    showToast('Refresh failed. Check connection.', 'error');
  }
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ===== EVENT LISTENERS =====
function initEventListeners() {
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('vendorFilter').addEventListener('change', applyFilters);
  document.getElementById('categoryFilter').addEventListener('change', applyFilters);

  // Lookup Enter key
  document.getElementById('lookupInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupProduct();
  });

  // Sort headers
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => sortData(th.dataset.sort));
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const dark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', dark ? 'light' : 'dark');
    document.getElementById('themeIcon').className = dark ? 'fas fa-moon' : 'fas fa-sun';
    updateCharts();
    showToast(dark ? 'Light mode' : 'Dark mode', 'info');
  });

  // FAB
  document.getElementById('fabMain').addEventListener('click', () => {
    document.getElementById('fabMain').classList.toggle('active');
    document.getElementById('fabOptions').classList.toggle('active');
  });

  // Quick Search
  document.getElementById('navSearchToggle').addEventListener('click', () => {
    document.getElementById('quickSearchOverlay').classList.add('active');
    document.getElementById('quickSearchInput').focus();
  });
  document.getElementById('quickSearchOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('quickSearchOverlay').classList.remove('active');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.getElementById('quickSearchOverlay').classList.remove('active');
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('quickSearchOverlay').classList.add('active');
      document.getElementById('quickSearchInput').focus();
    }
  });
  document.getElementById('quickSearchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const res = document.getElementById('quickSearchResults');
    if (!q) { res.innerHTML = ''; return; }
    const matches = inventoryData.filter(i => i.product_name.toLowerCase().includes(q) || i.upc.includes(q) || i.item_id.toLowerCase().includes(q)).slice(0, 8);
    res.innerHTML = matches.map(i => `<div class="qsr-item" onclick="quickSearchSelect('${i.item_id}')"><img src="${i.image}" alt=""><div><strong>${i.product_name}</strong><br><small>${i.item_id} • ${i.brand}</small></div></div>`).join('') || '<div class="qsr-item">No results found</div>';
  });

  // Notification panel
  document.getElementById('navNotification').addEventListener('click', () => {
    document.getElementById('notificationPanel').classList.toggle('active');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notificationPanel') && !e.target.closest('#navNotification')) {
      document.getElementById('notificationPanel').classList.remove('active');
    }
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
  });
}

function quickSearchSelect(id) {
  document.getElementById('quickSearchOverlay').classList.remove('active');
  document.getElementById('quickSearchInput').value = '';
  document.getElementById('quickSearchResults').innerHTML = '';
  document.getElementById('searchInput').value = id;
  applyFilters();
  showToast('Product found!', 'success');
}

// ===== NOTIFICATIONS =====
function generateNotifications() {
  const allVariants = inventoryData.flatMap(g => g.variants);
  const lowItems = allVariants.filter(i => Number(i.qty) > 0 && Number(i.qty) < Number(i.threshold));
  const outItems = allVariants.filter(i => Number(i.qty) === 0);
  const list = document.getElementById('notifList');
  let html = '';
  outItems.slice(0, 3).forEach(i => {
    html += `<div class="notif-item"><div class="ni-icon ni-danger"><i class="fas fa-times-circle"></i></div><div><div class="ni-text"><strong>${i.product_name}</strong> is out of stock</div><div class="ni-time">Needs immediate restock</div></div></div>`;
  });
  lowItems.slice(0, 3).forEach(i => {
    html += `<div class="notif-item"><div class="ni-icon ni-warn"><i class="fas fa-exclamation-triangle"></i></div><div><div class="ni-text"><strong>${i.product_name}</strong> has low stock (${i.qty})</div><div class="ni-time">Below threshold of ${i.threshold}</div></div></div>`;
  });
  html += `<div class="notif-item"><div class="ni-icon ni-info"><i class="fas fa-sync"></i></div><div><div class="ni-text">Dashboard data synced</div><div class="ni-time">Just now</div></div></div>`;
  list.innerHTML = html;
  document.getElementById('notifBadge').textContent = outItems.length + lowItems.length;
}

function clearNotifications() {
  document.getElementById('notifList').innerHTML = '<div class="notif-item"><div class="ni-icon ni-info"><i class="fas fa-check"></i></div><div><div class="ni-text">All caught up!</div><div class="ni-time">No new notifications</div></div></div>';
  document.getElementById('notifBadge').textContent = '0';
}

// ===== CHARTS =====
function getChartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return { text: dark ? '#e2e8f0' : '#1a1a2e', grid: dark ? '#334155' : '#e2e8f0', bg: dark ? '#1e293b' : '#fff' };
}

function initCharts() {
  const cc = getChartColors();
  const defaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: cc.text, font: { family: 'Poppins', size: 11 } } } }, scales: { x: { ticks: { color: cc.text, font: { family: 'Poppins', size: 10 } }, grid: { color: cc.grid + '40' } }, y: { ticks: { color: cc.text, font: { family: 'Poppins', size: 10 } }, grid: { color: cc.grid + '40' } } } };

  // Trend chart
  const trendLabels = [];
  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    trendLabels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    trendData.push(Math.floor(800 + Math.random() * 400 + i * 5));
  }
  chartInstances.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line', data: { labels: trendLabels, datasets: [{ label: 'Total Stock', data: trendData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 }] },
    options: { ...defaults, plugins: { ...defaults.plugins, legend: { display: false } } }
  });

  // Brand chart
  const brandMap = {};
  const allVariants = inventoryData.flatMap(g => g.variants);
  allVariants.forEach(i => { brandMap[i.brand] = (brandMap[i.brand] || 0) + Number(i.qty || 1); });
  const topBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const brandColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  chartInstances.brand = new Chart(document.getElementById('brandChart'), {
    type: 'doughnut', data: { labels: topBrands.map(b => b[0]), datasets: [{ data: topBrands.map(b => b[1]), backgroundColor: brandColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: cc.text, font: { family: 'Poppins', size: 11 }, padding: 12 } } } }
  });

  // Low stock chart
  const lowItems = allVariants.filter(i => Number(i.qty) > 0 && Number(i.qty) < Number(i.threshold)).slice(0, 10);
  chartInstances.lowStock = new Chart(document.getElementById('lowStockChart'), {
    type: 'bar', data: { labels: lowItems.map(i => i.product_name.substring(0, 20)), datasets: [{ label: 'Current', data: lowItems.map(i => i.qty), backgroundColor: '#f59e0b' }, { label: 'Threshold', data: lowItems.map(i => i.threshold), backgroundColor: '#ef444480' }] },
    options: defaults
  });

  // Value chart
  const catValue = {};
  allVariants.forEach(i => { catValue[i.category] = (catValue[i.category] || 0) + Number(i.mrp) * Number(i.qty || 1); });
  const catEntries = Object.entries(catValue).sort((a, b) => b[1] - a[1]);
  chartInstances.value = new Chart(document.getElementById('valueChart'), {
    type: 'bar', data: { labels: catEntries.map(c => c[0]), datasets: [{ label: 'Value (₹)', data: catEntries.map(c => c[1]), backgroundColor: 'rgba(99,102,241,.7)', borderRadius: 8 }] },
    options: { ...defaults, indexAxis: 'y' }
  });
}

function updateCharts() {
  Object.values(chartInstances).forEach(c => c.destroy());
  initCharts();
}

// ===== QR CODE =====
function showQR(upc, productName) {
  if (!upc) {
    showToast('No UPC available for this product', 'error');
    return;
  }
  const modal = document.getElementById('qrModal');
  const img = document.getElementById('qrImage');
  const title = document.getElementById('qrProductName');
  const upcText = document.getElementById('qrUpcText');

  title.textContent = productName;
  upcText.textContent = `UPC: ${upc}`;
  img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upc)}&size=250x250&bgcolor=ffffff&color=0f172a&margin=10`;
  modal.classList.add('active');
}

function closeQR() {
  document.getElementById('qrModal').classList.remove('active');
}

function downloadQR() {
  const img = document.getElementById('qrImage');
  const name = document.getElementById('qrProductName').textContent;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = `QR_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  a.target = '_blank';
  a.click();
}
