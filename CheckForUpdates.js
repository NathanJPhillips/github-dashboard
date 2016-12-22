var startDate = new Date().toISOString();
function checkForUpdates() {
  $.getJSON("https://api.github.com/repos/NathanJPhillips/github-dashboard/commits?since=" + startDate, function (data, textStatus, jqXHR) {
		if (data.length > 0)
			window.close();
  });
}
$(function () { setInterval(checkForUpdates, 1 * 60 * 1000); });
