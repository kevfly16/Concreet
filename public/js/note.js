$(document).ready(function() {
  var editor = new MediumEditor('.editor', {
    autoLink: true,
  });

  $('.editor').mediumInsert({
    editor: editor
    addons: {
      embeds: {
        label: '<i class="image outline icon"></i>'
        placeholder: 'Paste a YouTube, Vimeo, Facebook, Twitter, Instagram or image link and press Enter'
      }
    }
  });

});