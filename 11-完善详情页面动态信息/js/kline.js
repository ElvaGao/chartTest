// 历史数据存储，为了添加新数据时，能够准确记录所有数据
var KLineData = {
	FieldName: null,			// 指数名称		
	PriceDecimal: 2,			// 保留小数位数
	KChart: echarts.init(document.getElementById('kline_charts')),	// K线绘制对象
	lineType: "day",			// K线类型
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
}
var socket;
var klineObj;
var ws;
(function($){

	// 查询参数
	$.KLineRequire = function(option){

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
			},
			KKZQAll: {
				MsgType:"S101",
			    DesscriptionType:"3",
			    ExchangeID:"101",
			    InstrumentID:"1",
			    Instrumenttype:"2"
			},
			KQXKZQAll: {			// 取消订阅快照
				MsgType:"S101",
			    DesscriptionType:"4",
			    ExchangeID:"101",
			    InstrumentID:"1",
			    Instrumenttype:"2"
			},
			KQXQAll: {				// 取消订阅分钟K线
				MsgType:"S101",
			    DesscriptionType:"4",
			    ExchangeID:"101",
			    InstrumentID:"1",
			    Instrumenttype:"5"
			}
		};
		var historyQAll = {};
		// 不同类型K线设置不同参数
		switch(KLineData.lineType){
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
		this.KKZQAll = $.extend(
			{}, 
			this.defaults.KKZQAll, 
			option
		);
		this.KQXKZQAll = $.extend(
			{}, 
			this.defaults.KQXKZQAll, 
			option
		);
		this.KQXQAll = $.extend(
			{}, 
			this.defaults.KQXQAll, 
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
							        var dataObj = ele.getFieldsNameById(xmlCodes._codeList, InstrumentID);
							        xmlData = {
							        	FieldName: dataObj.name, 	// 根据id 查询指数名称
							        	PriceDecimal: parseInt(dataObj.priceDecimal)
							        }
							    }
							});
							
							return xmlData;
						},
		// 在xml文件中通过返回的指数id,获取指数名称
		getFieldsNameById: 	function(_codeList,id){
							    var object = {
							    		name: "",
							    		priceDecimal: ""

							    	};
							    $.each(_codeList,function(){
							        if($(this).attr("id") == id){
							            object.name = $(this).attr("name");
							            object.priceDecimal = $(this).parent().attr("PriceDecimal");
							        };
							    });
							    return object;
							},
		// websocket请求连接
		WebSocketConnect: 	function (klineObj) {	
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

								        klineObj.initEvent(ws, klineObj);

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
		initEvent: 	function(ws, klineObj) {
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
						    socket.reset().start(); 				// 第一次建立连接则启动心跳包
							
							socket.request(klineObj.HistoryKQAll);
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
						                 	socket.request(klineOpt.KQAll);	 	// 订阅当前日期K线=分钟K线
						                 	KCharts(dataList, "history");
						                 	break;
						                case "R211":        // 日K线历史数据查询
						                 	socket.request(klineOpt.KKZQAll);	 // 订阅当前日期K线=快照
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
					}
	}


	/*
	 * K线图构造函数
	 */ 
	function KCharts (dataList, isHistory){
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
	}

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
	// 按键操作
	$(document).keyup(function (e) {
		var keyCode = e.keyCode;
	    switch (keyCode) {
	        case 37:
	            move_k(-1, true);
	            break; //左
	        case 38:
	            move_k(1,false);
	            break;  //上
	        case 39:
	            move_k(1, true);
	            break; //右
	        case 40:
	            move_k(-1, false);
	            break; //下
	        default:
	            break;
	    }
	});

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
	                e_volume = (e_price-e_open)>0?[KLineData.hVolumesList.length-1,object.Volume,-1]:[KLineData.hVolumesList.length-1,object.Volume,1];
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
			        // {
			        //     type: 'inside',
			        //     xAxisIndex: [0, 1, 2],
			        //     start: 0,
			        //     end: 100
			        // },
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
	                            return (value).toFixed(KLineData.PriceDecimal);
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
			        },
			        // {
			        //     name: 'Volume',
			        //     type: 'bar',
			        //     xAxisIndex: 2,
			        //     yAxisIndex: 2,
			        //     data: KLineData.hVolumesList,
			        //     itemStyle: {
				       //      normal: {
				       //          color: '#e22f2a',
			        //             color0: '#3bc25b'
				       //      },
				       //      emphasis: {
				       //          color: '#000'
				       //      }
				       //  },
			        // }
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
			        },
			        // {
			        //     data: KLineData.hCategoryList
			        // }
				],
	            series: [
	                {
			            data: KLineData.hValuesList,
			        },
	                {
	                    data: KLineData.hVolumesList
	                },
	                // {
	                //     data: KLineData.hVolumesList
	                // }
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
	// 按键对应的move函数
	function move_k(index, type) {
		// 获取dataZoom起始位置和结束位置，比较他的信息，设置他的位置
	    var start = KLineData.KChart.getOption().dataZoom[0].start,
	    	end = KLineData.KChart.getOption().dataZoom[0].end,
	    	center = (end-start)/2+start,
	    	length = KLineData.hDate.length,
	    	continerWidth = $("#kline_charts").width();

		var count = KLineData.KChart?KLineData.KChart.getOption().series[0].data.length:0;
	    if (type) {
	        if (KLineSet.mouseHoverPoint == 0 && index == -1) {
	            KLineSet.mouseHoverPoint = KLineData.KChart.getOption().series[0].data.length;
	        }
	        if (KLineSet.mouseHoverPoint + index > KLineData.KChart.getOption().series[0].data.length - 1 && index == 1) {
	            KLineSet.mouseHoverPoint = 0;
	            index = 0;
	        }
	        // 信息框位置
		   	if ((KLineSet.mouseHoverPoint+1)/length > center/100) {
		        $("#kline_tooltip").css("left", 83/830*continerWidth);
		    } else {
		        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
		    }
		    $("#kline_tooltip").show();
	        var name = KLineData.KChart.getOption().series[0].name;
	        KLineData.KChart.dispatchAction({
	            type: 'showTip',
	            seriesIndex: 0,
	            dataIndex: KLineSet.mouseHoverPoint + index,
	            name: name,
	            position: ['50%', '50%']
	        });

	    } else {
	        if (index == 1) {
	            KLineSet.start += 10;
	            if (KLineSet.start > 100) {
	                KLineSet.start = 100;
	                return;
	            } else {
	                KLineSet.mouseHoverPoint = KLineSet.mouseHoverPoint + (count * KLineSet.zoom / 100);
	            }
	        } else {
	            KLineSet.start -= 10;
	            if (KLineSet.start < 0) {
	                KLineSet.start = 0;
	                return;
	            } else {
	                KLineSet.mouseHoverPoint = KLineSet.mouseHoverPoint - (count * KLineSet.zoom / 100);
	            }
	        }
	        KLineData.KChart.dispatchAction({
	            type: 'dataZoom',
	            // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
	            dataZoomIndex: 0,
	            // 开始位置的百分比，0 - 100
	            start: KLineSet.start,
	            // 结束位置的百分比，0 - 100
	            end: 100
	        });
	        
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
	        $(".name", countent).text(KLineData.FieldName); //指数名称
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
	    return parseFloat(data).toFixed(KLineData.PriceDecimal);
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

	var turnOn = true;
	//在插件中使用KLine对象
	$.queryKLine = function(opt) {
		// K线id和类型： 日K线/分钟K线/五分钟K线/30分钟K线等 --如果没传值，默认日K线
		var id = opt.InstrumentID?opt.InstrumentID:"1";
		var ExchangeID = opt.ExchangeID?opt.ExchangeID:"101";


		// // KLineData.lineType = opt.id?opt.id:"day";

		// 将要查询的K线对象初始化   日K线 or 分钟K线  对象
    	klineObj = new $.KLineRequire(opt);
		// 请求xml数据，获取指数名称
	    var xmlData = klineObj.requireXml(id);
	    KLineData.FieldName = xmlData.FieldName;
	    KLineData.PriceDecimal = xmlData.PriceDecimal;
	    
	






		// 点击按钮查询制定图形
		$(".charts-tab li").on("click",function(){
			// 修改K线类型
			KLineData.lineType = $(this).attr("id");
			// 创建新的查询对象
			klineObj = new $.KLineRequire({"InstrumentID": id,"ExchangeID": ExchangeID});

			if(KLineData.lineType=="mline"&&turnOn){
				return;
			}else{
				if(turnOn){
					// Websocket实例
				    socket = new klineObj.WebSocketConnect(klineObj);
				    ws = socket.createWebSocket();
				    // 发起websocket请求
				    klineObj.initEvent(ws, klineObj);
				    turnOn = false;
				}else{
					// 取消之前的订阅
					switch(KLineData.lineType){
						case "mline":
							KLineData.KChart.setOption({
								xAxis: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                },
					                // {
					                //     data: KLineData.hVolumesList
					                // }
					            ],
								yAxis: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                },
					                // {
					                //     data: KLineData.hVolumesList
					                // }
					            ],
								series: [
					                {
							            data: null,
							        },
					                {
					                    data: null
					                },
					                // {
					                //     data: KLineData.hVolumesList
					                // }
					            ]
							})
							socket.request(klineObj.KQXQAll);
							socket.request(klineObj.KQXKZQAll);
							break;
						case "minute":
							socket.request(klineObj.KQXKZQAll);
							// 发起新请求
							socket.request(klineObj.HistoryKQAll);
							break;
						case "day":
							socket.request(klineObj.KQXQAll);
							// 发起新请求
							socket.request(klineObj.HistoryKQAll);
							break;
						default:;
					}
					

				}
			}
		});
	};
})(jQuery)