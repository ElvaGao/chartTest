var wsUrlDevelop = 'ws://103.66.33.67:80';//'ws://103.66.33.31:443';//开发
var stockXMlUrl = "http://103.66.33.58:443/GetCalcData";//"../xml/ths.xml";//"http://172.17.20.203:6789/101";
var exponentDateTime = [];//解析XML后得到的数组 所有指数的时间、类型、id、小数位数等
var elementId;
var ZSId,ExchangeID;
var LSData = ZCData = DYData = QPDATA = null;
var _FirstS = [{name:"上证综指",sectionid:1,code:"000001"},{name:"深证成指",sectionid:1,code:"399001"},{name:"沪深300",sectionid:1,code:"399007"}];
var _SecS = [{name:"深证成指",sectionid:2,code:"399001"},{name:"创业板",sectionid:2,code:"395004"},{name:"中小板",sectionid:2,code:"399003"}];
var _ThirS = [{name:"上证综指",sectionid:3,code:"000001"},{name:"深证成指",sectionid:3,code:"399001"},{name:"沪深300",sectionid:3,code:"399007"}];
var _FourthS = [{name:"深证成指",sectionid:4,code:"399001"},{name:"创业板",sectionid:4,code:"395004"},{name:"中小板",sectionid:4,code:"399003"}];
var _FifthS = [{name:"深证成指",sectionid:5,code:"399001"},{name:"创业板",sectionid:5,code:"395004"},{name:"中小板",sectionid:5,code:"399003"}];
var _SixthS = [{name:"深证成指",sectionid:6,code:"399001"},{name:"创业板",sectionid:6,code:"395004"},{name:"中小板",sectionid:6,code:"399003"}];


$(function(){
    $("#main1").initMline(
        {
            id:_FirstS[0].code,
            exchangeID:"1",
            stockName:_FirstS[0].name,
            stockCode:_FirstS[0].code,
        }
    );
    $("#main2").initMline(
        {
            id:_FirstS[1].code,
            exchangeID:"2",
            stockName:_FirstS[1].name,
            stockCode:_FirstS[1].code,
        }
    );
    $("#main3").initMline(
        {
            id:_FirstS[2].code,
            exchangeID:"2",
            stockName:_FirstS[2].name,
            stockCode:_FirstS[2].code,
        }
    );
    checkoutBlock();
    // 点击其他地方收回搜索下拉列表
    $("body").on("click",function(e){
        if($(e.target).attr("id") == "searchInput"){
            return;
        }
        $("#searchEnd").slideUp();
    });
});
// 查询板块
function checkoutBlock(){
    $.ajax({
        url:"http://103.66.33.58:443/GetSections?",
        data:{"SectionClass":5},
        type:"GET",
        dataType:'json',
        async:false,
        success:function(data){
            var jsonB=[];
            if(data && data.ReturnCode == 0 && data.SectionsInfo){
                data = data.SectionsInfo;
                for(var i=0;i<data.length;i++){
                    jsonB.push({
                        name:data[i].SectionName,
                        SectionID:data[i].SectionID
                    });
                }
                initTabBlock(jsonB);
            }
        },
        error:function(data){
            console.log("未能查出板块数据");
        }
    });
}
function initTabBlock(jsonB){
    $(".mc-tab-li").toggleLi(
        {
            data:jsonB,
            width:"100px",
            lineHeight:"80px"
        }
    );
}
var socket = null;
;(function($,window,document,undefined){
    $.fn.initMline = function(options,params){
        // console.log(socket)
        // if(socket){
        //     socket.closeWebSocket();
        // }
        options = $.extend({},options,$.fn.initMline.defaults);
        $this = $(this);
        elementId = $this.attr("id");
        ZSId = options.id;
        ExchangeID = options.exchangeID;
        var xmlData;

        $("#"+elementId).parents(".market-main-chart").siblings(".market-chart-title").text(options.stockName+"("+options.stockCode+")");
        $(".market-chart-decs").html("<i>-</i><i>-</i><i>-</i>");
        socket = new WebSocketConnect();
        var ws = socket.createWebSocket();
        //第一次打开终端,初始化代码表第一次默认请求
        $.ajax({
            url: stockXMlUrl,
            type: 'GET',
            dataType: 'json',
            data:{"ExchangeID":ExchangeID,"Codes":ZSId},
            async:false,
            cache:false,
            timeout:60000,
            error: function(xml){
                console.log("请求代码表出错");
            },
            success: function(data){
                $(".charts").hide();
                if(data.ReturnCode == 0){
                    xmlData = data.CodeInfo[0];
                    var opt = {
                        id:ZSId,
                        exchangeID:ExchangeID,
                        elementId:elementId,
                        socket:socket,
                        xmlData:xmlData,
                        stockName:options.stockName,
                        stockCode:options.stockCode
                    };
                    var chartsInit = new InitMlineCharts(opt);
                    chartsInit.initEvent(ws);
                }else{
                    console.log("请求码表出错");
                }
            }
        }); 
        
    };
    var InitMlineCharts = function(opt){
        this.myChart = null;
        this.options = {
            oneZSInfo : compareTime(opt.xmlData,ZSId),
            id:opt.id,
            exchangeID:opt.exchangeID,
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
            stockName:opt.stockName,
            stockCode:opt.stockCode,
            // 获取历史数据
            LSData:{
                "MsgType": "Q3011",
                "ExchangeID": opt.exchangeID,
                "InstrumentID": opt.id,
                "StartIndex": "0",
                "StartDate": "-1",
                "StartTime": "0", 
                "Count": "0"
            },
            // 获取昨收值
            ZCData:{
                "MsgType":"S1010",
                // "DesscriptionType":"3",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"1"
            },
            // 订阅实时推送
            DYData:{
                "MsgType":"S1010",
                // "DesscriptionType":"3",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"11"
            },
            // 清盘
            QPDATA:{
                "MsgType":"Q8002",
                // "DesscriptionType":"3",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "PructType":"0"
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
                case "R3011"://订阅历史数据
                if(data.ErrorCode == 9999){
                    return;
                }
                // 初始化图表
                initCharts(data,'',_this);
                break;
                case "P0001"://订阅快照
                if(!_this.yc){
                    _this.yc = data.PreClose; //获取昨收值
                    return;
                }
                break;
                case "P0011"://订阅分钟线
                    if(_this.myChart != undefined){
                        initCharts(data,"add",_this);
                    }
                break;
                case "R8002"://清盘
                   var MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                    if(MarketStatus == 1){//收到清盘指令  操作图表
                        redrawChart(data,_this);
                    }
                case "R8050":  //心跳包
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
        var yc = parseFloat($this.yc);//昨收
        var decimal = $this.oneZSInfo[0].decimal;//保留的小数位数
        var sub = $this.oneZSInfo[0].sub;//是否跨天交易  -1为跨天 0未跨天
        var limitUp = Number((yc + yc*0.1).toFixed($this.decimal));
        var limitDown = Number((yc - yc*0.1).toFixed($this.decimal));

        if(type == "add"){
            if(!$this.myChart){
                console.log("图表还没有没有初始化呢  ^-^");
                return;
            }
            yc = parseFloat(yc);
            var a_lastData = data;
            var last_dataTime = formatTime(a_lastData.Time);//moment(parseFloat(a_lastData[0].Time + "000")).format("HH:mm"); //行情最新时间
            var last_date = dateToStamp(formatDate(a_lastData.Date) +" " + last_dataTime);
            var zVale = parseFloat(((parseFloat(a_lastData.Price) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2)); //行情最新涨跌幅
            var aValue = parseFloat(a_lastData.Volume); //最新成交量

            if((parseFloat(a_lastData.Price)) > (yc + yc*0.03).toFixed(decimal)){
                a_lastData.Price = (yc + yc*0.03).toFixed(decimal);
            }else if((parseFloat(a_lastData.Price)) < (yc - yc*0.03).toFixed(decimal)){
                a_lastData.Price = (yc - yc*0.03).toFixed(decimal);
            }

            for(var i=0;i<$this.c_data.length;i++){
                if(last_date == $this.c_data[i]){
                    $this.history_data[i] = parseFloat(a_lastData.Price);
                    $this.z_history_data[i] = parseFloat(zVale);
                    $this.a_history_data[i] = parseFloat(aValue);
                    // 中间有断开
                    if(i > ($this.history_data.length-1) ){
                        for(var j=$this.history_data.length-1;j<=i;j++){
                            $this.history_data[j].push(null);
                            $this.z_history_data[j].push(null);
                            $this.a_history_data[j].push(null);
                            if(j == i){
                                $this.history_data[j] = parseFloat(a_lastData.Price);
                                $this.z_history_data[j] = parseFloat(zVale);
                                $this.a_history_data[j] = parseFloat(aValue);
                            }
                        }
                    }
                }else{
                    
                }
            }
            var fvalue, r1;
            fvalue = parseFloat(a_lastData.Price);
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
            if(!data.KLineSeriesInfo && data.KLineSeriesInfo.length<=0){
                console.log("暂时没有数据");
                return;
            }
            $("#"+$this.elementId).show();
            data = data.KLineSeriesInfo;
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
            $this.v_data = getxAxis(data[0].Date,$this);
            var lastDate = dateToStamp(formatDate(data[data.length-1].Date) +" "+formatTime(data[data.length-1].Time));
            var price = [];//价格
            var volume = [];//成交量
            var zdfData = [];//涨跌幅
            for(var i=0;i<$this.c_data.length;i++){
                if(lastDate < $this.c_data[i]){
                    break;
                }
                for(var j=0;j<data.length;j++){
                    var dateStamp = dateToStamp(formatDate(data[j].Date) +" "+formatTime(data[j].Time));
                    if($this.c_data[i] == dateStamp){
                        var fvalue = parseFloat(data[j].Price);//价格
                        if(fvalue >= limitUp){
                            price[i] = limitUp;
                            zdfData[i] = 0.10;
                        }else if(fvalue <= limitDown){
                            price[i] = limitDown;
                            zdfData[i] = 0.10;
                        }else{
                            price[i] = fvalue;
                            zdfData[i] = (((fvalue-yc)/yc)* 100).toFixed(2);
                        }
                        
                        volume[i] = data[j].Volume;
                        
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
                    }
                }
            }

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
                    disabled:true,
                    // xAxisIndex:0,
                    // yAxisIndex:0,
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
                            var tVal = value.split(" ")[2];
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
                }
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


            var size = (parseFloat($this.history_data[$this.history_data.length-1]) - parseFloat(yc)).toFixed(decimal);
            if($this.history_data[$this.history_data.length-1] >= yc){
                htmlStr = '<label class="col_e22"><i style="font-size: 24px;margin-right: 10px;">'+parseFloat($this.history_data[$this.history_data.length-1]).toFixed(decimal)+'</i><i style="margin-right: 10px;">+'+$this.z_history_data[$this.history_data.length-1]+'%</i><i>+'+size+'</i></label>';
            }else{
                htmlStr = '<label class="col_3bc"><i style="font-size: 24px;margin-right: 10px;">'+parseFloat($this.history_data[$this.history_data.length-1]).toFixed(decimal)+'</i><i style="margin-right: 10px;">'+$this.z_history_data[$this.history_data.length-1]+'%</i><i>'+size+'</i></label>';
            }
            $("#"+$this.elementId).parents(".market-main-chart").siblings(".market-chart-decs").html(htmlStr);
            $("#"+$this.elementId).parents("a").attr("href","./detail.html?exchangeID="+$this.exchangeID+"&id="+$this.id);
            // $("#"+$this.elementId).parents(".market-main-chart").siblings(".market-chart-title").text($this.stockName+"("+$this.stockCode+")");
        }
    }

    // 获取X轴的数值
    function getxAxis(todayDateStr,$this){
        var beginTime,finishTime,beginTime1,finishTime1;
        //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
        var b_time1,b_time2;  // 停盘时间
        var todayDate = formatDate(todayDateStr);
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
    function compareTime(dataXML,id){
        var decimal,typeIndex,sub,startTime,endTime,startTime1,endTime1,imName,code;
        var ZSInfo = new Array();
        if(dataXML.time.indexOf(";")>-1){//分段时间
            startTime = (dataXML.time.split(";")[0]).split("-")[0];
            endTime = (dataXML.time.split(";")[0]).split("-")[1];
            startTime1 = (dataXML.time.split(";")[1]).split("-")[0];
            endTime1 = formatTimeMin(dataXML.time.split(";")[1].split("-")[1]);
            startTime1  = startTime1.split(":")[0] +":"+ parseInt(startTime1.split(":")[1])+1;
        }else{//无分段时间
            startTime = dataXML.time.split("-")[0];
            endTime = dataXML.time.split("-")[1];
            startTime1 = endTime1 = "";
        }
        code = dataXML.InstrumentCode;
        decimal = parseInt(dataXML.PriceDecimal);//保留小数位数
        typeIndex = dataXML.ProductType;//指数类型
        imName = dataXML.InstrumentName;
        var start = parseInt(startTime.split(":")[0]);
        var end = parseInt(endTime.split(":")[0]);
        if(endTime1){
            end = parseInt(endTime1.split(":")[0]);
        }
        var json,json1;
        if(start > end){//国际时间，需要将当前时间减一
            json = {
                ZSId:id,
                sub : -1,
                imName:imName,
                code:code,
                decimal:decimal,
                typeIndex:typeIndex,
                startTime:startTime,
                endTime:endTime1
            };
            ZSInfo.push(json);
        }else{
            json = {
                sub : 0,
                id:id,
                code:code,
                imName:imName,
                decimal:decimal,
                typeIndex:typeIndex,
                startTime:startTime,
                endTime:endTime
            };
            ZSInfo.push(json);
            if(startTime1){
                json1 = {
                    startTime1:startTime1,
                    endTime1:endTime1
                };
                ZSInfo.push(json1);
            }
        }
        return ZSInfo;
    }
    // 建立数据连接 websocket  
    var WebSocketConnect = function() {
        this.ws = null;
        var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
        wsUrl = wsUrlDevelop;  //开发
        var timeout = 60000,//60秒
            timeoutObj = null,
            serverTimeoutObj = null;
        var _target = this;
        var XTB = {
            "MsgType":"Q8050",
            "ExchangeID":ExchangeID,
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
        // 关闭连接
        WebSocketConnect.prototype.closeWebSocket = function(){
            this.ws.onclose();
        }
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
    var el = $(".mc-tab-li ul li").eq(index);
    // $.ajax({
    //     url:"http://103.66.33.58:443/GetStock?",
    //     data:{"SectionID":$(el).data("sectionid")},
    //     type:"GET",
    //     dataType:'json',
    //     async:false,
    //     success:function(data){
    //         console.log(data)
    //     },
    //     error:function(data){
    //         console.log("未能查出板块数据");
    //     }
    // });
    switch($(el).data("sectionid")){
        case 1:
        $("#main1").initMline(
            {
                id:_FirstS[0].code,
                exchangeID:"1",
                stockName:_FirstS[0].name,
                stockCode:_FirstS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_FirstS[1].code,
                exchangeID:"2",
                stockName:_FirstS[1].name,
                stockCode:_FirstS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_FirstS[2].code,
                exchangeID:"2",
                stockName:_FirstS[2].name,
                stockCode:_FirstS[2].code,
            }
        );
        break;
        case 2:
        $("#main1").initMline(
            {
                id:_SecS[0].code,
                exchangeID:"2",
                stockName:_SecS[0].name,
                stockCode:_SecS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_SecS[1].code,
                exchangeID:"2",
                stockName:_SecS[1].name,
                stockCode:_SecS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_SecS[2].code,
                exchangeID:"2",
                stockName:_SecS[2].name,
                stockCode:_SecS[2].code,
            }
        );
        break;
        case 3:
        $("#main1").initMline(
            {
                id:_ThirS[0].code,
                exchangeID:"1",
                stockName:_ThirS[0].name,
                stockCode:_ThirS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_ThirS[1].code,
                exchangeID:"2",
                stockName:_ThirS[1].name,
                stockCode:_ThirS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_ThirS[2].code,
                exchangeID:"2",
                stockName:_ThirS[2].name,
                stockCode:_ThirS[2].code,
            }
        );
        break;
        case 4:
        $("#main1").initMline(
            {
                id:_FourthS[0].code,
                exchangeID:"2",
                stockName:_FourthS[0].name,
                stockCode:_FourthS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_FourthS[1].code,
                exchangeID:"2",
                stockName:_FourthS[1].name,
                stockCode:_FourthS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_FourthS[2].code,
                exchangeID:"2",
                stockName:_FourthS[2].name,
                stockCode:_FourthS[2].code,
            }
        );
        break;
        case 5:
        $("#main1").initMline(
            {
                id:_FifthS[0].code,
                exchangeID:"2",
                stockName:_FifthS[0].name,
                stockCode:_FifthS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_FifthS[1].code,
                exchangeID:"2",
                stockName:_FifthS[1].name,
                stockCode:_FifthS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_FifthS[2].code,
                exchangeID:"2",
                stockName:_FifthS[2].name,
                stockCode:_FifthS[2].code,
            }
        );
        break;
        case 6:
        $("#main1").initMline(
            {
                id:_SixthS[0].code,
                exchangeID:"2",
                stockName:_SixthS[0].name,
                stockCode:_SixthS[0].code,
            }
        );
        $("#main2").initMline(
            {
                id:_SixthS[1].code,
                exchangeID:"2",
                stockName:_SixthS[1].name,
                stockCode:_SixthS[1].code,
            }
        );
        $("#main3").initMline(
            {
                id:_SixthS[2].code,
                exchangeID:"2",
                stockName:_SixthS[2].name,
                stockCode:_SixthS[2].code,
            }
        );
        break;
        default:
        break;
    }
}
// 搜索功能
$("#searchInput").on("keyup",function(e){
    var val = $(this).val();
    if(!val) return;
    if(e.keyCode==13 || e.keyCode==38 || e.keyCode==40) return;
    throttle(search,val);
});
$("#searchInput").on("focus",function(e){
    var val = $(this).val();
    if(!val) return;
    if(e.keyCode==13 || e.keyCode==38 || e.keyCode==40) return;
    throttle(search,val);
});
// 节流搜索
var timer=null,delay=50;
function throttle(method,value){
    clearTimeout(timer);
    method(value);
    timer = setTimeout(function(){
        timer=undefined;
    },delay);
}
// 搜索
function search(value){
    $.ajax({
        url:"http://103.66.33.58:443/GetCodes",
        data:{"ExchangeID":0,"Codes":value},
        dataType:"json",
        success:function(data){
            if(data.ReturnCode == 9999){
                console.log("请输入正确的股票代码");
                $("#searchEnd").slideUp();
            }else if(data.ReturnCode == 0){
                $("#searchEnd").slideDown();
                var htmlStr = '<tr class="stockTitle"><th>选项</th><th>类型</th><th>代码</th><th>中文名称</th></tr>';
                var ds,dr;
                data = data.CodeInfo;
                for(let i=0;i<data.length;i++){
                    htmlStr += '<tr class="stocklist" data-exchangeID='+data[i].ExchangeID+' data-instrumentID='+(data[i].InstrumentCode)+'>';
                    ds = data[i].InstrumentCode.split(value);
                    // 选项
                    htmlStr += '<td><a>';
                    for(let j=0;j<ds.length;j++){
                        htmlStr += ds[j]+(j==ds.length-1?'':'<span class="highlight">'+value+'</span>');
                    }
                    htmlStr += '</a></td>';
                    // 类型
                    switch(data[i].ExchangeID){
                        case 2:
                        htmlStr += '<td><a>深交所</a></td>';
                        break;
                        case 1:
                        htmlStr += '<td><a>上交所</a></td>';
                        break;
                        case 101:
                        htmlStr += '<td><a>指数</a></td>';
                        break;
                        default:
                        break;
                    }
                    // 代码
                    htmlStr += '<td><a>'+data[i].InstrumentCode+'</a></td>';
                    // 名称
                    htmlStr += '<td><a>'+data[i].InstrumentName+'</a></td>';
                    htmlStr += '</tr>';
                }
                $("#searchEnd table").html(htmlStr);
            }
        }
    })
}
// 搜索结果绑定事件  跳转详情页面
$(".search table").delegate(".stocklist","click",function(){
    var exchangeID = $(this).attr("data-exchangeID");
    var instrumentID = $(this).attr("data-instrumentID");
    $("#searchInput").val("");
    $("#searchEnd").slideUp();
    location.href = './detail.html?exchangeID='+exchangeID+'&id='+ instrumentID;
})
// 点击搜索
$(".search-btn").on("click",function(){
    var value = $("#searchInput").val();
    if(!value) return;
    search(value);
})
// 38上、40下、13enter键
var index = 0;
function searchCode(event){
    var _code = event.keyCode;
    if($(".stocklist").length==0) return;
    var len = $(".stocklist").length;
    if(_code == 38){//按上键
        index--;
        if(index < 0) return;
        var stockCode = $(".stocklist").eq(index).data("instrumentid");
        $("#searchInput").val(stockCode).attr("data-exchangeID",$(".stocklist").eq(index).data("exchangeid"));
    }else if(_code == 40){//按下键
        index++;
        if(index >= len) return;
        var stockCode = $(".stocklist").eq(index).data("instrumentid");
        $("#searchInput").val(stockCode).attr("data-exchangeID",$(".stocklist").eq(index).data("exchangeid"));
    }

    if(_code == 13){//按enter键
        var value = $("#searchInput").val();  
        var exchangeID = $("#searchInput").data("exchangeid");
        if(!exchangeID && !value) return;
        $.ajax({
            url:"http://103.66.33.58:443",
            data:{"ExchangeID":0,"Codes":value},
            dataType:"json",
            success:function(data){
                if(data.ReturnCode == 9999){
                    console.log("请输入正确的股票代码");
                    $("#searchEnd").slideUp();
                }else if(data.ReturnCode == 0){
                    if(data.CodeInfo.length==1){
                        location.href = './detail.html?exchangeID='+exchangeID+'&id='+value;
                    }else{
                        $("#searchEnd").slideUp();
                        $("#searchEnd").slideDown();
                        // location.href = './detail.html?exchangeID='+exchangeID+'&id='+parseFloat(value);
                    }
                }
            }
        })
    }
}