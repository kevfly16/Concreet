function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

$(document).ready(function() {
  var error = getParameterByName('error');
  if (error) {
    $('.ui.error.message').append('<ul class="list"><li>' + error.replace(/_/g, ' ').capitalize() + '</li></ul>');
    $('.ui.error.message').show();
    setTimeout(function() { 
      $('.ui.error.message').fadeOut();
    }, 3000);
  }

  var success = getParameterByName('success');
  if (success) {
    $('.ui.success.message').append('<ul class="list"><li>' + success.replace(/_/g, ' ').capitalize() + '</li></ul>');
    $('.ui.success.message').show();
    setTimeout(function() {
      $('.ui.success.message').fadeOut();
    }, 3000);
  }
});