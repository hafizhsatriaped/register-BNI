// Standard node self-check without frameworks
const assert = require("assert");

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function isAllowedExt(filename, allowed) {
  const ext = filename.split(".").pop().toLowerCase();
  return allowed.includes(ext);
}

// 1. Sanitization test
assert.strictEqual(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");

// 2. Extension validation
const OK_EXT = ["pdf", "xls", "xlsx"];
assert.strictEqual(isAllowedExt("test.PDF", OK_EXT), true);
assert.strictEqual(isAllowedExt("test.xlsx", OK_EXT), true);
assert.strictEqual(isAllowedExt("test.exe", OK_EXT), false);

console.log("Self-check OK");
