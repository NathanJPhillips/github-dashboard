function dateToGitHubISOString(date) {
  function pad(number) {
    var r = String(number);
    return r.length === 1 ? '0' + r : r;
  }
  return date.getUTCFullYear()
    + '-' + pad(date.getUTCMonth() + 1)
    + '-' + pad(date.getUTCDate())
    + 'T' + pad(date.getUTCHours())
    + ':' + pad(date.getUTCMinutes())
    + ':' + pad(date.getUTCSeconds())
    + '';
}
