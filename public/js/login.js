$(document).ready(function() {
  $('.ui.form').form({
    fields: {
      username: {
        identifier  : 'username',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your username'
          },
          {
            type   : 'regExp[/^[a-zA-Z\-0-9\^!@#\$%*\(\)\.~\?_\|]*$/]',
            prompt : 'Your username may not contain any of the following characters: [;<>\\{}[]+=?&,:\'"`]'
          }
        ]
      },
      password: {
        identifier  : 'password',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your password'
          },
          {
            type   : 'regExp[/^[a-zA-Z\-0-9\^!@#\$%*\(\)\.~\?_\|]*$/]',
            prompt : 'Your password may not contain any of the following characters: [;<>\\{}[]+=?&,:\'"`]'
          }
        ]
      }
    }
  });
});