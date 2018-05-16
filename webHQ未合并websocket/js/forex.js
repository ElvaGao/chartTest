var names = ["AUDUSD","EURUSD","GBPUSD","NZDUSD","USDCAD","USDCHF","USDJPY","USDCNY","USDHKD"];
// var names = ["AUDUSD","EURUSD","USDNZD","GBPUSD","NZDUSD","USDCAD","USDCHF","USDJPY","USDEUR","USDCNY","USDHKD"];

var v_date=[],socket,ws;
var nameSin,forexHttp="http://172.17.20.180:8080/datatrans/newFnow.do";
var wsUrl = "ws://172.17.20.180:8080/datatrans/websocket/money";
var colorList = ["239,0,0","169,16,16","112,28,28","220,220,220","38,71,37","22,131,23","51,204,51"];//从绿到红  跌到涨
var decimal = 2;
var charts = new Array();
$(function(){
    var options;
    for(var i=0;i<names.length;i++){
        $("#"+names[i]).initMline({
            name:names[i]
        });
        options = {
            name:names[i]
        };
    }
    socket = new WebSocketConnect(options);
    ws = socket.createWebSocket();
    
    getYCData(ws,options);
});
// 建立数据连接 websocket  
var WebSocketConnect = function(opt) {
    this.ws = null;
    this.defaults = {
        wsUrl : wsUrl,
        lockReconnect : false,//避免重复连接 连接锁如果有正在连接的则锁住
        timeout : 60000,//60秒
        timeoutObj : null,
        serverTimeoutObj : null,
    };
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
        _this.yc=0;
        getYCData(ws,_this);
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
function getYCData(ws,_this){
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
    };
    ws.onmessage = function (evt) {
        // 心跳包
        if(evt.data == "HeartBeat"){
            socket.reset().start();
            return;
        }
        var json = eval( "(" + evt.data + ")" );
        if(charts){
            for(var i in charts){
                if(charts[i][0].options.name == json.SZCODE){
                    initChart(charts[i][0],"add",json);
                }
            }
        }
    };
}
// 获取X轴的数值   从8:00到20:00
function getxAxis(date){
    var c_date = new Array();
    var startTime = dateToStamp(date +" "+"08:00");
    var endTime = dateToStamp(date +" "+"20:00");
    
    while(startTime <= endTime){
        c_date.push(startTime);
        startTime = startTime + 60*1000;
    }
    for(var i =0;i<c_date.length;i++){
        v_date.push(formatDate(c_date[i],"0"));
    }
    return c_date;
}
;(function($,window,document,undefined){
    $.fn.initMline = function(options,params){
        this.defaults={
            yc : 0,
            elementId : options.name,
            name : options.name,
            history_data:[]
        };
        this.myChart=null;
        this.options = $.extend({},options,this.defaults);
        $this = $(this);
        nameSin = options.name;
        // 获取历史数据
        getHttpData(this);
    };
    function getHttpData($this){
        $.ajax({
            url: forexHttp,
            type: 'GET',
            dataType: 'jsonp',
            data:{"jedisKey":$this.options.name+"-DAYHIS"},
            timeout:60000,
            error: function(){
                console.log("请求出错");
            },
            success: function(data){
                if(data){
                    for(var i in data){
                        var smallTime = data[i].smailTime.split(":")[0] +":"+ data[i].smailTime.split(":")[1];
                        var xTime = dateToStamp(data[0].bigTime + " " + smallTime);
                        $this.options.history_data.push([''+xTime,data[i].newFNOW]);
                    }
                    $this.options.yc = data[0].FLASTCLOSE;
                    initChart($this,'',data);
                }else{
                    console.log("没有历史数据");
                }
            }
        });
    }
})(jQuery, window, document);

function initChart($this,type,data){
    var yc = parseFloat($this.options.yc);//昨收
    var zde,zdf,price,high,low;
    if(type == "add"){
        zde = data.FNOW - yc; //涨跌额
        zdf = (data.FNOW - yc) / yc; //涨跌幅
        price = data.FNOW;//最新价
        high = parseFloat(data.FHIGH).toFixed(4);  //最高价
        low = parseFloat(data.FLOW).toFixed(4);  //最低价

        var smallTime = data.MOURTHTIME.split(":")[0] +":"+ data.MOURTHTIME.split(":")[1];
        var xTime = dateToStamp(data.YEARTIME + " " + smallTime);
        var len = $this.options.history_data.length;
        // for(var i in $this.options.history_data){
            if(xTime == $this.options.history_data[len-1][0]){
                $this.options.history_data[len-1] = [''+xTime,data.FNOW];
            }else{
                $this.options.history_data.push([''+xTime,data.FNOW]);
            }
        // }
        $this.myChart.setOption({
            series:{
                data:$this.options.history_data
            }
        });
    }else{
        zde = data[data.length-1].newFNOW - yc; //涨跌额
        zdf = (data[data.length-1].newFNOW - yc) / yc; //涨跌幅
        price = data[data.length-1].newFNOW;//最新价
        high = parseFloat(data[data.length-1].FHIGH).toFixed(4);  //最高价
        low = parseFloat(data[data.length-1].FLOW).toFixed(4);  //最低价
        max=min=$this.options.history_data[0][1];
        for(var i in $this.options.history_data){
            if(max <= $this.options.history_data[i][1]){
                max = $this.options.history_data[i][1];
            }
            if(min >= $this.options.history_data[i][1]){
                min = $this.options.history_data[i][1];
            }
        }
        var split = parseFloat(((max - min) / 6).toFixed(4));
        var option = {
            grid:{
                show:false,
            },
            tooltip:{
                show:false
            },
            axisPointer:{
                show:false,
            },
            xAxis:{
                boundaryGap:0,
                axisLine:{
                    show:false
                },
                axisTick:{
                    show:false
                },
                type:"category",
                data:getxAxis(data[0].bigTime),
                axisLabel: {
                    interval: function (number, string) {
                        if(number == 0 || number % 180 == 0 || number == 720){
                            return true;
                        }else{
                            return false;
                        }
                    },
                    formatter: function (value, number) {
                        var dateTime = formatDate(value,"0");
                        tVal = dateTime.split(" ")[1];
                        return tVal;
                    },
                    textStyle: {
                        color: '#fff',
                        fontSize:14
                    }
                },
                axisPointer: {
                    show:false,
                }
            },
            yAxis:{
                max:max,
                min:min,
                interval:split,
                type:"value",
                splitLine:{
                    show:false
                },
                axisLine:{
                    show:false
                },
                axisTick:{
                    show:false
                },
                axisPointer: {
                    show:false
                },
                axisLabel: {
                    formatter: function (value, index) {
                        return parseFloat(value).toFixed(4);
                    },
                    show:false
                },
            },
            series:{
                type:'line',
                symbolSize:0,
                hoverAnimation:false,
                connectNulls:true,
                animation:false,
                lineStyle:{
                    normal:{
                        color:"#fff",
                        width:1,
                        type:'solid',
                        opacity:'0.5'
                    }
                },
                markLine: {
                    animation:false,
                    silent:true,
                    lineStyle: {
                        normal: {
                            type: 'dashed',
                            color: '#fff',
                            width:1,
                            opacity:0
                        }
                    },
                    label: {
                        normal: {
                            show:false,
                            position: "end",
                            formatter: function (params) {
                                return params.value + " ";
                            }
                        }
                    },
                    data: [
                        {
                            name: 'Y 轴值为 100 的水平线',
                            yAxis: parseFloat($this.options.yc).toFixed(4),
                        },
                    ],
                    symbol: ['none', 'none']
                },
                data:$this.options.history_data
            }
        };
        $this.myChart = echarts.init(document.getElementById($this.options.elementId));
        $this.myChart.setOption(option);

        // 存放图表的信息
        charts.push([$this,$this.myChart]);

        // 图表信息
        var forexName1 = ($this.options.name).substr(0,3);
        var forexName2 = ($this.options.name).substr(3,3);
        $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-title").text(forexName1+"/"+forexName2);
    }
    // 每个图表上的信息
    $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-zdf").text((zdf>=0?"+"+ (parseFloat(zdf).toFixed(4)):(parseFloat(zdf).toFixed(4))));
    $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-zde").text( Math.abs(zde.toFixed(4)));
    $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-price").text(price);
    $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-price").text(price);
    var strHtml = '<label>H <i>'+high+'</i></label><label>L <i>'+low+'</i></label>';
    $("#"+$this.options.elementId).siblings(".forex-content").find(".forex-hl").html(strHtml);
    // 计算每个图表的背景颜色
    if(zdf == 0){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[3]+")"});
    }else if(zdf > 0 && zdf <=0.4){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[2]+")"});
    }else if(zdf > 0.4 && zdf <= 0.8){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[1]+")"});
    }else if(zdf > 0.8 && zdf <= 1.2){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[0]+")"});
    }else if(zdf < 0 && zdf >= -0.4){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[4]+")"});
    }else if(zdf < -0.4 && zdf >= -0.8){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[5]+")"});
    }else if(zdf < -0.8 && zdf >= -1.2){
        $("#"+$this.options.elementId).parent(".forex-container").css({"background-color":"rgb("+colorList[6]+")"});
    }
}