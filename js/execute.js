jQuery(function($)
{
	$('section.home .first_name').fitText(0.33, { maxFontSize: '120px' });
	$('section.home .last_name').fitText(0.44, { maxFontSize: '120px' });
	$('section.work h1').fitText(0.30, { maxFontSize: '120px' });
	$('section.contact h1').fitText(0.475, { maxFontSize: '120px' });
	
	$('<div id="highlight"/>').appendTo('body');
	
	$('header a').not('.no_highlight').hover(
		function(e)
		{
			moveHighlight($(this));
		},
		function()
		{
			moveHighlight($('a.active'));
		}
	).focusin(function()
	{
		moveHighlight($(this));
	}).focusout(function()
	{
		moveHighlight($('a.active'));
	}).click(function()
	{
		$('a.active').removeClass('active');
		$(this).addClass('active');
		
		var target = $('section.' + $.trim($(this).text()));
		switchViewport(target);
		
		return false;
	});
	
	// Crappy FOUT rendering...
	setTimeout(function()
	{
		moveHighlight($('a.active'), 0);
		$('#highlight').animate({opacity: 1},{queue: false, duration: 500});
	}, 150);
	
});

var moveHighlight = function(target, speed)
{
	if(typeof(speed) == 'undefined')
	{
		speed = 500;
	}
	
	var scrollTop = $('body').scrollTop();
	var offset = target.offset();
	var width = target.width();
	var height = target.height();
	
	$('#highlight').stop('fx', true).animate(
	{
		top: offset.top - scrollTop + height,
		left: offset.left,
		width: width
	}, speed);
}

var switchViewport = function(target, speed)
{
	if(typeof(speed) == 'undefined')
	{
		speed = 500;
	}
	
	$('body').animate({
		scrollTop: target.offset().top
	}, speed);
}