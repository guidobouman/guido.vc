jQuery(function($) {

  // Register modals
  $('a.work').on('click', function(e) {
    e.preventDefault();

    showModal('work');
  });

  // Register modals
  $('a.phone').on('click', function(e) {
    e.preventDefault();

    var phone = '';
    phone += '+31 ';
    phone += '6 ';
    phone += '42945687';
    $('.modal section.phone h1').html(phone);

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

var showModal = function(className) {

  $('.modal section').hide();
  if(className) {
    $('.modal section.' + className).show();
  } else {
    $('.modal section:first').show();
  }
  $('.modal').fadeIn();

};

var hideModal = function() {

  $('.modal').fadeOut();

};
