$(document).ready(function(){
	/// subtask adding
	$('#add_subtask_button').click(function(){
		var subtaskForm = $('.subtask.template').clone().removeClass('template').show(),
			numSubTasks = $(this).closest('div').find('.subtask').length;
		subtaskForm.find('input').each(function(){
			var i = $(this),
				name = i.attr('name');
			if(name){
				name = name.replace(/_\d*$/,'_'+numSubTasks);
				i.attr({'name':name});
			}
		});
		$(this).closest('div').append(subtaskForm);
		subtaskForm.find('.subtask_delete_button').click(function(){
			$(this).closest('.subtask').remove();
		});
	});
	
	/// task deleting
	$('input[value="delete"]').click(function(){
		var task = $(this).closest('.task'),
			id = task.find('[data-uid]').attr('data-uid');
		$.ajax('/tasks/' + id + '.json', {
			type : 'DELETE',
			success : function(obj){
				if(obj == 'true'){
					task.remove();
				}
			}
		});
	});
	
	/// task adding
	var createTask = function(obj){
		var task = $('.task.template').clone().removeClass('template').show(),
			fields = ['title','description','pointValue','subTasks'];
		task.find('[data-uid]').attr({'data-uid':obj.id});
		for(var f=0;f<fields.length;f++){
			task.find('[data-row="'+fields[f]+'"]').html(obj[fields[f]]);
		}
		$('#tasks_admin').append(task);
	}
	
	$('#add_button').click(function(){
		var inputs = $(this).closest('div').children('input:not([type=button]),textarea'),
			subTasks = $(this).closest('div').find('.subtask input:not([type=button])'),
			info = {
				subTasks : []
			};
		inputs.add(subTasks).each(function(){
			var el = $(this),
				name = el.attr('name'),
				val = el.val(),
				subtaskMatch = name.match(/subtask_([^_]+)_(\d+)/);
			if(!subtaskMatch){
				info[name] = val;
			} else {
				var subTask = info.subTasks[parseInt(subtaskMatch[2])];
				if(!subTask){
					subTask = info.subTasks[parseInt(subtaskMatch[2])] = {};
				}
				subTask[subtaskMatch[1]] = val;
			}
		});
		var data = {info:JSON.stringify(info)};
		
		$.ajax('/tasks/create.json', {
			data : data,
			type : 'POST',
			success : function(obj){
				if(typeof obj == 'object'){
					ssh.showFlash('Task Added!');
					createTask(obj);
					inputs.val('');
					subTasks.remove();
				} else {
					ssh.showFlash('Task Creation Failed...');
				}
			}
		});
		
	});
});