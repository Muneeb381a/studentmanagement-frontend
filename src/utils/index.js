/**
 * Format a date string to a readable format.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} opts
 */
export function formatDate(date, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', opts);
}

/**
 * Format a number with commas.
 * @param {number} n
 */
export function formatNumber(n) {
  if (n == null) return '0';
  return n.toLocaleString();
}

/**
 * Get initials from a full name (max 2 chars).
 * @param {string} name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Clamp a percentage between 0 and 100.
 * @param {number} value
 * @param {number} total
 */
export function toPct(value, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/**
 * Pick an avatar gradient pair by id.
 * @param {number} id
 * @param {Array} gradients
 */
export function pickGradient(id, gradients) {
  return gradients[(id || 0) % gradients.length];
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trigger a browser file download from a Blob (or axios blob response).
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
