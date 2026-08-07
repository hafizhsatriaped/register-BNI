(function () {
  // --- Login logic ---
  const loginSection = document.getElementById('login-section');
  const authSection = document.getElementById('auth-section');
  const keyInput = document.getElementById('keyInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  // Cek apakah ada key di URL (jika sudah login sebelumnya)
  const urlParams = new URLSearchParams(window.location.search);
  const urlKey = urlParams.get('key');
  
  if (urlKey === window.ADMIN_KEY) {
    // Jika URL sudah mengandung key yang benar, langsung tampilkan panel
    showAdminPanel();
  } else {
    // Tampilkan form login
    loginSection.style.display = 'block';
  }

  loginBtn.addEventListener('click', () => {
    if (keyInput.value === window.ADMIN_KEY) {
      // Simpan key di sessionStorage untuk sesi ini
      sessionStorage.setItem('admin_key', keyInput.value);
      // Redirect ke URL dengan key agar bisa direfresh
      window.location.href = window.location.pathname + '?key=' + encodeURIComponent(keyInput.value);
    } else {
      loginError.style.display = 'block';
      keyInput.value = '';
    }
  });

  // Jika user tekan Enter di input
  keyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });

  function showAdminPanel() {
    loginSection.style.display = 'none';
    authSection.style.display = 'block';
    initAdmin();
  }

  // --- Admin logic ---
  function initAdmin() {
    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // Elemen DOM
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const fileListContainer = document.getElementById('fileListContainer');
    const fileList = document.getElementById('fileList');
    const bulkDesc = document.getElementById('bulkDesc');
    const applyBulkDescBtn = document.getElementById('applyBulkDesc');
    const uploadAllBtn = document.getElementById('uploadAllBtn');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressDetail = document.getElementById('progressDetail');
    const templateListDiv = document.getElementById('templateList');

    let selectedFiles = [];
    const MAX_FILES = 10;
    const MAX_SIZE = 5 * 1024 * 1024;

    selectFilesBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > MAX_FILES) {
        alert(`Maksimal ${MAX_FILES} file per upload.`);
        fileInput.value = '';
        return;
      }

      const valid = files.every(f => f.size <= MAX_SIZE && /\.(pdf|xls|xlsx)$/i.test(f.name));
      if (!valid) {
        alert('Beberapa file tidak valid. Pastikan semua file PDF/Excel dan ukuran ≤ 5 MB.');
        fileInput.value = '';
        return;
      }

      selectedFiles = files;
      renderFileList();
    });

    function renderFileList() {
      fileList.innerHTML = '';
      selectedFiles.forEach((file, idx) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
          <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
          </div>
          <div class="file-desc">
            <input type="text" class="desc-input" data-index="${idx}" placeholder="Deskripsi (opsional)">
          </div>
        `;
        fileList.appendChild(li);
      });
      fileListContainer.style.display = 'block';
    }

    applyBulkDescBtn.addEventListener('click', () => {
      const desc = bulkDesc.value.trim();
      document.querySelectorAll('.desc-input').forEach(input => {
        input.value = desc;
      });
    });

    uploadAllBtn.addEventListener('click', async () => {
      if (selectedFiles.length === 0) return;

      const descInputs = document.querySelectorAll('.desc-input');
      const filesWithDesc = selectedFiles.map((file, idx) => ({
        file,
        description: descInputs[idx] ? descInputs[idx].value.trim() : ''
      }));

      progressSection.style.display = 'block';
      updateProgress(0, filesWithDesc.length, 'Memulai upload...');
      progressDetail.innerHTML = '';

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < filesWithDesc.length; i++) {
        const { file, description } = filesWithDesc[i];
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');

        const statusId = `file-status-${i}`;
        const statusDiv = document.createElement('div');
        statusDiv.className = 'file-status';
        statusDiv.id = statusId;
        statusDiv.innerHTML = `<span class="status-icon">⏳</span> ${file.name} - Mengunggah...`;
        progressDetail.appendChild(statusDiv);
        updateProgress(i, filesWithDesc.length, `Mengunggah ${i+1} dari ${filesWithDesc.length}`);

        try {
          const filePath = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('templates')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('templates')
            .getPublicUrl(filePath);

          const { error: insertError } = await supabase
            .from('templates')
            .insert([{ name: nameWithoutExt, description, file_url: publicUrl }]);

          if (insertError) throw insertError;

          document.getElementById(statusId).innerHTML = `<span class="status-icon">✅</span> ${file.name} - Berhasil`;
          successCount++;
        } catch (error) {
          document.getElementById(statusId).innerHTML = `<span class="status-icon">❌</span> ${file.name} - Gagal: ${error.message}`;
          failCount++;
        }

        updateProgress(i+1, filesWithDesc.length, '');
      }

      updateProgress(filesWithDesc.length, filesWithDesc.length, `Selesai: ${successCount} berhasil, ${failCount} gagal.`);
      if (failCount === 0) {
        selectedFiles = [];
        fileInput.value = '';
        fileListContainer.style.display = 'none';
      }
      loadTemplates();
    });

    function updateProgress(current, total, message) {
      const percent = total === 0 ? 0 : Math.round((current / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressBar.textContent = `${percent}%`;
      progressText.textContent = message || `${current}/${total} file`;
    }

    async function loadTemplates() {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        templateListDiv.innerHTML = '<p>Gagal memuat template.</p>';
        return;
      }

      if (!data || data.length === 0) {
        templateListDiv.innerHTML = '<p>Belum ada template.</p>';
        return;
      }

      templateListDiv.innerHTML = data.map(t => `
        <div class="template-card">
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.description || '')}</p>
          <div class="card-actions">
            <a href="${t.file_url}" download class="btn btn-secondary">Unduh</a>
            <button class="btn btn-danger delete-btn" data-id="${t.id}" data-path="${t.file_url}">Hapus</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          const fileUrl = e.target.dataset.path;
          if (!confirm('Yakin hapus template ini?')) return;

          const path = fileUrl.split('/').pop();
          await supabase.storage.from('templates').remove([path]);
          await supabase.from('templates').delete().eq('id', id);
          loadTemplates();
        });
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    loadTemplates();
  } // end initAdmin
})();
