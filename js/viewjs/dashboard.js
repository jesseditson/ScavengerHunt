$(document).ready(function(){
	var dataContainer = $('#dashboard_data');
	userPoints = JSON.parse(dataContainer.html());
	dataContainer.remove();
	var gint = setInterval(function(){
		clearInterval(gint);
		if(ssh.googleReady) drawChart(userPoints);
	},100);
});

function drawChart(inData){
	var data = new google.visualization.DataTable(),
		userPoints = {},
		chartMax = 15,
		rows = [];
	/// limit this to 15 days
	for(var i in inData){
		if(i <= chartMax){
			userPoints[i] = inData[i];
		}
	}
	for(var point in userPoints){
		if(userPoints.hasOwnProperty(point)){
			var rowData = [point],
				users = ['x'];
			for(var user in userPoints[point]){
				if(users.indexOf(user)==-1) users.push(user);
				rowData[users.indexOf(user)] = userPoints[point][user];
			}
			rows.push(rowData);
		}
	}
	for(var c in users){
		var type = (c==0)?'string':'number';
		data.addColumn(type,users[c]);
	}
	for(var d in rows){
		rows[d][0] = rows[d][0].replace(/^\d{4}/,'').replace(/^(\d\d)/,"$1/");
		data.addRow(rows[d]);
	}
	$(window).resize(function(){
		redrawChart(data);
	});
	redrawChart(data);
}
function redrawChart(data){
	var chart = new google.visualization.LineChart(document.getElementById('chart_div')),
		cWidth = $(window).width() - 40; // hardcoded padding...
		cHeight =  $(window).height() - 40 - 50; // hardcoded padding & header..
	chart.draw(data, {curveType:'function',width: cWidth, height:cHeight, title: 'Standings'});
	$('#main').css({'width':cWidth,'height':cHeight});
}