const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.getElementById("template-grid");
const searchInput = document.getElementById("search");
const emptyState = document.getElementById("empty-state");
const errorEl = document.getElementById("error");

let templates = [];

function escapeJs(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function download(url, name) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("response " + res.status);
      return res.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Tunda revoke agar browser sempat mulai download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    })
    .catch(() => {
      window.open(url, "_blank", "noopener");
    });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function loadTemplates() {
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    errorEl.hidden = false;
    errorEl.textContent = "Gagal memuat data: " + error.message;
    return;
  }
  templates = data || [];
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
        ${isPdf ? `<button class="btn" onclick="openPreview('${escapeJs(url)}')">Preview</button>` : ""}
        <a class="btn primary" href="#" onclick="event.preventDefault(); download('${escapeJs(url)}', '${escapeJs(t.name)}')">Download</a>
      </div>
    </article>`;
}

function openPreview(url) {
  document.getElementById("preview-frame").src = url;
  document.getElementById("preview-modal").hidden = false;
}

function closePreview() {
  document.getElementById("preview-modal").hidden = true;
  document.getElementById("preview-frame").src = "";
}

document.getElementById("preview-modal").addEventListener("click", e => {
  if (e.target.id === "preview-modal") closePreview();
});

searchInput.addEventListener("input", render);
loadTemplates();
