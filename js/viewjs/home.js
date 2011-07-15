$(document).ready(function(){
	$('.pulldown_button').click(toggleContainer).toggle(function(){$(this).addClass('collapse').removeClass('expand');},function(){$(this).addClass('expand').removeClass('collapse')});
});

function toggleContainer(e){
	var container = $(this).closest('li').find('.pulldown_container');
	container.slideToggle(200);
}