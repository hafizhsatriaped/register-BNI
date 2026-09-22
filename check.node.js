// Standard node self-check without frameworks — uji util.js produksi
const assert = require("assert");
const { escapeHtml, isAllowedExt } = require("./util.js");

// 1. Sanitization test
assert.strictEqual(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
assert.strictEqual(escapeHtml('a"b\'c&d<e>'), "a&quot;b&#39;c&amp;d&lt;e&gt;");

// 2. Extension validation (dipakai admin.js)
assert.strictEqual(isAllowedExt("test.PDF"), true);
assert.strictEqual(isAllowedExt("test.xlsx"), true);
assert.strictEqual(isAllowedExt("test.xls"), true);
assert.strictEqual(isAllowedExt("test.exe"), false);
assert.strictEqual(isAllowedExt("test.html"), false);

console.log("Self-check OK");
