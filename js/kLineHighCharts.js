var KLineSocket,StockSocket;
var barMaxValue;
var lastClose=0;
;(function($){
	// websocket通道-查询K线
	$.queryKLine = function(option) {
		
		// 实例化websocket默认参数 
		KLineSocket = new WebSocketConnect(option);

		// 建立websocket连接，命名为ws
		KLineSocket.ws = KLineSocket.createWebSocket();
		// 点击按钮查询K线
		KLineSocket.turnOn = true;
		// 区分点击的按钮是否是当前按钮
		var lineShow = "mline";

		$("#tab li").on("click",function(){
			
			// K线类型
			var klineType = $(this).attr("id");

			if(lineShow==klineType){
				return;
			}
			lineShow = klineType;

			// 创建新的查询对象
			var KLrequireObj = new KLineRequire(option, klineType);
			KLineSocket.option = KLrequireObj.options;
			KLineSocket.HistoryData = KLrequireObj.HistoryData;
			KLineSocket.KLineSet = KLrequireObj.KLineSet;
			// 发起websocket请求
			initSocketEvent(KLineSocket, klineType);
			

			if(klineType=="mline"&&KLineSocket.turnOn){
				return;
			}else{
				lastClose = 0;
				KLineSocket.turnOn = false;
				// 取消之前的订阅
				switch(klineType){
					case "mline":
						KLineSocket.KChart.series[0].update({data:[]});
						KLineSocket.KChart.series[1].update({data:[]});

						$("#withoutData").show().siblings().hide();
						KLineSocket.getKQXQAll();
						KLineSocket.getKQXKZQAll();
						break;
					case "minute":
						KLineSocket.getKQXKZQAll();
						// 发起新请求
						KLineSocket.getHistoryKQAll();
						break;
					case "day":
						KLineSocket.getKQXQAll();
						// 发起新请求
						KLineSocket.getHistoryKQAll();
						break;
					default:;
				};
			}
		});
	};

	// websocket通道-指数/个股信息
	$.queryStockInfo = function(option){

		// 实例化请求参数
		var StockReqObj = new ReqStockInfoOpt(option);
		// 实例化websocket默认参数 
		StockSocket = new WebSocketConnect(StockReqObj.options);
		StockSocket.FieldInfo = StockReqObj.FieldInfo;
		StockSocket.turnOff = true;
		StockSocket.ws = StockSocket.createWebSocket();

		// 存储当前个股/指数信息
		reqStockInfo(StockSocket.option);
	};
})(jQuery);
function tabLi(index){
    if(index==0){
        $("#MLine").show();
        $("#kline").hide();
    }else{
        $("#kline").show();
        $("#MLine").hide();
    }
}
/*
 * websocket
 */
// 指数/个股信息参数
var ReqStockInfoOpt = function(option){
	var ExchangeID = option.ExchangeID?option.ExchangeID:"101",
		InstrumentID = option.InstrumentID?option.InstrumentID:"1",
		wsUrl = option.wsUrl?option.wsUrl:"ws://172.17.20.203:7681",
		stockXMlUrl = option.stockXMlUrl?option.stockXMlUrl:"http://172.17.20.203:6789/101";
	// 不同类型K线历史数据参数扩展对象
	var historyQAll = {};
	// 对象默认请求参数
	this.defaults = {
		wsUrl: wsUrl,
        stockXMlUrl: stockXMlUrl,
		// 订阅快照
		KKZQAll: {				
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"3",
		    Instrumenttype:"2"
		}
	};
	// 更新请求参数
	this.options = $.extend({}, this.defaults, option);
	this.FieldInfo = {
		Name: null,         		// 指数名称  ---代码表查询
		Decimal: null, 				// 小数位数
		PrePrice: null,      		// 昨收   ---今日-快照 
		Code: null
	};
};
// K线参数
var KLineRequire = function(option, klineType){
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
		// 查询历史数据
		HistoryKQAll: {			
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType: "C211",  
			StartIndex: "-1", 
			StartDate: "0", 
			Count: "200" 
		},
		// 订阅分钟K线
		KQAll: {				
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"3",
		    Instrumenttype:"5"
		},
		// 取消订阅分钟K线
		KQXQAll: {				
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"4",
		    Instrumenttype:"5"
		},
		// 订阅快照
		KKZQAll: {				
			InstrumentID: InstrumentID,
			ExchangeID: ExchangeID,
			MsgType:"S101",
		    DesscriptionType:"3",
		    Instrumenttype:"2"
		},
		// 取消订阅快照
		KQXKZQAll: {			
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
	this.HistoryData = {
		hCategoryList: [],			// 横轴
		hValuesList: [],			// 值-开收低高
		hVolumesList: []			// 成交量
	};
	this.KLineSet = {
		mouseHoverPoint: 0,			// 当前现实的数据索引
		isHoverGraph: false,        // 是否正在被hover
		zoom: 10,
		start: 0
	};
};
// websocket连接
var WebSocketConnect = function(options){
	this.wsUrl = options.wsUrl?options.wsUrl:"ws://172.17.20.203:7681";
	this.stockXMlUrl = options.stockXMlUrl?options.stockXMlUrl:"http://172.17.20.203:6789/101";
	this.ws = null;
	this.lockReconnect = false;
	this.timeout = 60000;		//60秒
	this.timeoutObj = null;
	this.serverTimeoutObj = null;
	this.option = options; 		// 将请求参数等，存储在socket中
	this.HistoryData = options.HistoryData?options.HistoryData:null; 		// 历史数据存储，为了添加新数据时，能够准确记录所有数据

    // 心跳包
	this.HeartSend = {			
		InstrumentID: options.InstrumentID,
		ExchangeID: options.ExchangeID,
		MsgType: "C646"
	};
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
					var _target = this;
				    if (_target.lockReconnect) return;
				    _target.lockReconnect = true;
				    StockSocket.turnOff = true;
				    //没连接上会一直重连，设置延迟避免请求过多
				    setTimeout(function () {
				        var ws = _target.createWebSocket(_target.wsUrl);
				        _target.ws = _target.createWebSocket(_target.wsUrl);

				        initSocketEvent(_target, _target.option.lineType);

				        _target.lockReconnect = false;
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
				        self.getHeartSend();
				        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
				            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
				        }, self.timeout)
				    }, self.timeout)
				}
};
WebSocketConnect.prototype.__proto__ = {
	// 查询历史数据
	getHistoryKQAll: 	function(){
							this.request(this.option.HistoryKQAll);
						},
	// 订阅分钟K线
	getKQAll: 			function(){
							this.request(this.option.KQAll);
						},
	// 取消订阅分钟K线
	getKQXQAll: 		function(){
							this.request(this.option.KQXQAll);
						},
	// 订阅快照
	getKKZQAll: 		function(){
							this.request(this.option.KKZQAll);
						},
	// 取消订阅快照
	getKQXKZQAll: 		function(){
							this.request(this.option.KQXKZQAll);
						},
	getHeartSend: 		function(){
							this.request(this.HeartSend);
						},
};
// websocket请求
var initSocketEvent = function(socket, klineType){

	socket.ws.onclose = function () {
					console.log("终端重连……");
				    socket.reconnect(); //终端重连
				},
	socket.ws.onerror = function () {
					console.log("报错重连……");
				    socket.reconnect(); //报错重连
				},
	socket.ws.onopen = function () {
					console.log("open");
				    //心跳检测重置
				    socket.reset().start(); 				// 第一次建立连接则启动心跳包

				    /*
				     * 个股/指数 实时数据，通过快照接口
				     * 其他数据，处理方式不同
				     */
				    // klineType-区分查询历史数据和指数/个股信息
				    if(klineType){
				    	socket.getHistoryKQAll();
				    }else{
					    StockSocket.getKKZQAll();
				    }
				},
	socket.ws.onmessage = function (evt) {

					console.log("打开成功");

				    var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
				    $.each(jsons,function (i,o) {
				        if(o!==""){
				            var data = eval("(" + o + ")");
				            var dataList = data.d?data.d:data;
				            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
				            
				            /*
						     * 个股/指数 实时数据，通过快照接口
						     * 其他数据，处理方式不同
						     */
				            // klineType-区分查询历史数据和指数/个股信息
				            switch(MsgType){
				            	case "Q619":       // 订阅快照
				            		// 页面信息接口
				            		if(!klineType){
				            			StockSocket.FieldInfo.PrePrice = data[0].PreClose;
				            			setFieldInfo(data[data.length-1]);
				            		}
				            		// K线接口
							    	if(klineType&&klineType!="mline"){
										KCharts(socket, dataList);
									}else{
										return;
									}
									break;
				                case "Q213":        // 订阅分钟线应答
					                KCharts(socket, dataList);
				                    break;
				                case "R213":        // 分钟K线历史数据查询
				                 	socket.getKQAll();	 	// 订阅当前日期K线=分钟K线
				                 	KCharts(socket, dataList, "history");
				                 	break;
				                case "R211":        // 日K线历史数据查询
				                 	socket.getKKZQAll();	 // 订阅当前日期K线=快照
				                 	KCharts(socket, dataList, "history");
				                    break;    
				                case "R646":  //心跳包
				                    // console.log(data);
				                default:
				            }
				        }
				    });
				    //如果获取到消息，心跳检测重置
				    //拿到任何消息都说明当前连接是正常的
				    socket.reset().start();
				}
};
/*
 * 详情页面 指数/个股 信息相关函数
 */
// 查询 指数/个股 相关信息
function reqStockInfo(options){
    //第一次打开终端,初始化代码表第一次默认请求
    $.ajax({
        url:  options.stockXMlUrl,
        type: 'GET',
        dataType: 'xml',
        async:false,
        cache:false,
        error: function(xml){
            console.log("请求代码表出错");
        },
        success: function(xml){
            var allZSCode =  $(xml).find("EXCHANGE PRODUCT SECURITY");
            //  获取交易名字和小数位数
            setStockInfo(allZSCode,options.InstrumentID);
            // 发起websocket请求-reqStockInfo中去写
			initSocketEvent(StockSocket); 
        }
    });
};
// 设置顶部信息  当前指数/个股 请求快照数据
function setFieldInfo(data){
    var high,low,open,zf,price,zd,zdf,dealVal,dealVol;
    if(data){
    	$("#withoutStockData").hide().siblings().show();
    	StockSocket.FieldInfo.PrePrice = data.PreClose;
        high = data.High;
        low = data.Low;
        open = data.Open;
        dealVal = data.Value;

        dealVol = data.Volume;
        // StockSocket.FieldInfo.fMarketRate = data.fMarketRate;
        // StockSocket.FieldInfo.fMarketValue = data.fMarketValue;
        // StockSocket.FieldInfo.fHSRate = data.fHSRate;
        
        price = data.Last;
        zf = floatFixedTwo((high - low)/StockSocket.FieldInfo.PrePrice*100);
        zd = price - StockSocket.FieldInfo.PrePrice;
        zdf = floatFixedTwo((zd/StockSocket.FieldInfo.PrePrice)*100);

        $.each($(".tb-fielList li"),function(index,obj){

            var spanObj = $(obj).children("span"),
                compareData = StockSocket.FieldInfo.PrePrice,
                data,
                unit;
			    switch(index){
	                case 0:
	                    data = floatFixedDecimal(high);
	                    break;
	                case 1:
	                    data = floatFixedDecimal(open);
	                    break;
	                case 2:
	                	data = floatFixedDecimal(low);
	                    break;
	                case 3:
	                	data = floatFixedDecimal(StockSocket.FieldInfo.PrePrice);
	                    compareData = false;
	                    break;
	                case 4:
	                	data = setUnit(floatFixedDecimal(dealVal));
	                    compareData = false;
	                    unit = "元";
	                    break;
	                case 5:
	                    return;
	                case 6:
	                    if(dealVol>=100){
	                		data = setUnit(dealVol/100);
	                		unit = "手";
	                	}else{
	                		data = dealVol;
	                		unit = "股";
	                	}
	                    compareData = false;
	                    break;
	                case 7:
	                    return;
	                case 8:
	                    return;
	                case 9:
	                    data = zf;
	                    compareData = false;
	                    break;
	                default:;
	            }
            
            setTextAndColor(spanObj, data, compareData, unit);
            compareData = StockSocket.FieldInfo.PrePrice;
        });

        $.each($(".tb-fn-num span"),function(index,obj){

            var spanObj = $(obj),
                compareData = StockSocket.FieldInfo.PrePrice,
                data,
                unit;
            switch(index){
                case 0:
                    data = floatFixedDecimal(price);
                    spanObj.html("<i class="+getColorName(data, compareData)+"></i>"+data);
                    break;
                case 1:
                    data = floatFixedDecimal(zd);
                    compareData = "0";
                    setTextAndColor(spanObj, data, compareData, unit);
                    break;
                case 2:
                    data = zdf;
                    compareData = "0";
                    unit = "%";
                    setTextAndColor(spanObj, data, compareData, unit);
                    break;
                default:;
            }
            compareData = StockSocket.FieldInfo.PrePrice;
        });

    }
};
// 代码表：获取 指数/个股 名称，小数位数，InstrumentCode，Code
function setStockInfo(_codeList,id){
    var fieldInsCode;
    $.each(_codeList,function(){
        if($(this).attr("id") == id){

            StockSocket.FieldInfo.Name = $(this).attr("name");
            StockSocket.FieldInfo.Decimal = $(this).parent().attr("PriceDecimal");
            // 所属市场代码
            fieldInsCode = $(this).parent().parent().attr("code");
            // 股票代码
            StockSocket.FieldInfo.Code = $(this).attr("code");
        };
    });
	$(".tb-fn-title").html("<span class=\"fl\">"+StockSocket.FieldInfo.Name+"</span><span class=\"fl\">"+StockSocket.FieldInfo.Code+"</span>");
};

/*
 * 绘制KCharts图相关函数
 */
// K线图方法
function KCharts(socket, dataList, isHistory){
    if(dataList.length>0){
        $("#withoutData").hide().siblings().show();

        // 解析/存储 数据
        var dataJsons = splitData(dataList, isHistory); 
        // 存储数据
        saveData(dataJsons, isHistory);
        // 画图
        chartPaintHighCh(isHistory);
    }
};
// 将"2017-01-01 02:03:00" 转换为时间戳 (整数)
function dateToUTC(date,time){
    var date = formatDateSplit(date);
    var time = formatTimeSec(time);
    var dataArr = date.split("-");
    var timeArr = time?time.split(":"):[0,0,0];
    dataArr[1] = dataArr[1]-1;
    
    return Date.UTC(dataArr[0],dataArr[1],dataArr[2],timeArr[0],timeArr[1],timeArr[2],0);
}
// 格式化时间：03:10
function formatTwoDigit(data){
    return (data.toString().length<2?"0"+data:data);
}
// 获取utc时间
function formatUTCToLocal(data,addTime){
    var week = ["日","一","二","三","四","五","六"];
    // 遍历json，将它们push进不同的数组
    var Y =  formatTwoDigit(data.getUTCFullYear());   

    var M = formatTwoDigit(data.getUTCMonth()+1);
    var D = formatTwoDigit(data.getUTCDate());
    var H= formatTwoDigit(data.getUTCHours());
    var MI = formatTwoDigit(data.getUTCMinutes());


    date = Y + "-" + M + "-" + D;
    var day = week[new Date(date).getDay()];
    var time = H + ":" + MI;

    if(addTime){
       date = date + " " + day + " " + time; 
    }
    return date;
}
// 绘制/画K线图
function chartPaintHighCh(isHistory){
    KLineSocket.HistoryData.seriesArr = [{
                        type: 'candlestick',
                        name: "K线",
                        data: KLineSocket.HistoryData.hValuesList,
                        dataGrouping: {
                            enabled: false
                        },
                        id: 'sz'
                    },
                    {
                        type: 'column',
                        name: 'Volume',
                        data: KLineSocket.HistoryData.hVolumesList,
                        yAxis: 1,
                        dataGrouping: {
                            enabled: false
                        }
                    }];
    if(isHistory){
        // 绘制K线图
        KLineSocket.KChart = Highcharts.stockChart('kline_charts',{
            chart : {
                backgroundColor: '#1e2131',
                zoomType: 'x',
                spacing: [20,100,20,20]
            },
            rangeSelector: {
                enabled: false
            },
            credits: {
                enabled: false
            },
            legend: {
                enabled: true,
                align: 'left',
                layout: 'horizontal',
                verticalAlign: 'top',
                floating:true,
                itemDistance: 60,
                itemMarginLeft: 25,
                itemStyle: {
                    color: "#fff", 
                    cursor: "pointer", 
                    fontSize: "0"
                },
                squareSymbol: false,
                symbolHeight:0,
                symbolWidth: 0,
            },
            tooltip: {
                split: false,
                shared: true,
                backgroundColor: "#1e2131",
                borderColor: "#264378",
                borderRadius: 5,
                style:{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "20px", 
                    pointerEvents: "none", 
                },
                useHTML: true,
                formatter: function () {

                    // 消息提示框的信息
                    var strK = "";
                    var strVolume = "";
                    var strChange = "";
                    $.each(this.points, function (i,pObj) {

                        switch(pObj.point.series.name){
                            case KLineSocket.HistoryData.seriesArr[0].name:
                                strK= "Open <i>"+pObj.point.open+"</i><br>"
                                    +"High <i>"+pObj.point.high+"</i><br>"
                                    +"Low <i>"+pObj.point.low+"</i><br>"
                                    +"Close <i>"+pObj.y+"</i><br>";
                                strChange = "% Change <i>"+0+"</i><br>";
                                break;
                            case KLineSocket.HistoryData.seriesArr[1].name:
                                strVolume = "Volume: <i>"+setUnit(pObj.y)+"</i><br>";
                                break;
                            default:;
                        }
                    });
                    $(".f-kline-info").html(strK+strVolume+strChange);

                    // tooltip消息
                    var date;
                    switch(KLineSocket.option.lineType){
                        case "minute":
                            date = formatUTCToLocal(new Date(this.points[0].x),true);
                            break;
                        case "day":
                            date = formatUTCToLocal(new Date(this.points[0].x));
                            break;
                        default:;
                    }
                    var index = $.inArray(date,KLineSocket.HistoryData.hCategoryList),
                        value = setUnit(KLineSocket.HistoryData.hValueCJEList[index]),
                        text = new Date(this.points[0].x).toLocaleDateString()+ "<br><i>"+(StockSocket.FieldInfo.Name?StockSocket.FieldInfo.Name:"")+" "+value+"</i>";
                    return text;
                },
                positioner: function (pw,ph,pos) {

                    var width = $(".highcharts-plot-background").attr("width");
                    // 消息提示框的位置
                    var fPosObj = {};
                    if(pos.plotX<width/2){
                        fPosObj = { x: width-pw+30, y: 80 };
                    }else{
                        fPosObj = { x: 0+25, y: 80 };
                    }
                    $(".f-kline-info").css({"left":fPosObj.x});

                    // tooltip的位置
                    var oWidth = $(".highcharts-label.highcharts-tooltip.highcharts-color-undefined span").width();
                    var oHeight = $(".highcharts-label.highcharts-tooltip.highcharts-color-undefined span").height();
                    var posObj = {x:pos.plotX-115,y:pos.plotY-100};
                    // 左
                    if(pos.plotX<oWidth/2+30){
                        posObj.x = pos.plotX+30;
                    }
                    // 右
                    if(pos.plotX>(width - oWidth/2 - 30)){
                        posObj.x = pos.plotX-270;
                    }
                    // 上
                    if(pos.plotY<oHeight+30){
                        posObj.y = pos.plotY+50;
                    }

                    return posObj;
                },
            },
            navigator:{
                maskFill: 'rgba(43,46,61,0.5)'
            },
            colors: KLineSocket.HistoryData.hColorList,
            plotOptions: {
                candlestick: {
                    color: '#44c96e',
                    lineColor: '#44c96e',
                    upColor: '#c23a39',
                    upLineColor: '#c23a39',
                },
                series: {
                    animation: false
                },
                column: {
                    colorByPoint: true
                }
            },
            xAxis: {
                type: 'category',
                categories: KLineSocket.HistoryData.hCategoryList,
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S.%L',
                    second: '%H:%M:%S',
                    minute: '%H:%M',
                    hour: '%H:%M',
                    day: '%m-%d',
                    week: '%m-%d',
                    month: '%y-%m',
                    year: '%Y'
                },
                labels: {
                    // align: 'left',
                    rotation: 0,
                    x: 0,
                    style:{
                        color: "#999",
                        fontSize: 20
                    },
                    // formatter: function(){
                        // console.log(KLineSocket.HistoryData.hValuesList)
                        // var date,index;
                        // switch(KLineSocket.option.lineType){
                        //     case "minute":
                        //         date = formatUTCToLocal(new Date(this.value),true);
                        //         index = $.inArray(date,KLineSocket.HistoryData.hCategoryList);
                        //         date = date.split(" ")[2];
                        //         break;
                        //     case "day":
                        //         date = formatUTCToLocal(new Date(this.value));
                        //         index = $.inArray(date,KLineSocket.HistoryData.hCategoryList);
                        //         // console.log(date,index,KLineSocket.HistoryData.hCategoryList)
                        //         date = date.split("-")[1]+"-"+date.split("-")[2];
                        //         break;
                        //     default:;
                        // }
                        // console.log(index);
                        // if(index!=-1){  
                            // console.log(index); 
                        //     return date;
                        // }else{
                            // console.log(index);
                            // return;
                        // }
                        
                    // }
                },
                resize: {
                    enabled: true
                },
                tickWidth:0,
                crosshair:{
                    color: "#a9a9ad",
                    dashStyle: 'dash'
                }
            },
            yAxis: [{
                labels: {
                    align: 'left',
                    x: 10,
                    style:{
                        color: "#999",
                        fontSize: 20
                    },
                    formatter: function(){
                        return floatFixedDecimal(this.value);
                    }
                },
                title: {
                    text: '    '
                },
                height: '65%',
                resize: {
                    enabled: true
                },
                lineWidth: 1,
                lineColor: '#2b2f3f',
                gridLineWidth: 1,
                gridLineColor: '#2b2f3f',
                crosshair:{
                    color: "#a9a9ad",
                    dashStyle: 'dash',
                    label: {
                        enabled: true,
                        format: "{value:."+StockSocket.FieldInfo.Decimal+"f}"
                    }
                },
                enabled: false
            }, {
                labels: {
                    enabled: false,
                    align: 'right',
                    x: -3
                },
                title: {
                    text: '    '
                },
                top: '65%',
                height: '35%',
                offset: 0,
                lineWidth: 1,
                lineColor: '#2b2f3f',
                gridLineWidth: 1,
                gridLineColor: '#2b2f3f'
            }],
            series: KLineSocket.HistoryData.seriesArr
        });
        /*
         * legend
         */
        // 写入legend标签
        setLegendButton();
    }else{
        // 更新
        $.each(KLineSocket.KChart.series,function(i,sObj){
            $.each(KLineSocket.HistoryData.seriesArr,function(j,sArrObj){
                if(sObj.name==sArrObj.name){
                    // console.log()
                    sObj.update(sArrObj,true,false);
                }
            });
        });
    }
};
// 解析获取到的数据
function splitData(data, isHistory) {
    let k_categoryData = [],                // x轴分割线坐标数组
        k_values = [],                      // 二维数组：开收低高-四个数值的数组-蜡烛图
        k_volumns = [],                     // 柱形图数据-成交量
        week = ["日","一","二","三","四","五","六"],
        k_colors=[],
        k_valueCJE = [];
    // 遍历json，将它们push进不同的数组
    
    $.each(data,function(i,object){
        
        let e_date = formatDateSplit(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time;  

        switch(KLineSocket.option.lineType){
            case "minute":
                e_time_category = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_time_category);
                e_time = dateToUTC(object.Date,(object.Time/100000>=1)?object.Time:("0"+object.Time)); 
                break;
            case "day":
                KLineSocket.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_date);
                e_time = dateToUTC(object.Date,0);
                break; 
            default:;
        } 

        let e_open = (object.Open),          // 开
            e_highest = (object.High),       // 高
            e_lowest = (object.Low),         // 低
            e_price = (KLineSocket.option.lineType=="day"&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
            e_value = [                                       // 开收低高-蜡烛图数据格式
                e_time,
                Number(e_open),
                Number(e_highest),
                Number(e_lowest), 
                Number(e_price)
            ],
            e_volumnData = object.Volume,                              // 成交量---单位：股
            e_valueCJE = (object.Value),
            e_colors = (e_price-e_open)>0?'#c23a39':'#44c96e',
            e_volume = [e_time,Number(e_volumnData)];   // 成交量-数组，存储索引，值，颜色对应的值

        // 每条数据存入数组中
        k_values.push(e_value);             
        k_volumns.push(e_volume);   
        k_colors.push(e_colors);
        k_valueCJE.push(e_valueCJE)
    });

    // 返回K线图所需数据对象
    return {                        
        categoryData: k_categoryData,       
        values: k_values,                 
        volumes: k_volumns,             
        colors: k_colors,
        valueCJE: k_valueCJE
    }
};
// 保存获取的数据到相对应的数据中，存入数据对象
function saveData(data, isHistory){
    if(isHistory){
        KLineSocket.HistoryData.hCategoryList = data.categoryData;    
        KLineSocket.HistoryData.hValuesList = data.values;
        KLineSocket.HistoryData.hValuesPercentList = data.valuesPercent;
        KLineSocket.HistoryData.hVolumesList = data.volumes;
        KLineSocket.HistoryData.hZValuesList = data.zValues;
        KLineSocket.HistoryData.hZValuesListPercent = data.zValuePercent;
        KLineSocket.HistoryData.hZf = data.amplitude;
        KLineSocket.HistoryData.hZfList = data.amplPercent;
        KLineSocket.HistoryData.hColorList = data.colors;
        KLineSocket.HistoryData.hValueCJEList = data.valueCJE;
    }else{
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_volumes = data.volumes[0];            // 成交量
        var lastTime = KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1];
        var n_colorList = data.colors[0];
        var n_valueCJE = data.valueCJE[0];

        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1] = n_values;
            KLineSocket.HistoryData.hVolumesList[KLineSocket.HistoryData.hVolumesList.length-1] = n_volumes;
            KLineSocket.HistoryData.hColorList[KLineSocket.HistoryData.hColorList.length-1] = n_colorList;
            KLineSocket.HistoryData.hValueCJEList[KLineSocket.HistoryData.hValueCJEList.length-1] = n_valueCJE;
        }else{
            KLineSocket.HistoryData.hCategoryList.push(n_category);
            KLineSocket.HistoryData.hValuesList.push(n_values);
            KLineSocket.HistoryData.hVolumesList.push(n_volumes); 
            KLineSocket.HistoryData.hColorList.push(n_colorList);
            KLineSocket.HistoryData.hValueCJEList.push(n_valueCJE);
        };
    }
};
// 设置legend button
function setLegendButton(){
    var text="";
    $.each(KLineSocket.KChart.legend.allItems,function(i,obj){
        text = text+"<li>"+obj.name+"<span>+</span></li>";
    });
    $(".f-legend").html(text);
    $("#kline_charts>div").append("<div class=\"f-kline-info\"></div>");

    // 点击legend-button标签
    $(".f-legend li span").click(function(){
        // 点击的标签内容
        var seriesName = $(this).parent().text().replace("+","");
        // 删除按钮功能
        if($(this).parent().attr("class")!="remove"){
            $.each(KLineSocket.KChart.series,function(i){
                if(this.name==seriesName){
                    KLineSocket.KChart.series[i].remove(true);
                }
            });
            $(this).parent("li").addClass("remove");
        }else{
            // 添加按钮功能
            $.each(KLineSocket.HistoryData.seriesArr,function(i){
                if(seriesName==KLineSocket.HistoryData.seriesArr[i].name){
                    KLineSocket.KChart.addSeries(KLineSocket.HistoryData.seriesArr[i]);
                }
            });
            $(this).parent("li").removeClass("remove");
        }
    });
    $("#kline_charts > div").mouseover(function(){
        $(".f-kline-info").show()
    });
    $("#kline_charts > div").mouseout(function(){
        $(".f-kline-info").hide()
    });
}