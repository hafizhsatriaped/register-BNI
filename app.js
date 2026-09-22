const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.getElementById("template-grid");
const searchInput = document.getElementById("search");
const emptyState = document.getElementById("empty-state");
const errorEl = document.getElementById("error");

let templates = [];

async function loadTemplates() {
  emptyState.textContent = "Memuat...";
  emptyState.hidden = false;
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 4999);
  if (error) {
    emptyState.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = "Gagal memuat data: " + error.message;
    return;
  }
  templates = data || [];
  errorEl.hidden = true;
  render();
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = templates.filter(t =>
    !q
    || (t.name || "").toLowerCase().includes(q)
    || (t.description || "").toLowerCase().includes(q)
  );
  grid.innerHTML = filtered.map(cardHtml).join("");
  grid.querySelectorAll("[data-preview]").forEach(btn => {
    btn.addEventListener("click", () => openPreview(btn.dataset.preview));
  });
  emptyState.textContent = templates.length === 0 ? "Belum ada template." : "Tidak ditemukan.";
  emptyState.hidden = filtered.length > 0;
}

function cardHtml(t) {
  const url = t.file_url;
  const ext = (url.split(".").pop() || "FILE").toUpperCase();
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return `
    <article class="card">
      <div class="card-head">
        <span class="badge">${ext}</span>
        <time>${new Date(t.created_at).toLocaleDateString("id-ID")}</time>
      </div>
      <h3>${escapeHtml(t.name)}</h3>
      <p>${escapeHtml(t.description || "")}</p>
      <div class="card-actions">
        ${isPdf ? `<button class="btn" data-preview="${escapeHtml(url)}">Preview</button>` : ""}
        <a class="btn primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Download</a>
      </div>
    </article>`;
}

function openPreview(url) {
  const frame = document.getElementById("preview-frame");
  frame.src = url;
  document.getElementById("preview-modal").hidden = false;
  document.querySelector(".modal-close").focus();
}

function closePreview() {
  document.getElementById("preview-modal").hidden = true;
  document.getElementById("preview-frame").src = "";
}

document.getElementById("preview-modal").addEventListener("click", e => {
  if (e.target.id === "preview-modal") closePreview();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !document.getElementById("preview-modal").hidden) {
    closePreview();
  }
});

searchInput.addEventListener("input", render);
loadTemplates();
