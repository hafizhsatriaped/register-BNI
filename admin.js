(function () {
  // --- Akses kontrol dengan key dari config.js ---
  const urlParams = new URLSearchParams(window.location.search);
  const key = urlParams.get('key');
  if (key !== window.ADMIN_KEY) {
    document.getElementById('no-access').style.display = 'block';
    return;
  }
  document.getElementById('auth-section').style.display = 'block';

  // Inisialisasi Supabase
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

  let selectedFiles = []; // Array of File objects
  const MAX_FILES = 10;
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  // --- Pilih file ---
  selectFilesBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > MAX_FILES) {
      alert(`Maksimal ${MAX_FILES} file per upload.`);
      fileInput.value = '';
      return;
    }

    // Validasi awal: ukuran & tipe
    const valid = files.every(f => f.size <= MAX_SIZE && /\.(pdf|xls|xlsx)$/i.test(f.name));
    if (!valid) {
      alert('Beberapa file tidak valid. Pastikan semua file PDF/Excel dan ukuran ≤ 5 MB.');
      fileInput.value = '';
      return;
    }

    selectedFiles = files;
    renderFileList();
  });

  // Render daftar file dengan input deskripsi
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

  // Tombol "Terapkan ke Semua"
  applyBulkDescBtn.addEventListener('click', () => {
    const desc = bulkDesc.value.trim();
    document.querySelectorAll('.desc-input').forEach(input => {
      input.value = desc;
    });
  });

  // --- Upload semua file ---
  uploadAllBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // Kumpulkan deskripsi per file
    const descInputs = document.querySelectorAll('.desc-input');
    const filesWithDesc = selectedFiles.map((file, idx) => ({
      file,
      description: descInputs[idx] ? descInputs[idx].value.trim() : ''
    }));

    // Tampilkan progress section
    progressSection.style.display = 'block';
    updateProgress(0, filesWithDesc.length, 'Memulai upload...');
    progressDetail.innerHTML = '';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < filesWithDesc.length; i++) {
      const { file, description } = filesWithDesc[i];
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');

      // Tampilkan status per file
      const statusId = `file-status-${i}`;
      const statusDiv = document.createElement('div');
      statusDiv.className = 'file-status';
      statusDiv.id = statusId;
      statusDiv.innerHTML = `<span class="status-icon">⏳</span> ${file.name} - Mengunggah...`;
      progressDetail.appendChild(statusDiv);
      updateProgress(i, filesWithDesc.length, `Mengunggah ${i+1} dari ${filesWithDesc.length}`);

      try {
        // Upload file ke Supabase Storage
        const filePath = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('templates')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Dapatkan URL publik
        const { data: { publicUrl } } = supabase.storage
          .from('templates')
          .getPublicUrl(filePath);

        // Simpan metadata ke tabel templates
        const { error: insertError } = await supabase
          .from('templates')
          .insert([{
            name: nameWithoutExt,
            description: description,
            file_url: publicUrl
          }]);

        if (insertError) throw insertError;

        // Sukses
        document.getElementById(statusId).innerHTML = `<span class="status-icon">✅</span> ${file.name} - Berhasil`;
        successCount++;
      } catch (error) {
        document.getElementById(statusId).innerHTML = `<span class="status-icon">❌</span> ${file.name} - Gagal: ${error.message}`;
        failCount++;
      }

      updateProgress(i+1, filesWithDesc.length, '');
    }

    // Final
    updateProgress(filesWithDesc.length, filesWithDesc.length, `Selesai: ${successCount} berhasil, ${failCount} gagal.`);
    if (failCount === 0) {
      // Reset form setelah sukses semua
      selectedFiles = [];
      fileInput.value = '';
      fileListContainer.style.display = 'none';
    }

    // Refresh daftar template
    loadTemplates();
  });

  function updateProgress(current, total, message) {
    const percent = total === 0 ? 0 : Math.round((current / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
    progressText.textContent = message || `${current}/${total} file`;
  }

  // --- Load daftar template ---
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

    // Event listener hapus
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const fileUrl = e.target.dataset.path;
        if (!confirm('Yakin hapus template ini?')) return;

        // Hapus dari storage
        const path = fileUrl.split('/').pop(); // Nama file saja
        await supabase.storage.from('templates').remove([path]);
        // Hapus dari database
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

  // Initial load
  loadTemplates();
})();
