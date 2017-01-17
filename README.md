# github-dashboard

Dashboard to show GitHub statistics.

The dashboard will only display results from public repositories unless you set up authentication as follows:

* Copy `credentials.sample.js` to `credentials.js`
* Set the `username` to your username
* Set the `accessCode` to a [github personal access token](https://github.com/settings/tokens) with repo ("Full control of private repositories") permissions.

The dashboard will show statistics for the diffblue organisation unless you can change the organisation to another one by editing line 132 of SearchResults.js.
