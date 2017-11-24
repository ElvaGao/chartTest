
// websocket请求连接
var WebSocketConnect = function(wcObj){
	this.ws = null;
	this.lockReconnect = false,
	this.timeout = 600,//60秒
	this.timeoutObj = null,
	this.serverTimeoutObj = null,
	this.wsUrl = wcObj.wsUrl,
	this.HeartSend = wcObj.HeartSend;
};
// websocket连接方法
WebSocketConnect.prototype = {
	//建立socket连接
	createWebSocket: 	function () {
						    try {
						        this.ws = new WebSocket(this.wsUrl);
						        return this.ws;
						    } catch (e) {
						        this.reconnect(); //如果失败重连
						    }
						},
	//socket重连
	reconnect: 			function () {
						    if (socket.lockReconnect) return;
						    socket.lockReconnect = true;
						    //没连接上会一直重连，设置延迟避免请求过多
						    setTimeout(function () {
						        var ws = socket.createWebSocket(socket.wsUrl);
						        // this.initEvent(ws, this);
						        // ws.WebSocketResponse();
						        WebSocketResponse();

						        this.lockReconnect = false;
						        console.log("重连中……");
						    }, 2000);
						},
	//发送请求
	request: 			function (data) {
						    this.ws.send(JSON.stringify(data));
						},
	//重置心跳包
	reset: 				function () {
						    clearTimeout(this.timeoutObj);
						    clearTimeout(this.serverTimeoutObj);
						    return this;
						},
    //开始心跳包
	start: 				function () {
						    var self = this;
						    this.timeoutObj = setTimeout(function () {
						        //这里发送一个心跳，后端收到后，返回一个心跳消息，
						        // onmessage拿到返回的心跳就说明连接正常
						        self.request(this.HeartSend);
						        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
						            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
						        }, self.timeout)
						    }, self.timeout)
						}
}


// websocket连接终端
var WebSocketResponse = function(option) {

	var reqOpt = option;

	ws.onclose = 	function () {
		console.log("终端重连……");
	    socket.reconnect(); //终端重连
	};
	ws.onerror = 	function () {
		console.log("报错重连……");
	    socket.reconnect(); //报错重连
	};
	ws.onopen =  	function () {
		console.log("open");
	    //心跳检测重置
	    socket.reset().start(); 				// 第一次建立连接则启动心跳包
		
		socket.request(reqOpt.HistoryKQAll);
	};
	ws.onmessage = function (evt) {

		console.log("打开成功");

	    var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
	    $.each(jsons,function (i,o) {
	        if(o!==""){
	            var data = eval("(" + o + ")");
	            var dataList = data.d?data.d:data;
	            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
	            switch(MsgType)
	            {
	            	case "Q619":       // 订阅快照
	            		if(KLineData.lineType!="mline"){
							KCharts(dataList);
						}else{
							return;
						}
	            		break;
	                case "Q213":        // 订阅分钟线应答
		                KCharts(dataList);
	                    break;
	                case "R213":        // 分钟K线历史数据查询
	                 	socket.request(reqOpt.KQAll);	 	// 订阅当前日期K线=分钟K线
	                 	KCharts(dataList, "history");
	                 	break;
	                case "R211":        // 日K线历史数据查询
	                 	socket.request(reqOpt.KKZQAll);	 // 订阅当前日期K线=快照
	                 	KCharts(dataList, "history");
	                    break;    
	                case "R646":  //心跳包
	                    console.log(data);
	                default:
	            }
	        }
	    });
	    //如果获取到消息，心跳检测重置
	    //拿到任何消息都说明当前连接是正常的
	    socket.reset().start();
	}
}
