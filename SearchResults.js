function sum(collection) { return collection.reduce(function (sum, x) { return sum + x }, 0); }
function min(collection) { return collection.reduce(function (min, x) { return x > min ? min : x; }, NaN); }
function max(collection) { return collection.reduce(function (max, x) { return x < max ? max : x; }, NaN); }
function average(collection) { return sum(collection) / collection.length; }


function PullRequest(data) {
  var self = this;
  ko.mapping.fromJS(data, {}, self);

  self.age = ko.computed(function () { return new Date() - new Date(self.created_at()); });
}

function SearchResults() {
  var self = this;

  self.pullRequests =
    ko.mapping.fromJS([],
      {
        key: function(data) { return ko.utils.unwrapObservable(data.id); },
        create: function(options) { return new PullRequest(options.data); }
      });
  self.totalPRCount = ko.observable(0);
  self.pullRequestAges = function () { return self.pullRequests().map(function (pr) { return pr.age(); }); };
  self.averagePRAge = ko.computed(function () { return average(self.pullRequestAges()); });
  self.minPRAge = ko.computed(function () { return min(self.pullRequestAges()); })
  self.maxPRAge = ko.computed(function () { return max(self.pullRequestAges()); })

  self.prCountByAgeInWeeks = ko.computed(function () {
    var map = new Array();
    self.pullRequests().forEach(function(pr) {
      var weeks = Math.floor(pr.age() / 1000 / 60 / 60 / 24 / 7);
      map[weeks] = (map[weeks] ? map[weeks] : 0) + 1;
    });
    return _.range(26).map(function (weeks) { return map[weeks] ? map[weeks] : 0; });
  });

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
            self.errorMessage("Couldn't get all the PRs");
          ko.mapping.fromJS(pullRequests, {}, self.pullRequests);
        })
        .always(function () { self.activeRequests(self.activeRequests() - 1); });
      }
      // Load the first page
      getPage("https://api.github.com/search/issues?q=user%3Adiffblue+type%3Apr+is%3Aopen");
    };
}
