function TravisBuilds(repo, branch) {
  var self = this;

  self.buildState = ko.observable();
  self.passed = ko.pureComputed(function () { return self.buildState() == "passed"; });

  function request(method, uri, data, success) {
    return $.ajax(
      {
        type: method,
        url: "https://api.travis-ci.com" + uri,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Travis-API-Version", "3");
          jqXHR.setRequestHeader("Authorization", "token " + travisAccessCode);
          return true;
        },
        data: data,
        dataType: "json",
        success: success
      });
  }

  function get(uri, success) { return request("GET", uri, null, success); }
  function post(uri, data, success) { return request("POST", uri, data, success); }

  self.update = function() {
    get(
      "/repo/" + encodeURIComponent(repo) + "/branch/" + encodeURIComponent(branch),
      function (data, textStatus, jqXHR) {
        self.buildState(data.last_build.state);
      });
  }

  self.load = function () {
      self.update();
      setInterval(function() { self.update(); }, 5 * 01 * 1000);
    };
}
