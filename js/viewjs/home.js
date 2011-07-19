$(document).ready(function(){
	updateEnabled();
	$('.pulldown_button').click(toggleContainer).toggle(function(){$(this).addClass('collapse').removeClass('expand');},function(){$(this).addClass('expand').removeClass('collapse')});
	$('.task_checkbox').click(clickTask);
	$('.subtask input[type="number"]').bind("click",changeSubtask).bind('change',changeSubtask).bind('keydown',changeSubtask);
	$('#searchbox input').bind('keyup',updateSearch);
});

function updateSearch(e){
	var el = $(e.currentTarget),
		val = el.val(),
		matchTitles = [],
		failTitles = [];
		$('.task .taskTitle').each(function(){
			var patt = new RegExp(val,'i');
			if($(this).html().match(patt)){
				matchTitles.push(this);
			} else {
				failTitles.push(this);
			}
		});
	$.each(failTitles,function(){
		$(this).closest('.task').slideUp(200);
	});
	$.each(matchTitles,function(){
		$(this).closest('.task').slideDown(200);
	});
}

function changeSubtask(e){
	var el = $(e.currentTarget),
		val = el.val() || 0;
		id = el.closest('li.subtask').attr('data-id'),
		taskId = el.closest('li.task').attr('data-id'),
		prev = el.attr('data-prev');
	if(val > prev){
		var action = 'do',
			type = 'PUT';
	} else if(val < prev){
		var action = 'undo',
			type = 'DELETE';
	}
	if(action){
		$.ajax('/tasks/'+action+'/'+taskId+'/'+id,{
			type:type,
			success : function(obj){
				if(obj.error){
					ssh.showFlash('error' + obj.error);
				} else {
					var userbox = $('#userMenu .userbox');
					el.val(obj.subPoints).attr({'data-prev':obj.subPoints});
					userbox.html(userbox.html().replace(/\d+\spoints/, obj.userPoints + ' points'));
				}
			}
		});
	}
}
function clickTask(e){
	var el = $(e.currentTarget),
		done = el.is(':checked'),
		id = el.closest('li.task').attr('data-id'),
		action = done ? 'do' : 'undo',
		type = done ? 'PUT' : 'DELETE';
	$.ajax('/tasks/'+action+'/'+id, {
		type: type,
		success : function(obj){
			if(obj.error){
				showFlash('error: ' + obj.error);
			} else {
				updateEnabled();
				var userbox = $('#userMenu .userbox');
				userbox.html(userbox.html().replace(/\d+\spoints/, obj.userPoints + ' points'));
			}
		}
	});
}
function updateEnabled(){
	$('.task').each(function(){
		var tl = $(this),
			done = tl.find('.title_row input').is(':checked'),
			inputs = tl.find('.subtask input');
		if(done){
			inputs.removeAttr('disabled');
		} else {
			inputs.attr({'disabled':'true'}).val(0);
		}
	});
}

function toggleContainer(e){
	var container = $(this).closest('li').find('.pulldown_container');
	container.slideToggle(200);
}