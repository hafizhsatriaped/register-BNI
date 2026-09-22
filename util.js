(function (root) {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function isAllowedExt(filename) {
    return /\.(pdf|xls|xlsx)$/i.test(filename);
  }

  const api = { escapeHtml, isAllowedExt };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.escapeHtml = escapeHtml;
  root.isAllowedExt = isAllowedExt;
})(typeof globalThis !== "undefined" ? globalThis : this);
