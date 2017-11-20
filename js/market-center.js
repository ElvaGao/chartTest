var wsUrlDevelop = 'ws://172.17.20.203:7681';//'ws://103.66.33.31:443';//开发
var stockXMlUrl = "http://172.17.20.203:6789/101";//"../xml/ths.xml";//"http://172.17.20.203:6789/101";
var exponentDateTime = [];//解析XML后得到的数组 所有指数的时间、类型、id、小数位数等
var elementId;
var ZSId;
var LSData = ZCData = DYData = QPDATA = null;

$(function(){
    //第一次打开终端,初始化代码表第一次默认请求
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
            exponentDateTime = getExponentDateTime(xml,allZSCode);
            $("#main1").initMline(
                {
                    id:"1",
                }
            );
            $("#main2").initMline(
                {
                    id:"1000",
                }
            );
            $("#main3").initMline(
                {
                    id:"1500",
                }
            );
        }
    }); 
});
;(function($,window,document,undefined){
    $.fn.initMline = function(options,params){
        var socket = null;
        options = $.extend({},options,$.fn.initMline.defaults);
        $this = $(this);
        elementId = $this.attr("id");
        ZSId = options.id;

        socket = new WebSocketConnect();
        var ws = socket.createWebSocket();

        var opt = {
            id:ZSId,
            elementId:elementId,
            socket:socket,
        };
        var chartsInit = new InitMlineCharts(opt);
        chartsInit.initEvent(ws);
    };
    var InitMlineCharts = function(opt){
        this.myChart = null;
        this.options = {
            oneZSInfo : compareTime(exponentDateTime,ZSId),
            id:opt.id,
            elementId:opt.elementId,
            socket:opt.socket,
            c_data : [],
            v_data : [],
            interval : 0,
            isHoverGraph:false,
            mouseHoverPoint : 0,
            history_data:[],//价格历史数据
            z_history_data:[],//涨跌幅历史数据
            a_history_data:[],//成交量
            yc:null,//昨收
            nowDateTime:[],
            // 获取历史数据
            LSData:{
                "MsgType": "C213",
                "ExchangeID": "101",
                "InstrumentID": opt.id,
                "StartIndex": "0",
                "StartDate": "-1",
                "StartTime": "0", 
                "Count": "0"
            },
            // 获取昨收值
            ZCData:{
                "MsgType":"S101",
                "DesscriptionType":"3",
                "ExchangeID":"101",
                "InstrumentID":opt.id,
                "Instrumenttype":"2"
            },
            // 订阅实时推送
            DYData:{
                "MsgType":"S101",
                "DesscriptionType":"3",
                "ExchangeID":"101",
                "InstrumentID":opt.id,
                "Instrumenttype":"5"
            },
            // 清盘
            QPDATA:{
                "MsgType":"S101",
                "DesscriptionType":"3",
                "ExchangeID":"101",
                "InstrumentID":opt.id,
                "Instrumenttype":"4"
            }
        };
    };
    InitMlineCharts.prototype.initEvent = function(ws){
        var self = this;
        var _this = this.options;
        ws.onclose = function () {
            _this.socket.reconnect(); //终端重连
        };
        ws.onerror = function () {
            _this.socket.reconnect(); //报错重连
        };
        ws.onopen = function () {
            //心跳检测重置
            _this.socket.reset().start(); //都第一次建立连接则启动心跳包
            // 获取历史数据
            _this.socket.request(_this.LSData);
            // 获取昨收
            _this.socket.request(_this.ZCData);
            // 实时订阅
            _this.socket.request(_this.DYData);
            // 清盘
            _this.socket.request(_this.QPData);
        };
        ws.onmessage = function (evt) {
            var data  = evt.data.split("|")[0];  //每个json包结束都带有一个| 所以分割最后一个为空
            data = eval( "(" + data + ")" );
            data = data || data[0];
            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
            switch(MsgType)
            {
                case "R213"://订阅历史数据
                // 初始化图表
                initCharts(data,'',_this);
                break;
                case "Q619"://订阅快照
                if(!_this.yc){
                    _this.yc = data[0].PreClose; //获取昨收值
                    return;
                }
                break;
                case "Q213"://订阅分钟线
                    if(_this.myChart != undefined){
                        initCharts(data,"add",_this);
                    }
                break;
                case "Q640"://清盘
                   var MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                    if(MarketStatus == 1){//收到清盘指令  操作图表
                        redrawChart(data,_this);
                    }
                case "R646":  //心跳包
                    // console.log(data);
                default:
                break;
            }
            _this.socket.reset().start();
        };
    }; 
    // 清盘后重绘图表
    function redrawChart(data,$this){
        $this.history_data = []; //价格历史记录
        $this.z_history_data = []; //涨跌幅历史记录
        $this.a_history_data = []; //成交量记录
        $this.v_data = [];
        $this.c_data = [];
        if(data){
            if($this.myChart == undefined) return;
            yc = parseFloat($this.yc);
            decimal = $this.decimal;
            if (yc) {
                var minY = (yc - yc*0.03).toFixed(decimal);
                var middleY = yc.toFixed(decimal);
                var maxY = (yc + yc*0.03).toFixed(decimal);

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

            $this.v_data =  getxAxis((data[0].Date));
            var option ={
                yAxis: [
                    {
                        min: minY,
                        max: maxY,
                        interval: split
                    },{
                        min: minY1,
                        max: maxY1,
                        interval: split1
                    }
                ],
                xAxis:[{
                    data:$this.v_data
                },{
                    data:$this.v_data
                }],
                series: [
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
                    },
                    {
                        data: []
                    }
                ]
            };
            $this.myChart.setOption(option);
        }else{
            console.log("清盘有误");
        }
    }
    // 初始化图表
    function initCharts(data,type,$this){
        if(!data){
            console.log("没有数据");
            return;
        }
        var yc = $this.yc;//昨收
        // var interval = $this.interval;//间隔   计算Y轴最大值和最小值用到
        var decimal = $this.oneZSInfo[0].decimal;//保留的小数位数
        var sub = $this.oneZSInfo[0].sub;//是否跨天交易  -1为跨天 0未跨天
        if(type == "add"){
            if(!$this.myChart){
                console.log("图表还没有没有初始化呢  ^-^");
                return;
            }
            yc = parseFloat(yc);
            var a_lastData = data;
            var last_dataTime = formatTime(a_lastData[0].Time);//moment(parseFloat(a_lastData[0].Time + "000")).format("HH:mm"); //行情最新时间
            var last_date = dateToStamp(formatDate(a_lastData[0].Date) +" " + last_dataTime);
            var zVale = parseFloat(((parseFloat(a_lastData[0].Price) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2)); //行情最新涨跌幅
            var aValue = parseFloat(a_lastData[0].Volume); //最新成交量

            if((parseFloat(a_lastData[0].Price)) > (yc + yc*0.03).toFixed(decimal)){
                a_lastData[0].Price = (yc + yc*0.03).toFixed(decimal);
            }else if((parseFloat(a_lastData[0].Price)) < (yc - yc*0.03).toFixed(decimal)){
                a_lastData[0].Price = (yc - yc*0.03).toFixed(decimal);
            }

            for(var i=0;i<$this.c_data.length;i++){
                if(last_date == $this.c_data[i]){
                    $this.history_data[i] = parseFloat(a_lastData[0].Price);
                    $this.z_history_data[i] = parseFloat(zVale);
                    $this.a_history_data[i] = parseFloat(aValue);
                    // 中间有断开
                    if(i > ($this.history_data.length-1) ){
                        for(var j=$this.history_data.length-1;j<=i;j++){
                            $this.history_data[j].push(null);
                            $this.z_history_data[j].push(null);
                            $this.a_history_data[j].push(null);
                            if(j == i){
                                $this.history_data[j] = parseFloat(a_lastData[0].Price);
                                $this.z_history_data[j] = parseFloat(zVale);
                                $this.a_history_data[j] = parseFloat(aValue);
                            }
                        }
                    }
                }else{
                    
                }
            }
            var fvalue, r1;
            fvalue = parseFloat(a_lastData[0].Price);
            r1 = Math.abs(fvalue - parseFloat(yc));
            if (r1 > $this.interval) {
                $this.interval = r1;
                var minY = (yc - $this.interval).toFixed(decimal);
                var middleY = yc.toFixed(decimal);
                var maxY = (yc + $this.interval).toFixed(decimal);
                var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                $this.myChart.setOption({
                    yAxis: {
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
                                    return parseFloat(value).toFixed(decimal);
                                }
                            }
                        }
                    },
                    series: 
                    {
                        markLine: {
                            data: [
                                {
                                    name: 'Y 轴值为 100 的水平线',
                                    yAxis: middleY
                                }
                            ]
                        }
                    }
                });
            }
            $this.myChart.setOption({
                xAxis:{
                    data:$this.v_data
                },
                series: [
                    {
                        data: $this.history_data,
                    }
                ]
            });
        }else{
            if(!data.d && data.d.length<=0){
                console.log("暂时没有数据");
                return;
            }
            data = data.d;
            var startTime=startTime1=endTime=endTime1=null;//各个指数的交易时间
            if($this.oneZSInfo.length>1){//分段计算时间
                startTime = $this.oneZSInfo[0].startTime;
                endTime = $this.oneZSInfo[0].endTime;
                startTime1 = $this.oneZSInfo[1].startTime1;
                endTime1 = $this.oneZSInfo[1].endTime1;
            }else{//时间连续交易
                startTime = $this.oneZSInfo[0].startTime;
                endTime = $this.oneZSInfo[0].endTime;
            }
            var price = [];//价格
            var volume = [];//成交量
            var zdfData = [];//涨跌幅
            $.each(data, function (i, o) {
                var fvalue,r1;
                fvalue = parseFloat(o.Price);//价格
                price.push(o.Price);
                volume.push(o.Volume);
                zdfData.push((((fvalue-parseFloat(yc))/parseFloat(yc))* 100).toFixed(2));
                if(fvalue > 0){
                    r1 = Math.abs(fvalue - parseFloat(yc));
                    if (r1 > $this.interval) {
                        $this.interval = r1;
                    }
                }
            });

            $this.history_data = price;//价格历史数据
            $this.z_history_data = zdfData;//涨跌幅历史数据
            $this.a_history_data = volume;//成交量历史数据
            
            //取绝对值  差值 
            $this.interval = $this.interval*2;
            yc = parseFloat(yc);
            if (yc) {
                var minY = (yc - $this.interval).toFixed(decimal);
                var middleY = yc.toFixed(decimal);
                var maxY = (yc + $this.interval).toFixed(decimal);

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
            $this.v_data = getxAxis(data[0].Date,$this);

            var option = {
                grid:{
                    show:true,
                    borderColor:"#e5e5e5",
                    top:'10%',
                    left:"5%",
                    right:"10%",
                    height:'90%',
                    containLabel:true
                },
                dataZoom:{
                    type:"inside",
                    xAxisIndex:0,
                    yAxisIndex:0,
                },
                tooltip:{
                    trigger:"axis",
                    axisPointer:{
                        type:"cross",
                        crossStyle:{
                            type:"dotted"
                        }
                    },
                    show:false
                },
                axisPointer:{
                    show:true,
                    label:{
                        show:true,
                        backgroundColor:"#555"
                    },
                    lineStyle:{
                        type:"dotted"
                    }
                },
                xAxis:{
                    splitLine:{
                        lineStyle:{
                            color:"#e5e5e5"
                        }
                    },
                    axisLine:{
                        show:false
                    },
                    axisTick:{
                        show:false
                    },
                    type:"category",
                    data:$this.v_data,
                    axisLabel: {
                        interval: function (number, string) {
                            if(startTime1){//有中端
                                if(string.indexOf(startTime)>-1 || string.indexOf(endTime)>-1 || string.indexOf(endTime1)>-1){
                                    return true;
                                }else{
                                    return false;
                                }
                            }else{//连续
                                if(string.indexOf(startTime)>-1 || string.indexOf(endTime)>-1){
                                    return true;
                                }else{
                                    return false;
                                }
                            }
                        },
                        formatter: function (value, number) {
                            var tVal = value.split(" ")[3];
                            if(startTime1 && value.indexOf(endTime)>-1){
                                if(startTime1 == "13:01"){
                                    tVal = tVal+"/"+"13:00";
                                }else{
                                    tVal = tVal+"/"+startTime1;
                                }
                            }
                            return tVal;
                        },
                        textStyle: {
                            color: '#999'
                        }
                    },
                    axisPointer: {
                        show:true,
                        label: {
                            formatter: function (params, value, s) {
                                return (params.value);
                            },
                            padding:[3,5,5,5],
                            show:true
                        }
                    }
                },
                yAxis:[{
                    position:"right",
                    type:"value",
                    min:minY,
                    max:maxY,
                    interval: split,
                    boundaryGap: [0, '100%'],
                    splitLine:{
                        lineStyle:{
                            color:"#e5e5e5"
                        }
                    },
                    axisLine:{
                        show:false
                    },
                    axisTick:{
                        show:false
                    },
                    axisPointer: {
                        label: {
                            formatter: function (params, value, s) {
                                return parseFloat(params.value).toFixed(decimal);
                            }
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
                            color: "#999"
                        }
                    },
                },
                // {
                //     show:false,
                //     min: minY1,
                //     max: maxY1,
                //     interval: split1,
                //     boundaryGap: [0, '100%'],
                //     axisTick: {
                //         show: false
                //     },
                //     type: "value",
                //     splitLine:{
                //         lineStyle:{
                //             color:"transparent"
                //         },
                //         show:false
                //     },
                //     axisLine:{
                //         lineStyle:{
                //             color:'transparent'
                //         },
                //         show:false
                //     },
                //     axisLabel: {
                //         formatter: function (value, index) {
                //             if (index == 3) {
                //                 return "";
                //             } else {
                //                 return parseFloat(value).toFixed(2) + "%";
                //             }
                //         },
                //         textStyle: {
                //             color: function (value, index) {
                //                 if (parseFloat(value) > 0) {
                //                     return colorList[0];
                //                 } else {
                //                     return colorList[1];
                //                 }
                //             }
                //         },
                //         show:false
                //     },
                //     axisPointer: {
                //         label: {
                //             formatter: function (params, value, s) {
                //                 return parseFloat(params.value).toFixed(2) + "%";
                //             }
                //         },
                //         show:false
                //     }
                // }
                ],
                series:{
                    type:'line',
                    symbolSize:0,
                    hoverAnimation:false,
                    connectNulls:true,
                    animation:false,
                    lineStyle:{
                        normal:{
                            color:"#2b99ff",
                            width:1
                        }
                    },
                    areaStyle:{
                        normal:{
                            color:{
                                type: 'linear',
                                x:0,
                                y:0,
                                x2:0,
                                y2:1,
                                colorStops: [{
                                    offset: 0, color: 'rgba(43,153,255,0.3)' // 0% 处的颜色
                                }, {
                                    offset: 1, color: 'rgba(43,153,255,0.1)' // 100% 处的颜色
                                }],
                                globalCoord: false
                            }
                        }
                    },
                    markLine:{
                        symbolSize:0,
                        lineStyle:{
                            normal:{
                                color:"#999",
                                type:"dotted"
                            }
                        },
                        data: [
                            {
                                name: 'Y 轴值为 100 的水平线',
                                yAxis: middleY
                            }
                        ],
                        animation:false
                    },
                    data:price
                }
            };
            $this.myChart = echarts.init(document.getElementById($this.elementId));
            $this.myChart.setOption(option);

            count = $this.myChart.getOption().series[0].data.length;
            
            var marktToolData = [$this.history_data[count - 1], $this.z_history_data[count - 1], $this.a_history_data[count - 1], moment(parseFloat($this.c_data[count - 1])).format("YYYY-MM-DD HH:mm")];
            set_marketTool(marktToolData,$this); //设置动态行情条

            $this.myChart.on('showTip', function (params) {
                $this.mouseHoverPoint = params.dataIndex;
                var htmlStr = '';
                if ($this.history_data[$this.mouseHoverPoint]) {
                    var size = (parseFloat($this.history_data[$this.mouseHoverPoint]) - parseFloat(yc)).toFixed(decimal);
                    if($this.history_data[$this.mouseHoverPoint] >= yc){
                        htmlStr = '<label class="col_e22"><i style="font-size: 24px;margin-right: 10px;">'+$this.history_data[$this.mouseHoverPoint]+'</i><i style="margin-right: 10px;">+'+$this.z_history_data[$this.mouseHoverPoint]+'%</i><i>+'+size+'</i></label>';
                    }else{
                        htmlStr = '<label class="col_3bc"><i style="font-size: 24px;margin-right: 10px;">'+$this.history_data[$this.mouseHoverPoint]+'</i><i style="margin-right: 10px;">'+$this.z_history_data[$this.mouseHoverPoint]+'%</i><i>'+size+'</i></label>';
                    }
                    $("#"+$this.elementId).parents(".market-main-chart").siblings(".market-chart-decs").html(htmlStr);
                } else {
                    htmlStr = '<label class="col_e22"><i>-</i><i>-</i><i>-</i></label>';
                    $("#"+$this.elementId).parents(".market-main-chart").siblings(".market-chart-decs").html(htmlStr);
                }
            });
        }
    }

    function set_marketTool(data,_this) {
        if (!_this.isHoverGraph || _this.isHoverGraph && !_this.history_data[_this.mouseHoverPoint] && data) {
            var htmlStr = '';
            var size = (parseFloat(data[0]) - parseFloat(_this.yc)).toFixed(_this.oneZSInfo[0].decimal);
            if(parseFloat(data[0]) >= parseFloat(_this.yc)){
                htmlStr = '<label class="col_e22"><i style="font-size: 24px;margin-right: 10px;">'+data[0]+'</i><i style="margin-right: 10px;">+'+data[1]+'%</i><i>+'+size+'</i></label>';
            }else{
                htmlStr = '<label class="col_3bc"><i style="font-size: 24px;margin-right: 10px;">'+data[0]+'</i><i style="margin-right: 10px;">'+data[1]+'%</i><i>'+size+'</i></label>';
            }
            $("#"+_this.elementId).parents(".market-main-chart").siblings(".market-chart-decs").html(htmlStr);
        }
    }

    // 获取X轴的数值
    function getxAxis(todayDateStr,$this){
        var beginTime,finishTime,beginTime1,finishTime1;
        //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
        var b_time1,b_time2;  // 停盘时间
        var todayDate = formatDate(todayDateStr);
        // console.log($this.oneZSInfo);
        if($this.oneZSInfo[0].sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
            if($this.oneZSInfo.length > 1){
                beginTime = todayDate + " " + $this.oneZSInfo[0].startTime;
                finishTime = todayDate + " " + $this.oneZSInfo[0].endTime;
                beginTime1 = todayDate + " " + $this.oneZSInfo[1].startTime1;
                finishTime1 = todayDate + " " + $this.oneZSInfo[1].endTime1;
                
                b_time1 = moment(finishTime).utc().valueOf();
                b_time2 = moment(beginTime1).utc().valueOf();
            }else{
                beginTime = todayDate + " " + $this.oneZSInfo[0].startTime;
                finishTime = todayDate + " " + $this.oneZSInfo[0].endTime;
            }
        }else{  //跨天的时间计算  1-中间有断开
            if($this.oneZSInfo.length > 1){
                beginTime = todayDate + " " + $this.oneZSInfo[0].startTime;
                finishTime = todayDate + " " + $this.oneZSInfo[0].endTime;
                beginTime1 = todayDate + " " + $this.oneZSInfo[1].startTime1;
                finishTime1 = todayDate + " " + $this.oneZSInfo[1].endTime1;

                // 前半段时间的起始时间和结束时间比较
                if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                    //都是当天时间 
                    // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                    if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                        // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                        if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                        }else{
                            //跨天
                            finishTime1 = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[1].endTime1;
                        }
                    }else{
                        beginTime1 = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[1].startTime1;
                        finishTime1 = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[1].endTime1;
                    }
                }else{
                    //结束时间为第二天   跨天了
                    finishTime = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[0].endTime;
                    beginTime1 = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[1].startTime1;
                    finishTime1 = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[1].endTime1;
                }

                b_time1 = moment(finishTime).utc().valueOf();
                b_time2 = moment(beginTime1).utc().valueOf();
            }else{  // 2- 中间未断开
                beginTime = todayDate + " " + $this.oneZSInfo[0].startTime;
                finishTime = formatDate(todayDateStr+1) + " " + $this.oneZSInfo[0].endTime;
            }
        }
        beginTime = moment(beginTime).utc().valueOf(); //开盘时间
        if(finishTime1){
            finishTime = moment(finishTime1).utc().valueOf();
        }else{
            finishTime = moment(finishTime).utc().valueOf(); //清盘时间
        }
        var timeAdd = beginTime;
        var i = 0;
        while (moment(timeAdd).isBefore(moment(finishTime))) {
            if (i == 0) {
                $this.c_data.push(beginTime);
            } else {
                timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
                if(b_time1 && b_time2){
                    if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                        continue;
                    } else {
                        $this.c_data.push(timeAdd);
                    }
                }else{
                    $this.c_data.push(timeAdd);
                }
            }
            i++;
        }
        for(var k = 0;k < $this.c_data.length;k++){
            $this.v_data.push(formatDate($this.c_data[k],"1"));
        }
        return $this.v_data;
    }
    //1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位
    function compareTime(dateList,id){
        var decimal,typeIndex,sub;
        var ZSInfo = new Array();
        for(let i=0;i<dateList.length;i++){
            if( id == dateList[i].id ){
                decimal = parseInt(dateList[i].decimalCount);//保留小数位数
                typeIndex = dateList[i].type;//指数类型
                var start = parseInt(dateList[i].startTime.split(":")[0]);
                var end = parseInt(dateList[i].endTime.split(":")[0]);
                if(dateList[i].endTime1){
                    end = parseInt(dateList[i].endTime1.split(":")[0]);
                }
                var json,json1;
                if(start > end){//国际时间，需要将当前时间减一
                    json = {
                        ZSId:id,
                        sub : -1,
                        decimal:decimal,
                        typeIndex:typeIndex,
                        startTime:dateList[i].startTime,
                        endTime:dateList[i].endTime1
                    };
                    ZSInfo.push(json);
                }else{
                    json = {
                        sub : 0,
                        id:id,
                        decimal:decimal,
                        typeIndex:typeIndex,
                        startTime:dateList[i].startTime,
                        endTime:dateList[i].endTime
                    };
                    ZSInfo.push(json);
                    if(dateList[i].startTime1){
                        json1 = {
                            startTime1:dateList[i].startTime1,
                            endTime1:dateList[i].endTime1
                        };
                        ZSInfo.push(json1);
                    }
                }
            }
        }
        return ZSInfo;
    }
    // 建立数据连接 websocket  
    var WebSocketConnect = function() {
        this.ws = null;
        var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
        // var wsUrl = 'ws://103.66.33.37:80'; //生产
        wsUrl = wsUrlDevelop;  //开发
        var timeout = 60000,//60秒
            timeoutObj = null,
            serverTimeoutObj = null;
        var _target = this;
        var XTB = {
            "MsgType":"C646",
            "ExchangeID":"101",
            "InstrumentID":ZSId
        };
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
                var chartsInit = new InitMlineCharts();
                chartsInit.initEvent(ws);
                lockReconnect = false;
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
                //onmessage拿到返回数据就说明连接正常
                self.request(XTB);
                self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
                    self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
                }, timeout);
            }, timeout);
        };
    };
})(jQuery, window, document);
// 点击切换处理
function tabLi(index){
    console.log(index);
}
//从XML表中摘出时间，name,id，小数位,指数类型   公共方法   返回的是数组
function getExponentDateTime(xmlCode,_codeList){
    let startTime,endTime,startTime1,endTime1,ids,names,decimalCount,type,json;
    let exponentDateTime = [];
    for(let i=0;i<_codeList.length;i++){
        if(_codeList[i].attributes["ts"]){
            decimalCount = $($(_codeList[i]).parent("product")[0]).attr("PriceDecimal");
            type = $($(_codeList[i]).parent("product")[0]).attr("type");
            if(_codeList[i].attributes["ts"].value.indexOf(";")>-1){
                var st = _codeList[i].attributes["ts"].value.split(";")[0];
                var et = _codeList[i].attributes["ts"].value.split(";")[1];
                startTime = st.split("-")[0];
                endTime = st.split("-")[1];
                startTime1 = et.split("-")[0];
                endTime1 = et.split("-")[1];
                ids = _codeList[i].attributes["id"].value;
                names = _codeList[i].attributes["name"].value;
                json = {
                    id:ids,
                    name:names,
                    startTime:startTime,
                    endTime:endTime,
                    startTime1:startTime1,
                    endTime1:endTime1,
                    decimalCount:decimalCount,
                    type:type
                };
                exponentDateTime.push(json);
            }else{
                startTime = _codeList[i].attributes["ts"].value.split("-")[0];
                endTime = _codeList[i].attributes["ts"].value.split("-")[1];
                startTime1 = endTime1 = "";
                names = _codeList[i].attributes["name"].value;
                ids = _codeList[i].attributes["id"].value;
                json = {
                    id:ids,
                    name:names,
                    startTime:startTime,
                    endTime:endTime,
                    startTime1:startTime1,
                    endTime1:endTime1,
                    decimalCount:decimalCount,
                    type:type
                };
                exponentDateTime.push(json);
            }
        }else{
            var elValue = $($(_codeList[i]).parent("product")[0]).attr("ts");
            decimalCount = $($(_codeList[i]).parent("product")[0]).attr("PriceDecimal");
            type = $($(_codeList[i]).parent("product")[0]).attr("type");
            if(elValue.indexOf(";")>-1){
                var st = elValue.split(";")[0];
                var et = elValue.split(";")[1];
                startTime = st.split("-")[0];
                endTime = st.split("-")[1];
                startTime1 = et.split("-")[0];
                endTime1 = et.split("-")[1];
                ids = _codeList[i].attributes["id"].value;
                names = _codeList[i].attributes["name"].value;
                if($($(_codeList[i]).parent("product")[0]).attr("name") == "指数"){
                    startTime1  = startTime1.split(":")[0] +":"+ parseInt(startTime1.split(":")[1])+"1";
                }
                json = {
                    id:ids,
                    name:names,
                    startTime:startTime,
                    endTime:endTime,
                    startTime1:startTime1,
                    endTime1:endTime1,
                    decimalCount:decimalCount,
                    type:type              
                };
                exponentDateTime.push(json);
            }else{
                startTime = elValue.split("-")[0];
                endTime = elValue.split("-")[1];
                names = _codeList[i].attributes["name"].value;
                startTime1 = endTime1 = "";
                ids = _codeList[i].attributes["id"].value;
                json = {
                    id:ids,
                    name:names,
                    startTime:startTime,
                    endTime:endTime,
                    startTime1:startTime1,
                    endTime1:endTime1,
                    decimalCount:decimalCount,
                    type:type
                };
                exponentDateTime.push(json);
            }
        }
    }
    return exponentDateTime;
}