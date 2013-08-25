jQuery(function($) {

  $(window).resize(function() {
    if($(this).width() < 750) {
      narrow = true;
    } else {
      narrow = false;
    }

    init(narrow);
  }).resize();

  $('a.phone').on('click', function(e) {
    e.preventDefault();

    $('.modal section').hide();
    $('.modal section.phone').show();
    $('.modal').fadeIn();
  });

  $('a.close').on('click', function(e) {
    e.preventDefault();

    $('.modal').fadeOut();
  });

  $('a.mail').on('click', function(e) {
    e.preventDefault();

    var mail = '';
    mail += 'm@';
    mail += 'guido';
    mail += '.vc';
    // document.location.href = 'mailto:' + mail;

    $('.modal section').hide();
    $('.modal section.mail').show();
    $('.modal section.mail h1').html(mail);
    $('.modal').fadeIn();
  });

  $('.modal section.mail h1').on('click' , function() {
    document.location.href = 'mailto:' + $(this).html();
  })

  /mobi/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
    if (!pageYOffset) window.scrollTo(0, 0);
  }, 100);
});

var init = function(narrow)
{
  if(!window.initialised)
  {
    window.initialised = true;
    $('section.home h1').fitText(0.82, { maxFontSize: '120px' });
    $('section.home h2').fitText(1.70, { maxFontSize: '24px' });
    $('section.work h1').fitText(0.30, { maxFontSize: '120px' });
    $('section.contact h1').fitText(0.475, { maxFontSize: '120px' });


    $('body').panelSnap(
    {
      $menu: $('header'),
      onSnapFinish: function()
      {
        var self = this;

        moveHighlight($('a.active'));
      }
    });
  }

  if(narrow && window.wide_initialised)
  {
    window.wide_initialised = false;

    $('#highlight').remove();

    clearTimeout(window.delayedInit);
  }
  else if(!narrow && !window.wide_initialised)
  {
    window.wide_initialised = true;

    $('<div id="highlight"/>').appendTo('body');

    $('header a').not('.no_highlight').on('mouseenter focusin', function(e)
    {
      moveHighlight($(this));
    }).on('mouseleave focusout', function(e)
    {
      moveHighlight($('a.active'));
    });

    // Crappy FOUT rendering...
    window.delayedInit = setTimeout(function()
    {
      // Init highlightSnap
      // Invoke scrollStop

      moveHighlight($('a.active'), 0);
      $('#highlight').animate({opacity: 1},{queue: false, duration: 500});

      $(document).trigger('scrollstop');
    }, 500);
  }
}

var moveHighlight = function($target, speed)
{
  if(typeof(speed) == 'undefined')
  {
    speed = 500;
  }

  var $body = $('body');
  var canvasWidth = $body.width();
  var scrollTop = $body.scrollTop();
  var offset = $target.offset();
  var width = $target.width();
  var height = $target.height();

  $('#highlight').stop('fx', true).animate(
  {
    top: offset.top - scrollTop + height,
    right: canvasWidth - width - offset.left,
    width: width
  }, speed);
}