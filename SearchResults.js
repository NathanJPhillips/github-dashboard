function average(collection) { return _.sum(collection) / collection.length; }


function PullRequest(data) {
  var self = this;
  ko.mapping.fromJS(data, {}, self);

  self.createdAt = new Date(self.created_at());
  self.isOpen = self.closed_at() == null;
  self.closedAt = self.isOpen ? null : new Date(self.closed_at());
  self.age = (self.isOpen ? new Date() : self.closedAt) - self.createdAt;

  self.isOpenAtDate = function (when) {
    return self.createdAt <= when && (self.isOpen || self.closedAt > when);
  };
}

var msInADay = 1000 * 60 * 60 * 24,
  msInAWeek = msInADay * 7,
  msInAYear = msInADay * 365.25;

function SearchResults() {
  var self = this;

  self.totalPRCount = ko.observable(0);
  self.pullRequests =
    ko.mapping.fromJS([],
      {
        key: function(data) { return ko.utils.unwrapObservable(data.id); },
        create: function(options) { return new PullRequest(options.data); }
      });
  self.openPullRequests = ko.pureComputed(function () {
    return self.pullRequests().filter(function (pr) { return pr.isOpen; });
  });
  self.closedPullRequests = ko.pureComputed(function () {
    return self.pullRequests().filter(function (pr) { return !pr.isOpen; });
  });
  self.openPRsAtDate = function(when) {
    return self.pullRequests().filter(function (pr) { return pr.isOpenAtDate(when); });
  };
  self.pullRequestAges = function (open) {
    return (open ? self.openPullRequests() : self.closedPullRequests()).map(function (pr) { return pr.age; });
  };
  self.averagePRAge = function (open) {
    return ko.computed(function () { return average(self.pullRequestAges(open)); });
  };
  self.minPRAge = function (open) {
    return ko.computed(function () { return _.min(self.pullRequestAges(open)); });
  };
  self.maxPRAge = function (open) {
    return ko.computed(function () { return _.max(self.pullRequestAges(open)); });
  };
  self.agesOfPRsOpenAt = function (when) {
    return self.openPRsAtDate(when).map(function (pr) { return when - pr.createdAt; });
  };

  self.prCountByAgeInWeeks = function (open, limit) {
    var map = new Array();
    self.pullRequestAges(open)
      .forEach(function (age) {
        var weeks = Math.floor(age / msInAWeek);
        map[weeks] = (map[weeks] ? map[weeks] : 0) + 1;
      });
    var cumulative = [];
    _.range(limit).reduce(function (c, i) {
      var count = c + (map[i] ? map[i] : 0);
      cumulative.push(count);
      return count;
    }, 0);
    return cumulative;
    // Non-cumulative version
    //return _.range(limit).map(function (weeks) { return map[weeks] ? map[weeks] : 0; });
  };


  function createHistory(f, limit) {
    var dates = [];
    var openPRCountHistory = [];
    var when = new Date();
    for (var week = 0; week < limit; ++week) {
      dates.push(new Date(when).toLocaleDateString());
      openPRCountHistory.push(f(when));
      when -= msInAWeek;
    }
    return { labels: dates.reverse(), data: openPRCountHistory.reverse() };
  };
  self.openPRCountHistory = function (limit) {
    return createHistory(function (when) { return self.openPRsAtDate(when).length; }, limit);
  };
  self.sumOfPRAgesHistory = function (limit) {
    return createHistory(function (when) { return _.sum(self.agesOfPRsOpenAt(when)) / msInAYear; }, limit);
  };

  self.errorMessage = ko.observable();
  self.activeRequests = ko.observable(0);
  self.loading = ko.pureComputed(function () { self.activeRequests() == 0; });
  self.uninitialised = ko.pureComputed(function () { return self.pullRequests().length == 0; });

  self.update =
    function () {
      var pullRequests = [];
      // Function to load a page of results
      function getPage(uri) {
        self.activeRequests(self.activeRequests() + 1);
        $.getJSON(uri, function (data, textStatus, jqXHR) {
          self.totalPRCount(data.total_count);
          // Get the pull requests
          pullRequests = pullRequests.concat(data.items);
          // Get the link to the next page of results
          var nextLinkSuffix = "; rel=\"next\"";
          var nextLinks = jqXHR.getResponseHeader("Link").split(",").filter(function (link) { return link.endsWith(nextLinkSuffix); });
          if (nextLinks.length > 0) {
            var nextLink = nextLinks[0];
            nextLink = nextLink.substring(1, nextLink.length - nextLinkSuffix.length - 1);
            getPage(nextLink);
            return;   // Don't update until read all pages
          }
          if (pullRequests.length != self.totalPRCount())
            self.errorMessage("Couldn't get all the pull requests");
          ko.mapping.fromJS(pullRequests, {}, self.pullRequests);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          if (jqXHR.getResponseHeader("X-RateLimit-Remaining") <= 0) {
            var rateLimitReset = new Date(parseInt(jqXHR.getResponseHeader("X-RateLimit-Reset")) * 1000);
            console.log("Rate limit exceeded, retrying at " + rateLimitReset.toLocaleTimeString());
            setTimeout(function() { getPage(uri); }, rateLimitReset - new Date());
          }
        })
        .always(function () { self.activeRequests(self.activeRequests() - 1); });
      }
      // Load the first page
      getPage("https://api.github.com/search/issues?q=user%3Adiffblue+type%3Apr&per_page=100");
    };
}
