var yc=0,decimal=2,xml;
;(function($,undefined){
    var socket = null;
    var myChart = null;
    var mouseHoverPoint = 0;
    var isHoverGraph = false;
    var sub = 0;
    var colorList = ['#c23a39','#44c96e','#555','#999','#e5e5e5'];//红色,绿色,555,999
    var start = 0,zoom = 10;//左右键时应用
    var stopTime = [];
    var timer;//定时器

    var _singleTime,_endTime,_dealDate,_timeFlag;//股票更新的最后时间，交易时间的最后节点，交易日期，变量
    function watchStock($this){//集合竞价
        if(!myChart)return;
        timer = setInterval(function(){
            if(_timeFlag >= _endTime){
                clearInterval(timer);
                return;
            }
            var data = [{'Time':_timeFlag,'Date':_dealDate,'High':null,'Low':null,'Price':null,'Open':null}];
            initCharts(data,'add',$this);
        },3000);//30秒运行一次   监测是否有推送数据过来
    }

    var WebSocketConnect = function(opt) {
        this.ws = null;
        this.defaults = {
            wsUrl : opt.wsUrl,//"ws://172.17.20.203:7681",  //开发
            lockReconnect : false,//避免重复连接 连接锁如果有正在连接的则锁住
            timeout : 60000,//60秒
            timeoutObj : null,
            serverTimeoutObj : null,
        };
        // 心跳包请求参数
        this.XTB = {
            "MsgType":"Q8050",
            "ExchangeID":opt.exchangeID,
            "InstrumentID":opt.id
        },
        this.options = $.extend({},this.defaults,opt);
    };
    //建立socket连接
    WebSocketConnect.prototype.createWebSocket = function(){
        try {
            this.ws = new WebSocket(this.options.wsUrl);
            return this.ws;
        } catch (e) {
            this.reconnect(this.options.wsUrl); //如果失败重连
        }
    };
    //socket重连
    WebSocketConnect.prototype.reconnect = function () {
        var $this = this;
        var _this = this.options;
        if (_this.lockReconnect) return;
        _this.lockReconnect = true;

        //没连接上会一直重连，设置延迟避免请求过多
        setTimeout(function () {
            console.log("重连咯~~~~");
            var ws = $this.createWebSocket(_this.wsUrl);
            var initXML = new InitXMLIChart(_this);
            yc = 0;
            initEvent(ws,initXML);
            _this.lockReconnect = false;
        }, 2000);
    };
    //发送请求
    WebSocketConnect.prototype.request = function (data) {
        this.ws.send(JSON.stringify(data));
    };
    //重置心跳包
    WebSocketConnect.prototype.reset = function () {
        clearTimeout(this.options.timeoutObj);
        clearTimeout(this.options.serverTimeoutObj);
        return this;
    };
    //开始心跳包
    WebSocketConnect.prototype.start = function () {
        var self = this.options;
        var _this = this;
        self.timeoutObj = setTimeout(function () {
            //onmessage拿到返回数据就说明连接正常
            _this.request(_this.XTB);
            self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
                _this.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
            }, self.timeout);
        }, self.timeout);
    };
    
    // 初始化代码表
    var InitXMLIChart = function(opt){
        // this.socket = null,
        this.defaults = {
            // 请求代码表地址
            stockXMlUrl:opt.stockXMlUrl,
            decimal : 2,
            typeIndex:'',
            nowDateTime:[],
            stockName:'',//指数、个股的名称
            id:opt.id,//指数ID
            exchangeID:opt.exchangeID,//交易所ID
            c_data : [],
            v_data : [],
            interval : 0,
            history_data:[],//价格历史数据
            z_history_data:[],//涨跌幅历史数据
            a_history_data:[],//成交量
            open_data:[],
            high_data:[],
            low_data:[],
            flag_data : [], //成交量颜色记录 1为红 -1为绿
            //订阅快照请求
            HQAll : {
                "MsgType":"S1010",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"1"
            },
            // 获取历史数据
            historyData : {
                "MsgType": "Q3011",
                "ExchangeID": opt.exchangeID,
                "InstrumentID": opt.id,
                "StartIndex": "0",
                "StartDate": "-1",
                "StartTime": "0", 
                "Count": "0"
            },
            // 实时推送数据
            RTDATA : {
                "MsgType":"S1010",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"11"
            },
            // 清盘
            QPDATA : {
                "MsgType":"Q8002",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "PructType":"0"
            }
        };
        this.options = $.extend({},this.defaults,opt);
    };
    InitXMLIChart.prototype.initXML = function(){
        var _options = this.options;
        var _this = this;
        //第一次打开终端,初始化代码表第一次默认请求
        $.ajax({
            url:  _options.stockXMlUrl,
            type: 'GET',
            dataType: 'json',
            async:false,
            cache:false,
            timeout:60000,
            error: function(xml){
                console.log("请求代码表出错");
            },
            success: function(data){
                if(data.ReturnCode == 0){
                    if(data && data.CodeInfo[0]){
                        data = data.CodeInfo[0];
                        $(".tb-fn-title").html("<span class=\"fl\">"+data.InstrumentName+"</span><span class=\"fl\">"+data.InstrumentCode+"</span>");
			// 从代码表中获取昨收值
	                yc = data.PreClose?parseFloat(data.PreClose):0;
                        compareTime(data,_options);
        
                        socket = new WebSocketConnect(_options);
                        var ws = socket.createWebSocket();
                        initEvent(ws,_this);
                    }else{
                        console.log("没有数据");
                    }
                }
            }
        });
    };
    //1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位、股票名字
    function compareTime(data,_options){
        if(!data.time) return;
        var startTime,endTime,startTime1,endTime1;
        if(data.time.indexOf(";")>-1){//分段时间
            startTime = (data.time.split(";")[0]).split("-")[0];
            endTime = (data.time.split(";")[0]).split("-")[1];
            startTime1 = (data.time.split(";")[1]).split("-")[0];
            endTime1 = formatTimeMin((data.time.split(";")[1]).split("-")[1]);
            startTime1  = startTime1.split(":")[0] +":"+ parseInt(startTime1.split(":")[1])+1;
        }else{//无分段时间
            startTime = data.time.split("-")[0];
            endTime = data.time.split("-")[1];
            startTime1 = endTime1 = "";
        }
        decimal = _options.decimal = parseInt(data.PriceDecimal);//保留小数位数
        _options.typeIndex = data.ProductType;//指数类型
        _options.stockName = data.InstrumentName;
        var startT = parseInt(startTime.split(":")[0]);
        var endT = parseInt(endTime.split(":")[0]);
        if(endTime1){
            endT = parseInt(endTime1.split(":")[0]);
        }
        var json,json1;
        if(startT > endT){//国际时间，跨天了，需要将当前时间减一
            sub = -1;
            json = {
                startTime:startTime,
                endTime:endTime1
            };
            _options.nowDateTime.push(json);
        }else{//未跨天
            sub = 0;
            json = {
                startTime:startTime,
                endTime:endTime
            };
            _options.nowDateTime.push(json);
            if(startTime1){
                json1 = {
                    startTime1:startTime1,
                    endTime1:endTime1
                };
                _options.nowDateTime.push(json1);
            }
        }
        _endTime = (endTime1?endTime1:endTime).replace(":","");
    }
    function initEvent(ws,_this){
        watchStock(_this);
        var $this = _this;
        ws.onclose = function () {
            socket.reconnect(); //终端重连
        };
        ws.onerror = function () {
            socket.reconnect(); //报错重连
        };
        ws.onopen = function () {
            //心跳检测重置
            socket.reset().start(); //都第一次建立连接则启动心跳包
            $this.take_HQ(); //订阅行情 获取昨收
            // 获取历史数据
            $this.getHistoryData();
            //获取今日数据推送
            $this.getRealTimePush();
            // 清盘
            $this.getQP();
            
            //初始化报价图;
            // if(!$(".shibors").find("#mytable").length>0){
            //     $(".shibors").marketTable("init");
            // }
        };
        ws.onmessage = function (evt) {
            var data  = evt.data.split("|")[0];  //每个json包结束都带有一个| 所以分割最后一个为空
            try{
                data = eval( "(" + data + ")" );
                data = data || data[0];
            }catch(e){
                console.log(e);
                return;
            }
            
            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
            var beginTime,finishTime,beginTime1,finishTime1;
            //1、第一次进来要通过订阅来获取昨收
            // 2.1、通过昨收来绘制历史数据
            // 2.2、动态添加今日的数据 
            switch(MsgType)
            {
                case "R3011"://订阅历史数据
                    initCharts(data,'',$this);
                    break;
                case "P0001"://订阅快照
                    // $(document).trigger("SBR_HQ",data);
                    if(!yc){
                        yc = data.PreClose; //获取昨收值
                        // 初始化空分时图
                        initEmptyCharts(yc);
                    }
                    setFieldInfo(data);
                    // 接口变更  日期为前一天
                    // todayDate = formatDate(data[0].Date + sub);
                break;
                case "P0011"://订阅分钟线
                    clearInterval(timer);
                    if(myChart != undefined){
                        initCharts(data,"add",$this);
                        watchStock($this);
                    }
                break;
                case "R8002"://清盘
                    var MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                    
                    if(MarketStatus == 1){//收到清盘指令  操作图表
                        redrawChart(data,$this);
                    }
                    

                break;
                case "R8050":  //心跳包
                    // console.log(data);
                default:
            }
            socket.reset().start();
        };
    };
    // 设置顶部信息  当前指数/个股 请求快照数据
    function setFieldInfo(data){
        var high,low,open,zf,price,zd,zdf,dealVal,dealVol;
        if(data){
            high = data.High;
            low = data.Low;
            open = data.Open;
            dealVal = data.Value;
            dealVol = data.Volume;
            price = data.Last;
            // 未开盘时，昨收为0，计算涨跌幅和振幅会出现NAN，于是进行区分，为0%
            zf = yc==0?floatFixedTwo(0):floatFixedTwo((high - low)/yc*100);
            zd = price - yc;
            zdf = yc==0?floatFixedTwo(0):floatFixedTwo((zd/yc)*100);

            $.each($(".tb-fielList li"),function(index,obj){
                var spanObj = $(obj).children("span"),
                    compareData = yc,
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
                            data = floatFixedDecimal(yc);
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
                compareData = yc;
            });

            $.each($(".tb-fn-num span"),function(index,obj){
                var spanObj = $(obj),
                    compareData = yc,
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
                compareData = yc;
            });

        }
    };
    //请求订阅 获取昨收
    InitXMLIChart.prototype.take_HQ = function(){
        socket.request(this.options.HQAll);
    };
    //获取历史指数数据
    InitXMLIChart.prototype.getHistoryData = function(){
        socket.request(this.options.historyData);
    };
    // 获取实时分钟推送
    InitXMLIChart.prototype.getRealTimePush = function(){
        socket.request(this.options.RTDATA);
    };
    //初始空图表
    function initEmptyCharts(yc){
        var maxY = parseFloat((parseFloat(yc)*0.01+parseFloat(yc)).toFixed(decimal));
        var minY = parseFloat((parseFloat(yc)-parseFloat(yc)*0.01).toFixed(decimal));
        var maxY1 = parseFloat(((maxY-yc)/yc).toFixed(2));
        var minY1 = -parseFloat(((maxY-yc)/yc).toFixed(2));
        var split = parseFloat(((maxY - yc)/3).toFixed(decimal));
        var split1= parseFloat((split / yc))*100;
        // 绘制图形前，隐藏动图
        // 绘制图表 配置参数
        var option = {
            backgroundColor: "#1e2131",
            animation: false,
            grid: [
                {
                    top: 10,
                    left:80,
                    right:80,
                    height:'630px',
                },
                {
                    left:80,
                    right:80,
                    bottom: 90,
                    height: '20%',
                }
            ],
            title: {
                show: false
            },
            axisPointer: {
                link: {xAxisIndex: 'all'},
                label: {
                    backgroundColor: colorList[2]
                },
                show:true,
                triggerTooltip:false,
                snap:true
            },
            tooltip: {
                trigger: 'axis',
                showContent:false
            },
            xAxis: [
                {
                    type:"category",
                    axisTick: {
                        show:false
                    },
                    axisLabel: {
                        interval: function (number, string) {
                            if(number == 0 || number == $this.v_data.length-1){
                                return true;
                            }
                            if(stopTime){
                                if(string.indexOf(stopTime[0].split(" ")[1])>-1){
                                    return true
                                }
                            }
                            if(string.indexOf("00")>-1){
                                return true
                            }
                        },
                        formatter: function (value, number) {
                            var tVal = value.split(" ")[2];
                            return tVal;
                        },
                        textStyle: {
                            color: "rgba(255,255,255,0.5)",
                            fontSize:20,
                            fontFamily:'Helvetica'
                        },
                        margin:'5'
                    },
                    axisLine: {
                        lineStyle:{
                            color:"#34394a"
                        }
                    },
                    data: [],
                    splitLine: {
                        show: false
                    },
                    axisPointer: {
                        show:true,
                        lineStyle:{
                            color:"rgba(255,255,255,0.5)",
                            type:"dashed"
                        },
                        label: {
                            formatter: function (params, value, s) {
                                return (params.value);
                            },
                            padding:[3,5,5,5],
                            show:false
                        }
                    },
                    splitArea:{
                        show:true,
                        interval:30,
                        areaStyle:{
                            color:['rgba(255,255,255,0.1)','transparent']
                        }
                    },
                    boundaryGap:false
                },
                {
                    type:"category",
                    axisLabel: {
                        show:false
                    },
                    axisLine: {
                        show:false
                    },
                    data: [],
                    splitLine: {
                        show: false
                    },
                    gridIndex: 1,
                    axisPointer:{
                        lineStyle:{
                            color:"transparent"
                        },
                        label:{
                            show:false
                        }
                    },
                    boundaryGap:false
                }
            ],
            yAxis: [
                {
                    // show:false,
                    min: minY1,
                    max: maxY1,
                    interval: split1,
                    boundaryGap: [0, '100%'],
                    axisTick: {
                        show: false
                    },
                    type: "value",
                    splitLine:{
                        lineStyle:{
                            color:"transparent"
                        }
                    },
                    axisLine:{
                        lineStyle:{
                            color:"#34394a"
                        }
                    },
                    axisLabel: {
                        show:false,
                        formatter: function (value, index) {
                            if (index == 3) {
                                return "";
                            } else {
                                return parseFloat(value).toFixed(2) + "%";
                            }
                        },
                        textStyle: {
                            fontSize:20,
                            fontFamily:"Helvetica",
                            color: function (value, index) {
                                if (parseFloat(value) > 0) {
                                    return colorList[0];
                                } else {
                                    return colorList[1];
                                }
                            }
                        }
                    },
                    axisPointer: {
                        show:false,
                        label: {
                            formatter: function (params, value, s) {
                                return parseFloat(params.value).toFixed(2) + "%";
                            }
                        },
                        // snap: true
                    }
                },
                {
                    min: minY,
                    max: maxY,
                    interval: split,
                    boundaryGap: [0, '100%'],
                    axisTick: {
                        show: true
                    },
                    type: "value",
                    splitLine:{
                        lineStyle:{
                            color:"#34394a"
                        }
                    },
                    axisLine:{
                        lineStyle:{
                            color:"#34394a"
                        }
                    },
                    axisLabel: {
                        formatter: function (value, index) {
                            if (index == 3) {
                                return "";
                            } else {
                                return parseFloat(value).toFixed(decimal);
                            }
                        },
                        textStyle: {
                            color: "rgba(255,255,255,0.5)",
                            fontSize:20,
                            fontFamily:'Helvetica',
                        }
                    },
                    axisPointer: {
                        lineStyle:{
                            color:'rgba(255,255,255,0.5)',
                            type:"dashed"
                        },
                        label: {
                            show: true,
                            formatter: function (params, value, s) {
                                return parseFloat(params.value).toFixed($this.decimal);
                            }
                        },
                        snap: true
                    }
                },
                {
                    type:'value',
                    scale: true,
                    splitLine:{
                        show:false
                    },
                    axisLine:{
                        show:false
                    },
                    axisLabel:{
                        show:false
                    },
                    gridIndex: 1,
                    splitNumber: 2,
                    axisPointer: {
                        show:false
                    }
                }
            ],
            series: [
                {
                    name:'limit',
                    type: 'line',
                    showSymbol: false,
                    hoverAnimation: false,
                    connectNulls:true,
                    symbolSize:0,
                    markLine: {
                        animation:false,
                        silent:true,
                        lineStyle: {
                            normal: {
                                type: 'dashed',
                                color: '#fff',
                                width:0,
                                opacity:0.5
                            }
                        },
                        label: {
                            normal: {
                                // show:false,
                                position:"start",
                                formatter: function () {
                                    return "0.00%";
                                }
                            }
                        },
                        data: [
                            {
                                name: 'Y 轴值为 100 的水平线',
                                yAxis: 0.00
                            }
                        ],
                        symbol: ['none', 'none']
                    },
                    lineStyle: {
                        normal: {
                            width:0,
                            opacity:0
                        }
                    },
                    data: []
                },
                {
                    name: 'Mline',
                    type: 'line',
                    showSymbol: true,
                    hoverAnimation: false,
                    symbolSize:0,
                    smooth: true,
                    connectNulls:true,
                    data: [],
                    markLine: {
                        animation:false,
                        silent:true,
                        lineStyle: {
                            normal: {
                                type: 'dashed',
                                color: '#fff',
                                width:0,
                                opacity:0.5
                            }
                        },
                        label: {
                            normal: {
                                // show:false,
                                position:"start",
                                formatter: function () {
                                    return "0.00%";
                                }
                            }
                        },
                        data: [
                            {
                                name: 'Y 轴值为 100 的水平线',
                                yAxis: parseFloat(yc),
                                label:{
                                    textStyle:{
                                        fontSize: '20'
                                    }
                                }
                            },
                        ],
                        symbol: ['none', 'none']
                    },
                    lineStyle:{
                        normal:{
                            color:"#2b99ff",
                            width:1
                        }
                    },
                    areaStyle:{
                        normal:{
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                offset: 0,
                                color: 'rgba(43, 153, 255,0.3)'
                            }, {
                                offset: 1,
                                color: 'rgba(43, 153, 255,0.1)'
                            }]),
                            opacity:0
                        }
                    },
                    yAxisIndex: 1
                },
                {
                    name: 'Vol',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 2,
                    data: [],
                    barWidth:3,
                    itemStyle:{
                        normal:{
                            color:function(params){
                                if(flag[params.dataIndex] > 0){
                                    return colorList[0];
                                }else{
                                    return colorList[1];
                                }
                            },
                            opacity: 0.8,
                        }
                    }
                }
            ]
        };
        myChart = echarts.init(document.getElementById('mline_charts'));
        myChart.setOption(option);
    }
    
    // 清盘
    InitXMLIChart.prototype.getQP = function(){
        socket.request(this.options.QPDATA);
    };
    //初始化分时图 
    function initCharts(data,type,$this){
        $this = $this.options;
        if (data) {
            $("#noData").hide();
            $("#toolContent_M").show();
            $(".vol").show();
            $(".chartsTab").show();
            yc = parseFloat(yc);
            var limitUp = (yc + yc*0.1).toFixed($this.decimal);
            var limitDown = (yc - yc*0.1).toFixed($this.decimal);
            if(type == "add"){
                if(myChart != undefined){
                    var a_lastData = data;
                    var last_dataTime = formatTime(a_lastData.Time);//行情最新时间
                    _singleTime = a_lastData.Time;
                    _timeFlag = parseInt(_singleTime) + 100;
                    var last_date = dateToStamp(formatDate(a_lastData.Date) +" " + last_dataTime);//最新时间时间戳
                    var zVale = parseFloat(((parseFloat(a_lastData.Price) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2)); //行情最新涨跌幅
                    var aValue = parseFloat(a_lastData.Volume); //最新成交量
                    var oValue = parseFloat(a_lastData.Open); //最新开盘价
                    var hValue = parseFloat(a_lastData.High); //最高价
                    var lValue = parseFloat(a_lastData.Low); //最低价

                    var flag = parseFloat(a_lastData.Price) - parseFloat(a_lastData.Open) >= 0 ? 1:-1;//成交量最新颜色标识

                    if((parseFloat(a_lastData.Price)) >= limitUp){
                        a_lastData.Price = limitUp;
                    }else if((parseFloat(a_lastData.Price)) <= limitDown){
                        a_lastData.Price = limitDown;
                    }

                    for(var i=0;i<$this.c_data.length;i++){
                        if(last_date == $this.c_data[i]){
                            $this.history_data[i] = parseFloat(a_lastData.Price);
                            $this.z_history_data[i] = zVale;
                            $this.a_history_data[i] = aValue;
                            $this.open_data[i] = oValue;
                            $this.high_data[i] = hValue;
                            $this.low_data[i] = lValue;
                            $this.flag_data[i] = flag;
                            // 中间有断开
                            if(i > ($this.history_data.length-1) ){
                                for(var j=$this.history_data.length-1;j<=i;j++){
                                    $this.history_data[j].push(null);
                                    $this.z_history_data[j].push(null);
                                    $this.a_history_data[j].push(null);
                                    $this.flag_data[j].push(null);
                                    $this.open_data[j].push(null);
                                    $this.high_data[j].push(null);
                                    $this.low_data[j].push(null);
                                    if(j == i){
                                        $this.history_data[j] = parseFloat(a_lastData.Price);
                                        $this.z_history_data[j] = zVale;
                                        $this.a_history_data[j] = aValue;
                                        $this.flag_data[j] = flag;
                                        $this.open_data[j] = oValue;
                                        $this.high_data[j] = hValue;
                                        $this.low_data[j] = lValue;
                                    }
                                }
                            }
                        }else{
                            
                        }
                    }
                    
                    var marktToolData = [
                        $this.history_data[$this.history_data.length - 1],
                        $this.z_history_data[$this.z_history_data.length - 1],
                        $this.a_history_data[$this.a_history_data.length - 1] / 100,
                        formatDate(parseFloat($this.c_data[$this.history_data.length - 1]),"0")
                        // moment(parseFloat($this.c_data[$this.history_data.length - 1])).format("YYYY-MM-DD HH:mm")
                    ];
                    // set_marketTool(marktToolData,$this); //设置动态行情条
                    var fvalue, r1;
                    fvalue = parseFloat(a_lastData.Price);
                    r1 = Math.abs(fvalue - parseFloat(yc));
                    if (r1 > $this.interval) {
                        $this.interval = r1 + r1*0.1;
                        var minY = (yc - $this.interval).toFixed($this.decimal);
                        var middleY = yc.toFixed($this.decimal);
                        var maxY = (yc + $this.interval).toFixed($this.decimal);
                        if(minY <= limitDown){
                            minY = limitDown;
                        }
                        if(maxY >= limitUp){
                            maxY = limitUp;
                        }
                        var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                        myChart.setOption({
                            yAxis: [{},{
                                min: minY,
                                max: maxY,
                                interval: split,
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return ""
                                        } else {
                                            return parseFloat(value).toFixed($this.decimal);
                                        }
                                    }
                                }
                            }],
                            series: 
                            [{},{
                                markLine: {
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: middleY
                                        }
                                    ]
                                }
                            }]
                        });
                    }
                    if (mouseHoverPoint == $this.history_data.length - 1) {
                        myChart.dispatchAction({
                            type: 'showTip',
                            seriesIndex: 0,
                            dataIndex: mouseHoverPoint,
                            name: "Mline",
                            position: function (pos, params, el, elRect, size) {
                                var obj = {top: 10};
                                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                                return obj;
                            }
                        });
                    }
                    myChart.setOption({
                        xAxis:[{
                            data:$this.v_data
                        },
                        {
                            data:$this.v_data
                        }],
                        series: [
                            {
                                data: $this.z_history_data,
                            },
                            {
                                data: $this.history_data,
                                markPoint:{
                                    silent:true,
                                    data:[{
                                        coord:[$this.v_data[$this.history_data.length-1],''+$this.history_data[$this.history_data.length-1]],
                                        value:'',
                                        symbol:'image://../img/round.png',
                                        symbolSize:10,
                                        name:'最后一个值',
                                        label:{
                                            normal:{
                                                show:false
                                            }
                                        }
                                    }]
                                }
                            },
                            {
                                data: $this.a_history_data,
                                itemStyle:{
                                    normal:{
                                        color:function(params){
                                            if($this.flag_data[params.dataIndex] > 0){
                                                return colorList[0];
                                            }else{
                                                return colorList[1];
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    });
                    $(".point_label").text(fvalue?fvalue:"-");
                    var pixel = myChart.convertToPixel({seriesIndex: 1}, [$this.v_data[$this.history_data.length-1], ''+$this.history_data[$this.history_data.length-1]]);
                    $(".point_label").css({'top':pixel[1]-12});
                    if(fvalue >= yc){
                        $(".point_label").css({"background-color":"#c23a39"});
                    }
                    _dealDate = a_lastData.Date;
                }else{
                    // $("#noData").show();
                    // $("#toolContent_M").hide();
                    // $(".vol").hide();
                    // $(".chartsTab").hide();
                    // console.log("初始化图表失败");
                    // $("#MLine").hide();
                }
            }else{
                if(data.KLineSeriesInfo && data.KLineSeriesInfo.length>0){
                    data = data.KLineSeriesInfo;
		            if(!yc){
                        yc =  parseFloat(data[data.length-1].Open);
                    }
                    var price = [];//价格
                    var volume = [];//成交量
                    var zdfData = [];//涨跌幅
                    var openPrice = [];//开盘价
                    var highPrice = [];//最高价
                    var lowPrice = [];//最低价
                    var flag = [];//现价-开盘价 值为1和-1
                    $this.v_data = getxAxis(data[0].Date,$this);
                    var lastDate = dateToStamp(formatDate(data[data.length-1].Date) +" "+formatTime(data[data.length-1].Time));

                    for(var i=0;i<$this.c_data.length;i++){
                        if(lastDate < $this.c_data[i]){
                            break;
                        }
                        for(var j=0;j<data.length;j++){
                            var dateStamp = dateToStamp(formatDate(data[j].Date) +" "+formatTime(data[j].Time));
                            if($this.c_data[i] == dateStamp){
                                var fvalue = parseFloat(data[j].Price);//价格
                                if(fvalue >= limitUp){
                                    price[i] = parseFloat(limitUp);
                                    zdfData[i] = 0.10;
                                }else if(fvalue <= limitDown){
                                    price[i] = parseFloat(limitDown);
                                    zdfData[i] = 0.10;
                                }else{
                                    price[i] = parseFloat(data[j].Price);
                                    zdfData[i] = (((fvalue-yc)/yc)* 100).toFixed(2);
                                }
                                volume[i] = parseFloat(data[j].Volume);
                                flag[i] = (parseFloat(data[j].Price)-parseFloat(data[j].Open)) >= 0 ? 1 : -1;
                                openPrice[i] = parseFloat(data[j].Open);
                                highPrice[i] = parseFloat(data[j].High);
                                lowPrice[i] = parseFloat(data[j].Low);
                                if(fvalue > 0){
                                    r1 = Math.abs(fvalue - yc);
                                    if (r1 > $this.interval) {
                                        $this.interval = r1;
                                    }
                                }
                                break;
                            }else{
                                price[i] = null;
                                volume[i] = null;
                                zdfData[i] = null;
                                flag[i] = null;
                                openPrice[i] = null;
                                highPrice[i] = null;
                                lowPrice[i] = null;
                            }
                        }
                    }
                        
                    $this.history_data = price;//价格历史数据
                    $this.z_history_data = zdfData;//涨跌幅历史数据
                    $this.a_history_data = volume;//成交量历史数据
                    $this.flag_data = flag;//成交量颜色标识
                    $this.open_data = openPrice;
                    $this.high_data = highPrice;
                    $this.low_data = lowPrice;
                    //取绝对值  差值 
                    $this.interval = $this.interval + $this.interval*0.1;
                    if (yc) {
                        var minY = Number((yc - $this.interval).toFixed($this.decimal));//(minPrice - r1).toFixed($this.decimal);//(yc - $this.interval).toFixed($this.decimal);
                        var middleY = yc.toFixed($this.decimal);
                        var maxY = Number((yc + $this.interval).toFixed($this.decimal));//(maxPrice + r1).toFixed($this.decimal);//(yc + $this.interval).toFixed($this.decimal);
                        if(minY < limitDown){
                            minY = limitDown;
                        }
                        if(maxY > limitUp){
                            maxY = limitUp;
                        }

                        var dd = ((parseFloat(minY) - (yc)) / (yc) );//* 100);
                        if(Math.abs(dd) > 1){
                            var minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
                            var maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
                        }else{
                            var minY1 = ((parseFloat(minY) - (yc)) / (yc) * 100).toFixed(2);
                            var maxY1 = ((parseFloat(maxY) - (yc)) / (yc) * 100).toFixed(2);
                        }
                    } else {
                        var minY = 0;
                        var middleY = 1;
                        var maxY = 2;
                    }

                    var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                    var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(4));

                    _dealDate = data[data.length-1].Date;
                    _singleTime = data[data.length-1].Time;
                    _timeFlag = parseInt(_singleTime) + 100;

                    // 绘制图表 配置参数
                    var option = {
                        backgroundColor: "#1e2131",
                        animation: false,
                        grid: [
                            {
                                top: 10,
                                left:80,
                                right:80,
                                height:'630px',
                            },
                            {
                                left:80,
                                right:80,
                                bottom: 90,
                                height: '20%',
                            }
                        ],
                        title: {
                            show: false
                        },
                        axisPointer: {
                            link: {xAxisIndex: 'all'},
                            label: {
                                backgroundColor: colorList[2]
                            },
                            show:true,
                            triggerTooltip:false,
                            snap:true
                        },
                        tooltip: {
                            trigger: 'axis',
                            showContent:false
                        },
                        xAxis: [
                            {
                                type:"category",
                                axisTick: {
                                    show:false
                                },
                                axisLabel: {
                                    interval: function (number, string) {
                                        if(number == 0 || number == $this.v_data.length-1){
                                            return true;
                                        }
                                        if(stopTime){
                                            if(string.indexOf(stopTime[0].split(" ")[1])>-1){
                                                return true
                                            }
                                        }
                                        if(string.indexOf("00")>-1){
                                            return true
                                        }
                                    },
                                    formatter: function (value, number) {
                                        var tVal = value.split(" ")[2];
                                        return tVal;
                                    },
                                    textStyle: {
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize:20,
                                        fontFamily:'Helvetica'
                                    },
                                    margin:'5'
                                },
                                axisLine: {
                                    lineStyle:{
                                        color:"#34394a"
                                    }
                                },
                                data: $this.v_data,
                                splitLine: {
                                    show: false
                                },
                                axisPointer: {
                                    show:true,
                                    lineStyle:{
                                        color:"rgba(255,255,255,0.5)",
                                        type:"dashed"
                                    },
                                    label: {
                                        formatter: function (params, value, s) {
                                            return (params.value);
                                        },
                                        padding:[3,5,5,5],
                                        show:false
                                    }
                                },
                                splitArea:{
                                    show:true,
                                    interval:30,
                                    areaStyle:{
                                        color:['rgba(255,255,255,0.1)','transparent']
                                    }
                                },
                                boundaryGap:false
                            },
                            {
                                type:"category",
                                axisLabel: {
                                    show:false
                                },
                                axisLine: {
                                    show:false
                                },
                                data: $this.v_data,
                                splitLine: {
                                    show: false
                                },
                                gridIndex: 1,
                                axisPointer:{
                                    lineStyle:{
                                        color:"transparent"
                                    },
                                    label:{
                                        show:false
                                    }
                                },
                                boundaryGap:false
                            }
                        ],
                        yAxis: [
                            {
                                // show:false,
                                min: minY1,
                                max: maxY1,
                                interval: split1,
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                splitLine:{
                                    lineStyle:{
                                        color:"transparent"
                                    }
                                },
                                axisLine:{
                                    lineStyle:{
                                        color:"#34394a"
                                    }
                                },
                                axisLabel: {
                                    show:false,
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return "";
                                        } else {
                                            return parseFloat(value).toFixed(2) + "%";
                                        }
                                    },
                                    textStyle: {
                                        fontSize:20,
                                        fontFamily:"Helvetica",
                                        color: function (value, index) {
                                            if (parseFloat(value) > 0) {
                                                return colorList[0];
                                            } else {
                                                return colorList[1];
                                            }
                                        }
                                    }
                                },
                                axisPointer: {
                                    show:false,
                                    label: {
                                        formatter: function (params, value, s) {
                                            return parseFloat(params.value).toFixed(2) + "%";
                                        }
                                    },
                                    // snap: true
                                }
                            },
                            {
                                min: minY,
                                max: maxY,
                                interval: split,
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: true
                                },
                                type: "value",
                                splitLine:{
                                    lineStyle:{
                                        color:"#34394a"
                                    }
                                },
                                axisLine:{
                                    lineStyle:{
                                        color:"#34394a"
                                    }
                                },
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return "";
                                        } else {
                                            return parseFloat(value).toFixed($this.decimal);
                                        }
                                    },
                                    textStyle: {
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize:20,
                                        fontFamily:'Helvetica',
                                        // color: function (value, index) {
                                        //     if (parseFloat(value) > parseFloat(yc)) {
                                        //         return colorList[0];
                                        //     } else {
                                        //         return colorList[1];
                                        //     }
                                        // }
                                    }
                                },
                                axisPointer: {
                                    lineStyle:{
                                        color:'rgba(255,255,255,0.5)',
                                        type:"dashed"
                                    },
                                    label: {
                                        show: true,
                                        formatter: function (params, value, s) {
                                            return parseFloat(params.value).toFixed($this.decimal);
                                        }
                                    },
                                    snap: true
                                }
                            },
                            {
                                type:'value',
                                scale: true,
                                splitLine:{
                                    show:false
                                },
                                axisLine:{
                                    show:false
                                },
                                axisLabel:{
                                    show:false
                                },
                                gridIndex: 1,
                                splitNumber: 2,
                                axisPointer: {
                                    show:false
                                }
                            }
                        ],
                        series: [
                            {
                                name:'limit',
                                type: 'line',
                                showSymbol: false,
                                hoverAnimation: false,
                                connectNulls:true,
                                symbolSize:0,
                                markLine: {
                                    animation:false,
                                    silent:true,
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: '#fff',
                                            width:0,
                                            opacity:0.5
                                        }
                                    },
                                    label: {
                                        normal: {
                                            // show:false,
                                            position:"start",
                                            formatter: function () {
                                                return "0.00%";
                                            }
                                        }
                                    },
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: 0.00
                                        }
                                    ],
                                    symbol: ['none', 'none']
                                },
                                lineStyle: {
                                    normal: {
                                        width:0,
                                        opacity:0
                                    }
                                },
                                data: zdfData
                            },
                            {
                                name: 'Mline',
                                type: 'line',
                                showSymbol: true,
                                hoverAnimation: false,
                                symbolSize:0,
                                smooth: true,
                                connectNulls:true,
                                data: price,
                                markPoint:{
                                    silent:true,
                                    data:[{
                                        coord:[$this.v_data[price.length-1],''+price[price.length-1]],
                                        value:'',
                                        symbol:'image://../img/round.png',
                                        symbolSize:10,
                                        name:'最后一个值',
                                        label:{
                                            normal:{
                                                show:false
                                            }
                                        }
                                    }]
                                },
                                markLine: {
                                    animation:false,
                                    silent:true,
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: '#fff',
                                            width:1,
                                            opacity:0.5
                                        }
                                    },
                                    label: {
                                        normal: {
                                            // show:false,
                                            position: "end",
                                            formatter: function (params) {
                                                return params.value + " ";
                                            }
                                        }
                                    },
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: middleY,
                                        },
                                    ],
                                    symbol: ['none', 'none']
                                },
                                lineStyle:{
                                    normal:{
                                        color:"#2b99ff",
                                        width:1
                                    }
                                },
                                areaStyle:{
                                    normal:{
                                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                            offset: 0,
                                            color: 'rgba(43, 153, 255,0.3)'
                                        }, {
                                            offset: 1,
                                            color: 'rgba(43, 153, 255,0.1)'
                                        }]),
                                        opacity:0
                                    }
                                },
                                yAxisIndex: 1
                            },
                            {
                                name: 'Vol',
                                type: 'bar',
                                xAxisIndex: 1,
                                yAxisIndex: 2,
                                data: volume,
                                barWidth:3,
                                itemStyle:{
                                    normal:{
                                        color:function(params){
                                            if(flag[params.dataIndex] > 0){
                                                return colorList[0];
                                            }else{
                                                return colorList[1];
                                            }
                                        },
                                        opacity: 0.8,
                                    }
                                }
                            }
                        ]
                    };
                    
                    myChart = echarts.init(document.getElementById('mline_charts'));
                    myChart.setOption(option);

                    count = myChart.getOption().series[0].data.length;
                    
                    var marktToolData = [
                        $this.history_data[count - 1], 
                        $this.z_history_data[count - 1], 
                        $this.a_history_data[count - 1] / 100, 
                        formatDate(parseFloat($this.c_data[count - 1]),"0"),//moment(parseFloat($this.c_data[count - 1])).format("YYYY-MM-DD HH:mm")
                        highPrice[count - 1],
                        openPrice[count - 1],
                        lowPrice[count - 1]
                    ];
                    var topPixel = 0;
                    myChart.on('showTip', function (params) {
                        mouseHoverPoint = params.dataIndex;
                        // 随鼠标移动的浮层
                        var pixel = myChart.convertToPixel({seriesIndex: 1}, [$this.v_data[mouseHoverPoint], ''+price[mouseHoverPoint]]);
                        if(topPixel == pixel[1]-150){
                            return;
                        }
                        $(".mline_info").css({"top":pixel[1],"left":pixel[0]-70});
                        topPixel = pixel[1]-150;
                        var tooltipTime = $this.v_data[mouseHoverPoint];
                            tooltipTime = tooltipTime.replace(/-/g,"/");
                        if ($this.history_data[mouseHoverPoint]) {
                            var tooltipHtml = '<span><label>Open</label><i>'+openPrice[mouseHoverPoint]+'</i></span>'+
                            '<span><label>High</label><i>'+highPrice[mouseHoverPoint]+'</i></span><span>'+
                            '<label>Low</label><i>'+lowPrice[mouseHoverPoint]+'</i></span><span>'+
                            '<label>Close</label><i>'+price[mouseHoverPoint]+'</i></span><span>'+
                            '<label>Volume</label><i>'+volume[mouseHoverPoint]+'</i></span><span>'+
                            '<label>% Change</label><i>'+zdfData[mouseHoverPoint]+'%</i></span>';
                            $(".mline_tooltip").html(tooltipHtml);

                            $(".mline_info").html(' <span class="stockDate">'+tooltipTime+'</span>'+
                            '<span><label class="stockName">'+$this.stockName+'</label>'+
                                '<i class="lastPrice">  '+price[mouseHoverPoint]+'</i></span>');
                        } else {
                            var tooltipHtml = '<span><label>Open</label><i>-</i></span>'+
                            '<span><label>High</label><i>-</i></span><span>'+
                            '<label>Low</label><i>-</i></span><span>'+
                            '<label>Close</label><i>-</i></span><span>'+
                            '<label>Volume</label><i>-</i></span><span>'+
                            '<label>% Change</label><i>-</i></span>';
                            $(".mline_tooltip").html(tooltipHtml);
                            $(".mline_info").html(' <span class="stockDate">'+tooltipTime+'</span>'+
                            '<span><label class="stockName">'+$this.stockName+'</label>'+
                                '<i class="lastPrice">-</i></span>');
                        }
                    });

                    $("#MLine").bind("mouseenter", function (event) {
                        toolContentPosition(event);
                        _this = $("#MLine");
                        $(".mline_tooltip").show();
                        $(".mline_info").show();
                    });

                    $("#MLine").bind("mousemove", function (event) {
                        isHoverGraph = true;
                        toolContentPosition(event);
                         _this = $("#MLine");
                    });

                    $("#MLine").bind("mouseout", function (event) {
                        isHoverGraph = false;
                        mouseHoverPoint = 0;
                        $(_this).children(".charts-focus").blur();
                        _this = window;
                        $(".mline_tooltip").hide();
                        $(".mline_info").hide();
                        topPixel = 0;
                    });

                    // Y轴的label
                    $(".point_label").show();
                    $(".point_label").text(price[price.length-1]);
                    var pixelLast = myChart.convertToPixel({seriesIndex: 1}, [$this.v_data[price.length-1], ''+price[price.length-1]]);
                    $(".point_label").css({'top':pixelLast[1]-12});
                    if(price[price.length-1] >= yc){
                        $(".point_label").css({"background-color":"#c23a39"});
                    }

                    function toolContentPosition(event) {
                        var offsetX = event.offsetX;
                        if(offsetX > pixelLast[0]) {
                            $(".mline_tooltip").hide();
                            $(".mline_info").hide();
                            topPixel = 0;
                            return;
                        }
                        $(".mline_tooltip").show();
                        $(".mline_info").show();
                        var continerWidth = $("#mline_charts").width(), toolContent = $(".mline_tooltip").width();
                        var centerX = continerWidth / 2;
                        if (offsetX > centerX) {
                            $(".mline_tooltip").css("left", 55);
                        } else {
                            $(".mline_tooltip").css("left", continerWidth - toolContent - 60);
                        }
                    }
                }else{
                    // $("#noData").show();
                    // $("#toolContent_M").hide();
                    // $(".vol").hide();
                    // $(".chartsTab").hide();
                    // console.log("初始化图表失败");
                    // $("#MLine").hide();    
                }
            }
        }else{
            // $("#noData").show();
            // $("#toolContent_M").hide();
            // $(".vol").hide();
            // $(".chartsTab").hide();
            // console.log("初始化图表失败");
            // $("#MLine").hide();
        }

        function set_marketTool(data,$this) {
            if (!isHoverGraph || isHoverGraph && !$this.history_data[mouseHoverPoint] && data) {
                $("#toolContent_M").children().first().text(data[3]);
                $("#toolContent_M").children().eq(2).text(data[2]);
                $(".vol i").text(data[2]);
                $("#quantityRatio").text(data[2]);
                if( parseFloat(data[0]) >= parseFloat(yc)){
                    $("#toolContent_M").children().eq(1).text(data[0]).css("color",colorList[0]);
                    $("#toolContent_M").children().eq(3).text(data[1]).css("color",colorList[0]);
                }else{
                    $("#toolContent_M").children().eq(1).text(data[0]).css("color",colorList[1]);
                    $("#toolContent_M").children().eq(3).text(data[1]).css("color",colorList[1]);
                }
            }
        }

    }
     $("#MLine,#kline").mouseover(function(){
        $(this).children(".kline-focus").focus();
    });
    $("#MLine,#kline").mouseout(function(){
        $(this).children(".kline-focus").blur();
    });
    $("#kline,#MLine").keydown(function (e) {
        $(window).off("scroll");
        var keyCode = e.keyCode;
        switch (keyCode) {
            case 37:
                move(-1, true);
                break; //左
            case 38:
                move(1);
                break;  //上
            case 39:
                move(1, true);
                break; //右
            case 40:
                move(-1);
                break; //下
            default:
                break;
        }
    });
    // 按键对应的move函数
    function move(index, type) {
        if($("#MLine").css("display") == "none") {
            // 获取dataZoom起始位置和结束位置，比较他的信息，设置他的位置
            var KStart = KLineSocket.KChart.getOption().dataZoom[0].start,
                KEnd = KLineSocket.KChart.getOption().dataZoom[0].end,
                KCenter = (KEnd-KStart)/2+KStart,
                KLength = KLineSocket.HistoryData.hCategoryList.length,
                KContinerWidth = $("#kline_charts").width();

            var count = KLineSocket.KChart?KLineSocket.KChart.getOption().series[0].data.length:0;
            if (type) {
                if (KLineSocket.KLineSet.mouseHoverPoint == 0 && index == -1) {
                    KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KChart.getOption().series[0].data.length;
                }
                if (KLineSocket.KLineSet.mouseHoverPoint + index > KLineSocket.KChart.getOption().series[0].data.length - 1 && index == 1) {
                    KLineSocket.KLineSet.mouseHoverPoint = 0;
                    index = 0;
                }
                // 信息框位置
                if ((KLineSocket.KLineSet.mouseHoverPoint+1)/KLength > KCenter/100) {
                    $("#kline_tooltip").css("left", 83/830*KContinerWidth);
                } else {
                    $("#kline_tooltip").css({"left":"auto","right":83/830*KContinerWidth});
                }
                $("#kline_tooltip").show();
                var name = KLineSocket.KChart.getOption().series[0].name;
                KLineSocket.KChart.dispatchAction({
                    type: 'showTip',
                    seriesIndex: 0,
                    dataIndex: KLineSocket.KLineSet.mouseHoverPoint + index,
                    name: name,
                    position: ['50%', '50%']
                });

            } else {
                if (index == 1) {
                    KLineSocket.KLineSet.start += 10;
                    if (KLineSocket.KLineSet.start > 100) {
                        KLineSocket.KLineSet.start = 100;
                        return;
                    } else {
                        KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KLineSet.mouseHoverPoint + (count * KLineSocket.KLineSet.zoom / 100);
                    }
                } else {
                    KLineSocket.KLineSet.start -= 10;
                    if (KLineSocket.KLineSet.start < 0) {
                        KLineSocket.KLineSet.start = 0;
                        return;
                    } else {
                        KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KLineSet.mouseHoverPoint - (count * KLineSocket.KLineSet.zoom / 100);
                    }
                }
                KLineSocket.KChart.dispatchAction({
                    type: 'dataZoom',
                    // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
                    dataZoomIndex: 0,
                    // 开始位置的百分比，0 - 100
                    start: KLineSocket.KLineSet.start,
                    // 结束位置的百分比，0 - 100
                    end: 100
                });
                
            }
        }else {
            var chart = myChart;
        
            if (type) {
                if (mouseHoverPoint == 0 && index == -1) {
                    mouseHoverPoint = chart.getOption().series[0].data.length;
                }
                if (mouseHoverPoint == 0 && index == 1) {
                    // index = 0;
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
                    // // 结束位置的百分比，0 - 100
                    end: 100
                });    
            }
        }
    }

    // 接收到清盘指令重绘图表
    function redrawChart(data,$this){
        $this = $this.options;
        $this.history_data = []; //价格历史记录
        $this.z_history_data = []; //涨跌幅历史记录
        $this.a_history_data = []; //成交量记录
        $this.flag_data = []; //成交量颜色记录 1为绿 -1为红
        // $this.v_data = [];
        // $this.c_data = [];
        $this.open_data = [];
        $this.high_data = [];
        $this.low_data = [];
        setFieldInfo({High:0,Low:0,Open:0,Value:0,Volume:0,Last:0});
        var decimal = $this.decimal;
        if(data){
            if(myChart == undefined) return;
            yc = parseFloat(yc);
            if (yc) {
                var minY = (yc - yc*0.1).toFixed(decimal);
                var middleY = yc.toFixed(decimal);
                var maxY = (yc + yc*0.1).toFixed(decimal);
                var dd = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc) * 100);

                if(Math.abs(dd) > 1){
                    var minY1 = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc)).toFixed(2);
                    var maxY1 = ((parseFloat(maxY) - parseFloat(yc)) / parseFloat(yc)).toFixed(2);
                }else{
                    var minY1 = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                    var maxY1 = ((parseFloat(maxY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                }
            } else {
                var minY = 0;
                var middleY = 1;
                var maxY = 2;
            }
            var split = parseFloat(((maxY - minY) / 6).toFixed(4));
            var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(4));

            v_data =  getxAxis((data[0].Date),$this);
            var option ={
                yAxis: [
                    {
                        min: minY1,
                        max: maxY1,
                        interval: split1
                    },{
                        min: minY,
                        max: maxY,
                        interval: split
                    }
                ],
                // xAxis:[{
                //     data:v_data
                // },{
                //     data:v_data
                // }],
                series: [
                    {
                        data: []
                    },
                    {
                        data: [],
                        markLine: {
                            data: [
                                {
                                    name: 'Y 轴值为 100 的水平线',
                                    yAxis: middleY
                                }
                            ],
                            symbol: ['none', 'none']
                        }
                    },
                    {
                        data: []
                    }
                ]
            };
            myChart.setOption(option);
        }else{
            console.log("清盘有误");
        }
    }

    // 获取X轴的数值
    function getxAxis(todayDateStr,$this){
        var beginTime,finishTime,beginTime1,finishTime1;
        //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
        var b_time1,b_time2;  // 停盘时间
        var todayDate = formatDate(todayDateStr);
        var dateArr = new Array();
        var dateArrStamp = new Array();
        if(sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
            // todayDate = formatDate(data[0].Date + sub);
            if($this.nowDateTime.length > 1){
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
                beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
                finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;
                
                b_time1 = moment(finishTime).utc().valueOf();
                b_time2 = moment(beginTime1).utc().valueOf();
                stopTime = [finishTime,beginTime1];
            }else{
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
            }
        }else{  //跨天的时间计算  1-中间有断开
            if($this.nowDateTime.length > 1){
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
                beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
                finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;
                stopTime = [finishTime,beginTime1];
                // 前半段时间的起始时间和结束时间比较
                if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                    //都是当天时间 
                    // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                    if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                        // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                        if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                        }else{
                            //跨天
                            finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
                        }
                    }else{
                        beginTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].startTime1;
                        finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
                    }
                }else{
                    //结束时间为第二天   跨天了
                    finishTime = formatDate(todayDateStr+1) + " " + $this.nowDateTime[0].endTime;
                    beginTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].startTime1;
                    finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
                }

                b_time1 = moment(finishTime).utc().valueOf();
                b_time2 = moment(beginTime1).utc().valueOf();
            }else{  // 2- 中间未断开
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = formatDate(todayDateStr+1) + " " + $this.nowDateTime[0].endTime;
            }
        }
        beginTime = moment(beginTime).utc().valueOf(); //开盘时间
        if(finishTime1){
            endDateTime = finishTime1;
            finishTime = moment(finishTime1).utc().valueOf();
        }else{
            endDateTime = finishTime;                        
            finishTime = moment(finishTime).utc().valueOf(); //清盘时间
        }
        var timeAdd = beginTime;
        var i = 0;
        while (moment(timeAdd).isBefore(moment(finishTime))) {
            if (i == 0) {
                dateArrStamp.push(beginTime);
            } else {
                timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
                if(b_time1 && b_time2){
                    if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                        continue;
                    } else {
                        dateArrStamp.push(timeAdd);
                    }
                }else{
                    dateArrStamp.push(timeAdd);
                }
            }
            i++;
        }
        for(var k = 0;k < dateArrStamp.length;k++){
            dateArr.push(formatDate(dateArrStamp[k],"1"));
        }
        $this.c_data = dateArrStamp;
        return dateArr;
    }

    $.fn.initMline = function(options,params){
        options = $.extend({},$.fn.initMline.defaults,options || {});
        var $this = $(this);
        // 初始化代码表
        xml = new InitXMLIChart(options);
        return xml.initXML();
    };

    // ecahrts图进行缩放
    $(window).resize(function(){
        if($("#kline").css("display")=="none"){
            if(myChart){
                myChart.resize({width:"auto",height:"auto"});
            }
        }else{
            chartResize();
        }         
    });

     /*
        * 分时图的下拉选择 线还是区域
        */
    $(".flt-text").click(function () {
        if ($(".f-lineType-box").hasClass("clicked")) {
            $(".f-lineType-box").removeClass("clicked");
            $(".f-lineType-box").hide();
        } else {
            $(".f-lineType-box").addClass("clicked")
            $(".f-lineType-box").show();
        }
    });
    $(".flb-toggle li").on("click", function (event) {
        var html = "<span class=\"fl-trangle\"></span>";
        html = $(this).html() + html;
        $(".flt-text").html(html);
        if(myChart){
            if($(this).index() == 0){
                myChart.setOption({
                    series:[{},{
                        areaStyle:{
                            normal:{
                                opacity:0
                            }
                        }
                    }]
                });
            }else if($(this).index() == 1){
                myChart.setOption({
                    series:[{},{
                        areaStyle:{
                            normal:{
                                opacity:1
                            }
                        }
                    }]
                });
            }
        }
        $(".f-lineType-box").removeClass("clicked");
        $(".f-lineType-box").hide();
        return false;
    });
})(jQuery);