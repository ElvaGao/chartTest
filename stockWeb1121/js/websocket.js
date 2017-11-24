var socket;
var WebSocketRequire = function(option){

	this.wsUrl = option.wsUrl?option.wsUrl:"ws://172.17.20.203:7681";
    this.stockXMlUrl = option.stockXMlUrl?option.stockXMlUrl:"http://172.17.20.203:6789/101";
    
}
// 初始化请求参数
var KLineRequireOpt = function(option){
	var ExchangeID = option.ExchangeID?option.ExchangeID:"101",
		InstrumentID = option.InstrumentID?option.InstrumentID:"1",
		wsUrl = option.wsUrl?option.wsUrl:"ws://172.17.20.203:7681",
		stockXMlUrl = option.stockXMlUrl?option.stockXMlUrl:"http://172.17.20.203:6789/101",
		klineType = klineType?klineType:"minute";
	// 不同类型K线历史数据参数扩展对象
	var historyQAll = {};
	// 对象默认请求参数
	this.defaults = {
		wsUrl: wsUrl,
        stockXMlUrl: stockXMlUrl,
        lineType: klineType,
		HeartSend: {			// 心跳包
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType: "C646"
		},
		HistoryKQAll: {			// 查询历史数据
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType: "C211",  
			StartIndex: "-1", 
			StartDate: "0", 
			Count: "200" 
		},
		KQAll: {				// 订阅分钟K线
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"3",
		    Instrumenttype:"5"
		},
		KQXQAll: {				// 取消订阅分钟K线
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"4",
		    Instrumenttype:"5"
		},
		KKZQAll: {				// 订阅快照
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"3",
		    Instrumenttype:"2"
		},
		KQXKZQAll: {			// 取消订阅快照
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"4",
		    Instrumenttype:"2"
		}
	};
	// 不同类型K线请求参数区分
	switch(klineType){
		case "day":
			historyQAll = {
				MsgType: "C211"				// 日K线：C211
			}
			break;
		case "minute":
			historyQAll = {
				MsgType: "C213",			// 分钟K线：C213
				StartTime: "0"
			}
			break;
		default:
	};
	// 更新请求参数
	this.defaults.HistoryKQAll = $.extend({}, this.defaults.HistoryKQAll, historyQAll);
	this.options = $.extend({}, this.defaults, option);
}
var WebSocketConnect = function(options){
	this.ws = null;
	this.lockReconnect = false;
	this.wsUrl = options.wsUrl;
	this.timeout = 60000;//60秒
	this.timeoutObj = null;
	this.serverTimeoutObj = null;
	this.options = options;
	this.HeartSend = options.HeartSend;
};
WebSocketConnect.prototype = {
	createWebSocket: 	function () {
						    try {
						        this.ws = new WebSocket(this.wsUrl);
						        return this.ws;
						    } catch (e) {
						        this.reconnect(); //如果失败重连
						    }
						},
	reconnect:  function () {
				    if (socket.lockReconnect) return;
				    socket.lockReconnect = true;
				    //没连接上会一直重连，设置延迟避免请求过多
				    setTimeout(function () {
				        var ws = socket.createWebSocket(socket.wsUrl);
				        ws.reqOpt = socket.options;
				        WebSocketResponse(ws);

				        socket.lockReconnect = false;
				        console.log("重连中……");
				    }, 2000);
				},
	//发送请求
	request: 	function (data) {
				    this.ws.send(JSON.stringify(data));
				},
	//重置心跳包
	reset:   	function () {
				    clearTimeout(this.timeoutObj);
				    clearTimeout(this.serverTimeoutObj);
				    return this;
				},
	//开始心跳包
	start: 		function () {
				    var self = this;
				    this.timeoutObj = setTimeout(function () {
				        //这里发送一个心跳，后端收到后，返回一个心跳消息，
				        // onmessage拿到返回的心跳就说明连接正常
				        self.request(self.HeartSend);
				        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
				            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
				        }, this.timeout)
				    }, this.timeout)
				}
}

// websocket接收数据
var WebSocketResponse = function( ws ) {

	ws.onclose = function () {
					console.log("终端重连……");
				    socket.reconnect(); //终端重连
				},
	ws.onerror = function () {
					console.log("报错重连……");
				    socket.reconnect(); //报错重连
				},
	ws.onopen = function () {
					console.log("open");
				    //心跳检测重置
				    socket.reset().start(); 				// 第一次建立连接则启动心跳包
					
					socket.request(ws.reqOpt.HistoryKQAll);
				},
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
				            		
				                case "Q213":        // 订阅分钟线应答
					                KCharts(dataList);
				                    break;
				                case "R213":        // 分钟K线历史数据查询
				                 	socket.request(ws.reqOpt.KQAll);	 	// 订阅当前日期K线=分钟K线
				                 	KCharts(dataList, "history");
				                 	break;
				                case "R211":        // 日K线历史数据查询
				                 	socket.request(ws.reqOpt.KKZQAll);	 // 订阅当前日期K线=快照
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
};