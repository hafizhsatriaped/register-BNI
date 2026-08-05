const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(location.search);
const panel = document.getElementById("admin-panel");
const accessForm = document.getElementById("access-form");
const list = document.getElementById("template-list");

const MAX_FILE = 5 * 1024 * 1024; // 5MB
const OK_EXT = ["pdf", "xls", "xlsx"];

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function unlock() {
  accessForm.hidden = true;
  panel.hidden = false;
  document.getElementById("upload-form").addEventListener("submit", onUpload);
  loadTemplates();
}

if (params.get("key") === ADMIN_KEY) {
  unlock();
} else {
  accessForm.hidden = false;
  document.getElementById("key-form").addEventListener("submit", e => {
    e.preventDefault();
    if (document.getElementById("key-input").value === ADMIN_KEY) {
      unlock();
    } else {
      document.getElementById("key-error").hidden = false;
    }
  });
}

async function onUpload(e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("file").files[0];

  if (file.size > MAX_FILE) return alert("File maksimal 5MB.");
  const ext = file.name.split(".").pop().toLowerCase();
  if (!OK_EXT.includes(ext)) return alert("Format harus PDF, XLS, atau XLSX.");

  const path = "templates/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const { error: upErr } = await sb.storage.from("templates").upload(path, file);
  if (upErr) return alert("Upload gagal: " + upErr.message);

  const { data: { publicUrl } } = sb.storage.from("templates").getPublicUrl(path);
  const { error: insErr } = await sb.from("templates").insert({ name, description, file_url: publicUrl });
  if (insErr) {
    await sb.storage.from("templates").remove([path]);
    return alert("Simpan ke database gagal: " + insErr.message);
  }

  e.target.reset();
  loadTemplates();
}

async function loadTemplates() {
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return alert("Gagal memuat: " + error.message);
  list.innerHTML = (data || []).map(rowHtml).join("");
  document.getElementById("empty").hidden = (data || []).length > 0;
}

function rowHtml(t) {
  const ext = (t.file_url.split(".").pop() || "FILE").toUpperCase();
  return `
    <li class="row">
      <div class="row-info">
        <strong>${escapeHtml(t.name)}</strong>
        <span>${escapeHtml(t.description || "")} &middot; ${ext} &middot; ${new Date(t.created_at).toLocaleDateString("id-ID")}</span>
      </div>
      <div class="row-actions">
        <a class="btn" href="${t.file_url}" target="_blank" rel="noopener">Lihat</a>
        <button class="btn danger" onclick="deleteTemplate('${t.id}', '${t.file_url}')">Hapus</button>
      </div>
    </li>`;
}

async function deleteTemplate(id, fileUrl) {
  if (!confirm("Hapus template ini? Aksi tidak bisa dibatalkan.")) return;
  const { error } = await sb.from("templates").delete().eq("id", id);
  if (error) return alert("Gagal hapus: " + error.message);

  // Hapus juga file di storage (jika URL berasal dari bucket ini)
  const prefix = "/storage/v1/object/public/templates/";
  const i = fileUrl.indexOf(prefix);
  if (i >= 0) await sb.storage.from("templates").remove([fileUrl.slice(i + prefix.length)]);
  loadTemplates();
}
