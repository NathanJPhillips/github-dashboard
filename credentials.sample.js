// Copy this file as credentials.js, and edit the below lines

// Your github username
var username = "username";

// A personal access token from https://github.com/settings/tokens
var accessCode = "token";

// An API token from https://developer.travis-ci.com/authentication
var travisAccessCode = "token";

// ///////////////////// Leave the below /////////////////////

$.ajaxSetup({
  beforeSend: function(jqXHR) {
    jqXHR.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + accessCode));
  }
});
