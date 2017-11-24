var socket;
var turnOn = true;
var option = {};

(function($){
	
	//在插件中使用KLine对象
	$.queryKLine = function(option) {
	    // option = option;
		
		var wsReqObj = new WebSocketRequire(option);
		socket = new WebSocketConnect(wsReqObj);
		var ws = socket.createWebSocket();

		// 创建新的查询对象
		// var KLrequireObj = new KLineRequireOpt(option);

		// var requireObj = KLrequireObj.options;

		// Websocket实例
		// socket = new WebSocketConnect(requireObj);
		// 建立websocket连接
	    // var ws = socket.createWebSocket();
	    // ws.reqOpt = requireObj;
	    // 发起websocket请求
	    // WebSocketResponse(ws);
	 //    KLineData.KChart.setOption({
		// 	xAxis: [{data: null},{data: null}],
		// 	yAxis: [{data: null},{data: null}],
		// 	series: [{data: null},{data: null}]
		// })
		// socket.request(requireObj.KQXQAll);
		// socket.request(requireObj.KQXKZQAll);

		// 点击按钮查询制定图形
		$(".charts-tab li").on("click",function(){
			
			var klineType = $(this).attr("id");
			KLineData.lineType = $(this).attr("id");

			// 创建新的查询对象
			var KLrequireObj = new KLineRequireOpt(option, klineType);

			var requireObj = KLrequireObj.options;
			// requireObj.__proto__ = KLrequireObj.__proto__;

			if(KLineData.lineType=="mline"&&turnOn){
				return;
			}else{
				if(turnOn){
					
				    turnOn = false;
				}else{
					// 取消之前的订阅
					switch(klineType){
						case "mline":
							KLineData.KChart.setOption({
								xAxis: [{data: null},{data: null}],
								yAxis: [{data: null},{data: null}],
								series: [{data: null},{data: null}]
							})
							socket.request(requireObj.KQXQAll);
							socket.request(requireObj.KQXKZQAll);
							break;
						case "minute":
							socket.request(requireObj.KQXKZQAll);
							// 发起新请求
							socket.request(requireObj.HistoryKQAll);
							break;
						case "day":
							socket.request(requireObj.KQXQAll);
							// 发起新请求
							socket.request(requireObj.HistoryKQAll);
							break;
						default:;
					}
				}
			}
		});
	};
})(jQuery)