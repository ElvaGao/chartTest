/*
 * 绘制KCharts图相关函数
 */
// K线图方法
function KCharts(socket, dataList, isHistory){
    if(dataList.length>0){
        $("#withoutData").hide().siblings().show();

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


        /*
         * K线图事件绑定
         */
        // ecahrts图进行缩放
        $(window).resize(function(){

            chartResize(); 
        });
        KLineSocket.KChart.on('showTip', function (params) {
            KLineSocket.KLineSet.mouseHoverPoint = params.dataIndex;
            var length = KLineSocket.HistoryData.hCategoryList.length;
            setToolInfo(length, 'showTip');
        });
        // 鼠标滑过，出现信息框
        $("#kline_charts").bind("mouseenter", function (event) {
            toolContentPosition(event);
            $("#kline_tooltip").show();
        });
        $("#kline_charts").bind("mousemove", function (event) {
            KLineSocket.KLineSet.isHoverGraph = true;
            $("#kline_tooltip").show();
            toolContentPosition(event);
        });
        $("#kline_charts").bind("mouseout", function (event) {
            KLineSocket.KLineSet.isHoverGraph = false;
            $("#kline_tooltip").hide();
            KLineSocket.KLineSet.mouseHoverPoint = 0;
            initMarketTool();// 显示信息
        });

    }
};
// 解析获取到的数据
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
        data_length = 0;
    // 遍历json，将它们push进不同的数组
    
    $.each(data,function(i,object){
        
        let e_date = formatDateSplit(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time;  

        switch(KLineSocket.option.lineType){
            case "minute":
                e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_time);
                break;
            case "day":
                KLineSocket.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                k_categoryData.push(e_date);
                break; 
            default:;
        }    

        if(!lastClose){
            lastClose = object.Open;                          // 上一根柱子的收盘价
        }
        // 如果是最后一条数据的更新，lastClose就是前一根柱子的收盘价
        if(k_categoryData[0].toString() == KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1]){
    		lastClose = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-2][1];
    	}

        let e_open = (object.Open),          // 开
            e_highest = (object.High),       // 高
            e_lowest = (object.Low),         // 低
            e_price = (KLineSocket.option.lineType=="day"&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
            e_value = [                                       // 开收低高-蜡烛图数据格式
                e_open, 
                e_price, 
                e_lowest, 
                e_highest
            ],
            e_valuePercent = [                                // 开收低高-百分比-相对上一根柱子的收盘价
                ((e_open-lastClose)*100/lastClose),
                ((e_price-lastClose)*100/lastClose),
                ((e_lowest-lastClose)*100/lastClose),
                ((e_highest-lastClose)*100/lastClose)
            ],
            e_volumnData = object.Volume,							   // 成交量---单位：股
            e_zValues = lastClose?(e_price-lastClose):0,               // 涨幅-相对昨收      
            e_zValuesPercent = (e_zValues*100/lastClose),              // 涨幅百分比
            e_amplitude = (e_highest - e_lowest),                      // 振幅
            e_amplPercent = (100*e_amplitude/lastClose);               // 振幅百分比

        if(isHistory){
            e_volume = (e_price-e_open)>0?[i,e_volumnData,-1]:[i,e_volumnData,1];   // 成交量-数组，存储索引，值，颜色对应的值                         
        }else{
            e_volume = (e_price-e_open)>0?[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,-1]:[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,1];  
        }

        lastClose = e_price;

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
// 保存获取的数据到相对应的数据中，存入数据对象
function saveData(data, isHistory){
    if(isHistory){
        KLineSocket.HistoryData.hDate = data.date;
        KLineSocket.HistoryData.hDay = data.day;
        KLineSocket.HistoryData.hCategoryList = data.categoryData;    
        KLineSocket.HistoryData.hValuesList = data.values;
        KLineSocket.HistoryData.hValuesPercentList = data.valuesPercent;
        KLineSocket.HistoryData.hVolumesList = data.volumes;
        KLineSocket.HistoryData.hZValuesList = data.zValues;
        KLineSocket.HistoryData.hZValuesListPercent = data.zValuePercent;
        KLineSocket.HistoryData.hZf = data.amplitude;
        KLineSocket.HistoryData.hZfList = data.amplPercent;
    }else{
        var n_date = data.date[0];
        var n_day = data.day[0];
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_zValues = data.zValues[0];        // 涨跌
        var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
        var n_volumes = data.volumes[0];            // 成交量
        var n_valuesPercent = data.valuesPercent[0];
        var n_zf = data.amplitude[0];
        var n_zfList = data.amplPercent[0];
        var lastTime = KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1];

        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            n_volumes[0] = n_volumes[0]-1;

            KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1] = n_values;
            KLineSocket.HistoryData.hVolumesList[KLineSocket.HistoryData.hVolumesList.length-1] = n_volumes;
            KLineSocket.HistoryData.hZValuesList[KLineSocket.HistoryData.hZValuesList.length-1] = n_zValues;
            KLineSocket.HistoryData.hZValuesListPercent[KLineSocket.HistoryData.hZValuesListPercent.length-1] = n_zValuePercent;
            KLineSocket.HistoryData.hValuesPercentList[KLineSocket.HistoryData.hValuesPercentList.length-1] = n_valuesPercent;
            KLineSocket.HistoryData.hZf[KLineSocket.HistoryData.hZf.length-1] = n_zf;
            KLineSocket.HistoryData.hZfList[KLineSocket.HistoryData.hZfList.length-1] = n_zfList;
        }else{
            KLineSocket.HistoryData.hDate.push(n_date);
            KLineSocket.HistoryData.hDay.push(n_day);
            KLineSocket.HistoryData.hCategoryList.push(n_category);
            KLineSocket.HistoryData.hValuesList.push(n_values);
            KLineSocket.HistoryData.hVolumesList.push(n_volumes); 
            KLineSocket.HistoryData.hZValuesList.push(n_zValues);
            KLineSocket.HistoryData.hZValuesListPercent.push(n_zValuePercent);
            KLineSocket.HistoryData.hValuesPercentList.push(n_valuesPercent);
            KLineSocket.HistoryData.hZf.push(n_zf);
            KLineSocket.HistoryData.hZfList.push(n_zfList);
        };
    }
};
// 绘制/画K线图
function chartPaint(isHistory){
    var yAxisName = null;
    if(isHistory){
        // 绘制K线图
        KLineSocket.KChart.setOption(option = {
            animation: false,
            tooltip: {
                trigger: 'axis',
                showContent: false
            },
            axisPointer: {
                link: {xAxisIndex: 'all'},
                label: {
                    backgroundColor: '#555' 
                },
                type: 'line',
                lineStyle:{
                    type: 'dotted',
                    color: '#000'
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
                    top: '57.8%',
                    height: '9.2%'
                },
                {
                    top: '75.4%',
                    height: '9.2%'
                }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1, 2],
                    start: 0,
                    end: 100
                },
                {
                    type: 'inside',
                    xAxisIndex: [0, 1, 2],
                    start: 0,
                    end: 100
                },
                {
                    show: true,
                    xAxisIndex: [0, 1, 2],
                    type: 'slider',
                    top: '91.5%',
                    start: 0,
                    end: 100,
                    handleIcon: 'path://M306.1,413c0,2.2-1.8,4-4,4h-59.8c-2.2,0-4-1.8-4-4V200.8c0-2.2,1.8-4,4-4h59.8c2.2,0,4,1.8,4,4V413z',
                    handleSize:'100%',
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
                        return KLineSocket.HistoryData.hCategoryList[valueStr];
                    },
                    showDetail: true
                },
            ],
            visualMap: {
                show: false,
                seriesIndex: 1,
                dimension: 2,
                pieces: [
                    {   value: 1, 
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
                    data: KLineSocket.HistoryData.hCategoryList,
                    scale: true,
                    boundaryGap: true,
                    axisTick:{ show:false },
                    axisLine: { show:false },
                    splitLine: {
                        show: true,
                        interval: 15,
                        lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    },
                    axisLabel: {
                    	show: true,
                    	color: '#999',
                    	fontSize: 14,
                        formatter : function(value, index){
                            if(KLineSocket.option.lineType=="minute"){
                                    return value.split(" ")[2];
                                }else{
                                    return value;
                                }
                        }
                    },
                    axisPointer: {
                        show:true,
                        label: {
                        	show:true,
                            formatter: function(params){
                                return params.value.replace(/-/g,"/");
                            }
                        }
                    }

                },
                {
                    type: 'category',
                    gridIndex: 1,
                    data: KLineSocket.HistoryData.hCategoryList,
                    scale: true,
                    axisTick: { show:false },
                    boundaryGap: true,
                    axisLine: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                    axisPointer: {
                        label: {
                        	show:false
                        }
                    }
                },
                {
                    type: 'category',
                    gridIndex: 2,
                    data: KLineSocket.HistoryData.hCategoryList,
                    scale: true,
                    axisTick: { show:false },
                    boundaryGap: true,
                    axisLine: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                    axisPointer: {
                        label: {
                        	show:false
                        }
                    }
                }
            ],
            yAxis: [
                {
                    scale: true,
                    splitNumber: 3,
                    splitArea: { show: false },
                    axisTick:{ show:false },
                    axisLine: { show: false },
                    splitLine: {
                        show: true,
                        lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    },
                    axisLabel: {
                    	show: true,
                    	color: '#999',
                    	fontSize: 14,
                        formatter: function (value, index) {
                            return (value).toFixed(StockSocket.FieldInfo.Decimal);
                        }
                    },
                    axisPointer: {
                        show:true,
                        label: {
                        	show:true,
                            formatter: function(params){
                                return params.value.toFixed(StockSocket.FieldInfo.Decimal);
                            }
                        }
                    }
                },
                {
                	type:'value',
                    scale: true,
                    gridIndex: 1,
                    min: 0,
                    axisTick:{ show:false },
                    axisLabel: {
                        show: true,
                        color: '#999',
                        fontSize: 14,
                        formatter: function (value, index) {
                            setyAsixName(value);
                            return;
                        }
                    },
                    axisLine: { 
                    	show: true,
                    	inZero: true,
                    	lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    },
                    splitNumber: 2,
                    splitLine: {
                        show: true,
                        lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    }
                },
                {
                	type:'value',
                    scale: true,
                    gridIndex: 2,
                    min: 0,
                    axisTick:{ show:false },
                    axisLabel: {
                        show: true,
                        color: '#999',
                        fontSize: 14,
                        formatter: function (value, index) {
                            setyAsixName(value);
                            return;
                        }
                    },
                    axisLine: { 
                    	show: true,
                    	inZero: true,
                    	lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    },
                    splitNumber: 2,
                    splitLine: {
                        show: true,
                        lineStyle: {
                    		color: '#e5e5e5'
                    	}
                    }
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
                        }
                    },
                    data: KLineSocket.HistoryData.hValuesList,
                    markPoint: {
                        symbolSize: 20,
                        data: [
                            {
                                name: 'highest value',
                                type: 'max',
                                valueDim: 'highest',
                                label: {
                                    normal: {
                                        position: 'insideBottomLeft',
                                        color: "#555",
                                        fontSize: 14,
                                        offset: [10,20]
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
                                label: {
                                    normal: {
                                        position: 'insideTopLeft',
                                        color: "#555",
                                        fontSize: 14,
                                        offset: [10,10]
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
                    data: KLineSocket.HistoryData.hVolumesList,
                    itemStyle: {
                        normal: {
                            color: '#e22f2a',
                            color0: '#3bc25b'
                        }
                    },
                },
                {
                    name: 'MACD',
                    type: 'line',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: KLineSocket.HistoryData.hVolumesList,
                    itemStyle: {
                        normal: {
                            color: '#e22f2a',
                            color0: '#3bc25b'
                        }
                    },
                }
            ]
        });
    }else{
        // 初始化并显示数据栏和数据信息框的信息
        KLineSocket.KChart.setOption({
            xAxis:[
                {
                    data: KLineSocket.HistoryData.hCategoryList
                },
                {
                    data: KLineSocket.HistoryData.hCategoryList
                },
                {
                    data: KLineSocket.HistoryData.hCategoryList
                }
            ],
            series: [
                {
                    data: KLineSocket.HistoryData.hValuesList,
                },
                {
                    data: KLineSocket.HistoryData.hVolumesList
                },
                {
                    data: KLineSocket.HistoryData.hVolumesList
                }
            ]
        }); 
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
// 根据窗口变化，调整柱状图单位的位置
function chartResize() {
    var h_w = Math.round(538/830*1000)/1000,
        top_h = Math.round(286/538*1000)/1000,
        name_width = Math.round(80/830*1000)/1000,
        k_height,
        k_width;
    var width = $(".kline").width();

    k_width = width;
    k_height = width*h_w;

    KLineSocket.KChart.resize({
        width: k_width,
        height: k_height
    })

    $(".kline-charts").height(k_height).width(k_width);
    // 计算div宽度
    if(width>1000){
    	$(".deal-title").css({"width": name_width*k_width+"px"});
    	$(".macd-title").css({"width": name_width*k_width+15+6+"px"});

        $(".volumn,.volMacd").css({"width": name_width*k_width+5+"px"});

        $(".kline-buttons").css({"paddingLeft": name_width*k_width+1+"px"});
    }else if(width<450){
    	$(".deal-title").css({"width": name_width*k_width-10+"px"});
    	$(".macd-title").css({"width": name_width*k_width+5+6+"px"});

        $(".volumn,.volMacd").css({"width": name_width*k_width-5+"px"});

        $(".kline-buttons").css({"paddingLeft": name_width*k_width+1+"px"});
    }else if(width>300){
    	$(".deal-title").css({"width": name_width*k_width-5+"px"});
    	$(".macd-title").css({"width": name_width*k_width+5+6+"px"});

        $(".volumn,.volMacd").css({"width": name_width*k_width+"px"});

        $(".kline-buttons").css({"paddingLeft": name_width*k_width+1+"px"});
    }

    $(".bar-tools").css({"top": k_height*top_h+"px","height": 200/538*k_height});
};
// 设置成交量的单位变化状况
function setyAsixName(value) {
	var data = setUnit(value,true);
	var maximun = (data=="0"?"0":floatFixedZero(data.value))
	var yAxisName = (data=="0"?"量":data.unit);
	$(".volumn div:first").text(maximun);
    $(".volumn div:last").text(yAxisName);
};
// 初始化设置显示信息
function initMarketTool() {
    var length = KLineSocket.HistoryData.hCategoryList.length;
    if (!KLineSocket.KLineSet.isHoverGraph || KLineSocket.KLineSet.isHoverGraph && !KLineSocket.HistoryData.hCategoryList[KLineSocket.KLineSet.mouseHoverPoint]) {
        setToolInfo(length, null);
    }
};
// 信息框和提示栏：区分 默认的信息 和 hover上去的信息显示
function setToolInfo(length, showTip){ 
    var setPoint;
    if(KLineSocket.KLineSet.mouseHoverPoint>0){
        if(KLineSocket.KLineSet.mouseHoverPoint>length-1){
            KLineSocket.KLineSet.mouseHoverPoint = length-1;
        }else{
            KLineSocket.KLineSet.mouseHoverPoint = Math.round(KLineSocket.KLineSet.mouseHoverPoint);
        }
    }else{
        KLineSocket.KLineSet.mouseHoverPoint = 0;
    }
    if(showTip){
        setPoint = KLineSocket.KLineSet.mouseHoverPoint;
    }else{
        setPoint = length-1;
    }
    var countent = $("#kline");
    if (length) {
        $(".name", countent).text(StockSocket.FieldInfo.Name); //指数名称
        $(".date", countent).text(KLineSocket.HistoryData.hDate[setPoint].replace(/-/g,'/')); //日期
        $(".day", countent).text(KLineSocket.HistoryData.hDay[setPoint]); //星期
        // 分钟K线每根柱子都有一条时间数据
        // 日K线，只有最后一根存在当前分钟时间数据
        switch(KLineSocket.option.lineType){
            case "minute":
                $(".time", countent).text(KLineSocket.HistoryData.hCategoryList[setPoint].split(" ")[2]); //时间
                 break;
            case "day":
            	KLineSocket.HistoryData.hTime = (KLineSocket.HistoryData.hTime=="00:00")?null:KLineSocket.HistoryData.hTime;
                if(showTip){
                    $(".time", countent).text((KLineSocket.KLineSet.mouseHoverPoint==length-1)?KLineSocket.HistoryData.hTime:null); //时间
                }else{
                    $(".time", countent).text(KLineSocket.HistoryData.hTime);
                }
        };

        $(".open", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][0])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][0])+"%)")
        	.attr("class","open pull-right "+((setPoint==0)?"":getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][0],0))); //开
        
        $(".price", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][1])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][1])+"%)")
        	.attr("class","price pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][1],0)); //收
        
        $(".lowest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][2])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][2])+"%)")
        	.attr("class","lowest pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][2],0)); //低
        
        $(".highest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][3])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][3])+"%)")
        	.attr("class","highest pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][3],0)); //高
        
        $(".z-value", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hZValuesList[setPoint])+"("+floatFixedTwo(KLineSocket.HistoryData.hZValuesListPercent[setPoint])+"%)")
        	.attr("class","z-value pull-right "+getColorName(KLineSocket.HistoryData.hZValuesList[setPoint],0));   // 涨跌
        
        
        $(".amplitude", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hZf[setPoint])+"("+floatFixedTwo(KLineSocket.HistoryData.hZfList[setPoint])+"%)");   // 振幅
        $(".price", $("#kline .kline-info")).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][1])); //收
        $(".z-value", $("#kline .kline-info")).text(floatFixedTwo(KLineSocket.HistoryData.hZValuesListPercent[setPoint])+"%"); //收
   		

   		var volume = KLineSocket.HistoryData.hVolumesList[setPoint][1];

   		$(".deal-Vol em").text(parseFloat(volume/100).toFixed(2));//量--单位:手

        if(volume>=100){
        	//量--单位:手
        	$(".volume", countent).text(setUnit(floatFixedZero(volume/100))+"手");
	        $(".volume", $("#kline .kline-info")).text(setUnit(floatFixedZero(volume/100)));
        }else{
        	//量--单位:股
        	$(".volume", countent).text(volume+"股");
	        $(".volume", $("#kline .kline-info")).text(volume); 
        }
   		
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