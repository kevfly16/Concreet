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
            type   : 'maxLength[32]',
            prompt : 'Your username must be no longer than 32 characters'
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
            type   : 'minLength[8]',
            prompt : 'Your password must be at least {ruleValue} characters long'
          },
          {
            type   : 'maxLength[64]',
            prompt : 'Your password must be no longer than 64 characters'
          },
          {
            type   : 'regExp[/^[a-zA-Z\-0-9\^!@#\$%*\(\)\.~\?_\|]*$/]',
            prompt : 'Your password may not contain any of the following characters: [;<>\\{}[]+=?&,:\'"`]'
          }
        ]
      },
      confirm: {
        identifier  : 'confirm',
        rules: [
          {
            type   : 'match[password]',
            prompt : 'Your passwords did not match'
          }
        ]
      }
    }
  });
});