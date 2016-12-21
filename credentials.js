var username = "NathanJPhillips";
var accessCode = "password";

$.ajaxSetup({
  beforeSend: function (xhr) {
    xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + accessCode));
  }
});
