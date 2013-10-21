jQuery(function($) {

  $('body').panelSnap({
    $menu: $('header'),
    onSnapFinish: function() {
      var self = this;

      moveHighlight($('a.active'));
    }
  });

  $('<div id="highlight"/>').appendTo('body');

  $('header a').not('.no_highlight').on('mouseenter focusin', function(e) {
    moveHighlight($(this));
  }).on('mouseleave focusout', function(e) {
    moveHighlight($('a.active'));
  });

  // Crappy FOUT rendering...
  setTimeout(function() {

    moveHighlight($('a.active'), 0);
    $('#highlight').animate({opacity: 1},{queue: false, duration: 500});

  }, 500);

  // Register modals
  $('a.phone').on('click', function(e) {
    e.preventDefault();

    showModal('phone');
  });

  $('a.mail').on('click', function(e) {
    e.preventDefault();

    var mail = '';
    mail += 'm@';
    mail += 'guido';
    mail += '.vc';
    $('.modal section.mail h1').html(mail);

    showModal('mail');
  });

  $('.modal section.phone h1').on('click' , function() {
    document.location.href = 'tel:' + $(this).html().replace(' ', '');
  });

  $('.modal section.mail h1').on('click' , function() {
    document.location.href = 'mailto:' + $(this).html();
  });

  $('a.close').on('click', function(e) {
    e.preventDefault();

    hideModal();
  });

  // Hide addressbar on mobile
  /mobi/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
    if (!pageYOffset) window.scrollTo(0, 0);
  }, 100);

});

var moveHighlight = function($target, speed) {

  if(typeof(speed) == 'undefined') {
    speed = 500;
  }

  var $body = $('body');
  var canvasWidth = $body.width();
  var scrollTop = $body.scrollTop();
  var offset = $target.offset();
  var width = $target.width();
  var height = $target.height();

  $('#highlight').stop('fx', true).animate({
    top: offset.top - scrollTop + height,
    right: canvasWidth - width - offset.left,
    width: width
  }, speed);

};

var showModal = function(className) {

  $('.modal section').hide();
  if(className) {
    $('.modal section.' + className).show();
  } else {
    $('.modal section:first').show();
  }
  $('.modal').fadeIn();

}

var hideModal = function() {

  $('.modal').fadeOut();

}