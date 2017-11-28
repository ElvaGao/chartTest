// 历史数据存储，为了添加新数据时，能够准确记录所有数据
var hDate = [],						// 日期
	hDay = [],						// 星期
	hTime = 0;						// 如果为日K线，存储最后一条时间
	hCategoryList = [],				// 横轴
	hValuesList = [],				// 值-开收低高
	hValuesPercentList = [],		// 值-对应的百分比
	hVolumesList = [],				// 成交量
	hZValuesList = [],				// 涨幅
	hZValuesListPercent = [],		// 涨幅百分比
	hZf = [],						// 振幅
	hZfList = [];					// 振幅百分比
var fieldName,						// 指数名称					
	ycPrice,						// 昨收价格
	KMChart,						// 分钟K线
	number = 200,					// K线中数据条数
	lineType;						// 存储K线类型： 日K线/分钟K线/五分钟K线/30分钟K线等

(function($){
	var KLine = function(ele, option){
		/*
		 *	默认请求日K线的上证指数
		 */
		// 日K线
		this.defaults = {
			"KQAll": {					// watch-订阅分钟快照请求---K线的波动绘制
				"MsgType":"S101",
			    "DesscriptionType":"3",
			    "ExchangeID":"101",
			    "InstrumentID":"1",
			    "Instrumenttype":"5"	// 默认订阅分钟K线 (订阅快照请求是"2",查询昨收)
			},
			"historyKQAll":{			// 一次性获取历史数据
				"MsgType": null, 		// 默认日K线：C211 (分钟K线：C213)
				"ExchangeID": "101", 
				"InstrumentID": "1", 
				"StartIndex": "-1", 
				"StartDate": "0", 
				"StartTime": "0", 
				"Count": "201" 
			}
		}
		
		switch(lineType){
			case "day":
				this.options = {
					"KQAll": {},
					"historyKQAll": {"MsgType": "C211"},
					"MKPrePriceQAll": null
				}
				break;
			case "minute":
				this.options = {
					"KQAll": {},
					"historyKQAll": {"MsgType": "C213"},
					"MKPrePriceQAll": {"Instrumenttype":"2"}    // 订阅快照请求是,查询昨收
				}
				this.options.MKPrePriceQAll = $.extend({}, this.defaults.KQAll, this.options.MKPrePriceQAll, option.MKPrePriceQAll);
				break;
			default:
		}

		this.options.KQAll = $.extend({}, this.defaults.KQAll, this.options.KQAll, option.KQAll);
		this.options.historyKQAll = $.extend({}, this.defaults.historyKQAll, this.options.historyKQAll, option.historyKQAll);
	};
	// websocket查询
	KLine.prototype = {
		WebSocket: function( KQAll, historyKQAll, MKPrePriceQAll){
			WebSocketAPI( KQAll, historyKQAll, MKPrePriceQAll);	
		}
	};
	//在插件中使用KLine对象
	$.fn.queryKLine = function(opt) {
		var option = {
			"InstrumentID": opt.InstrumentID
		}
		lineType = opt.id?opt.id:"day";
		
    	var kline = new KLine(this, option);
    	
	    return kline.WebSocket(kline.options.KQAll, kline.options.historyKQAll, kline.options.MKPrePriceQAll)
	};
	// 点击按钮查询制定图形
	$(".charts-tab li").on("click",function(){
		var id = $(this).attr("id");
		// 改变按钮样式
		$(this).addClass("active").siblings().removeClass("active");
		$("body").queryKLine({
			"id": id
		});
	});
})(jQuery)
// 初始化图形
$("body").queryKLine({
	"InstrumentID": "1501",
	"id": "minute"
});

/*
 *	请求xml文件，同时调用websocket API
 *  开始查询数据
 */
function WebSocketAPI(KQAll,historyQAll,KPrePriceQAll) {
 	var stockXMlUrl = "http://172.17.20.203:6789/101",   // xml文件地址
	// var stockXMlUrl = "http://localhost/PRO/KLine/data/ThsHttpStock.xml",   // xml文件地址
		_codeList = [],					// SECURITY列表
		xmlCode; 						// xml文件
	$.ajax({
	    url: stockXMlUrl,
	    type: 'GET',
	    dataType: 'xml',
	    async:false,
	    cache:false,
	    error: function(xml){
	        console.log("请求代码表出错");
	    },
	    success: function(xml){
	        var allZSCode =  $(xml).find("EXCHANGE PRODUCT SECURITY");
	        xmlCode = xml;
	        _codeList = allZSCode;
	        fieldName = getFieldsNameById(_codeList,KQAll.InstrumentID);// 根据id 查询指数名称
	        initEvent(KQAll,historyQAll,KPrePriceQAll);

	    }
	});
 }
/*
 * websocket连接设置
 */
// websocket请求连接设置
function WebSocketConnect(request) {
	this.ws = null;
	var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
	// var wsUrl = 'ws://103.66.33.37:80'; //生产
	// var wsUrl = 'ws://103.66.33.31:443';  //开发
	// var wsUrl = 'ws://172.17.20.203:443';  //开发
	var wsUrl = 'ws://172.17.20.203:7681'; // 开发
	// var wsUrl = 'ws://127.0.0.1';  //开发
	// var wsUrl= 'ws://103.66.33.58:80';
	// var wsUrl = 'wss://103.66.33.37:80';
	// var heartSend = {"MsgType":"C646","ExchangeID":"101","InstrumentID":"1044"};
	var timeout = 60000,//60秒
	    timeoutObj = null,
	    serverTimeoutObj = null;
	var _target = this;

	//建立socket连接
	WebSocketConnect.prototype.createWebSocket = function () {
	    try {
	        this.ws = new WebSocket(wsUrl);
	        return this.ws;
	    } catch (e) {
	        this.reconnect(wsUrl); //如果失败重连
	    }
	};
	//socket重连
	WebSocketConnect.prototype.reconnect = function () {
	    if (lockReconnect) return;
	    lockReconnect = true;
	    //没连接上会一直重连，设置延迟避免请求过多
	    setTimeout(function () {
	        var ws = _target.createWebSocket(wsUrl);
	        initEvent(ws);
	        lockReconnect = false;
	        console.log("重连中……");
	    }, 2000);
	};
	//发送请求
	WebSocketConnect.prototype.request = function (data) {
	    this.ws.send(JSON.stringify(data));
	};
	//重置心跳包
	WebSocketConnect.prototype.reset = function () {
	    clearTimeout(this.timeoutObj);
	    clearTimeout(this.serverTimeoutObj);
	    return this;
	};
	//开始心跳包
	WebSocketConnect.prototype.start = function () {
	    var self = this;
	    this.timeoutObj = setTimeout(function () {
	        //这里发送一个心跳，后端收到后，返回一个心跳消息，
	        //onmessage拿到返回的心跳就说明连接正常
	        // self.request(heartSend);
	        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
	            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
	        }, timeout)
	    }, timeout)
	};
}
// websocket请求的返回结果
function initEvent(MKQAll, historyQAll, MKPrePriceQAll) {
	var socket = new WebSocketConnect();
    var ws = socket.createWebSocket();
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
	    // socket.reset().start(); //都第一次建立连接则启动心跳包
	    if(MKPrePriceQAll){
	    	socket.request(MKPrePriceQAll);			// 订阅当前分钟内K线
	    }
		socket.request(historyQAll); 	// 查询历史数据
	};
	ws.onmessage = function (evt) {
		console.log("打开成功");

	    var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
	    $.each(jsons,function (i,o) {
	        if(o!==""){
	            var data = eval("(" + o + ")");
	            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
	            switch(MsgType)
	            {
	                case "Q619":
	                	if(!ycPrice){						// 为了获取昨收，当第一次获取到订阅参数，直接返回，中断操作
                    		ycPrice = data[0].PreClose;
	                    	return;
	                    }    					
	                    break;
	                case "Q213":    						// 订阅接口
	                   	MK_data(data);						
	                    break;
	                case "R213":   							// 分钟K线查询历史数据接口
	                	socket.request(MKQAll);				// 订阅当前分钟内K线
	                    MK_data(data, "history");						
	                    break;
	                case "R211":   							// 日K线查询历史数据接口
	                	socket.request(MKQAll);				// 订阅当前日期K线
	                	ycPrice = 0;
	                    MK_data(data, "history");						
	                    break;
	                case "Q640":
	                    $(document).trigger("Q640",data); //订阅指数的状态,用于根据该状态初始化图形;
	                case "R646":  //心跳包
	                    console.log(data);
	                default:
	            }
	        }
	    });
	    //如果获取到消息，心跳检测重置
	    //拿到任何消息都说明当前连接是正常的
	    // socket.reset().start();
	};
}

/**
 * K线绘制-日K
 * 步骤：
 * 		绘制echarts的K线图，将请求到的数据解析到K线图的数据项中;
 * 		配合鼠标滑动操作，显示日K信息;
 * 		配合键盘上线左右操作，进行缩放左右操作;
 * 接口数据格式：
 * 		{"ExchangeID":"20170727","InstrumentID":"2,"d":"[{"Date":"20170802","Time":"171040","Open":7423.660156250,"High":43.9283,"Low":23.9237,"Price":233.93,"Volume":"0","Value":"0"},{"Date":"20170802","Time":"171040","Open":7423.660156250,"High":43.9283,"Low":23.9237,"Price":233.93,"Volume":"0","Value":"0"}]}
 * 		其中d中的数据，为日K线需要的数据内容，包括：
 * 			High	最高价	
 * 			Low	    最低价	
 * 			Open	开盘价	
 * 			Price	收盘价(昨收)
 * 			Volume	成交量	
 * 			Value	成交额
 * 
 */
/*
 * 绘制K线图
 */
// 初始化分钟K线图
var MK_data = function (dataJsons, history){

	var marktToolData;
	var charthover = 0;					// 鼠标是否滑在K线图上
	var yAxisName;
	KMChart = echarts.init(document.getElementById('kline_charts'));
	var dataList = dataJsons.d?dataJsons.d:dataJsons;  
	var mouseHoverPoint = 0;
	var zoom = 10;
	var start = 0;
	var count = 0;
	var interval = 0;
	var isHoverGraph = false;
	var data = splitData(dataList, lineType); //k线数据
	//解析数据-判断传入的数据是都是第一次传入
	if(history){
		// 将请求到的数据保存到定义好的历史数组中~~
		// 更新当前数据时，需要重新绘制K线图，会用到
		hDate = data.date;
		hDay = data.day;
		hCategoryList = data.categoryData;	// 
		hValuesList = data.values;
		hValuesPercentList = data.valuesPercent;
		hVolumesList = data.volumes;
		hZValuesList = data.zValues;
		hZValuesListPercent = data.zValuePercent;
		hZf = data.amplitude;
		hZfList = data.amplPercent;

		// 截取后number条数据
		// spliceData(number);
		// 绘制K线图
		KMChart.setOption(option = {
		    animation: false,
		    tooltip: {
		        trigger: 'axis',
		        showContent: false,
		        axisPointer: {
		            type: 'cross',
		            lineStyle:{
			        	type: 'dotted',
			        }
		        },
		    },
		    axisPointer: {
		        link: {xAxisIndex: 'all'},
		        label: {
		        	backgroundColor: '#777' 
		        }
		    },
		    grid: [
		        {
		            top: "5%",
		            height: '42.4%'
		        },
		        {
		            top: '59.8%',
		            height: '9.2%'
		        }
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
					    return hCategoryList[valueStr];
					},
					showDetail: true
		        }
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
		            data: hCategoryList,
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
		            		if(lineType=="minute"){
			                		return value.split(" ")[2];
			                	}else{
			                		return value.replace(/-/g,"/");
			                	}
		            	}
		            },
		            axisPointer: {
		                z: 100,
		                label: {
			                formatter: function(params){
			                	if(lineType=="minute" || lineType=="day"){
			                		return params.value.replace(/-/g,"/");
			                	}else{
			                		return params.value
			                	}
			                }
			            }
		            }

		        },
		        {
		            type: 'category',
		            gridIndex: 1,
		            data: hCategoryList,
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
		                z: 100,
		                label: {
			                formatter: function(params){
			                	return params.value.replace(/-/g,"/");
			                }
			            }
		            },
		            axisTick: {show: false},
		            splitLine: {show: false},
		            axisLabel: {show: false},
		        }
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
                            return (value).toFixed(2);
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
                   	interval:1000000000,
                    axisLabel: {
                    	show: true,
                    	showMaxLabel : true,
                    	showMinLabel : false,
                    	onZero : true,
                        formatter: function (value, index) {
                        	var f_value = 0;
                        	if(value/100000000>=1){
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
                        	setyAsixName();
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
		            data: hValuesList,
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
		            data: hVolumesList,
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
		},true);
		// 初始化并显示数据栏和数据信息框的信息
		initMarketTool();	// 显示信息
		chartResize();
		// setyAsixName(); 	// 对单位进行重新设置
	}else{
		
		// 从data中取出推送过来的时间
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
		var lastTime = hCategoryList[hCategoryList.length-1];
		// 如果当前最后一条数据是历史数据中的最后一条，则更新最后一条数据
		// 如果当前数据不是最后一条数据，则将新数据push到数组里面

		if(n_category.toString() == lastTime){
			hValuesList[hValuesList.length-1] = n_values;
			hVolumesList[hVolumesList.length-1] = n_volumes;
			hZValuesList[hZValuesList.length-1] = n_zValues;
			hZValuesListPercent[hZValuesListPercent.length-1] = n_zValuePercent;
			hValuesPercentList[hValuesPercentList.length-1] = n_valuesPercent;
			hZf[hZf.length-1] = n_zf;
			hZfList[hZfList.length-1] = n_zfList;
		}else{
			hDate.push(n_date);
			hDay.push(n_day);
			hCategoryList.push(n_category);
			hValuesList.push(n_values);
			hVolumesList.push(n_volumes); 
			hZValuesList.push(n_zValues);
			hZValuesListPercent.push(n_zValuePercent);
			hValuesPercentList.push(n_valuesPercent);
			hZf.push(n_zf);
			hZfList.push(n_zfList);
		};

		
		// 截取后number条数据
		// spliceData(number);
		// 初始化并显示数据栏和数据信息框的信息
		KMChart.setOption({
			xAxis:[
				{
		            data: hCategoryList
		        },
		        {
		            data: hCategoryList
		        }
			],
            series: [
                {
		            data: hValuesList,
		        },
                {
                    data: hVolumesList
                }
            ]
        });
		if(!charthover){
			initMarketTool();// 显示信息
		}
		chartResize();	// 设置单位的值
	}
	// 对单位进行重新设置
	function setyAsixName(){
  		$(".kline-unit").text(yAxisName);
	}
	// ecahrts图进行缩放
	$(window).resize(function(){
		chartResize();  // 设置单位的值
	});
	// 根据窗口变化，调整柱状图单位的位置
	function chartResize(){
		var h_w = Math.round(538/830*1000)/1000,
			top_h = Math.round(362/538*1000)/1000,
			name_width = Math.round(80/830*1000)/1000,
			k_height,
			k_width;
		var width = $(".kline").width();

		k_width = width;
		k_height = width*h_w;

		KMChart.resize({
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
	}
	
	// 当鼠标滑动，信息栏修改信息数据
	KMChart.on('showTip', function (params) {
	    mouseHoverPoint = params.dataIndex;
	    
	    var length = hCategoryList.length;
	    setToolInfo(length, mouseHoverPoint, 'showTip')
	});
	// 初始化设置显示信息
	function initMarketTool() {
		var length = hCategoryList.length;
		if (!isHoverGraph || isHoverGraph && !data.values[mouseHoverPoint]) {
	    	setToolInfo(length, mouseHoverPoint, null)
	    }
	}
	/*
	 * 鼠标滑动操作
	 */
	// 鼠标滑过，出现信息框
	$("#kline_charts").bind("mouseenter", function (event) {
	    toolContentPosition(event);
	    $("#kline_tooltip").show();
	    charthover = 1;
	});
	$("#kline_charts").bind("mousemove", function (event) {
	    isHoverGraph = true;
	    toolContentPosition(event);
	    charthover = 1;
	});
	$("#kline_charts").bind("mouseout", function (event) {
	    isHoverGraph = false;
	    $("#kline_tooltip").hide();
		mouseHoverPoint = 0;
		charthover = 0;
		initMarketTool(marktToolData);// 显示信息
	});
	/*
	 * 键盘按键
	 */
	// 按键操作
	$(document).keyup(function (e) {
	    var keyCode = e.keyCode;
	    switch (keyCode) {
	        case 37:
	            move(-1, true, KMChart);
	            break; //左
	        case 38:
	            move(1,false, KMChart);
	            break;  //上
	        case 39:
	            move(1, true, KMChart);
	            break; //右
	        case 40:
	            move(-1, false, KMChart);
	            break; //下
	        default:
	            break;
	    }
	});
	// 按键对应的move函数
	function move(index, type, chart) {
	    if (type) {
	        if (mouseHoverPoint == 0 && index == -1) {
	            mouseHoverPoint = chart.getOption().series[0].data.length;
	        }
	        if (mouseHoverPoint == 0 && index == 1) {
	            index = 0;
	        }
	        if (mouseHoverPoint + index > chart.getOption().series[0].data.length - 1 && index == 1) {
	            mouseHoverPoint = 0;
	            index = 0;
	        }
	        var name = chart.getOption().series[0].name;
	        chart.dispatchAction({
	            type: 'showTip',
	            seriesIndex: 0,
	            dataIndex: mouseHoverPoint + index,
	            name: name,
	            position: ['50%', '50%']
	        });
	    } else {
	        if (index == 1) {
	            start += 10;
	            if (start > 100) {
	                start = 100;
	                return;
	            } else {
	                mouseHoverPoint = mouseHoverPoint + (count * zoom / 100);
	            }
	        } else {
	            start -= 10;
	            if (start < 0) {
	                start = 0;
	                return;
	            } else {
	                mouseHoverPoint = mouseHoverPoint - (count * zoom / 100);
	            }
	        }
	        chart.dispatchAction({
	            type: 'dataZoom',
	            // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
	            dataZoomIndex: 0,
	            // 开始位置的百分比，0 - 100
	            start: start,
	            // 结束位置的百分比，0 - 100
	            end: 100
	        })
	    }
	}
}

/**
  * public.js
  **/
/*
 * 格式化时间：utc时间   日期时间    093000 -> 09:30
 */
//格式化为utc时间
function format_momentUtc(date, time) {
    var date = formatDate(date);
    var time = formatTime(time);
    return moment(date + " " + time).utc().valueOf();
}
//格式化日期时间20170908 2017-09-08
function formatDate(date) {
    date = date.toString();
    var Y = date.substring(0, 4);
    var M = date.substring(4, 6);
    var D = date.substring(6, 8);
    return Y + "-" + M + "-" + D;
}
//093000 -> 09:30
function formatTime(time) {
    time = time.toString();
    //TODO 后台返回的数据时间没有补0
    if (time.length !== 6) {
        var diff = 6 - (time.length);
        var zero = "";
        for (var i = 0; i < diff; i++) {
            zero += "0";
        }
        time = zero + time;
    }
    var H = time.substring(0, 2);
    var m = time.substring(2, 4);
    time = H + ":" + m;
    return time;
}
/*
 * 读取xml文件
 */
// 在xml文件中通过返回的指数id,获取指数名称
function getFieldsNameById(_codeList,id){
    var name="";
    $.each(_codeList,function(){
        if($(this).attr("id") == id){
            name = $(this).attr("name")
        };
    });
    return name;
}
/*
 * json数据处理:解析json文件，返回数据对象
 */     
function splitData(data, lineType){
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
        week = ["日","一","二","三","四","五","六"];
        data_length = 0;
    // 遍历json，将它们push进不同的数组
    
    $.each(data,function(i,object){
        let e_date = formatDate(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time,                                           //时间
            e_open = floatFixedFour(object.Open),             // 开
            e_highest = floatFixedFour(object.High),          // 高
            e_lowest = floatFixedFour(object.Low),            // 低
            e_price = floatFixedFour(object.Price),           // 收盘价
            e_value = [                                       // 开收低高-蜡烛图数据格式
                e_open, 
                e_price, 
                e_lowest, 
                e_highest
            ];                           
            e_valuePercent = [                                // 开收低高-百分比-相对昨收
                getPercent(e_open,ycPrice),
                getPercent(e_price,ycPrice),
                getPercent(e_lowest,ycPrice),
                getPercent(e_highest,ycPrice)
            ],

            e_volume = (e_price-e_open)>0?[i,object.Volume,-1]:[i,object.Volume,1],       // 成交量-数组，存储索引，值，颜色对应的值                                         // 成交量
            e_zValues = ycPrice?floatFixedFour(e_price-ycPrice):0,                       // 涨幅-相对昨收      
            e_zValuesPercent = floatFixedFour(e_zValues*100/ycPrice),                    // 涨幅百分比
            e_amplitude = floatFixedFour(e_highest - e_lowest),                          // 振幅
            e_amplPercent = floatFixedFour(100*e_amplitude/ycPrice);                     // 振幅百分比
            
        switch(lineType){
            case "minute":
                e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_time);
                break;
            case "day":
                ycPrice = e_price;
                hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
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
}
// 取两位小数点
function floatFixedTwo(data){
    return parseFloat(data).toFixed(2);
}
function floatFixedFour(data){
    return parseFloat(data).toFixed(4);
}
// 计算和昨收相比的涨幅
function getPercent(data,ycPrice){
    var percent = floatFixedFour((data-ycPrice)*100/ycPrice);
    return percent;
}
// // 前number条数据截取
// function spliceData(number){
//     hDate = hDate.length>number?hDate.slice(-number):hDate;
//     hDay = hDay.length>number?hDay.slice(-number):hDay;
//     hCategoryList = hCategoryList.length>number?hCategoryList.slice(-number):hCategoryList;   
//     hValuesList = hValuesList.length>number?hValuesList.slice(-number):hValuesList;
//     hValuesPercentList = hValuesPercentList.length>number?hValuesPercentList.slice(-number):hValuesPercentList;
//     hZValuesList = hZValuesList.length>number?hZValuesList.slice(-number):hZValuesList;
//     hZValuesListPercent = hZValuesListPercent.length>number?hZValuesListPercent.slice(-number):hZValuesListPercent;
//     hZf = hZf.length>number?hZf.slice(-number):hZf;
//     hZfList = hZfList.length>number?hZfList.slice(-number):hZfList;
//     hVolumesList = hVolumesList.length>number?hVolumesList.slice(-number):hVolumesList; 

//     $.each(hVolumesList,function(i,o){
//         hVolumesList[i] = [i,hVolumesList[i][1],hVolumesList[i][2]];

//     })
    
// }

/*
 * 显示信息栏数据的信息：横幅信息和tooltip的显示
 */

var setToolInfo = function(length, mouseHoverPoint, showTip){
    var setPoint;
    if(showTip){
        setPoint = mouseHoverPoint;
    }else{
        setPoint = length-1;
    }
    var countent = $("#kline");
    if (length) {
        $(".name", countent).text(fieldName); //指数名称
        $(".date", countent).text(hDate[setPoint].replace(/-/g,'/')); //日期
        $(".day", countent).text(hDay[setPoint]); //星期
        // 分钟K线每根柱子都有一条时间数据
        // 日K线，只有最后一根存在当前分钟时间数据
        switch(lineType){
            case "minute":
                $(".time", countent).text(hCategoryList[setPoint].split(" ")[2]); //时间
                 break;
            case "day":
                $(".time", countent).text((mouseHoverPoint==length-1)?hTime:null); //时间
        }
        $(".open", countent).text(floatFixedTwo(hValuesList[setPoint][0])+"("+floatFixedTwo(hValuesPercentList[setPoint][0])+"%)").attr("class",hValuesPercentList[setPoint][0]>0?"open pull-right red":"open pull-right green"); //开
        $(".price", countent).text(floatFixedTwo(hValuesList[setPoint][1])+"("+floatFixedTwo(hValuesPercentList[setPoint][1])+"%)").attr("class",hValuesPercentList[setPoint][1]>0?"price pull-right red":"price pull-right green"); //收
        $(".lowest", countent).text(floatFixedTwo(hValuesList[setPoint][2])+"("+floatFixedTwo(hValuesPercentList[setPoint][2])+"%)").attr("class",hValuesPercentList[setPoint][2]>0?"lowest pull-right red":"lowest pull-right green"); //低
        $(".highest", countent).text(floatFixedTwo(hValuesList[setPoint][3])+"("+floatFixedTwo(hValuesPercentList[setPoint][3])+"%)").attr("class",hValuesPercentList[setPoint][3]>0?"highest pull-right red":"highest pull-right green"); //高
        $(".z-value", countent).text(floatFixedTwo(hZValuesList[setPoint])+"("+floatFixedTwo(hZValuesListPercent[setPoint])+"%)").attr("class",hZValuesList[setPoint]>0?"z-value pull-right red":"z-value pull-right green");   // 涨跌
        $(".volume", countent).text((hVolumesList[setPoint][1]/10000).toFixed(2)+"万"); //量
        $(".amplitude", countent).text(floatFixedTwo(hZf[setPoint])+"("+floatFixedTwo(hZfList[setPoint])+"%)");   // 振幅
        $(".price", $("#kline .kline-info")).text(floatFixedTwo(hValuesList[setPoint][1])); //收
        $(".z-value", $("#kline .kline-info")).text(floatFixedTwo(hZValuesListPercent[setPoint])+"%"); //收
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
}


/*
 * K线图中信息框的位置： 左-右
 */
function toolContentPosition(event) {
    var offsetX = event.offsetX;
    var continerWidth = $("#kline_charts").width(), toolContent = $("#kline_tooltip").width();
    var centerX = continerWidth / 2;
    if (offsetX > centerX) {
        $("#kline_tooltip").css("left", 83/830*continerWidth);
    } else {
        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
    }
}


// /*
//  * 前复权：复权后价格＝(复权前价格-现金红利)÷(1＋流通股份变动比例)
//  * 后复权：复权后价格＝复权前价格×(1＋流通股份变动比例)＋现金红利
//  */
// // 假设 10 转 10 派 6 
// // 假设除权时间是 14：00
// // 复权算法
// $("#toolbtn :radio").click(function(){
// 	var r_index = $(this).index();		// 是否复权 0-不复权, 2-前复权，4-后复权
// 		r_dividend = 6,     // 10股红利6
// 		r_ratio = 1,		// 股份变动比例
// 		r_time = "140000";  // 除权时间

// 	var rightValuesList = getRightValue(r_dividend,r_ratio,r_time,r_index);

// 	KMChart.setOption({
//         series: [
//             {
// 	            data: rightValuesList,
// 	        },{}
//         ]
//     });
    
// });

// // 计算复权后的值 从倒数第20点开始
// function getRightValue(dividend,ratio,time,index){
// 	var rightValueList = [];			// 关于复权
// 	var r_open,
// 		r_close,
// 		r_lowest,
// 		r_hightest,
// 		r_values = [];
// 	switch(index){
// 		case 2:
// 			$.each(hValuesList,function(i,o){
// 				if((hCategoryList[i].split(" ")[2].replace(":","")+"00")<time){
// 					r_open = (hValuesList[i][0]-dividend/10)/(1+ratio);
// 					r_close = (hValuesList[i][1]-dividend/10)/(1+ratio);
// 					r_lowest = (hValuesList[i][2]-dividend/10)/(1+ratio);
// 					r_hightest = (hValuesList[i][3]-dividend/10)/(1+ratio);
// 					r_values = [r_open,r_close,r_lowest,r_hightest];
// 					rightValueList[i] = r_values;
// 				}else{
// 					r_open = hValuesList[i][0];
// 					r_close = hValuesList[i][1];
// 					r_lowest = hValuesList[i][2];
// 					r_hightest = hValuesList[i][3];
// 					r_values = [r_open,r_close,r_lowest,r_hightest];
// 					rightValueList[i] = r_values;
// 				}
// 			});
// 			break;
// 		case 4:
// 			$.each(hValuesList,function(i,o){
// 				if((hCategoryList[i].split(" ")[2].replace(":","")+"00")>time){
// 					r_open = hValuesList[i][0]*(1+ratio) + dividend/10;
// 					r_close = hValuesList[i][1]*(1+ratio) + dividend/10;
// 					r_lowest = hValuesList[i][2]*(1+ratio) + dividend/10;
// 					r_hightest = hValuesList[i][3]*(1+ratio) + dividend/10;
// 					r_values = [r_open,r_close,r_lowest,r_hightest];
// 					rightValueList[i] = r_values;
// 				}else{
// 					r_open = hValuesList[i][0];
// 					r_close = hValuesList[i][1];
// 					r_lowest = hValuesList[i][2];
// 					r_hightest = hValuesList[i][3];
// 					r_values = [r_open,r_close,r_lowest,r_hightest];
// 					rightValueList[i] = r_values;
// 				}
// 			});
// 			break;
// 		case 0:	
// 		default:
// 			$.each(hValuesList,function(i,o){
// 				r_open = hValuesList[i][0];
// 				r_close = hValuesList[i][1];
// 				r_lowest = hValuesList[i][2];
// 				r_hightest = hValuesList[i][3];
// 				r_values = [r_open,r_close,r_lowest,r_hightest];
// 				rightValueList[i] = r_values;
// 			});	
// 	}
// 	return rightValueList;
// }