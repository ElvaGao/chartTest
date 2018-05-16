var initM = function(options){
    // 初始化代码表
    MLine = new CreateMline(options);
};
var MChart = echarts.init(document.getElementById('mline_charts'));
// 初始化代码表
var CreateMline = function(opt){
    this.HistoryData = {
        hCategoryUTC: [],
        hCategoryData: [],
        hValueList:[],  //价格历史数据
        hZValuesList: [],   //涨跌幅历史数据
        hVolumesList: [], //成交量
        hVolumesColorList: [] //成交量颜色记录 1为红 -1为绿
    }
    this.interval = 0;
    this.option = {
        // 获取历史数据
        historyData : {
            "MsgType": "Q3011",
            "ExchangeID":StockInfo.ExchangeID,
            "InstrumentID":StockInfo.InstrumentID,
            "StartIndex": "0",
            "StartDate": "-1",
            "StartTime": "0", 
            "Count": "242"
        },
        // 实时推送数据
        RTDATA : {
            "MsgType":"S1010",
            "ExchangeID":StockInfo.ExchangeID,
            "InstrumentID":StockInfo.InstrumentID,
            "Instrumenttype":"11"
        }
    }
    this.MLineSet = {
        mouseHoverPoint: 0,         // 当前现实的数据索引
        isHoverGraph: false        // 是否正在被hover
    };
};
CreateMline.prototype = {
    //获取历史指数数据
    getHistoryData :    function(){
        socket.request(this.option.historyData);
    },
    // 获取实时分钟推送
    getRealTimePush :   function(){
                            socket.request(this.option.RTDATA);
                        }
}
//初始空图表
function initEmptyCharts(){
    var maxY = parseFloat((parseFloat(StockInfo.PreClose)*0.01+parseFloat(StockInfo.PreClose)).toFixed(StockInfo.decimal));
    var minY = parseFloat((parseFloat(StockInfo.PreClose)-parseFloat(StockInfo.PreClose)*0.01).toFixed(StockInfo.decimal));
    var maxY1 = parseFloat(((maxY-StockInfo.PreClose)/StockInfo.PreClose).toFixed(2));
    var minY1 = -parseFloat(((maxY-StockInfo.PreClose)/StockInfo.PreClose).toFixed(2));
    var split = parseFloat(((maxY - StockInfo.PreClose)/3).toFixed(StockInfo.decimal));
    var split1= parseFloat((split / StockInfo.PreClose))*100;
    // 绘制图形前，隐藏动图
    $("#withoutDataM").hide().siblings().show();
    MChart.setOption({
        backgroundColor: "#fff",
        animation: false,
        grid: [
            {
                top: "5%",
                height: '70%',
                show:true
            },
            {
                show:true,
                top: '85%',
                height: '13%',
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
            lineStyle:{
                color:colorList[2],
                type:"dotted",
                width:1
            },
            type:'line',
            show:true,
            triggerTooltip:false
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
                    show:true,
                    interval: function (number, string) {
                        if(number % 60 == 0){
                            return true;
                        }else{
                            return false;
                        }
                    },
                    formatter: function (value, number) {
                        var tVal = value.split(" ")[2];
                        return tVal;
                    },
                    textStyle: {
                        color: colorList[3]
                    }
                },
                axisLine: {
                    lineStyle:{
                        color:colorList[4]
                    }
                },
                data: MLine.HistoryData.hCategoryData,
                splitLine: {
                    interval:function(index,value){
                        if(index % 60 == 0){
                            return true;
                        }else{
                            return false;
                        }
                    },
                    show: true
                },
                axisPointer: {
                    show:true,
                    label: {
                        formatter: function (params, value, s) {
                            return (params.value);
                            // return moment(parseFloat(params.value)).format("YYYY-MM-DD HH:mm");
                        },
                        padding:[3,5,5,5],
                        show:true
                    }
                },
                boundaryGap:false
            },
            {
                type:"category",
                nameLocation:'start',
                nameTextStyle:{
                    color:colorList[2]
                },
                axisTick: {
                    interval: function (number, string) {
                        if(StockInfo.typeIndex == "128" || StockInfo.typeIndex == "224"){
                            if (number % 180 == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }else{
                            if (number % 30 == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    },
                    show:false
                },
                axisLabel: {
                    show:false,
                    interval: function (number, string) {
                        if(StockInfo.typeIndex == "128" || StockInfo.typeIndex == "224"){
                            if (number % 180 == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }else{
                            if (number % 30 == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    },
                    formatter: function (value, number) {
                        return value.split(" ")[3];
                    },
                    textStyle: {
                        color: colorList[3]
                    }
                },
                axisLine: {
                    lineStyle:{
                        color:colorList[4]
                    }
                },
                data: MLine.HistoryData.hCategoryData,
                splitLine: {
                    show: false
                },
                gridIndex: 1,
                boundaryGap:false
            }
        ],
        yAxis: [
            {
                min: minY,
                max: maxY,
                interval: split,
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
                        color:colorList[4]
                    }
                },
                axisLabel: {
                    formatter: function (value, index) {
                        if (index == 3) {
                            return "";
                        } else {
                            return parseFloat(value).toFixed(StockInfo.decimal);
                        }
                    },
                    textStyle: {
                        color: function (value, index) {
                            if (parseFloat(value) > parseFloat(StockInfo.PreClose)) {
                                return colorList[0];
                            } else {
                                return colorList[1];
                            }
                        }
                    }
                },
                axisPointer: {
                    label: {
                        formatter: function (params, value, s) {
                            return parseFloat(params.value).toFixed(StockInfo.decimal);
                        }
                    }
                }
            },
            {
                min: minY1,
                max: maxY1,
                interval: split1,
                // name:"涨跌幅",
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
                        color:colorList[4]
                    }
                },
                axisLabel: {
                    formatter: function (value, index) {
                        if (index == 3) {
                            return "";
                        } else {
                            return parseFloat(value).toFixed(2) + "%";
                        }
                    },
                    textStyle: {
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
                    label: {
                        formatter: function (params, value, s) {
                            return parseFloat(params.value).toFixed(2) + "%";
                        }
                    }
                }
            },
            {
                type:'value',
                name:'成交',
                nameLocation:'end',
                nameTextStyle:{
                    color:colorList[2],
                    fontSize:14
                },
                nameGap:10,
                scale: true,
                splitLine:{
                    lineStyle:{
                        color:colorList[4]
                    }
                },
                axisLine:{
                    lineStyle:{
                        color:colorList[4]
                    }
                },
                axisLabel:{
                    formatter:function(value,index){
                        var data = setUnit(value,null,true,true);
                        $(".volumeMax").text(floatFixedZero(data.value/100));
                        $(".vol-unit").text(data.unit);
                        return;
                    },
                    textStyle:{
                        color:colorList[3],
                        fontSize:14,
                    },
                    showMinLabel:true,
                    showMaxLabel:true,
                },
                axisTick:{
                    show:false
                },
                gridIndex: 1,
                splitNumber: 2
            }
        ],
        series: [
            {
                name: 'Mline',
                type: 'line',
                showSymbol: false,
                hoverAnimation: false,
                data: "",
                connectNulls:true,
                symbolSize:0,
                markLine: {
                    animation:false,
                    silent:true,
                    lineStyle: {
                        normal: {
                            type: 'dashed',
                            color: colorList[2],
                            width:1
                        }
                    },
                    label: {
                        normal: {
                            position: "start",
                            formatter: function (params) {
                                return params.value + " ";
                            }
                        }
                    },
                    data: [
                        {
                            name: 'Y 轴值为 100 的水平线',
                            yAxis: StockInfo.PreClose
                        }
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
                        }])
                    }
                }
            },
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
                            color: colorList[2],
                            width:0
                        }
                    },
                    label: {
                        normal: {
                            position: "end",
                            formatter: function (params) {
                                return " " + params.value + ".00%";

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
                        color: "#2b99ff",
                        opacity:0
                    }
                },
                data: "",
                yAxisIndex: 1
            },
            {
                name: 'Vol',
                type: 'bar',
                xAxisIndex: 1,
                yAxisIndex: 2,
                data: "",
                itemStyle:{
                    normal:{
                        color:function(params){
                            if(flag[params.dataIndex] > 0){
                                return colorList[0];
                            }else{
                                return colorList[1];
                            }
                        }
                    }
                }
            },
        ]
    });
}
//绘制分时图 
function paintMCharts(data,type){
    // MLine.options.HistoryData.hCategoryData=MLine.HistoryData.hCategoryData;
    // MLine = MLine.options;
    // 绘制图形前，隐藏动图
    $("#withoutDataM").hide().siblings().show();
    if (data) {
        $(".vol").show();
        StockInfo.PreClose = parseFloat(StockInfo.PreClose);
        var limitUp = parseFloat((StockInfo.PreClose + StockInfo.PreClose*0.1).toFixed(StockInfo.decimal));
        var limitDown = parseFloat((StockInfo.PreClose - StockInfo.PreClose*0.1).toFixed(StockInfo.decimal));
        var minY,middleY,maxY,minY1,maxY1;
        if(type == "add"){
            if( MChart != undefined){
                var a_lastData = data;
                var last_dataTime = formatTime(a_lastData.Time);//行情最新时间
                var last_date = dateToStamp(formatDate(a_lastData.Date) +" " + last_dataTime);//最新时间时间戳
                var zVale = parseFloat(((parseFloat(a_lastData.Price) - parseFloat(StockInfo.PreClose)) / parseFloat(StockInfo.PreClose) * 100).toFixed(2)); //行情最新涨跌幅
                var aValue = parseFloat(a_lastData.Volume); //最新成交量
                var flag = parseFloat(a_lastData.Price) - parseFloat(a_lastData.Open) >= 0 ? 1:-1;//成交量最新颜色标识

                if((parseFloat(a_lastData.Price)) >= limitUp){
                    a_lastData.Price = limitUp;
                }else if((parseFloat(a_lastData.Price)) <= limitDown){
                    a_lastData.Price = limitDown;
                }
                // MLine.HistoryData.hCategoryUTC.length : 时间轴长度
                // last_date当前的时间
                // i 当前时间轴索引
                // MLine.HistoryData.hValueList.length历史数据长度
                for(var i=0;i<MLine.HistoryData.hCategoryUTC.length;i++){
                    if(last_date == MLine.HistoryData.hCategoryUTC[i]){
                        MLine.HistoryData.hValueList[i] = parseFloat(a_lastData.Price);
                        MLine.HistoryData.hZValuesList[i] = parseFloat(zVale);
                        MLine.HistoryData.hVolumesList[i] = parseFloat(aValue);
                        MLine.HistoryData.hVolumesColorList[i] = flag;
                        // 中间有断开
                        if(i > (MLine.HistoryData.hValueList.length-1) ){
                            for(var j=MLine.HistoryData.hValueList.length-1;j<=i;j++){
                                MLine.HistoryData.hValueList[j].push(null);
                                MLine.HistoryData.hZValuesList[j].push(null);
                                MLine.HistoryData.hVolumesList[j].push(null);
                                MLine.HistoryData.hVolumesColorList[j].push(null);
                                if(j == i){
                                    MLine.HistoryData.hValueList[j] = parseFloat(a_lastData.Price);
                                    MLine.HistoryData.hZValuesList[j] = parseFloat(zVale);
                                    MLine.HistoryData.hVolumesList[j] = parseFloat(aValue);
                                    MLine.HistoryData.hVolumesColorList[j] = flag;
                                }
                            }
                        }
                    }
                }
                
                var marktToolData = [
                    MLine.HistoryData.hValueList[MLine.HistoryData.hValueList.length - 1],
                    MLine.HistoryData.hZValuesList[MLine.HistoryData.hZValuesList.length - 1],
                    MLine.HistoryData.hVolumesList[MLine.HistoryData.hVolumesList.length - 1],
                    formatDate(parseFloat(MLine.HistoryData.hCategoryUTC[MLine.HistoryData.hValueList.length - 1]),"0")
                ];
                set_marketTool(marktToolData); //设置动态行情条
                var fvalue, r1;
                fvalue = parseFloat(a_lastData.Price);
                r1 = Math.abs(fvalue - StockInfo.PreClose);
                // console.log(r1);
                // debugger;
                if (r1 >= MLine.interval) {
                    MLine.interval = r1 + r1*0.1;
                    minY = (StockInfo.PreClose - MLine.interval).toFixed(StockInfo.decimal);
                    middleY = StockInfo.PreClose.toFixed(StockInfo.decimal);
                    maxY = (StockInfo.PreClose + MLine.interval).toFixed(StockInfo.decimal);
                    if(minY <= limitDown){
                        minY = limitDown;
                    }
                    if(maxY >= limitUp){
                        maxY = limitUp;
                    }
                    minY1 = ((parseFloat(minY)-StockInfo.PreClose) / StockInfo.PreClose).toFixed(4);
                    maxY1 = ((parseFloat(maxY)-StockInfo.PreClose) / StockInfo.PreClose).toFixed(4);
                    split = parseFloat(((maxY - minY) / 6).toFixed(StockInfo.decimal));
                    split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(6));
                    
                    MChart.setOption({
                        yAxis: [
                            {
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
                                            return parseFloat(value).toFixed(StockInfo.decimal);
                                        }
                                    }
                                }
                            },{
                                min: minY1,
                                max: maxY1,
                                interval: split1,
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
                                            return parseFloat(value).toFixed(StockInfo.decimal)+ "%";
                                        }
                                    }
                                }
                            }],
                        series: [
                            {
                                markLine: {
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: middleY
                                        }
                                    ]
                                }
                            },
                            {
                                name:'limit',
                                type: 'line',
                                markLine: {
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: colorList[2],
                                            width:0
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
                                yAxisIndex: 1
                            }]
                    });
                }
                if (MLine.MLineSet.mouseHoverPoint == MLine.HistoryData.hValueList.length - 1) {
                    MChart.dispatchAction({
                        type: 'showTip',
                        seriesIndex: 0,
                        dataIndex: MLine.MLineSet.mouseHoverPoint,
                        name: "Mline",
                        position: function (pos, params, el, elRect, size) {
                            var obj = {top: 10};
                            obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                            return obj;
                        }
                    });
                }
                MChart.setOption({
                    xAxis:[
                        {
                            data:MLine.HistoryData.hCategoryData
                        },
                        {
                            data:MLine.HistoryData.hCategoryData
                        }
                    ],
                    series: [
                        {
                            data: MLine.HistoryData.hValueList,
                        },
                        {
                            data: MLine.HistoryData.hZValuesList
                        },
                        {
                            data: MLine.HistoryData.hVolumesList,
                            itemStyle:{
                                normal:{
                                    color:function(params){
                                        if(MLine.HistoryData.hVolumesColorList[params.dataIndex] > 0){
                                            return colorList[0];
                                        }else{
                                            return colorList[1];
                                        }
                                    }
                                }
                            }
                        },
                        // {
                        //     data: HistoryData.hVolumesList
                        // }
                    ]
                });
            }else{
                $(".vol").hide();
                console.log("初始化图表失败");
                $("#MLine").hide();
            }
        }else{
            if(data.KLineSeriesInfo && data.KLineSeriesInfo.length>0){
                data = data.KLineSeriesInfo;
                if(!StockInfo.PreClose){
                    StockInfo.PreClose =  parseFloat(data[data.length-1].Open);
                }
                var price = [];//价格
                var volume = [];//成交量
                var zdfData = [];//涨跌幅
                var flagColor = [];//现价-开盘价 值为1和-1
                var lastDate = dateToStamp(formatDate(data[data.length-1].Date) +" "+formatTime(data[data.length-1].Time));
                var unit="";
                for(var i=0;i<MLine.HistoryData.hCategoryUTC.length;i++){
                    if(lastDate < MLine.HistoryData.hCategoryUTC[i]){
                        break;
                    }
                    for(var j=0;j<data.length;j++){
                        var dateStamp = dateToStamp(formatDate(data[j].Date) +" "+formatTime(data[j].Time));
                        if(MLine.HistoryData.hCategoryUTC[i] == dateStamp){
                            var fvalue = parseFloat(data[j].Price);//价格
                            if(fvalue >= limitUp){
                                price[i] = limitUp;
                                zdfData[i] = 0.10;
                            }else if(fvalue <= limitDown){
                                price[i] = limitDown;
                                zdfData[i] = 0.10;
                            }else{
                                price[i] = data[j].Price;
                                zdfData[i] = (((fvalue-StockInfo.PreClose)/StockInfo.PreClose)* 100).toFixed(2);
                            }
                            
                            volume[i] = data[j].Volume;
                            
                            flagColor[i] = (parseFloat(data[j].Price)-parseFloat(data[j].Open)) >= 0 ? 1 : -1;
                            
                            if(fvalue > 0){
                                r1 = Math.abs(fvalue - StockInfo.PreClose);
                                if (r1 > MLine.interval) {
                                    MLine.interval = r1;
                                }
                            }
                            break;
                        }else{
                            price[i] = null;
                            volume[i] = null;
                            zdfData[i] = null;
                            flagColor[i] = null;
                        }
                    }
                }
                    
                MLine.HistoryData.hValueList = price;//价格历史数据
                MLine.HistoryData.hZValuesList = zdfData;//涨跌幅历史数据
                MLine.HistoryData.hVolumesList = volume;//成交量历史数据
                MLine.HistoryData.hVolumesColorList = flagColor;//成交量颜色标识
                //取绝对值  差值 
                MLine.interval = MLine.interval + MLine.interval*0.1;
                middleY = StockInfo.PreClose.toFixed(StockInfo.decimal);
                // 左1轴
                var minY = Number((StockInfo.PreClose - MLine.interval).toFixed(StockInfo.decimal));//(minPrice - r1).toFixed(StockInfo.decimal);//(StockInfo.PreClose - MLine.interval).toFixed(StockInfo.decimal);
                var maxY = Number((StockInfo.PreClose + MLine.interval).toFixed(StockInfo.decimal));//(maxPrice + r1).toFixed(StockInfo.decimal);//(StockInfo.PreClose + MLine.interval).toFixed(StockInfo.decimal);
                if(minY < limitDown){
                    minY = limitDown;
                }
                if(maxY > limitUp){
                    maxY = limitUp;
                }
                // 右边y1轴
                var dd = ((parseFloat(minY) - (StockInfo.PreClose)) / (StockInfo.PreClose) );
                if(Math.abs(dd) > 1){
                    minY1 = ((parseFloat(minY) - (StockInfo.PreClose)) / (StockInfo.PreClose)).toFixed(2);
                    maxY1 = ((parseFloat(maxY) - (StockInfo.PreClose)) / (StockInfo.PreClose)).toFixed(2);
                }else{
                    minY1 = ((parseFloat(minY) - (StockInfo.PreClose)) / (StockInfo.PreClose) * 100).toFixed(2);
                    maxY1 = ((parseFloat(maxY) - (StockInfo.PreClose)) / (StockInfo.PreClose) * 100).toFixed(2);
                }
                var split = parseFloat(((maxY - minY) / 6).toFixed(StockInfo.decimal));
                var split1= parseFloat((split / StockInfo.PreClose))*100;
                MChart.setOption({
                    animation: false,
                    axisPointer: {
                        link: {xAxisIndex: 'all'},
                        label: {
                            backgroundColor: colorList[2]
                        },
                        lineStyle:{
                            color:colorList[2],
                            type:"dotted",
                            width:1
                        },
                        type:'line',
                        show:true,
                        triggerTooltip:false
                    },
                    tooltip: {
                        trigger: 'axis',
                        showContent:false
                    },
                    xAxis: [
                        {
                            type:"category",
                            data: MLine.HistoryData.hCategoryData,
                        },
                        {
                            type:"category",
                            name:unit,
                            nameLocation:'start',
                            nameTextStyle:{
                                color:colorList[2]
                            },
                            axisTick: {
                                interval: function (number, string) {
                                    if(StockInfo.typeIndex == "128" || StockInfo.typeIndex == "224"){
                                        if (number % 180 == 0) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }else{
                                        if (number % 30 == 0) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                },
                                show:false
                            },
                            axisLabel: {
                                show:false,
                                interval: function (number, string) {
                                    if(StockInfo.typeIndex == "128" || StockInfo.typeIndex == "224"){
                                        if (number % 180 == 0) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }else{
                                        if (number % 30 == 0) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                },
                                formatter: function (value, number) {
                                    return value.split(" ")[3];
                                },
                                textStyle: {
                                    color: colorList[3]
                                }
                            },
                            axisLine: {
                                lineStyle:{
                                    color:colorList[4]
                                }
                            },
                            data: MLine.HistoryData.hCategoryData,
                            splitLine: {
                                show: false
                            },
                            gridIndex: 1,
                            boundaryGap:false
                        },
                    ],
                    yAxis: [
                        {
                            min: minY,
                            max: maxY,
                            interval: split,
                            // name:"价格",
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
                                    color:colorList[4]
                                }
                            },
                            axisLabel: {
                                formatter: function (value, index) {
                                    if (index == 3) {
                                        return "";
                                    } else {
                                        return parseFloat(value).toFixed(StockInfo.decimal);
                                    }
                                },
                                textStyle: {
                                    color: function (value, index) {
                                        if (parseFloat(value) > parseFloat(StockInfo.PreClose)) {
                                            return colorList[0];
                                        } else {
                                            return colorList[1];
                                        }
                                    }
                                }
                            },
                            axisPointer: {
                                label: {
                                    formatter: function (params, value, s) {
                                        return parseFloat(params.value).toFixed(StockInfo.decimal);
                                    }
                                }
                            }
                        },
                        {
                            min: minY1,
                            max: maxY1,
                            interval: split1,
                            // name:"涨跌幅",
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
                                    color:colorList[4]
                                }
                            },
                            axisLabel: {
                                formatter: function (value, index) {
                                    if (index == 3) {
                                        return "";
                                    } else {
                                        return parseFloat(value).toFixed(2) + "%";
                                    }
                                },
                                textStyle: {
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
                                label: {
                                    formatter: function (params, value, s) {
                                        return parseFloat(params.value).toFixed(2) + "%";
                                    }
                                }
                            }
                        },
                        {
                            type:'value',
                            name:'成交',
                            nameLocation:'end',
                            nameTextStyle:{
                                color:colorList[2],
                                fontSize:14
                            },
                            nameGap:10,
                            scale: true,
                            splitLine:{
                                lineStyle:{
                                    color:colorList[4]
                                }
                            },
                            axisLine:{
                                lineStyle:{
                                    color:colorList[4]
                                }
                            },
                            axisLabel:{
                                formatter:function(value,index){
                                    setyAsixName(value/100);
                                    return;
                                },
                                textStyle:{
                                    color:colorList[3],
                                    fontSize:14,
                                },
                                showMinLabel:true,
                                showMaxLabel:true,
                            },
                            gridIndex: 1,
                            splitNumber: 2
                        }
                    ],
                    series: [
                        {
                            name: 'Mline',
                            type: 'line',
                            showSymbol: false,
                            hoverAnimation: false,
                            data: price,
                            connectNulls:true,
                            symbolSize:0,
                            markLine: {
                                animation:false,
                                silent:true,
                                lineStyle: {
                                    normal: {
                                        type: 'dashed',
                                        color: colorList[2],
                                        width:1
                                    }
                                },
                                label: {
                                    normal: {
                                        position: "start",
                                        formatter: function (params) {
                                            return params.value + " ";
                                        }
                                    }
                                },
                                data: [
                                    {
                                        name: 'Y 轴值为 100 的水平线',
                                        yAxis: middleY
                                    }
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
                                    }])
                                }
                            }
                        },
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
                                        color: colorList[2],
                                        width:0
                                    }
                                },
                                label: {
                                    normal: {
                                        position: "end",
                                        formatter: function (params) {
                                            return " " + params.value + ".00%";

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
                                    color: "#2b99ff",
                                    opacity:0
                                }
                            },
                            data: zdfData,
                            yAxisIndex: 1
                        },
                        {
                            name: 'Vol',
                            type: 'bar',
                            xAxisIndex: 1,
                            yAxisIndex: 2,
                            data: volume,
                            itemStyle:{
                                normal:{
                                    color:function(params){
                                        if(flagColor[params.dataIndex] > 0){
                                            return colorList[0];
                                        }else{
                                            return colorList[1];
                                        }
                                    }
                                }
                            }
                        },
                    ]
                });
                count = MChart.getOption().series[0].data.length;
                
                var marktToolData = [
                    MLine.HistoryData.hValueList[count - 1], 
                    MLine.HistoryData.hZValuesList[count - 1], 
                    MLine.HistoryData.hVolumesList[count - 1], 
                    formatDate(parseFloat(MLine.HistoryData.hCategoryUTC[count - 1]),"0")//moment(parseFloat(MLine.HistoryData.hCategoryUTC[count - 1])).format("YYYY-MM-DD HH:mm")
                ];
                set_marketTool(marktToolData); //设置动态行情条

                MChart.on('showTip', function (params) {
                    MLine.MLineSet.mouseHoverPoint = params.dataIndex;
                    setMlineToolInfo(true,MLine.MLineSet.mouseHoverPoint);
                });
                // 设置成交量的单位变化状况
                function setyAsixName(value) {
                    var data = setUnit(value,null,true);
                    var maximun = (data=="0"?"0":floatFixedZero(data.value))
                    var yAxisName = (data=="0"?"量":data.unit);
                    $(".volumn .volumeMax").text(maximun);
                    $(".volumn .vol-unit").text(yAxisName);
                };

                $("#mline_charts").on("mouseenter", function (event) {
                    // console.log(event.offsetY)
                    if(event.offsetY<570){
                        toolContentPosition(event);
                        $("#toolContent").show();
                        
                        Charts.thisChartFocus = "#MLine";
                    }
                });

                $("#mline_charts").on("mousemove", function (event) {
                    if(event.offsetY<570){
                        MLine.MLineSet.isHoverGraph = true;
                        toolContentPosition(event);
                        $("#toolContent").show();
                        Charts.thisChartFocus = "#MLine";
                    }else{
                        $("#mline_charts").mouseout();
                    }
                });

                $("#mline_charts").bind("mouseout", function (event) {
                    MLine.MLineSet.isHoverGraph = false;
                    $("#toolContent").hide();
                    MLine.MLineSet.mouseHoverPoint = 0;
                    setMlineToolInfo();
                    $(Charts.thisChartFocus).children(".charts-focus").blur();
                    Charts.thisChartFocus = window;
                });
                
                // console.log($(document).scrollTop())
                $(document).scrollTop($(document).scrollTop()+100)

                function toolContentPosition(event) {
                    var offsetX = event.offsetX;
                    var continerWidth = $("#mline_charts").width(), toolContent = $("#toolContent").width();
                    var centerX = continerWidth / 2;
                    if (offsetX > centerX) {
                        $("#toolContent").css("left", 85);
                    } else {
                        $("#toolContent").css("left", continerWidth - toolContent - 85);
                    }
                }
            }else{
                $(".vol").hide();
                console.log("初始化图表失败");
                $("#MLine").hide();    
            }
        }
    }else{
        // $("#noData").show();
        // $("#toolContent_M").hide();
        $(".vol").hide();
        // $(".chartsTab").hide();
        console.log("初始化图表失败");
        $("#MLine").hide();
    }

    function set_marketTool(data) {
        if (!MLine.MLineSet.isHoverGraph || MLine.MLineSet.isHoverGraph && !MLine.HistoryData.hValueList[MLine.MLineSet.mouseHoverPoint] && data) {
            $(".vol i").text(parseFloat(data[2]).toFixed(2));
            $("#quantityRatio").text(data[2]);
            setMlineToolInfo();
        }
    }

}
// 接收到清盘指令重绘图表
function redrawChart(){
    // 绘制图形前，隐藏动图
    $("#withoutDataM").hide().siblings().show();
    // MLine = MLine.options;
    MLine.HistoryData.hValueList = []; //价格历史记录
    MLine.HistoryData.hZValuesList = []; //涨跌幅历史记录
    MLine.HistoryData.hVolumesList = []; //成交量记录
    MLine.HistoryData.hVolumesColorList = []; //成交量颜色记录 1为绿 -1为红
    var decimal = StockInfo.decimal;

    if(MChart == undefined || !MChart) return;
    StockInfo.PreClose = parseFloat(StockInfo.PreClose);
    if (StockInfo.PreClose) {
        var minY = (StockInfo.PreClose - StockInfo.PreClose*0.1).toFixed(StockInfo.decimal);
        var middleY = StockInfo.PreClose.toFixed(StockInfo.decimal);
        var maxY = (StockInfo.PreClose + StockInfo.PreClose*0.1).toFixed(StockInfo.decimal);
        var dd = ((parseFloat(minY) - parseFloat(StockInfo.PreClose)) / parseFloat(StockInfo.PreClose));

        if(Math.abs(dd) > 1){
            var minY1 = ((parseFloat(minY) - (StockInfo.PreClose)) / (StockInfo.PreClose)).toFixed(2);
            var maxY1 = ((parseFloat(maxY) - (StockInfo.PreClose)) / (StockInfo.PreClose)).toFixed(2);
        }else{
            var minY1 = ((parseFloat(minY) - parseFloat(StockInfo.PreClose)) / parseFloat(StockInfo.PreClose) * 100).toFixed(2);
            var maxY1 = ((parseFloat(maxY) - parseFloat(StockInfo.PreClose)) / parseFloat(StockInfo.PreClose) * 100).toFixed(2);
        }
    } else {
        var minY = 0;
        var middleY = 1;
        var maxY = 2;
    }
    var split = parseFloat(((maxY - minY) / 6).toFixed(StockInfo.decimal));
    var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(StockInfo.decimal));

    MChart.setOption({
        yAxis: [
            {
                min: minY,
                max: maxY,
                interval: split
            },{
                min: minY1,
                max: maxY1,
                interval: split1,
                axisLabel: {
                    formatter: function (value, index) {
                        if (index == 3) {
                            return "";
                        } else {
                            return parseFloat(value).toFixed(2) + "%";
                        }
                    },
                    textStyle: {
                        color: function (value, index) {
                            var status = 0;
                            if (parseFloat(value) > status) {
                                return colorList[0];
                            } else {
                                return colorList[1];
                            }
                        }
                    }
                },
                axisPointer: {
                    label: {
                        formatter: function (params, value, s) {
                            return parseFloat(params.value).toFixed(2) + "%";
                        }
                    }
                }
            }
        ],
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
    });
    $('.tb-fn-num').html('<span class="">-</span><span class="">0.00</span><span class="">0.00%</span>');
    var strHtml = '';
    if(StockInfo.stockType == "Field"){
        strHtml +='<ul class=\"cb-zs-pk\">\
        <li><span>上涨数</span><span class=\"cb-zspk-szs\">--</span></li>\
        <li><span>平盘数</span><span class=\"cb-zspk-pps\">--</span></li>\
        <li><span>下跌数</span><span class=\"cb-zspk-xds\">--</span></li>\
        </ul>';
    }else{
        strHtml = '<div class="cb-pk"><h2>五档盘口</h2><div class="cb-title">'+
        '<p>委比：<span class="cbt-wb">-</span></p>'+
        '<p>委差：<span class="cbt-wc">-</span></p></div>'+
        '<ul class="cb-txtOffer"><li><span>卖五</span><span>-</span>'+
        '<span>-</span></li><li><span>卖四</span><span>-</span>'+
        '<span>-</span></li><li><span>卖三</span><span>-</span>'+
        '<span>-</span></li><li><span>卖二</span><span>-</span>'+
        '<span>-</span></li><li><span>卖一</span><span>-</span>'+
        '<span>-</span></li></ul><ul class="cb-txtBids"><li><span>买一</span>'+
        '<span>-</span><span>-</span></li><li><span>买二</span>'+
        '<span>-</span><span>-</span></li><li><span>买三</span>'+
        '<span>-</span><span>-</span></li><li><span>买四</span>'+
        '<span>-</span><span>-</span></li><li><span>买五</span>'+
        '<span>-</span><span>-</span></li></ul>'+
        '<div class="cb-title cb-title-sub"><p>外盘：<span class="red cbt-wp">-</span></p>'+
        '<p>内盘：<span class="cbt-np">-</span></p></div></div>';
    }
    $(".cb-pk").html(strHtml);
    $(".cb-cj>ul").html('<li><span>-</span><span>-</span><span>-</span><span>-</span></li>');
}
// 获取X轴的数值
function getxAxis(todayDateStr){
    var beginTime,finishTime,beginTime1,finishTime1;
    //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
    var b_time1,b_time2;  // 停盘时间
    StockInfo.todayDate = formatDate(todayDateStr);
    var dateArr = new Array();
    var dateArrStamp = new Array();
    if(StockInfo.sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
        if(StockInfo.nowDateTime.length > 1){
            beginTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].startTime;
            finishTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].endTime;
            beginTime1 = StockInfo.todayDate + " " + StockInfo.nowDateTime[1].startTime1;
            finishTime1 = StockInfo.todayDate + " " + StockInfo.nowDateTime[1].endTime1;
            
            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{
            beginTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].startTime;
            finishTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].endTime;
        }
    }else{  //跨天的时间计算  1-中间有断开
        if(StockInfo.nowDateTime.length > 1){
            beginTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].startTime;
            finishTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].endTime;
            beginTime1 = StockInfo.todayDate + " " + StockInfo.nowDateTime[1].startTime1;
            finishTime1 = StockInfo.todayDate + " " + StockInfo.nowDateTime[1].endTime1;
            
            // 前半段时间的起始时间和结束时间比较
            if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                //都是当天时间 
                // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                    // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                    if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                    }else{
                        //跨天
                        finishTime1 = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[1].endTime1;
                    }
                }else{
                    beginTime1 = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[1].startTime1;
                    finishTime1 = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[1].endTime1;
                }
            }else{
                //结束时间为第二天   跨天了
                finishTime = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[0].endTime;
                beginTime1 = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[1].startTime1;
                finishTime1 = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[1].endTime1;
            }

            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{  // 2- 中间未断开
            beginTime = StockInfo.todayDate + " " + StockInfo.nowDateTime[0].startTime;
            finishTime = formatDate(todayDateStr+1) + " " + StockInfo.nowDateTime[0].endTime;
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
    MLine.HistoryData.hCategoryUTC = dateArrStamp;
    return dateArr;
}
// 设置显示的信息
function setMlineToolInfo(showTip){
    var point;
    $(".vol i").text("-");
    $("#quantityRatio").text("-");
    $(".dataPrice").text("-");
    $(".change").text("-");
    $(".volume").text("-");
    if(MLine.HistoryData.hCategoryUTC.length>0){
        if(showTip){
            point = MLine.MLineSet.mouseHoverPoint;
        }else{
            point = MLine.HistoryData.hVolumesList.length-1;
        }
        $("#toolContent .dataTime").text(formatDate(MLine.HistoryData.hCategoryUTC[point],"1"));
        if (MLine.HistoryData.hValueList[point]) {
            if(MLine.HistoryData.hValueList[point] >= StockInfo.PreClose){
                // 浮窗数据
                $(".dataPrice").text(floatFixedDecimal(MLine.HistoryData.hValueList[point])).css("color",colorList[0]);
                $(".change").text(MLine.HistoryData.hZValuesList[point]+"%").css("color",colorList[0]);
            }else{
                // 浮窗数据
                $(".dataPrice").text(floatFixedDecimal(MLine.HistoryData.hValueList[point])).css("color",colorList[1]);
                $(".change").text(MLine.HistoryData.hZValuesList[point]+"%").css("color",colorList[1]);
            }
            $(".vol i").text(MLine.HistoryData.hVolumesList[point]);
            $("#quantityRatio").text(MLine.HistoryData.hVolumesList[point]);
            // 浮层中的销量
            var volFix = parseFloat(MLine.HistoryData.hVolumesList[point])/100;
            $(".volume").text(setUnit(volFix,true) +"手"); 
            
        }
    }
    
    
}
// 按键操作
$("#MLine,#kline").keydown(function (e) {
    e.preventDefault();
    e.stopPropagation();
    var scrollTop = $(document).scrollTop();
    $(document).scrollTop(scrollTop);
    var keyCode = e.keyCode;
    if(e.ctrlKey && keyCode==37){
        moveCtrl(-1, true);
    }
    if(e.ctrlKey && keyCode==39){
        moveCtrl(1, true);
    }
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
function move(index, type) {
    if(Charts.type!="mline") {
        // 获取dataZoom起始位置和结束位置，比较他的信息，设置他的位置
        var KStart = KChart.getOption().dataZoom[0].start,
            KEnd = KChart.getOption().dataZoom[0].end,
            KCenter = (KEnd-KStart)/2+KStart,
            KLength = KLine.HistoryData.hCategoryList.length,
            KContinerWidth = $("#kline_charts").width();

        var count = KChart?KChart.getOption().series[0].data.length:0;
        if (type) {
            var max = Charts.mouseHoverPoint>=Math.round(KEnd*KLength/100)-1;
            var min = Charts.mouseHoverPoint<Math.round(KStart*KLength/100); 
            if((index==-1&&min)||(index==1&&max)){
                return;
            }
            var name = KChart.getOption().series[0].name;
            KChart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: Charts.mouseHoverPoint + index,
                position: function (point, params) {
                    var offsetX = point[0];
                    var continerWidth = $("#kline_charts").width();
                    var centerX = continerWidth / 2;
                    if (offsetX-13 > centerX) {
                        $("#kline_tooltip").css("left", 83/830*continerWidth);
                    } else {
                        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
                    }
                }
            });

        } else {
            if (index == 1) {
                Charts.start += 10;
                if (Charts.start > 90) {
                    Charts.start = 90;
                    return;
                } else {
                    Charts.mouseHoverPoint = Charts.mouseHoverPoint + (count * Charts.zoom / 100);
                }
            } else {
                Charts.start -= 10;
                if (Charts.start < 0) {
                    Charts.start = 0;
                    return;
                } else {
                    Charts.mouseHoverPoint = Charts.mouseHoverPoint - (count * Charts.zoom / 100);
                }
            }
            KChart.dispatchAction({
                type: 'dataZoom',
                // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
                dataZoomIndex: 0,
                // 开始位置的百分比，0 - 100
                start: Charts.start,
                // 结束位置的百分比，0 - 100
                end: 100
            });
            
        }
    }else {
        var chart = MChart;
        if (type) {
            if (MLine.MLineSet.mouseHoverPoint == 0 && index == -1) {
                MLine.MLineSet.mouseHoverPoint = chart.getOption().series[0].data.length;
            }
            if (MLine.MLineSet.mouseHoverPoint == 0 && index == 1) {
                // index = 0;
            }
            if (MLine.MLineSet.mouseHoverPoint + index > chart.getOption().series[0].data.length - 1 && index == 1) {
                MLine.MLineSet.mouseHoverPoint = 0;
                index = 0;
            }
            var name = chart.getOption().series[0].name;
            chart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: MLine.MLineSet.mouseHoverPoint + index,
                name: name,
                position: ['50%', '50%']
            });
        } 
    }
};
function moveCtrl(index, type){
    if(Charts.type!="mline") {
        // 获取dataZoom起始位置和结束位置，比较他的信息，设置他的位置
        var KStart = KChart.getOption().dataZoom[0].start,
            KEnd = KChart.getOption().dataZoom[0].end,
            KCenter = (KEnd-KStart)/2+KStart,
            KLength = KLine.HistoryData.hCategoryList.length,
            KContinerWidth = $("#kline_charts").width();

        var count = KChart?KChart.getOption().series[0].data.length:0;
        if (type) {
            var max = Charts.mouseHoverPoint>=Math.round(KEnd*KLength/100)-1;
            var min = Charts.mouseHoverPoint<Math.round(KStart*KLength/100); 
            if((index==-1&&min)||(index==1&&max)){
                return;
            }
            var name = KChart.getOption().series[0].name;
            KChart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: Charts.mouseHoverPoint + index*10,
                position: function (point, params) {
                    var offsetX = point[0];
                    var continerWidth = $("#kline_charts").width();
                    var centerX = continerWidth / 2;
                    if (offsetX-13 > centerX) {
                        $("#kline_tooltip").css("left", 83/830*continerWidth);
                    } else {
                        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
                    }
                }
            });

        }
    }else {
        var chart = MChart;
        if (type) {
            if (MLine.MLineSet.mouseHoverPoint == 0 && index == -1) {
                MLine.MLineSet.mouseHoverPoint = chart.getOption().series[0].data.length;
            }
            if (MLine.MLineSet.mouseHoverPoint == 0 && index == 1) {
                // index = 0;
            }
            if (MLine.MLineSet.mouseHoverPoint + index > chart.getOption().series[0].data.length - 1 && index == 1) {
                MLine.MLineSet.mouseHoverPoint = 0;
                index = 0;
            }
            var name = chart.getOption().series[0].name;
            chart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: MLine.MLineSet.mouseHoverPoint + index*10,
                name: name,
                position: ['50%', '50%']
            });
        }
    }
}

