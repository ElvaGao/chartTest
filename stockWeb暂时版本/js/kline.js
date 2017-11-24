// 历史数据存储，为了添加新数据时，能够准确记录所有数据
var KLineData = {
	KChart: echarts.init(document.getElementById('kline_charts')),	// K线绘制对象
	lineType: "mline",			// K线类型
	hDate: [],					// 日期
	hDay: [],					// 星期
	hTime: 0,					// 如果为日K线，存储最后一条时间
	hCategoryList: [],			// 横轴
	hValuesList: [],			// 值-开收低高
	hValuesPercentList: [],		// 值-对应的百分比
	hVolumesList: [],			// 成交量
	hZValuesList: [],			// 涨幅
	hZValuesListPercent: [],	// 涨幅百分比
	hZf: [],					// 振幅
	hZfList: []					// 振幅百分比
};
var KLineSet = {
	mouseHoverPoint: 0,			// 当前现实的数据索引
	isHoverGraph: false,        // 是否正在被hover
	zoom: 10,
	start: 0
};
var socket;
// var ws;
(function($){




// websocket请求连接
// var WebSocketConnect = function(wcObj){
var WebSocketConnect = function (klineObj) {	
		this.ws = null;
		var lockReconnect = false,
			wsUrl = klineObj.wsUrl,
			timeout = 60000,//60秒
		    timeoutObj = null,
		    serverTimeoutObj = null,
		    _target = this;
		    
		//建立socket连接
		this.createWebSocket = function () {
		    try {
		        this.ws = new WebSocket(wsUrl);
		        return this.ws;
		    } catch (e) {
		        this.reconnect(wsUrl); //如果失败重连
		    }
		};
		//socket重连
		this.reconnect = function (wsUrl) {
		    if (lockReconnect) return;
		    lockReconnect = true;
		    //没连接上会一直重连，设置延迟避免请求过多
		    setTimeout(function () {
		        var ws = _target.createWebSocket(wsUrl);

		        WebSocketResponse(ws, klineObj);

		        lockReconnect = false;
		        console.log("重连中……");
		    }, 2000);
		};
		//发送请求
		this.request = function (data) {
		    this.ws.send(JSON.stringify(data));
		};
		//重置心跳包
		this.reset = function () {
		    clearTimeout(this.timeoutObj);
		    clearTimeout(this.serverTimeoutObj);
		    return this;
		};
		//开始心跳包
		this.start = function () {
		    var self = this;
		    this.timeoutObj = setTimeout(function () {
		        //这里发送一个心跳，后端收到后，返回一个心跳消息，
		        // onmessage拿到返回的心跳就说明连接正常
		        self.request(klineObj.HeartSend);
		        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
		            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
		        }, timeout)
		    }, timeout)
		};
	// }
	// this.ws = null;
	// this.lockReconnect = false,
	// this.timeout = 600,//60秒
	// this.timeoutObj = null,
	// this.serverTimeoutObj = null,
	// this.wsUrl = wcObj.wsUrl,
	// this.HeartSend = wcObj.HeartSend;
};
// websocket连接方法
// WebSocketConnect.prototype = {
// 	//建立socket连接
// 	createWebSocket: 	function () {
// 						    try {
// 						        this.ws = new WebSocket(wsUrl);
// 						        return this.ws;
// 						    } catch (e) {
// 						        this.reconnect(wsUrl); //如果失败重连
// 						    }
// 						},
// 	//socket重连
// 	reconnect: 			function () {
// 						    if (lockReconnect) return;
// 						    lockReconnect = true;
// 						    //没连接上会一直重连，设置延迟避免请求过多
// 						    setTimeout(function () {
// 						        var ws = _target.createWebSocket(wsUrl);

// 						        klineObj.initEvent(ws, klineObj);

// 						        lockReconnect = false;
// 						        console.log("重连中……");
// 						    }, 2000);
// 						},
// 	//发送请求
// 	request: 			function (data) {
// 						    this.ws.send(JSON.stringify(data));
// 						},
// 	//重置心跳包
// 	reset: 				function () {
// 						    clearTimeout(this.timeoutObj);
// 						    clearTimeout(this.serverTimeoutObj);
// 						    return this;
// 						},
//     //开始心跳包
// 	start: 				function () {
// 						    var self = this;
// 						    this.timeoutObj = setTimeout(function () {
// 						        //这里发送一个心跳，后端收到后，返回一个心跳消息，
// 						        // onmessage拿到返回的心跳就说明连接正常
// 						        self.request(this.HeartSend);
// 						        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
// 						            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
// 						        }, self.timeout)
// 						    }, self.timeout)
// 						}
// }


// websocket连接终端
var WebSocketResponse = function(ws,option) {
	var reqOpt = option?option:"";
	// var reqOpt = option;
	ws.onclose = function () {
		console.log("终端重连……");
	    socket.reconnect(); //终端重连
	};
	ws.onerror = function () {
		console.log("报错重连……");
	    socket.reconnect(); //报错重连
	};
	ws.onopen = function () {
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
	};
	// ws.onclose = 	function () {
	// 	console.log("终端重连……");
	//     socket.reconnect(); //终端重连
	// };
	// ws.onerror = 	function () {
	// 	console.log("报错重连……");
	//     socket.reconnect(); //报错重连
	// };
	// ws.onopen =  	function () {
	// 	console.log("open");
	//     //心跳检测重置
	//     socket.reset().start(); 				// 第一次建立连接则启动心跳包
		
	// 	socket.request(reqOpt.HistoryKQAll);
	// };
	// ws.onmessage = function (evt) {

	// 	console.log("打开成功");

	//     var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
	//     $.each(jsons,function (i,o) {
	//         if(o!==""){
	//             var data = eval("(" + o + ")");
	//             var dataList = data.d?data.d:data;
	//             var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
	//             switch(MsgType)
	//             {
	//             	case "Q619":       // 订阅快照
	//             		if(KLineData.lineType!="mline"){
	// 						KCharts(dataList);
	// 					}else{
	// 						return;
	// 					}
	//             		break;
	//                 case "Q213":        // 订阅分钟线应答
	// 	                KCharts(dataList);
	//                     break;
	//                 case "R213":        // 分钟K线历史数据查询
	//                  	socket.request(reqOpt.KQAll);	 	// 订阅当前日期K线=分钟K线
	//                  	KCharts(dataList, "history");
	//                  	break;
	//                 case "R211":        // 日K线历史数据查询
	//                  	socket.request(reqOpt.KKZQAll);	 // 订阅当前日期K线=快照
	//                  	KCharts(dataList, "history");
	//                     break;    
	//                 case "R646":  //心跳包
	//                     console.log(data);
	//                 default:
	//             }
	//         }
	//     });
	//     //如果获取到消息，心跳检测重置
	//     //拿到任何消息都说明当前连接是正常的
	//     socket.reset().start();
	// }
}







	var turnOn = true;
	//在插件中使用KLine对象
	$.queryKLine = function(option) {
	    
		// 点击按钮查询制定图形
		$(".charts-tab li").on("click",function(){
			// 修改K线类型
			var klineType = $(this).attr("id");

			KLineData.lineType = $(this).attr("id");

			// 创建新的查询对象
			var KLrequireObj = new KLineRequireOpt(option, klineType);
			var requireObj = KLrequireObj.options;
			requireObj.__proto__ = KLrequireObj.__proto__;

			if(KLineData.lineType=="mline"&&turnOn){
				return;
			}else{
				if(turnOn){
					// Websocket实例
					socket = new WebSocketConnect(requireObj);
					// 建立websocket连接
				    // ws = socket.createWebSocket();
				    ws = socket.createWebSocket();
				    // 发起websocket请求
				    WebSocketResponse(ws,requireObj);
				    // WebSocketResponse.call(ws);
				    // var a = new wr();
				    // requireObj.initEvent(ws);
				    turnOn = false;
				}else{
					// 取消之前的订阅
					switch(klineType){
						case "mline":
							KLineData.KChart.setOption({
								xAxis: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                }
					            ],
								yAxis: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                }
					            ],
								series: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                }
					            ]
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








	/*
	 * 图形操作
	 */
	// ecahrts图进行缩放
	$(window).resize(function(){
		chartResize();  // 设置单位的值
	});
	// 当鼠标滑动，信息栏修改信息数据
	KLineData.KChart.on('showTip', function (params) {
	    KLineSet.mouseHoverPoint = params.dataIndex;
	    var length = KLineData.hCategoryList.length;
	    setToolInfo(length, 'showTip');
	});
	// 鼠标滑过，出现信息框
	$("#kline_charts").bind("mouseenter", function (event) {
	    toolContentPosition(event);
	    $("#kline_tooltip").show();
	});
	$("#kline_charts").bind("mousemove", function (event) {
	    KLineSet.isHoverGraph = true;
	    $("#kline_tooltip").show();
	    toolContentPosition(event);
	});
	$("#kline_charts").bind("mouseout", function (event) {
	    KLineSet.isHoverGraph = false;
	    $("#kline_tooltip").hide();
		KLineSet.mouseHoverPoint = 0;
		initMarketTool();// 显示信息
	});
})(jQuery)


// 初始化请求参数
var KLineRequireOpt = function(option, klineType){
	var ExchangeID = option.ExchangeID?option.ExchangeID:"101",
		InstrumentID = option.InstrumentID?option.InstrumentID:"1",
		wsUrl = option.wsUrl?option.wsUrl:"ws://172.17.20.203:7681",
		stockXMlUrl = option.stockXMlUrl?option.stockXMlUrl:"http://172.17.20.203:6789/101"
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
	
/*
 * K线图构造函数
 */ 
function KCharts (dataList, isHistory){

	// console.log(dataList)
	if(dataList.length>0){
		// 解析数据
		var dataJsons = splitData(dataList, isHistory); 
		// 存储数据
		saveData(dataJsons, isHistory);
		// 画图
		chartPaint(isHistory);
		// 设置单位的值
		chartResize();	
		// 初始化并显示数据栏和数据信息框的信息
		initMarketTool();
	}else{
		 $("#kline").html("<div style='font-size:18px;margin-top: 40px;'>亲，暂时没有数据哦~~~~ ^_^</div>");
	}
}
/*
 * functions
 */
// K线图方法
function splitData(data, isHistory) {
    let k_date = [],                        // 日期
        k_day = [],                         // 星期
        k_time = [],                        // 时间
        k_categoryData = [],                // x轴分割线坐标数组
        k_values = [],                      // 二维数组：开收低高-四个数值的数组-蜡烛图
        k_valuesPercent = [],               // 二维数组：开收低高-四个百分比值-相对昨收
        k_zValues = [],                     // 涨幅-数值
        k_zValuesPercent = [],              // 涨幅-百分比
        k_volumns = [],                     // 柱形图数据-成交量
        k_amplitude = [],                   // 振幅-K线最高减去最低的值        
        k_amplPercent = [],                 // 振幅百分比-相对昨收
        week = ["日","一","二","三","四","五","六"],
        data_length = 0,
        lastClose;
    // 遍历json，将它们push进不同的数组
    
    $.each(data,function(i,object){
        if(!lastClose){
            lastClose = object.Open;                            // 上一根柱子的收盘价
        }
        let e_date = formatDate(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time,                                           //时间
            e_open = floatFixedDecimal(object.Open),             // 开
            e_highest = floatFixedDecimal(object.High),          // 高
            e_lowest = floatFixedDecimal(object.Low),            // 低
            e_price = (KLineData.lineType=="day"&&(!isHistory))?floatFixedDecimal(object.Last):floatFixedDecimal(object.Price),           // 收盘价
            e_value = [                                       // 开收低高-蜡烛图数据格式
                e_open, 
                e_price, 
                e_lowest, 
                e_highest
            ];                           
            e_valuePercent = [                                // 开收低高-百分比-相对上一根柱子的收盘价
                floatFixedDecimal((e_open-lastClose)*100/lastClose),
                floatFixedDecimal((e_price-lastClose)*100/lastClose),
                floatFixedDecimal((e_lowest-lastClose)*100/lastClose),
                floatFixedDecimal((e_highest-lastClose)*100/lastClose)
            ],

            // e_volume = (e_price-e_open)>0?[i,object.Volume,-1]:[i,object.Volume,1],       // 成交量-数组，存储索引，值，颜色对应的值                                         // 成交量
            e_zValues = lastClose?floatFixedDecimal(e_price-lastClose):0,                       // 涨幅-相对昨收      
            e_zValuesPercent = floatFixedDecimal(e_zValues*100/lastClose),                    // 涨幅百分比
            e_amplitude = floatFixedDecimal(e_highest - e_lowest),                          // 振幅
            e_amplPercent = floatFixedDecimal(100*e_amplitude/lastClose);                     // 振幅百分比
            if(data.length>2){
                e_volume = (e_price-e_open)>0?[i,object.Volume,-1]:[i,object.Volume,1];   // 成交量-数组，存储索引，值，颜色对应的值                         
            }else{
                e_volume = (e_price-e_open)>0?[KLineData.hVolumesList.length,object.Volume,-1]:[KLineData.hVolumesList.length,object.Volume,1];
            }
        switch(KLineData.lineType){
            case "minute":
                lastClose = e_price;
                e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_time);
                break;
            case "day":
                lastClose = e_price;
                KLineData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_date);
                break; 
            default:
        }

        // 每条数据存入数组中
        k_date.push(e_date);                
        k_day.push(e_day);   
        k_time.push(e_time);        
            
        k_values.push(e_value);             
        k_valuesPercent.push(e_valuePercent);
        k_volumns.push(e_volume);   
        k_zValues.push(e_zValues);
        k_zValuesPercent.push(e_zValuesPercent);
        k_amplitude.push(e_amplitude);
        k_amplPercent.push(e_amplPercent);
    });

    // 返回K线图所需数据对象
    return {
        date: k_date,                       
        day: k_day,                        
        categoryData: k_categoryData,       
        values: k_values,     
        valuesPercent: k_valuesPercent,              
        volumes: k_volumns,                 
        zValues: k_zValues,                 
        zValuePercent: k_zValuesPercent,
        amplitude: k_amplitude,
        amplPercent: k_amplPercent
    }
};
function saveData(data, isHistory){
	if(isHistory){
		KLineData.hDate = data.date;
		KLineData.hDay = data.day;
		KLineData.hCategoryList = data.categoryData;	
		KLineData.hValuesList = data.values;
		KLineData.hValuesPercentList = data.valuesPercent;
		KLineData.hVolumesList = data.volumes;
		KLineData.hZValuesList = data.zValues;
		KLineData.hZValuesListPercent = data.zValuePercent;
		KLineData.hZf = data.amplitude;
		KLineData.hZfList = data.amplPercent;
	}else{
		var n_date = data.date[0];
		var n_day = data.day[0];
		var n_category = data.categoryData[0]; 	// 最后一分钟的时间
		var n_values = data.values[0]; 			// 要存储的values
		var n_zValues = data.zValues[0];		// 涨跌
		var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
		var n_volumes = data.volumes[0];			// 成交量
		var n_valuesPercent = data.valuesPercent[0];
		var n_zf = data.amplitude[0];
		var n_zfList = data.amplPercent[0];
		var lastTime = KLineData.hCategoryList[KLineData.hCategoryList.length-1];

		// 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
		if(n_category.toString() == lastTime){

			n_volumes[0] = n_volumes[0]-1;

			KLineData.hValuesList[KLineData.hValuesList.length-1] = n_values;
			KLineData.hVolumesList[KLineData.hVolumesList.length-1] = n_volumes;
			KLineData.hZValuesList[KLineData.hZValuesList.length-1] = n_zValues;
			KLineData.hZValuesListPercent[KLineData.hZValuesListPercent.length-1] = n_zValuePercent;
			KLineData.hValuesPercentList[KLineData.hValuesPercentList.length-1] = n_valuesPercent;
			KLineData.hZf[KLineData.hZf.length-1] = n_zf;
			KLineData.hZfList[KLineData.hZfList.length-1] = n_zfList;
			// if(KLineData.isKZQAlled){
			
			// }
		}else{
			KLineData.hDate.push(n_date);
			KLineData.hDay.push(n_day);
			KLineData.hCategoryList.push(n_category);
			KLineData.hValuesList.push(n_values);
			KLineData.hVolumesList.push(n_volumes); 
			KLineData.hZValuesList.push(n_zValues);
			KLineData.hZValuesListPercent.push(n_zValuePercent);
			KLineData.hValuesPercentList.push(n_valuesPercent);
			KLineData.hZf.push(n_zf);
			KLineData.hZfList.push(n_zfList);
		};
	}
};
function chartPaint(isHistory){
	var yAxisName = null;
	if(isHistory){
		// 绘制K线图
		KLineData.KChart.setOption(option = {
		    animation: false,
		    tooltip: {
		        trigger: 'axis',
		        showContent: false
		    },
		    axisPointer: {
		        link: {xAxisIndex: 'all'},
		        label: {
		        	backgroundColor: '#777' 
		        },
	            type: 'line',
	            lineStyle:{
		        	type: 'dotted',
		        },
		        show:true,
                triggerTooltip:false
		    },
		    grid: [
		        {
		            top: "5%",
		            height: '42.4%'
		        },
		        {
		            top: '55.8%',
		            height: '9.2%'
		        },
		        // {
		        //     top: '68.8%',
		        //     height: '9.2%'
		        // }
		    ],
		    dataZoom: [
		        {
		            type: 'inside',
		            xAxisIndex: [0, 1],
		            start: 0,
		            end: 100
		        },
		        {
		            show: true,
		            xAxisIndex: [0, 1],
		            type: 'slider',
		            top: '85%',
		            start: 0,
		            end: 100,
		            handleIcon: 'path://M306.1,413c0,2.2-1.8,4-4,4h-59.8c-2.2,0-4-1.8-4-4V200.8c0-2.2,1.8-4,4-4h59.8c2.2,0,4,1.8,4,4V413z',
	        		handleSize:'110%',
	        		handleStyle:{
			            color:"#f2f2f2",
			            borderColor: "#b4b4b4"
			        },
		            dataBackground: {
		            	lineStyle: {
		            		color: "rgba(0,0,0,1)"
		            	},
		            	areaStyle: {
		            		color: "rgba(0,0,0,0)"
		            	}
		            },
		            labelFormatter: function (valueStr) {
					    return KLineData.hCategoryList[valueStr];
					},
					showDetail: true
		        },
		    ],
	        visualMap: {
		    	show: false,
	            seriesIndex: 1,
	            dimension: 2,
		        pieces: [
		            {	value: 1, 
		            	color: '#3bc25b'
		            },
		            {
		            	value: -1,
		            	color: "#e22f2a"
		            }
		        ]
		    },
		    xAxis: [
		        {
		            type: 'category',
		            data: KLineData.hCategoryList,
		            scale: true,
		            boundaryGap: true,
		            axisTick:{
                   		show:false,
                   		lineStyle: {
		            		color: "#ccc"
		            	}
                   	},
	                axisLine: { 
                    	show: false,
                    	lineStyle: { 
                    		color: '#000' 
                    	} 
                    },
		            splitLine: {
		            	show: true,
		            	interval: 15
		            },
		            axisLabel: {
		            	formatter : function(value, index){
		            		if(KLineData.lineType=="minute"){
			                		return value.split(" ")[2];
			                	}else{
			                		return value;
			                		// return value.replace(/-/g,"/");
			                	}
		            	}
		            },
		            axisPointer: {
		            	show:true,
		                label: {
			                formatter: function(params){
			                	if(KLineData.lineType=="minute" || KLineData.lineType=="day"){
			                		return params.value.replace(/-/g,"/");
			                	}else{
			                		return params.value
			                	}
			                },
			                show:true
			            }
		            }

		        },
		        {
		            type: 'category',
		            gridIndex: 1,
		            data: KLineData.hCategoryList,
		            scale: true,
		            axisTick: {
                            show:true,
                            interval: function (number, string) {
                                if (number % 30 == 0) {
                                    return true;
                                } else {
                                    return false;
                                }
                            },
                            inside:true
                        },
		            boundaryGap: true,
		            axisLine: {
		            	onZero: false,
		            	lineStyle: {
		            		color: "#999"
		            	}
		            },
		            axisLabel: {
		            	formatter : function(value, index){
		            		return value.split(" ")[2];
		            	}
		            },
		            axisPointer: {
		                label: {
			                formatter: function(params){
			                	return params.value.replace(/-/g,"/");
			                }
			            }
		            }
		        },
		    ],
		    yAxis: [
		        {
                    scale: true,
                    splitArea: {
                        show: false
                    },
                    axisTick:{
                   		show:false
                   	},
                    axisLine: { 
                    	show: false,
                    	lineStyle: { 
                    		color: '#000' 
                    	} 
                    },
                    axisLabel: {
                        formatter: function (value, index) {
                            return (value).toFixed(FieldInfo.fPriceDecimal);
                        }
                    },
                },
                {
                	name: yAxisName,
                	nameLocation: 'start',
                	nameTextStyle:{
                		align: 'right',
                		padding: [-12,30,0,0]
                	},
                	nameGap: 0,
                    scale: true,
                    gridIndex: 1,
                	min: 0,
                   	axisTick:{
                   		show:false
                   	},
                   	interval:100000000000,
                    axisLabel: {
                    	show: true,
                    	showMaxLabel : true,
                    	showMinLabel : false,
                    	onZero : true,
                        formatter: function (value, index) {
                        	var f_value = 0;
                        	if(value/100000000000>=1){
                        		yAxisName = "千亿";
                        		f_value = value/100000000000;
                        	}else if(value/10000000000>=1){
                        		yAxisName = "百亿";
                        		f_value = value/10000000000;
                        	}else if(value/1000000000>=1){
                        		yAxisName = "十亿";
                        		f_value = value/1000000000;
                        	}else if(value/100000000>=1){
                        		yAxisName = "亿";
                        		f_value = value/100000000;
                        	}else if(value/1000000>=1){
                        		yAxisName = "百万";
                        		f_value = value/1000000;
                        	}else if(value/100000>=1){
                        		yAxisName = "十万";
                        		f_value = value/100000;
                        	}else if(value/10000>=1){
                        		yAxisName = "万";
                        		f_value = value/10000;
                        	}else{
                        		yAxisName = "量";
                        		f_value = value;
                        	}
                        	setyAsixName(yAxisName);
                        	return f_value;
                        }
                    },
                    axisLine: { 
                    	show: true,
                    	lineStyle: { 
                    		color: '#999' 
                    	},
                    	onZero : true
                    },
                    splitLine: {
		            	show: false
		            },
                }
		    ],
		    series: [
		        {
		            name: 'K',
		            type: 'candlestick',
		            showSymbol: false,
                    hoverAnimation: false,
		            itemStyle: {
		                normal: {
		                    color: '#e22f2a',
		                    color0: '#3bc25b',
		                    borderColor: '#e22f2a',
		                    borderColor0: '#3bc25b'
		                },
		                emphasis: {
		                    color: 'black',
		                    color0: '#444',
		                    borderColor: 'black',
		                    borderColor0: '#444'
		                }
		            },
		            data: KLineData.hValuesList,
		            markPoint: {
		                symbolSize: 1,
		                data: [
		                    {
		                        name: 'highest value',
		                        type: 'max',
		                        valueDim: 'highest',
		                        label: {
		                            normal: {
		                                position: 'top',
		                                color: "#000"
		                            }
		                        },
		                        itemStyle: {
		                        	normal:{
		                        		color: "rgba(0,0,0,0)"
		                        	}
		                        }
		                    },
		                    {
		                        name: 'lowest value',
		                        type: 'min',
		                        valueDim: 'lowest',
		                        symbolSize: 10,
		                        label: {
		                            normal: {
		                                position: '20%',
		                                color: "#000"
		                            }
		                        },
		                        itemStyle: {
		                        	normal:{
		                        		color: "rgba(0,0,0,0)"
		                        	}
		                        }
		                    }
		                ]
		            },

		        },
		        {
		            name: 'Volume',
		            type: 'bar',
		            xAxisIndex: 1,
		            yAxisIndex: 1,
		            data: KLineData.hVolumesList,
		            itemStyle: {
			            normal: {
			                color: '#e22f2a',
		                    color0: '#3bc25b'
			            },
			            emphasis: {
			                color: '#000'
			            }
			        },
		        }
		    ]
		});
	}else{
		// 初始化并显示数据栏和数据信息框的信息
		KLineData.KChart.setOption({
			xAxis:[
				{
		            data: KLineData.hCategoryList
		        },
		        {
		            data: KLineData.hCategoryList
		        }
			],
            series: [
                {
		            data: KLineData.hValuesList,
		        },
                {
                    data: KLineData.hVolumesList
                }
            ]
        });	
	}
};
// 对单位进行重新设置
function setyAsixName(yAxisName) {
		$(".kline-unit").text(yAxisName);
};
// 初始化设置显示信息
function initMarketTool() {
	var length = KLineData.hCategoryList.length;
	if (!KLineSet.isHoverGraph || KLineSet.isHoverGraph && !KLineData.hCategoryList[KLineSet.mouseHoverPoint]) {
    	setToolInfo(length, null);
    }
};

// 根据窗口变化，调整柱状图单位的位置
function chartResize() {
	var h_w = Math.round(538/830*1000)/1000,
		top_h = Math.round(335/538*1000)/1000,
		name_width = Math.round(80/830*1000)/1000,
		k_height,
		k_width;
	var width = $(".kline").width();

	k_width = width;
	k_height = width*h_w;

	KLineData.KChart.resize({
		width: k_width,
	    height: k_height
	})

	$(".kline-charts").height(k_height).width(k_width);
	// 计算div宽度
	if(width>1000){
		$(".kline-unit").css({"width": name_width*k_width+5+"px"});
	}else if(width<450){
		$(".kline-unit").css({"width": name_width*k_width-5+"px"});
	}else if(width>300){
		$(".kline-unit").css({"width": name_width*k_width+"px"});
	}
	$(".kline-unit").css({"top": k_height*top_h-5+"px"});
};
// 信息栏数据：横幅信息和tooltip的显示
function setToolInfo(length, showTip){ 
    var setPoint;
    if(KLineSet.mouseHoverPoint>0){
    	if(KLineSet.mouseHoverPoint>length-1){
	    	KLineSet.mouseHoverPoint = length-1;
	    }else{
	    	KLineSet.mouseHoverPoint = Math.round(KLineSet.mouseHoverPoint);
	    }
    }else{
    	KLineSet.mouseHoverPoint = 0;
    }
    if(showTip){
    	setPoint = KLineSet.mouseHoverPoint;
    }else{
    	setPoint = length-1;
    }
    var countent = $("#kline");
    if (length) {
        $(".name", countent).text(FieldInfo.fName); //指数名称
        $(".date", countent).text(KLineData.hDate[setPoint].replace(/-/g,'/')); //日期
        $(".day", countent).text(KLineData.hDay[setPoint]); //星期
        // 分钟K线每根柱子都有一条时间数据
        // 日K线，只有最后一根存在当前分钟时间数据
        switch(KLineData.lineType){
            case "minute":
                $(".time", countent).text(KLineData.hCategoryList[setPoint].split(" ")[2]); //时间
                 break;
            case "day":
            	if(showTip){
            		$(".time", countent).text((KLineSet.mouseHoverPoint==length-1)?KLineData.hTime:null); //时间
            	}else{
            		$(".time", countent).text((KLineData.hTime=="00:00")?null:KLineData.hTime);
            	}
        }
        $(".open", countent).text(floatFixedDecimal(KLineData.hValuesList[setPoint][0])+"("+floatFixedTwo(KLineData.hValuesPercentList[setPoint][0])+"%)").attr("class",KLineData.hValuesPercentList[setPoint][0]>0?"open pull-right red":"open pull-right green"); //开
        $(".price", countent).text(floatFixedDecimal(KLineData.hValuesList[setPoint][1])+"("+floatFixedTwo(KLineData.hValuesPercentList[setPoint][1])+"%)").attr("class",KLineData.hValuesPercentList[setPoint][1]>0?"price pull-right red":"price pull-right green"); //收
        $(".lowest", countent).text(floatFixedDecimal(KLineData.hValuesList[setPoint][2])+"("+floatFixedTwo(KLineData.hValuesPercentList[setPoint][2])+"%)").attr("class",KLineData.hValuesPercentList[setPoint][2]>0?"lowest pull-right red":"lowest pull-right green"); //低
        $(".highest", countent).text(floatFixedDecimal(KLineData.hValuesList[setPoint][3])+"("+floatFixedTwo(KLineData.hValuesPercentList[setPoint][3])+"%)").attr("class",KLineData.hValuesPercentList[setPoint][3]>0?"highest pull-right red":"highest pull-right green"); //高
        $(".z-value", countent).text(floatFixedDecimal(KLineData.hZValuesList[setPoint])+"("+floatFixedTwo(KLineData.hZValuesListPercent[setPoint])+"%)").attr("class",KLineData.hZValuesList[setPoint]>0?"z-value pull-right red":"z-value pull-right green");   // 涨跌
        $(".volume", countent).text((KLineData.hVolumesList[setPoint][1]/10000).toFixed(2)+"万"); //量
        $(".amplitude", countent).text(floatFixedDecimal(KLineData.hZf[setPoint])+"("+floatFixedTwo(KLineData.hZfList[setPoint])+"%)");   // 振幅
        $(".price", $("#kline .kline-info")).text(floatFixedDecimal(KLineData.hValuesList[setPoint][1])); //收
        $(".z-value", $("#kline .kline-info")).text(floatFixedTwo(KLineData.hZValuesListPercent[setPoint])+"%"); //收
    }else{
        $(".name", countent).text("-");
        $(".date", countent).text("-");
        $(".day", countent).text("-");
        $(".time", countent).text("-");
        $(".open", countent).text("-");
        $(".highest", countent).text("-");
        $(".price", countent).text("-");
        $(".lowest", countent).text("-");
        $(".volume", countent).text("-");
        $(".z-value", countent).text("-");
        $(".amplitude", countent).text("-");
    }
};
// 信息框的位置： 左-右
function toolContentPosition(event) {
    var offsetX = event.offsetX;
    var continerWidth = $("#kline_charts").width(), toolContent = $("#kline_tooltip").width();
    var centerX = continerWidth / 2;
    if (offsetX > centerX) {
        $("#kline_tooltip").css("left", 83/830*continerWidth);
    } else {
        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
    }
};
// 取两位小数点
function floatFixedTwo(data) {
    return parseFloat(data).toFixed(2);
};
// 取n位小数点
function floatFixedDecimal(data) {
    return parseFloat(data).toFixed(FieldInfo.fPriceDecimal);
};