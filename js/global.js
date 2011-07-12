$(document).ready(function(){
	ssh.showFlash();
});


var ssh = {
	showFlash:function(info){
		var flash = $('#flash');
		if(info) flash.html('<h4>'+info+'</h4>');
		if(info || flash.children().length && !flash.hasClass('_animating')){
			flash.addClass('_animating').show().css({'background-color':'rgba(255, 255, 0, .2)'}).animate({'background-color':'#fff'},300,function(){
				setTimeout(function(){
					flash.animate({'height':0,'opacity':0},400,function(){
						flash.html('').removeClass('_animating').removeAttr('style');
					});
				},800);
			});
		}
	}
}