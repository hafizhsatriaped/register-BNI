(function () {
  // --- Supabase client ---
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // --- Elemen login ---
  const loginSection = document.getElementById('login-section');
  const authSection = document.getElementById('auth-section');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    passwordInput.value = '';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Masuk';
  }

  async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Memverifikasi...';
    loginError.style.display = 'none';
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        showError(error.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : 'Login gagal: ' + error.message);
        return;
      }
      showAdminPanel();
    } catch {
      showError('Login gagal. Periksa koneksi internet.');
    }
  }

  loginBtn.addEventListener('click', handleLogin);
  [emailInput, passwordInput].forEach((el) =>
    el.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); })
  );

  async function showAdminPanel() {
    loginSection.hidden = true;
    authSection.style.display = 'block';
    try {
      const { data } = await sb.auth.getUser();
      document.getElementById('sessionEmail').textContent = data?.user?.email || '';
    } catch { /* abaikan */ }
    initAdmin(sb);
  }

  // Sesi sebelumnya masih aktif? Langsung buka panel.
  sb.auth.getSession().then(({ data }) => {
    if (data.session) {
      showAdminPanel();
    } else {
      loginSection.hidden = false;
    }
  });

  // --- Logika admin ---
  function initAdmin(sb) {
    // Elemen DOM
    const logoutBtn = document.getElementById('logoutBtn');
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

    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.reload();
    });

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
        const info = document.createElement('div');
        info.className = 'file-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = file.name;
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'file-size';
        sizeSpan.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        info.append(nameSpan, sizeSpan);
        const descDiv = document.createElement('div');
        descDiv.className = 'file-desc';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'desc-input';
        input.dataset.index = idx;
        input.placeholder = 'Deskripsi (opsional)';
        descDiv.appendChild(input);
        li.append(info, descDiv);
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
        statusDiv.textContent = `⏳ ${file.name} - Mengunggah...`;
        progressDetail.appendChild(statusDiv);
        updateProgress(i, filesWithDesc.length, `Mengunggah ${i+1} dari ${filesWithDesc.length}`);

        try {
          // ponytail: nama file di-encode manual — encodeURIComponent per segmen agar "/" pemisah folder tetap utuh
          const filePath = `${Date.now()}_${encodeURIComponent(file.name).replace(/%2C|%20/g, m => decodeURIComponent(m))}`;
          const { error: uploadError } = await sb.storage
            .from('templates')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = sb.storage
            .from('templates')
            .getPublicUrl(filePath);

          const { error: insertError } = await sb
            .from('templates')
            .insert([{ name: nameWithoutExt, description, file_url: publicUrl }]);

          if (insertError) throw insertError;

          statusDiv.textContent = `✅ ${file.name} - Berhasil`;
          successCount++;
        } catch (error) {
          statusDiv.textContent = `❌ ${file.name} - Gagal: ${error.message}`;
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
      const { data, error } = await sb
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
            <button class="btn btn-danger delete-btn" data-id="${t.id}">Hapus</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          const fileUrl = e.target.closest('.template-card').querySelector('.card-actions a').href;
          if (!confirm('Yakin hapus template ini?')) return;

          const path = decodeURIComponent(new URL(fileUrl, location.href).pathname.split('/object/public/templates/')[1] || '');
          if (!path) { alert('URL file tidak dikenali.'); return; }
          await sb.storage.from('templates').remove([path]);
          await sb.from('templates').delete().eq('id', id);
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
