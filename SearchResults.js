function SearchResults() {
  var self = this;

  self.items = ko.observableArray([]);
  self.totalCount = ko.observable(0);
  self.averageAge = ko.computed(function () {
    if (self.items().length != 0) {
      var itemAges = self.items().map(function (item) { return new Date() - new Date(item.created_at); });
      var averageAgeMs = itemAges.reduce(function (sum, age) { return sum + age }) / itemAges.length;
      return Math.round(averageAgeMs / 1000 / 60 / 60 / 24 * 10) / 10;
    }
  });

  self.errorMessage = ko.observable();
  self.activeRequests = ko.observable(0);
  self.loading = ko.computed(function () { self.activeRequests() == 0; });
  self.uninitialised = ko.computed(function () { return self.items().length == 0; });

  self.update =
    function () {
      var items = [];
      // Function to load a page of results
      function getPage(uri) {
        self.activeRequests(self.activeRequests() + 1);
        $.getJSON(uri, function (data, textStatus, jqXHR) {
          self.totalCount(data.total_count);
          // Get the items
          self.items(self.items().concat(data.items));
          // Get the link to the next page of results
          var nextLinkSuffix = "; rel=\"next\"";
          var nextLinks = jqXHR.getResponseHeader("Link").split(",").filter(function (link) { return link.endsWith(nextLinkSuffix); });
          if (nextLinks.length > 0) {
            var nextLink = nextLinks[0];
            nextLink = nextLink.substring(1, nextLink.length - nextLinkSuffix.length - 1);
            getPage(nextLink);
          } else {
            if (self.items().length != self.totalCount())
              self.errorMessage("Couldn't get all the PRs");
          }
        }).always(function () { self.activeRequests(self.activeRequests() - 1); });
      }
      // Load the first page
      getPage("https://api.github.com/search/issues?q=user%3Adiffblue+type%3Apr+is%3Aopen");
    };
}
