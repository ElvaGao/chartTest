// 历史数据存储，为了添加新数据时，能够准确记录所有数据
var KLineData = {
	FieldName: null,				// 指数名称		
	KChart: echarts.init(document.getElementById('kline_charts')),	
	kchartsObj: null,
	isQAlled: false,				
	day: {							// 日K线
		hDate: [],					// 日期
		hDay: [],					// 星期
		hCategoryList: [],			// 横轴
		hValuesList: [],			// 值-开收低高
		hValuesPercentList: [],		// 值-对应的百分比
		hVolumesList: [],			// 成交量
		hZValuesList: [],			// 涨幅
		hZValuesListPercent: [],	// 涨幅百分比
		hZf: [],					// 振幅
		hZfList: []					// 振幅百分比
	},
	minute: {						// 分钟K线
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
	}
}
// var KMChart = ;	// K线容器
var socket;
var requireLocked = false;
var lineType = "day";
(function($){

	// 查询参数
	$.KLineRequire = function(option, lineType){

		// 订阅分钟K线
		this.defaults = {
			KQAll: {
				MsgType:"S101",
			    DesscriptionType:"3",
			    ExchangeID:"101",
			    InstrumentID:"1",
			    Instrumenttype:"5"
			},
			// 心跳包
			HeartSend: {
				MsgType: "C646",
		    	ExchangeID: "101",
		    	InstrumentID: "1"
			},
			// 初始参数
			HistoryKQAll: {
				MsgType: "C211", 		
				ExchangeID: "101", 
				InstrumentID: "1", 
				StartIndex: "-1", 
				StartDate: "0", 
				Count: "201" 
			}
		};
		var historyQAll = {}
		// 不同类型K线设置不同参数
		switch(lineType){
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
		}
		// 查询的参数
		this.KQAll = $.extend(
			{}, 
			this.defaults.KQAll, 
			option
		);
		this.HistoryKQAll = $.extend(
			{}, 
			this.defaults.HistoryKQAll, 
			historyQAll, 
			option
		);
		this.HeartSend = $.extend(
			{}, 
			this.defaults.HeartSend, 
			option
		);
	}
	// 查询方法
	$.KLineRequire.prototype = {
		// 请求xml文件
		requireXml: 	function( InstrumentID ) {
							var ele = this,
								xmlData = {},
								xmlCodes = {
									stockXMlUrl: "http://172.17.20.203:6789/101",	// xml文件地址
									_codeList: [],			// SECURITY列表
									xmlCode: null			// xml文件
								};	
												
							$.ajax({
							    url: xmlCodes.stockXMlUrl,
							    type: 'GET',
							    dataType: 'xml',
							    async:false,
							    cache:false,
							    error: function(xml){
							        console.log("请求代码表出错");
							    },
							    success: function(xml){
							        xmlCodes.xmlCode = xml;
							        xmlCodes._codeList = $(xmlCodes.xmlCode).find("EXCHANGE PRODUCT SECURITY");;
							        xmlData = {
							        	FieldName: ele.getFieldsNameById(xmlCodes._codeList, InstrumentID) 	// 根据id 查询指数名称
							        }
							    }
							});
							
							return xmlData;
						},
		// 在xml文件中通过返回的指数id,获取指数名称
		getFieldsNameById: 	function(_codeList,id){
							    var name="";
							    $.each(_codeList,function(){
							        if($(this).attr("id") == id){
							            name = $(this).attr("name")
							        };
							    });
							    return name;
							},
		// websocket请求连接
		WebSocketConnect: 	function (klineReqJsons) {	
								this.ws = null;
								var lockReconnect = false,
									wsUrl = 'ws://172.17.20.203:7681',
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
								this.reconnect = function () {
								    if (lockReconnect) return;
								    lockReconnect = true;
								    //没连接上会一直重连，设置延迟避免请求过多
								    setTimeout(function () {
								        var ws = _target.createWebSocket(wsUrl);

								        klineReqJsons[lineType].initEvent(ws, klineReqJsons);

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
								        //onmessage拿到返回的心跳就说明连接正常
								        // self.request(klineObj[lineType].HeartSend);
								        // self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
								        //     self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
								        // }, timeout)
								    }, timeout)
								};
							},
		// websocket应答				
		initEvent: 	function(ws, klineReqJsons) {
						var klineOpt = this?this:"";
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
						    // socket.reset().start(); 				// 第一次建立连接则启动心跳包
	
							// 查询历史数据
							$.each(klineReqJsons, function(i,obj){
								socket.request(obj.HistoryKQAll);
							})

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
						                case "Q213":        // 订阅分钟线应答
						                	var dataJsons = splitData(dataList, "minute");
						                	saveData(dataJsons, "minute");
						                	var dataJsons1 = splitData(dataList, "day"); 
											saveData(dataJsons1, "day");
											if(!KLineData.kchartsObj){
						                 		KLineData.kchartsObj = new $.KCharts();
						                 	}else{
						                 		KLineData.kchartsObj.chartPaint();
						                 	}
						                   	
						                   	// KLineData.kchartsObj = new $.KCharts(data, lineType, "history");							
						                    break;
						                case "R213":        // 分钟K线历史数据查询
						                 	if(!KLineData.isQAlled){
						                 		socket.request(klineOpt.KQAll);	 // 订阅当前日期K线
						                 		KLineData.isQAlled = true;
						                 	}
						                 	// 解析并存储数据
											var dataJsons = splitData(dataList, "minute"); 
											saveData(dataJsons, "minute", "history");
						                 	// 绘制K线	
						                 	if(lineType=="minute"){
							                 	if(!KLineData.kchartsObj){
							                 		KLineData.kchartsObj = new $.KCharts("history");
							                 	}else{
							                 		KLineData.kchartsObj.chartPaint("history");
							                 	}
						                 	}
						                 		
						                 	break;
						                case "R211":        // 日K线历史数据查询
						                	if(!KLineData.isQAlled){
						                 		socket.request(klineOpt.KQAll);	 // 订阅当前日期K线
						                 		KLineData.isQAlled = true;
						                 	}
						                    // 解析并存储数据
											var dataJsons = splitData(dataList, "day"); 
											saveData(dataJsons, "day", "history");
						                 	// 绘制K线
						                 	if(lineType=="day"){
							                 	if(!KLineData.kchartsObj){
							                 		KLineData.kchartsObj = new $.KCharts("history");
							                 	}else{
							                 		KLineData.kchartsObj.chartPaint("history");
							                 	}
						                 	}
						                    		
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
					}

	}




	function splitData(data, lineType) {
		var ele = this; 
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
	            e_valuePercent = [                                // 开收低高-百分比-相对上一根柱子的收盘价
	                floatFixedFour((e_open-lastClose)*100/lastClose),
	                floatFixedFour((e_price-lastClose)*100/lastClose),
	                floatFixedFour((e_lowest-lastClose)*100/lastClose),
	                floatFixedFour((e_highest-lastClose)*100/lastClose)
	            ],

	            // e_volume = (e_price-e_open)>0?[i,object.Volume,-1]:[i,object.Volume,1],       // 成交量-数组，存储索引，值，颜色对应的值                                         // 成交量
	            e_zValues = lastClose?floatFixedFour(e_price-lastClose):0,                       // 涨幅-相对昨收      
	            e_zValuesPercent = floatFixedFour(e_zValues*100/lastClose),                    // 涨幅百分比
	            e_amplitude = floatFixedFour(e_highest - e_lowest),                          // 振幅
	            e_amplPercent = floatFixedFour(100*e_amplitude/lastClose);                     // 振幅百分比
	            if(data.length>2){
	                e_volume = (e_price-e_open)>0?[i,object.Volume,-1]:[i,object.Volume,1];   // 成交量-数组，存储索引，值，颜色对应的值                         
	            }else{
	                e_volume = (e_price-e_open)>0?[KLineData[lineType].hVolumesList.length-1,object.Volume,-1]:[KLineData[lineType].hVolumesList.length-1,object.Volume,1];
	            }
	        switch(lineType){
	            case "minute":
	                lastClose = e_price;
	                e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
	                k_categoryData.push(e_time);
	                break;
	            case "day":
	                lastClose = e_price;
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
	};
	function saveData(data, lineType, isHistory){
		if(isHistory){
			KLineData[lineType].hDate = data.date;
			KLineData[lineType].hDay = data.day;
			KLineData[lineType].hCategoryList = data.categoryData;	// 
			KLineData[lineType].hValuesList = data.values;
			KLineData[lineType].hValuesPercentList = data.valuesPercent;
			KLineData[lineType].hVolumesList = data.volumes;
			KLineData[lineType].hZValuesList = data.zValues;
			KLineData[lineType].hZValuesListPercent = data.zValuePercent;
			KLineData[lineType].hZf = data.amplitude;
			KLineData[lineType].hZfList = data.amplPercent;
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
			var lastTime = KLineData[lineType].hCategoryList[KLineData[lineType].hCategoryList.length-1];
			// 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
			if(n_category.toString() == lastTime){
				KLineData[lineType].hValuesList[KLineData[lineType].hValuesList.length-1] = n_values;
				KLineData[lineType].hVolumesList[KLineData[lineType].hVolumesList.length-1] = n_volumes;
				KLineData[lineType].hZValuesList[KLineData[lineType].hZValuesList.length-1] = n_zValues;
				KLineData[lineType].hZValuesListPercent[KLineData[lineType].hZValuesListPercent.length-1] = n_zValuePercent;
				KLineData[lineType].hValuesPercentList[KLineData[lineType].hValuesPercentList.length-1] = n_valuesPercent;
				KLineData[lineType].hZf[KLineData[lineType].hZf.length-1] = n_zf;
				KLineData[lineType].hZfList[KLineData[lineType].hZfList.length-1] = n_zfList;
			}else{
				KLineData[lineType].hDate.push(n_date);
				KLineData[lineType].hDay.push(n_day);
				KLineData[lineType].hCategoryList.push(n_category);
				KLineData[lineType].hValuesList.push(n_values);
				KLineData[lineType].hVolumesList.push(n_volumes); 
				KLineData[lineType].hZValuesList.push(n_zValues);
				KLineData[lineType].hZValuesListPercent.push(n_zValuePercent);
				KLineData[lineType].hValuesPercentList.push(n_valuesPercent);
				KLineData[lineType].hZf.push(n_zf);
				KLineData[lineType].hZfList.push(n_zfList);
			};


		}
	};
	// 取两位小数点
	function floatFixedFour(data) {
	    return parseFloat(data).toFixed(4);
	};
	//格式化日期时间20170908 2017-09-08
	function formatDate(date) {
	    date = date.toString();
	    var Y = date.substring(0, 4);
	    var M = date.substring(4, 6);
	    var D = date.substring(6, 8);
	    return Y + "-" + M + "-" + D;
	};
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
	};




	// K线图构造函数
	$.KCharts = function (isHistory){
		var ele = this;
		var KChartsOpt = {
			mouseHoverPoint: 0,
			isHoverGraph: false
		}
		// 解析数据-判断传入的数据是都是第一次传入
		ele.chartPaint(isHistory);
		// 初始化并显示数据栏和数据信息框的信息
		ele.initMarketTool(KChartsOpt);
		ele.chartResize();	// 设置单位的值
		
		// ecahrts图进行缩放
		$(window).resize(function(){
			ele.chartResize();  // 设置单位的值
		});
		// 当鼠标滑动，信息栏修改信息数据
		KLineData.KChart.on('showTip', function (params) {
		    KChartsOpt.mouseHoverPoint = params.dataIndex;
		    var length = KLineData[lineType].hCategoryList.length;
		    ele.setToolInfo(length, KChartsOpt.mouseHoverPoint, 'showTip')
		});
		// 鼠标滑过，出现信息框
		$("#kline_charts").bind("mouseenter", function (event) {
		    ele.toolContentPosition(event);
		    $("#kline_tooltip").show();
		});
		$("#kline_charts").bind("mousemove", function (event) {
		    KChartsOpt.isHoverGraph = true;
		    ele.toolContentPosition(event);
		});
		$("#kline_charts").bind("mouseout", function (event) {
		    KChartsOpt.isHoverGraph = false;
		    $("#kline_tooltip").hide();
			KChartsOpt.mouseHoverPoint = 0;
			ele.initMarketTool(KChartsOpt);// 显示信息
		});
		// 按键操作
		$(document).keyup(function (e) {
		    var keyCode = e.keyCode;
		    switch (keyCode) {
		        case 37:
		            ele.move(-1, true, KLineData.KChart, KChartsOpt);
		            break; //左
		        case 38:
		            ele.move(1,false, KLineData.KChart, KChartsOpt);
		            break;  //上
		        case 39:
		            ele.move(1, true, KLineData.KChart, KChartsOpt);
		            break; //右
		        case 40:
		            ele.move(-1, false, KLineData.KChart, KChartsOpt);
		            break; //下
		        default:
		            break;
		    }
		});
		
	}
	// K线图方法
	$.KCharts.prototype = {
		chartPaint: function( isHistory){
						var ele = this;
						var yAxisName = null;
						if(isHistory){
							// 绘制K线图
							KLineData.KChart.setOption(option = {
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
										    return KLineData[lineType].hCategoryList[valueStr];
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
							            data: KLineData[lineType].hCategoryList,
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
							            data: KLineData[lineType].hCategoryList,
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
					                        	ele.setyAsixName(yAxisName);
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
							            data: KLineData[lineType].hValuesList,
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
							            data: KLineData[lineType].hVolumesList,
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
							            data: KLineData[lineType].hCategoryList
							        },
							        {
							            data: KLineData[lineType].hCategoryList
							        }
								],
					            series: [
					                {
							            data: KLineData[lineType].hValuesList,
							        },
					                {
					                    data: KLineData[lineType].hVolumesList
					                }
					            ]
					        });	
						}
					},
		// 对单位进行重新设置
		setyAsixName:   function(yAxisName) {
					  		$(".kline-unit").text(yAxisName);
						},
		// 初始化设置显示信息
		initMarketTool:  function(KChartsOpt) {
							var length = KLineData[lineType].hCategoryList.length;
							if (!KChartsOpt.isHoverGraph || KChartsOpt.isHoverGraph && !data.values[KChartsOpt.mouseHoverPoint]) {
						    	this.setToolInfo(length, KChartsOpt.mouseHoverPoint, null)
						    }
						},
		// 按键对应的move函数
		move:  	function(index, type, chart, KChartsOpt) {
					var zoom = 10,
						start = 0,
						count = 0;
				    if (type) {
				        if (KChartsOpt.mouseHoverPoint == 0 && index == -1) {
				            KChartsOpt.mouseHoverPoint = chart.getOption().series[0].data.length;
				        }
				        if (KChartsOpt.mouseHoverPoint == 0 && index == 1) {
				            index = 0;
				        }
				        if (KChartsOpt.mouseHoverPoint + index > chart.getOption().series[0].data.length - 1 && index == 1) {
				            KChartsOpt.mouseHoverPoint = 0;
				            index = 0;
				        }
				        var name = chart.getOption().series[0].name;
				        chart.dispatchAction({
				            type: 'showTip',
				            seriesIndex: 0,
				            dataIndex: KChartsOpt.mouseHoverPoint + index,
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
				                KChartsOpt.mouseHoverPoint = KChartsOpt.mouseHoverPoint + (count * zoom / 100);
				            }
				        } else {
				            start -= 10;
				            if (start < 0) {
				                start = 0;
				                return;
				            } else {
				                KChartsOpt.mouseHoverPoint = KChartsOpt.mouseHoverPoint - (count * zoom / 100);
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
				},
		// 根据窗口变化，调整柱状图单位的位置
		chartResize: 	function () {
							var h_w = Math.round(538/830*1000)/1000,
								top_h = Math.round(362/538*1000)/1000,
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
						},
		// 信息栏数据：横幅信息和tooltip的显示
		setToolInfo: 	function(length, mouseHoverPoint, showTip){ 
						    var setPoint,
						        ele = this;
						    if(showTip){
						        setPoint = mouseHoverPoint;
						    }else{
						        setPoint = length-1;
						    }
						    var countent = $("#kline");
						    if (length) {
						        $(".name", countent).text(KLineData.FieldName); //指数名称
						        $(".date", countent).text(KLineData[lineType].hDate[setPoint].replace(/-/g,'/')); //日期
						        $(".day", countent).text(KLineData[lineType].hDay[setPoint]); //星期
						        // 分钟K线每根柱子都有一条时间数据
						        // 日K线，只有最后一根存在当前分钟时间数据
						        switch(lineType){
						            case "minute":
						                $(".time", countent).text(KLineData[lineType].hCategoryList[setPoint].split(" ")[2]); //时间
						                 break;
						            case "day":
						                $(".time", countent).text((mouseHoverPoint==length-1)?KLineData[lineType].hTime:null); //时间
						        }
						        $(".open", countent).text(ele.floatFixedTwo(KLineData[lineType].hValuesList[setPoint][0])+"("+ele.floatFixedTwo(KLineData[lineType].hValuesPercentList[setPoint][0])+"%)").attr("class",KLineData[lineType].hValuesPercentList[setPoint][0]>0?"open pull-right red":"open pull-right green"); //开
						        $(".price", countent).text(ele.floatFixedTwo(KLineData[lineType].hValuesList[setPoint][1])+"("+ele.floatFixedTwo(KLineData[lineType].hValuesPercentList[setPoint][1])+"%)").attr("class",KLineData[lineType].hValuesPercentList[setPoint][1]>0?"price pull-right red":"price pull-right green"); //收
						        $(".lowest", countent).text(ele.floatFixedTwo(KLineData[lineType].hValuesList[setPoint][2])+"("+ele.floatFixedTwo(KLineData[lineType].hValuesPercentList[setPoint][2])+"%)").attr("class",KLineData[lineType].hValuesPercentList[setPoint][2]>0?"lowest pull-right red":"lowest pull-right green"); //低
						        $(".highest", countent).text(ele.floatFixedTwo(KLineData[lineType].hValuesList[setPoint][3])+"("+ele.floatFixedTwo(KLineData[lineType].hValuesPercentList[setPoint][3])+"%)").attr("class",KLineData[lineType].hValuesPercentList[setPoint][3]>0?"highest pull-right red":"highest pull-right green"); //高
						        $(".z-value", countent).text(ele.floatFixedTwo(KLineData[lineType].hZValuesList[setPoint])+"("+ele.floatFixedTwo(KLineData[lineType].hZValuesListPercent[setPoint])+"%)").attr("class",KLineData[lineType].hZValuesList[setPoint]>0?"z-value pull-right red":"z-value pull-right green");   // 涨跌
						        $(".volume", countent).text((KLineData[lineType].hVolumesList[setPoint][1]/10000).toFixed(2)+"万"); //量
						        $(".amplitude", countent).text(ele.floatFixedTwo(KLineData[lineType].hZf[setPoint])+"("+ele.floatFixedTwo(KLineData[lineType].hZfList[setPoint])+"%)");   // 振幅
						        $(".price", $("#kline .kline-info")).text(ele.floatFixedTwo(KLineData[lineType].hValuesList[setPoint][1])); //收
						        $(".z-value", $("#kline .kline-info")).text(ele.floatFixedTwo(KLineData[lineType].hZValuesListPercent[setPoint])+"%"); //收
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
						},
		// 信息框的位置： 左-右
		toolContentPosition: 	function(event) {
								    var offsetX = event.offsetX;
								    var continerWidth = $("#kline_charts").width(), toolContent = $("#kline_tooltip").width();
								    var centerX = continerWidth / 2;
								    if (offsetX > centerX) {
								        $("#kline_tooltip").css("left", 83/830*continerWidth);
								    } else {
								        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
								    }
								},
		// 取两位小数点
		floatFixedTwo: 		function(data) {
							    return parseFloat(data).toFixed(2);
							},
	};

	//在插件中使用KLine对象
	$.queryKLine = function(opt) {
		// K线id和类型： 日K线/分钟K线/五分钟K线/30分钟K线等 --如果没传值，默认日K线
		var id = opt.InstrumentID?opt.InstrumentID:"1";
		lineType = opt.id?opt.id:"day";

		// 将要查询的K线对象初始化   日K线 or 分钟K线  对象
		var list = ["day","minute"];
	    var klineReqJsons = {};  	// 所有请求
	    $.each(list,function(i,o){
    		var klineObj = new $.KLineRequire({"InstrumentID": id}, list[i]);
			klineReqJsons[list[i]] = klineObj;
		});


    	var klineObj = klineReqJsons[lineType];
		// 请求xml数据，获取指数名称
	    var xmlData = klineObj.requireXml(id);
	    KLineData.FieldName = xmlData.FieldName;
	    // Websocket实例
	    socket = new klineObj.WebSocketConnect(klineReqJsons);
	    var ws = socket.createWebSocket();
	    // 发起websocket请求
		klineObj.initEvent(ws, klineReqJsons);


	};

	// 点击按钮查询制定图形
	$(".charts-tab li").on("click",function(){
		var id = $(this).attr("id");
		// 改变按钮样式
		$(this).addClass("active").siblings().removeClass("active");
		// 初始化图形
		lineType = id;

		KLineData.kchartsObj.chartPaint("history");

		// $.queryKLine({
		// 	"id": id
		// });
	});


})(jQuery)


// 初始化图形
$.queryKLine({
	"InstrumentID": "1508",
	"id": "day"
});