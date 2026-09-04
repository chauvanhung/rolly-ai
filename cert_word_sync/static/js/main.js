/* Cert Word Sync - Main JavaScript Interactions */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initDropzones();
  initTableSearch();
  initCopyButtons();
  initDocxPreview();
});

/* Docx File Live Modal Previewer */
function openDocxPreview(btn) {
  const clientId = btn.getAttribute('data-client');
  const filename = btn.getAttribute('data-file');
  const modal = document.getElementById('previewModal');
  const modalTitle = document.getElementById('previewModalTitle');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const loading = document.getElementById('previewLoading');
  const content = document.getElementById('previewContent');

  if (!modal || !clientId || !filename) return;

  modalTitle.textContent = `Xem Trực Tiếp: ${filename}`;
  modalDownloadBtn.href = `/outputs/${clientId}/${filename}`;
  modal.style.display = 'flex';
  loading.style.display = 'flex';
  content.style.display = 'none';
  content.innerHTML = '';

  fetch(`/preview/${clientId}/${filename}`)
    .then(res => {
      if (!res.ok) throw new Error('Không thể đọc file Word xem trước.');
      return res.json();
    })
    .then(data => {
      loading.style.display = 'none';
      content.innerHTML = data.html || '<p style="text-align: center; color: #64748b; padding: 40px;">File rỗng hoặc không có văn bản.</p>';
      content.style.display = 'block';
    })
    .catch(err => {
      loading.style.display = 'none';
      content.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 40px; font-weight: 600;">⚠️ ${err.message}</div>`;
      content.style.display = 'block';
    });
}

function closeDocxPreview() {
  const modal = document.getElementById('previewModal');
  const content = document.getElementById('previewContent');
  const loading = document.getElementById('previewLoading');
  if (modal) {
    modal.style.display = 'none';
    if (content) {
      content.innerHTML = '';
      content.style.display = 'none';
    }
    if (loading) {
      loading.style.display = 'flex';
    }
  }
}

function initDocxPreview() {
  const previewButtons = document.querySelectorAll('.btn-preview-docx');
  previewButtons.forEach(btn => {
    btn.onclick = () => openDocxPreview(btn);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDocxPreview();
    }
  });
}

/* Tab Switching System */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(targetTab);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
}

/* File Drag & Drop + Preview Handler */
function initDropzones() {
  const dropzones = document.querySelectorAll('.dropzone');

  dropzones.forEach(zone => {
    const fileInput = zone.querySelector('input[type="file"]');
    const previewContainer = zone.nextElementSibling; // Expected .file-preview element

    if (!fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Drag highlights
    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, () => zone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, () => zone.classList.remove('drag-over'), false);
    });

    // Handle dropped files
    zone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        updateFilePreview(fileInput, previewContainer);
      }
    });

    // Handle normal file selection
    fileInput.addEventListener('change', () => {
      updateFilePreview(fileInput, previewContainer);
    });
  });
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function updateFilePreview(input, previewElement) {
  if (!previewElement || !previewElement.classList.contains('file-preview')) return;

  if (input.files && input.files[0]) {
    const file = input.files[0];
    const nameEl = previewElement.querySelector('.file-preview-name');
    const sizeEl = previewElement.querySelector('.file-preview-size');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);

    previewElement.style.display = 'flex';

    // Setup remove listener
    const removeBtn = previewElement.querySelector('.file-preview-remove');
    if (removeBtn) {
      removeBtn.onclick = (e) => {
        e.preventDefault();
        input.value = '';
        previewElement.style.display = 'none';
      };
    }
  } else {
    previewElement.style.display = 'none';
  }
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/* Dynamic Data Table Search */
function initTableSearch() {
  const searchInput = document.getElementById('tableSearch');
  const tableBody = document.querySelector('#extractedDataTable tbody');

  if (!searchInput || !tableBody) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}

/* 1-Click Copy Buttons */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalText = btn.textContent;
          btn.textContent = '✓ Đã chép';
          btn.style.color = '#10b981';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '';
          }, 1800);
        }).catch(err => {
          console.error('Lỗi copy:', err);
        });
      }
    });
  });
}
