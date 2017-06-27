function average(collection) { return _.sum(collection) / collection.length; }


function PullRequest(data) {
  var self = this;
  if (!data)
    console.log("Created PullRequest with no data");
  ko.mapping.fromJS(data, {}, self);

  self.createdAt = ko.pureComputed(function () { return new Date(self.created_at()); });
  self.updatedAt = ko.pureComputed(function () { return new Date(self.updated_at()); });
  self.isOpen = ko.pureComputed(function () { return self.closed_at() == null; });
  self.closedAt = ko.pureComputed(function () { return self.isOpen() ? null : new Date(self.closed_at()); });
  self.age = ko.pureComputed(function () { return (self.isOpen() ? new Date() : self.closedAt()) - self.createdAt(); });

  self.isOpenAtDate = function (when) {
    return self.createdAt() <= when && (self.isOpen() || self.closedAt() > when);
  };
}

var msInADay = 1000 * 60 * 60 * 24,
  msInAWeek = msInADay * 7,
  msInAYear = msInADay * 365.25;

function SearchResults() {
  var self = this;

  self.pullRequests =
    ko.mapping.fromJS([],
      {
        key: function (data) { return data ? ko.utils.unwrapObservable(data.id) : null; },
        create: function (options) { return new PullRequest(options.data); }
      });
  self.openPullRequests = ko.pureComputed(function () {
    return self.pullRequests().filter(function (pr) { return pr.isOpen(); });
  });
  self.closedPullRequests = ko.pureComputed(function () {
    return self.pullRequests().filter(function (pr) { return !pr.isOpen(); });
  });
  self.openPRsAtDate = function(when) {
    return self.pullRequests().filter(function (pr) { return pr.isOpenAtDate(when); });
  };
  self.pullRequestAges = function (open) {
    return (open ? self.openPullRequests() : self.closedPullRequests()).map(function (pr) { return pr.age(); });
  };
  self.averagePRAge = function (open) {
    return ko.pureComputed(function () { return average(self.pullRequestAges(open)); });
  };
  self.minPRAge = function (open) {
    return ko.pureComputed(function () { return _.min(self.pullRequestAges(open)); });
  };
  self.maxPRAge = function (open) {
    return ko.pureComputed(function () { return _.max(self.pullRequestAges(open)); });
  };
  self.agesOfPRsOpenAt = function (when) {
    return self.openPRsAtDate(when).map(function (pr) { return when - pr.createdAt(); });
  };
  self.lastPRUpdate = ko.observable();

  self.prCountByAgeInWeeks = function (open, limit) {
    var map = new Array();
    self.pullRequestAges(open)
      .forEach(function (age) {
        var weeks = Math.floor(age / msInAWeek);
        map[weeks] = (map[weeks] ? map[weeks] : 0) + 1;
      });
    var cumulative = [];
    _.range(limit, 0 , -1).reduce(function (c, i) {
      var count = c + (map[i] ? map[i] : 0);
      cumulative.push(count);
      return count;
    }, 0);
    return _.reverse(cumulative);
    // Non-cumulative version
    //return _.range(limit).map(function (weeks) { return map[weeks] ? map[weeks] : 0; });
  };


  function createHistory(f, limit) {
    var dates = [];
    var openPRCountHistory = [];
    var when = new Date();
    for (var count = 0; count < limit; ++count) {
      dates.push(new Date(when).toLocaleDateString());
      openPRCountHistory.push(f(when));
      when -= msInADay;
    }
    return { labels: dates.reverse(), data: openPRCountHistory.reverse() };
  };
  self.openPRCountHistory = function (limit) {
    return createHistory(function (when) { return self.openPRsAtDate(when).length; }, limit);
  };
  self.sumOfPRAgesHistory = function (limit) {
    return createHistory(function (when) { return _.sum(self.agesOfPRsOpenAt(when)) / msInAYear; }, limit);
  };
  self.sumOfPRAges = ko.pureComputed(function () { return _.sum(self.agesOfPRsOpenAt(new Date())); });
  self.jamiesDisapproval = ko.pureComputed(function() { return Math.round(Math.log(1 + self.sumOfPRAges() / 263000000)); });

  self.errorMessage = ko.observable();
  self.errorMessage.subscribe(function(newValue) {
    if (newValue != null)
      console.log(newValue);
  });
  self.activeRequests = ko.observable(0);
  self.loading = ko.pureComputed(function () { self.activeRequests() == 0; });
  self.uninitialised = ko.pureComputed(function () { return self.pullRequests().length == 0; });


  function loadAllPages(query, onComplete) {
    var totalCount;
    var pullRequests = [];
    // Function to load a page of results
    function getPage(uri) {
      self.activeRequests(self.activeRequests() + 1);
      $.getJSON(uri, function (data, textStatus, jqXHR) {
        self.errorMessage(null);
        totalCount = data.total_count;
        // Add the pull requests to the existing cache
        pullRequests = pullRequests.concat(data.items);
        // Get the link to the next page of results
        var nextLinkSuffix = "; rel=\"next\"";
        var linksHeader = jqXHR.getResponseHeader("Link");
        if (linksHeader == null)
          linksHeader = "";
        var nextLinks = linksHeader.split(",").filter(function (link) { return link.endsWith(nextLinkSuffix); });
        if (nextLinks.length > 0) {
          var nextLink = nextLinks[0];
          nextLink = nextLink.substring(1, nextLink.length - nextLinkSuffix.length - 1);
          getPage(nextLink);
        } else if (onComplete)
          onComplete(pullRequests, totalCount);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 0) {
          self.errorMessage("Could not connect to Github");
          return;
        }
        var rateLimitRemaining = jqXHR.getResponseHeader("X-RateLimit-Remaining");
        if (rateLimitRemaining !== null && rateLimitRemaining <= 0) {
          var rateLimitReset = new Date(parseInt(jqXHR.getResponseHeader("X-RateLimit-Reset")) * 1000);
          self.errorMessage("Rate limit exceeded, retrying at " + rateLimitReset.toLocaleTimeString());
          setTimeout(function () { getPage(uri); }, rateLimitReset - new Date());
          return;
        }
        self.errorMessage("Failure response from Github: " + jqXHR.statusText);
      })
      .always(function () { self.activeRequests(self.activeRequests() - 1); });
    }
    getPage("https://api.github.com/search/issues?q=" + encodeURIComponent(query) + "&sort=updated&order=asc&per_page=100");
  }

  var baseQuery = "user:diffblue type:pr";

  function processSearchResults(pullRequestCache, onComplete) {
    // Don't retrieve more search results if already have as many as totalCount
    // We might have more than totalCount if we have retrieved PRs updated on the date of the overlaps between queries more than once
    var requestAgain = pullRequestCache.length < totalCount;
    if (pullRequestCache.length != 0) {
      // Check whether lastPRUpdate has progressed, if not there's no point in repeating the last query
      var newLastUpdate = new Date(pullRequestCache[pullRequestCache.length - 1].updated_at);
      if (!(newLastUpdate <= self.lastPRUpdate()))
        // Store the updated lastPRUpdate
        self.lastPRUpdate(newLastUpdate);
      else
        requestAgain = false;
    } else
      requestAgain = false;
    if (requestAgain) {
      loadAllPages(baseQuery + " updated:>=" + dateToGitHubISOString(self.lastPRUpdate()), function (prs) {
        processSearchResults(pullRequestCache.concat(prs), onComplete);
      });
      return;
    }
    if (self.uninitialised())
      ko.mapping.fromJS(pullRequestCache, {}, self.pullRequests);
    else {
      // Add the pull requests to the array - this is very slow
      for (let pr of pullRequestCache) {
        var prIndex = self.pullRequests.mappedIndexOf(pr);
        if (prIndex === -1)
          self.pullRequests.mappedCreate(pr);
        else
          ko.mapping.fromJS(pr, {}, self.pullRequests[prIndex]);
      }
    }
    console.log("Retrieved " + pullRequestCache.length + " pull requests, making a total of " + self.pullRequests().length + " at " + new Date());
    if (onComplete)
      onComplete();
  }

  var totalCount;

  self.load = function () {
    // Load the first set of pages
    loadAllPages(baseQuery, function (prs, count) {
      totalCount = count;
      processSearchResults(prs, function () { setInterval(self.update, 60 * 1000); });
    });
  };

  self.update = function (onComplete) {
    loadAllPages(baseQuery + " updated:>=" + dateToGitHubISOString(self.lastPRUpdate()), function (prs) {
      processSearchResults(prs, onComplete);
    });
  };
}
