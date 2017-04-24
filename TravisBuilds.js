function TravisBuilds(repo, branch) {
  var self = this;

  self.buildState = ko.observable();
  self.previousBuildState = ko.observable();

  function specificState(buildState, state) {
    return ko.pureComputed(function () { return buildState() == state; });
  }
  self.created = specificState(self.buildState, "created");
  self.started = specificState(self.buildState, "started");
  self.passed = specificState(self.buildState, "passed");
  self.failed = specificState(self.buildState, "failed");

  self.building = ko.pureComputed(function() { return self.created() || self.started(); });

  self.lastCompleteBuildState = ko.pureComputed(function() {
    return self.building() ? self.previousBuildState() : self.buildState();
  });
  self.lastCompleteBuildPassed = specificState(self.lastCompleteBuildState, "passed");
  self.lastCompleteBuildFailed = specificState(self.lastCompleteBuildState, "failed");

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
        self.previousBuildState(data.last_build.previous_state);
      });
  }

  self.load = function () {
      self.update();
      setInterval(function() { self.update(); }, 1 * 60 * 1000);
    };
}
