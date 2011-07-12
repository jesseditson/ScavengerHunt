$(document).ready(function(){
	$('#userlist [data-row="delete"] input, #userlist [data-row="admin"] input').click(function(e){
		var item = $(e.currentTarget).closest('ul'),
			info = {
				'id': item.attr('data-uid')
			},
			action = $(e.currentTarget).attr('name'),
			reqType = (action == 'delete')?'DELETE':'PUT';
		$.each(item.find('li'), function(){
			var item = $(this).children().first(),
				row = $(this).attr('data-row');
			if(!item.length){
				info[row] = $(this).html();
			} else {
				info[row] = item.val();
				if(item.is(':checkbox')) info[row] = (item.is(':checked'))?true:false;
			}
		});
		$.ajax('/users/' + info.id + '.json', {
			data : info,
			type : reqType,
			success : function(obj){
				if(obj == 'true' && action == 'delete'){
					item.remove();
				} else {
					ssh.showFlash('updated successfuly!');
					/// TODO: Update view with this object - not necessary currently
				}
			}
		});
	});
});