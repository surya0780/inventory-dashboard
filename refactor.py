import re
import os

filepath = 'c:/Users/lsury/Downloads/super_inventory_dashboard/script.js'

with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. updateStats
code = re.sub(
    r'function updateStats\(\) \{[\s\S]*?animateCounter\(.*?statValueNum.*?\}',
    '''function updateStats() {
  const total = inventoryData.reduce((s, g) => s + g.variants.length, 0);
  const value = inventoryData.reduce((s, g) => s + g.variants.reduce((vs, v) => vs + Number(v.mrp), 0), 0);

  animateCounter(document.getElementById('statTotalNum'), total);
  animateCounter(document.getElementById('statValueNum'), value, '₹');
}''',
    code
)

# 2. lookupProduct
code = re.sub(
    r'function lookupProduct\(\) \{[\s\S]*?showToast\(\'Product found:.*?\}',
    '''function lookupProduct() {
  const input = document.getElementById('lookupInput').value.trim();
  const result = document.getElementById('lookupResult');
  if (!input) { showToast('Please enter an Item ID', 'warning'); return; }

  const group = inventoryData.find(i => i.item_id.toLowerCase() === input.toLowerCase());
  result.style.display = 'block';

  if (!group) {
    result.innerHTML = `<div class="lr-not-found"><i class="fas fa-search"></i><h3>No product found</h3><p>No product matches Item ID "<strong>${input}</strong>"</p></div>`;
    showToast('Product not found', 'error');
    return;
  }

  const item = group.variants[0];
  const upcs = group.variants.map(v => v.upc).join(', ');

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
        <button class="lr-qr-btn" onclick="showQR('${item.upc}', '${item.product_name.replace(/'/g, "\\'")}')"><i class="fas fa-expand"></i> View Full</button>
      </div>
    </div>`;
  showToast('Product found: ' + item.product_name, 'success');
}''',
    code
)

# 3. populateFilters
code = re.sub(
    r'function populateFilters\(\) \{[\s\S]*?cf\.innerHTML =.*?\}',
    '''function populateFilters() {
  const allVariants = inventoryData.flatMap(g => g.variants);
  const brands = [...new Set(allVariants.map(i => i.brand))].sort();
  const cats = [...new Set(allVariants.map(i => i.category))].sort();
  const vf = document.getElementById('vendorFilter');
  const cf = document.getElementById('categoryFilter');
  vf.innerHTML = '<option value="">All Vendors</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
  cf.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}''',
    code
)

# 4. applyFilters
code = re.sub(
    r'function applyFilters\(\) \{[\s\S]*?renderTable\(\);\n\}',
    '''function applyFilters() {
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
}''',
    code
)

# 5. sortData
code = re.sub(
    r'function sortData\(key, toggle = true\) \{[\s\S]*?renderTable\(\);\n\}',
    '''function sortData(key, toggle = true) {
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
}''',
    code
)

# 6. renderTable
code = re.sub(
    r'function renderTable\(\) \{[\s\S]*?renderPagination\(\);\n\}',
    '''function renderTable() {
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
        <button class="row-action-btn qr" title="QR Code" onclick="showQR('${item.upc}', '${item.product_name.replace(/'/g, "\\\\'")}')"><i class="fas fa-qrcode"></i></button>
        <button class="row-action-btn history" title="History" onclick="viewHistory('${group.item_id}')"><i class="fas fa-history"></i></button>
        <button class="row-action-btn edit" title="Edit" onclick="editItem('${group.item_id}', '${item.upc}')"><i class="fas fa-edit"></i></button>
        <button class="row-action-btn delete" title="Delete" onclick="deleteItem('${group.item_id}', '${item.upc}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
      return html;
    }).join('');
  }).join('');

  renderPagination();
}''',
    code
)

# 7. Actions (edit, save, delete, confirm, viewHistory)
code = re.sub(
    r'function editItem\(id\) \{[\s\S]*?openModal\(\'historyModal\'\);\n\}',
    '''let editingUpc = null;
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
}''',
    code
)

# 8. exportCSV and exportExcel
code = re.sub(
    r'function exportCSV\(\) \{[\s\S]*?showToast\(\'Excel exported!\', \'success\'\);\n\}',
    '''function getStatus(item) {
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
}''',
    code
)

# 9. Quick Search
code = re.sub(
    r'const matches = inventoryData\.filter.*?join\(\'\'\) \|\| \'<div class="qsr-item">No results found</div>\';',
    '''const allVariants = inventoryData.flatMap(g => g.variants.map(v => ({ ...v, item_id: g.item_id })));
    const matches = allVariants.filter(i => i.product_name.toLowerCase().includes(q) || i.upc.includes(q) || i.item_id.toLowerCase().includes(q)).slice(0, 8);
    res.innerHTML = matches.map(i => `<div class="qsr-item" onclick="quickSearchSelect('${i.item_id}')"><img src="${i.image}" alt=""><div><strong>${i.product_name}</strong><br><small>${i.item_id} • ${i.brand}</small></div></div>`).join('') || '<div class="qsr-item">No results found</div>';''',
    code
)

# 10. generateNotifications
code = re.sub(
    r'function generateNotifications\(\) \{[\s\S]*?document\.getElementById\(\'notifBadge\'\)\.textContent = outItems\.length \+ lowItems\.length;\n\}',
    '''function generateNotifications() {
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
}''',
    code
)

# 11. initCharts
code = re.sub(
    r'const brandMap = \{\};\n\s*inventoryData\.forEach\(i => \{ brandMap\[i\.brand\] = \(brandMap\[i\.brand\] \|\| 0\) \+ Number\(i\.qty\); \}\);',
    '''const brandMap = {};
  const allVariants = inventoryData.flatMap(g => g.variants);
  allVariants.forEach(i => { brandMap[i.brand] = (brandMap[i.brand] || 0) + Number(i.qty || 1); });''',
    code
)
code = re.sub(
    r'const lowItems = inventoryData\.filter\(i => Number\(i\.qty\) > 0 && Number\(i\.qty\) < Number\(i\.threshold\)\)\.slice\(0, 10\);',
    '''const lowItems = allVariants.filter(i => Number(i.qty) > 0 && Number(i.qty) < Number(i.threshold)).slice(0, 10);''',
    code
)
code = re.sub(
    r'const catValue = \{\};\n\s*inventoryData\.forEach\(i => \{ catValue\[i\.category\] = \(catValue\[i\.category\] \|\| 0\) \+ Number\(i\.mrp\) \* Number\(i\.qty\); \}\);',
    '''const catValue = {};
  allVariants.forEach(i => { catValue[i.category] = (catValue[i.category] || 0) + Number(i.mrp) * Number(i.qty || 1); });''',
    code
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Refactored script.js")
