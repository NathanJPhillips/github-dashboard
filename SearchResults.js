function sum(collection) { return collection.reduce(function (sum, x) { return sum + x }, 0); }
function min(collection) { return collection.reduce(function (min, x) { return x > min ? min : x; }, NaN); }
function max(collection) { return collection.reduce(function (max, x) { return x < max ? max : x; }, NaN); }
function average(collection) { return sum(collection) / collection.length; }

function SearchResults() {
  var self = this;

  self.pullRequests = ko.observableArray([]);
  self.totalPRCount = ko.observable(0);
  self.pullRequestAges = function () { return self.pullRequests().map(function (item) { return new Date() - new Date(item.created_at); }); };
  self.averagePRAge = ko.computed(function () { return average(self.pullRequestAges()); });
  self.minPRAge = ko.computed(function () { return min(self.pullRequestAges()); })
  self.maxPRAge = ko.computed(function () { return max(self.pullRequestAges()); })

  self.errorMessage = ko.observable();
  self.activeRequests = ko.observable(0);
  self.loading = ko.computed(function () { self.activeRequests() == 0; });
  self.uninitialised = ko.computed(function () { return self.pullRequests().length == 0; });

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
          self.pullRequests(pullRequests);
        })
        .always(function () { self.activeRequests(self.activeRequests() - 1); });
      }
      // Load the first page
      getPage("https://api.github.com/search/issues?q=user%3Adiffblue+type%3Apr+is%3Aopen");
    };
}
