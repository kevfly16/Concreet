$(document).ready(function() {
  
  var info = "Shift + Mouse Click will open the link in a new window."
  $('.ui.info.message').append('<ul class="list"><li>' + info.replace(/_/g, ' ').capitalize() + '</li></ul>');
  $('.ui.info.message').show();
  setTimeout(function() {
    $('.ui.info.message').fadeOut();
  }, 3000);

  var editor = new MediumEditor('.editor', {
    autoLink: true,
  }).subscribe("editableClick", function(e) {
    if (e.target.href && e.shiftKey) {
      console.log(e)
      window.open(e.target.href) 
    } 
  });

  $('.editor').mediumInsert({
    editor: editor,
    addons: {
      embeds: {
        label: '<i class="image outline icon" style="font-size: 16px;line-height: 1.9em;text-indent: 3px;"></i>',
        placeholder: 'Paste a YouTube, Vimeo, Facebook, Twitter, Instagram or image link',
        parseOnPaste: true,
        oembedProxy: 'https://iframe.ly/api/oembed?iframe=1&api_key=2f981739c3b8f0a53ddf95'
      }
    }
  });

  $('.medium-insert-action[data-addon="images"]').parent().remove(); 

  $('form').on('submit', function(event) {
    var contents = $('.editor').clone();
    contents.find('.medium-insert-buttons').remove();
    $('input[name="text"]').val(contents.html());
    
    return true;
  });

});