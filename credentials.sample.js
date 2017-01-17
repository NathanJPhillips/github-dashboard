// Copy this file as credentials.js, and edit the below lines

// Your github username
var username = "NathanJPhillips";

// A personal access token from https://github.com/settings/tokens
var accessCode = "token";

// ///////////////////// Leave the below /////////////////////

$.ajaxSetup({
  beforeSend: function (xhr) {
    xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + accessCode));
  }
});
