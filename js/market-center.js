var wsUrlDevelop = 'ws://103.66.33.67:80';//分时图地址
var stockXMlUrl = "http://103.66.33.58:443/GetCalcData";
var requestOffer = "ws://103.66.33.67:443";//报价表地址
var stockList = [];//解析XML后得到的数组 所有指数的时间、类型、id、小数位数等
var elementId,secId;
var ZSId,ExchangeID;
var LSData = ZCData = DYData = QPDATA = null;
var _FirstS = [{name:"上证综指",sectionid:1,exchangeID:"1",code:"000001"},{name:"深证成指",sectionid:1,exchangeID:"2",code:"399001"},{name:"沪深300",sectionid:1,exchangeID:"2",code:"399007"}];
var _SecS = [{name:"深证成指",sectionid:2,exchangeID:"2",code:"399001"},{name:"创业板",sectionid:2,exchangeID:"2",code:"399006"},{name:"中小板",sectionid:2,exchangeID:"2",code:"399003"}];
var _ThirS = [{name:"Ｂ股指数",sectionid:3,exchangeID:"1",code:"000003"},{name:"上证综指",sectionid:3,exchangeID:"1",code:"000001"},{name:"Ａ股指数",sectionid:3,exchangeID:"1",code:"000002"}];
var _FourthS = [{name:"成份Ｂ指",sectionid:4,exchangeID:"2",code:"399003"},{name:"深证成指",exchangeID:"2",sectionid:4,code:"399001"},{name:"深成指R",sectionid:4,exchangeID:"2",code:"399002"}];
var _FifthS = [{name:"创业板",sectionid:5,exchangeID:"2",code:"399006"},{name:"深证成指",exchangeID:"2",sectionid:5,code:"399001"},{name:"中小板",sectionid:5,exchangeID:"2",code:"399003"}];
var _SixthS = [{name:"中小板",sectionid:6,exchangeID:"2",code:"399003"},{name:"深证成指",exchangeID:"2",sectionid:6,code:"399001"},{name:"创业板",sectionid:6,exchangeID:"2",code:"399006"}];
var oWs=offerWs=socket=echartsWS=null;
var nowPage = 1;
var itemTotalCount = 0;
var count = 0;//推送报价表的次数
var priceForm = [];
var MarketStatus = null;
var sectionIdOld = 1;
$(function(){
    // 查询板块
    checkoutBlock();
    // 点击其他地方收回搜索下拉列表
    $("body").on("click",function(e){
        if($(e.target).attr("id") == "searchInput"){
            return;
        }
        $("#searchEnd").hide();
    }); 
    
    secId = $("#tab li").eq(0).data("sectionid");//当前选中板块id
    $(".zdf-list>h1").html( $("#tab li").eq(0).text());
    // 填充报价表
    initBlockInfo(secId);
    // 填充图表
    $("#main1").initMline(
        {
            id:_FirstS[0].code,
            exchangeID:_FirstS[0].exchangeID,
            stockName:_FirstS[0].name,
            stockCode:_FirstS[0].code,
        }
    );
    $("#main2").initMline(
        {
            id:_FirstS[1].code,
            exchangeID:_FirstS[1].exchangeID,
            stockName:_FirstS[1].name,
            stockCode:_FirstS[1].code,
        }
    );
    $("#main3").initMline(
        {
            id:_FirstS[2].code,
            exchangeID:_FirstS[2].exchangeID,
            stockName:_FirstS[2].name,
            stockCode:_FirstS[2].code,
        }
    );
    initChartInfo();
});
;(function($,window,document,undefined){
    $.fn.initMline = function(options,params){
        options = $.extend({},options,$.fn.initMline.defaults);
        $this = $(this);
        elementId = $this.attr("id");
        ZSId = options.id;
        ExchangeID = options.exchangeID;
        var xmlData;
        $("#"+elementId).parents(".market-main-chart").siblings(".market-chart-title").text(options.stockName+"("+options.stockCode+")");
        
        $(".market-chart-decs").html("<i>-</i><i>0.00%</i><i>0.00</i>");
        $(".market-chart-decs").addClass("market-chart-decs-black");
        //第一次打开终端,初始化代码表第一次默认请求
        var date = new Date();
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
                        xmlData:xmlData,
                        stockName:options.stockName,
                        stockCode:options.stockCode,
                        yc:0,
                        interval:0,
                        myChart:null,
                        v_data:[],
                        c_date:[],
                        oneZSInfo:null,
                        history_data:[],
                        a_history_data:[],
                        z_history_data:[],
                    };
                    stockList.push(opt);
                    return stockList;
                }else{
                    console.log("请求码表出错");
                }
            }
        });
    };
})(jQuery, window, document);
// 查询板块
function checkoutBlock(){
    var date = new Date();
    $.ajax({
        url:"http://103.66.33.58:443/GetSections",
        data:{"SectionClass":5},
        type:"GET",
        dataType:'json',
        async:false,
        cache:false, 
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
                // 板块类别
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
// 建立查询报价表的连接
function initBlockInfo(secId){
    oWs = new WebSocketConnectBlock({wsUrl:requestOffer});
    offerWs = oWs.createWebSocket(requestOffer);
    var options = {
        // 订阅报价表
        takeOffer:{
            "msgtype":"S3301",
            "sectionId": secId,
            "startIndex": 0,
            "count": 10,
            "field": 0,
            "orderType": 0
        },
        // 获取总条数
        totalCount:{
            "msgtype":"Q3302",
            "sectionId": secId
        }        
    };
    connectEvent(options);
}
// 连接报价表处理事件
function connectEvent(opt){
    offerWs.onclose = function (event) {
        console.log(event);
        oWs.reconnect(); //终端重连
        // alert("请稍等");
    };
    offerWs.onerror = function (event) {
        console.log(event);
        oWs.reconnect(); //报错重连
    };
    offerWs.onopen = function () {
        oWs.request(opt.takeOffer);
        setTimeout(function(){
            oWs.request(opt.totalCount);
        },1000);
    };
    offerWs.onmessage = function (evt) {
        var data  = evt.data.split("|")[0];  //每个json包结束都带有一个| 所以分割最后一个为空
        data = eval( "(" + data + ")" );
        data = data || data[0];
        var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
        switch(MsgType)
        {
            // 历史查询报价表状态
            // case "R3301":
            //     fillNewOfferForm(data);
            //     break;
            // 订阅报价表
            case "P3301":
                if(data.ErrorCode == 9999){
                    return;
                }
                if(!data.QueryRes && data.QueryRes.length<=0){
                    return;
                }
                count++;

                if(priceForm.length==0||priceForm[0]&&priceForm[0].InstrumentName==data.QueryRes[0].InstrumentName){
                    fillNewOfferForm(data);
                    priceForm = data.QueryRes;
                }  
                break;
            case "R3302":
                if(data.ErrorCode == 9999){
                    return;
                }
                itemTotalCount = data.SectionItemCount;
                $(".M-box2").pagination({
                    prevContent:"上一页",
                    nextContent:"下一页",
                    totalData:itemTotalCount,
                    showData:10,
                    coping: true,
                    // mode: 'fixed',
                    callback: function (api) {
                        var cancelOfferHeader = {
                            "msgtype":"D3301",
                            "sectionId": sectionIdOld,
                            "field": 0,
                            "orderType": 0
                        }
                        oWs.request(cancelOfferHeader);

                        priceForm = [];
                        count = 0;
                        nowPage = api.getCurrent();
                        var offerHeader = {
                            "msgtype":"S3301",
                            "sectionId": secId,
                            "startIndex": api.getCurrent() * 10 - 9,
                            "count": 10,
                            "field": 0,
                            "orderType": 0
                        };

                        oWs.request(offerHeader);
                        
                        
                    }
                });
                break;
            default:
            break;
        }
    };
}
// 点击切换处理
function tabLi(index){
    nowPage = 1;
    count = 0;
    var el = $(".mc-tab-li ul li").eq(index);
    $(".zdf-list>h1").html($(el).text());
    


    var cancelOfferHeader = {
        "msgtype":"D3301",
        "sectionId": sectionIdOld,
        "field": 0,
        "orderType": 0
    }
    oWs.request(cancelOfferHeader);
    priceForm = [];
    count = 0;

    secId = $(el).data("sectionid");
    var offerHeader={
        "msgtype":"S3301",
        "sectionId": secId,
        "startIndex": 0,
        "count": 10,
        "field": 0,
        "orderType": 0
    };
    oWs.request(offerHeader);
    sectionIdOld = secId;

    var pageCount={
        "msgtype":"Q3302",
        "sectionId": secId,
    };
    setTimeout(function(){
        oWs.request(pageCount);
    },1000);
    $(".M-box2").pagination({
        prevContent:"上一页",
        nextContent:"下一页",
        totalData:itemTotalCount,
        showData:10,
        // mode: 'fixed',
        cope:true,
        callback: function (api) {
            nowPage = api.getCurrent();//等到当前页
            var data = {
                "msgtype":"S3301",
                "sectionId": secId,
                "startIndex": api.getCurrent() * 10 - 9,
                "count": 10,
                "field": 0,
                "orderType": 0
            };
            oWs.request(data);
        }
    });
    for(var i=0;i<stockList.length;i++){
        var QXDYA={
            "MsgType":"N1010",
            "ExchangeID":stockList[i].exchangeID,
            "InstrumentID":stockList[i].id,
            "Instrumenttype":"1,11"
        };
        socket.request(QXDYA);
    }
    stockList=[];
    switch($(el).data("sectionid")){
        case 1:
            // 填充图表
            $("#main1").initMline(
                {
                    id:_FirstS[0].code,
                    exchangeID:_FirstS[0].exchangeID,
                    stockName:_FirstS[0].name,
                    stockCode:_FirstS[0].code,
                }
            );
            $("#main2").initMline(
                {
                    id:_FirstS[1].code,
                    exchangeID:_FirstS[1].exchangeID,
                    stockName:_FirstS[1].name,
                    stockCode:_FirstS[1].code,
                }
            );
            $("#main3").initMline(
                {
                    id:_FirstS[2].code,
                    exchangeID:_FirstS[2].exchangeID,
                    stockName:_FirstS[2].name,
                    stockCode:_FirstS[2].code,
                }
            );
        break;
        case 2:
            // 填充图表
            $("#main1").initMline(
                {
                    id:_SecS[0].code,
                    exchangeID:_SecS[0].exchangeID,
                    stockName:_SecS[0].name,
                    stockCode:_SecS[0].code,
                    myChart:null
                }
            );
            $("#main2").initMline(
                {
                    id:_SecS[1].code,
                    exchangeID:_SecS[1].exchangeID,
                    stockName:_SecS[1].name,
                    stockCode:_SecS[1].code,
                    myChart:null
                }
            );
            $("#main3").initMline(
                {
                    id:_SecS[2].code,
                    exchangeID:_SecS[2].exchangeID,
                    stockName:_SecS[2].name,
                    stockCode:_SecS[2].code,
                    myChart:null
                }
            );
        break;
        case 3:
        // 填充图表
            $("#main1").initMline(
                {
                    id:_ThirS[0].code,
                    exchangeID:_ThirS[0].exchangeID,
                    stockName:_ThirS[0].name,
                    stockCode:_ThirS[0].code,
                    myChart:null
                }
            );
            $("#main2").initMline(
                {
                    id:_ThirS[1].code,
                    exchangeID:_ThirS[1].exchangeID,
                    stockName:_ThirS[1].name,
                    stockCode:_ThirS[1].code,
                    myChart:null
                }
            );
            $("#main3").initMline(
                {
                    id:_ThirS[2].code,
                    exchangeID:_ThirS[2].exchangeID,
                    stockName:_ThirS[2].name,
                    stockCode:_ThirS[2].code,
                    myChart:null
                }
            );
        break;
        case 4:
            $("#main1").initMline(
                {
                    id:_FourthS[0].code,
                    exchangeID:_FourthS[0].exchangeID,
                    stockName:_FourthS[0].name,
                    stockCode:_FourthS[0].code,
                    myChart:null
                }
            );
            $("#main2").initMline(
                {
                    id:_FourthS[1].code,
                    exchangeID:_FourthS[1].exchangeID,
                    stockName:_FourthS[1].name,
                    stockCode:_FourthS[1].code,
                    myChart:null
                }
            );
            $("#main3").initMline(
                {
                    id:_FourthS[2].code,
                    exchangeID:_FourthS[2].exchangeID,
                    stockName:_FourthS[2].name,
                    stockCode:_FourthS[2].code,
                    myChart:null
                }
            );
        break;
        case 5:
            $("#main1").initMline(
                {
                    id:_FifthS[0].code,
                    exchangeID:_FifthS[0].exchangeID,
                    stockName:_FifthS[0].name,
                    stockCode:_FifthS[0].code,
                    myChart:null
                }
            );
            $("#main2").initMline(
                {
                    id:_FifthS[1].code,
                    exchangeID:_FifthS[1].exchangeID,
                    stockName:_FifthS[1].name,
                    stockCode:_FifthS[1].code,
                    myChart:null
                }
            );
            $("#main3").initMline(
                {
                    id:_FifthS[2].code,
                    exchangeID:_FifthS[2].exchangeID,
                    stockName:_FifthS[2].name,
                    stockCode:_FifthS[2].code,
                    myChart:null
                }
            );
        break;
        case 6:
            $("#main1").initMline(
                {
                    id:_SixthS[0].code,
                    exchangeID:_SixthS[0].exchangeID,
                    stockName:_SixthS[0].name,
                    stockCode:_SixthS[0].code,
                    myChart:null
                }
            );
            $("#main2").initMline(
                {
                    id:_SixthS[1].code,
                    exchangeID:_SixthS[1].exchangeID,
                    stockName:_SixthS[1].name,
                    stockCode:_SixthS[1].code,
                    myChart:null
                }
            );
            $("#main3").initMline(
                {
                    id:_SixthS[2].code,
                    exchangeID:_SixthS[2].exchangeID,
                    stockName:_SixthS[2].name,
                    stockCode:_SixthS[2].code,
                    myChart:null
                }
            );
        break;
        default:
        break;
    }
    for(var i=0;i<stockList.length;i++){
        LSData={
            "MsgType": "Q3011",
            "ExchangeID": stockList[i].exchangeID,
            "InstrumentID": stockList[i].id,
            "StartIndex": "0",
            "StartDate": "-1",
            "StartTime": "0", 
            "Count": "0"
        };
        ZCData={
            "MsgType":"S1010",
            "ExchangeID":stockList[i].exchangeID,
            "InstrumentID":stockList[i].id,
            "Instrumenttype":"1,11"
        };
        QPData={
            "MsgType":"Q8002",
            "ExchangeID":stockList[i].exchangeID,
            "InstrumentID":stockList[i].id,
            "PructType":"0"
        };
        // 获取历史数据
        // socket.request(LSData);
        getHistoryData(i);
        // 获取昨收值
        socket.request(ZCData);
        // 实时订阅
        // socket.request(DYData);
        // 清盘
        socket.request(QPData);
    }
}
// 获取X轴的数值
function getxAxis(todayDateStr,stockOne){
    var oneZSInfo = stockOne.oneZSInfo;
    var beginTime,finishTime,beginTime1,finishTime1,
        v_data = [];
        oneZSInfo.c_data=[];
    //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
    var b_time1,b_time2;  // 停盘时间
    var todayDate = formatDate(todayDateStr);
    if(oneZSInfo[0].sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
        if(oneZSInfo.length > 1){
            beginTime = todayDate + " " + oneZSInfo[0].startTime;
            finishTime = todayDate + " " + oneZSInfo[0].endTime;
            beginTime1 = todayDate + " " + oneZSInfo[1].startTime1;
            finishTime1 = todayDate + " " + oneZSInfo[1].endTime1;
            
            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{
            beginTime = todayDate + " " + oneZSInfo[0].startTime;
            finishTime = todayDate + " " + oneZSInfo[0].endTime;
        }
    }else{  //跨天的时间计算  1-中间有断开
        if(oneZSInfo.length > 1){
            beginTime = todayDate + " " + oneZSInfo[0].startTime;
            finishTime = todayDate + " " + oneZSInfo[0].endTime;
            beginTime1 = todayDate + " " + oneZSInfo[1].startTime1;
            finishTime1 = todayDate + " " + oneZSInfo[1].endTime1;

            // 前半段时间的起始时间和结束时间比较
            if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                //都是当天时间 
                // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                    // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                    if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                    }else{
                        //跨天
                        finishTime1 = formatDate(todayDateStr+1) + " " + oneZSInfo[1].endTime1;
                    }
                }else{
                    beginTime1 = formatDate(todayDateStr+1) + " " + oneZSInfo[1].startTime1;
                    finishTime1 = formatDate(todayDateStr+1) + " " + oneZSInfo[1].endTime1;
                }
            }else{
                //结束时间为第二天   跨天了
                finishTime = formatDate(todayDateStr+1) + " " + oneZSInfo[0].endTime;
                beginTime1 = formatDate(todayDateStr+1) + " " + oneZSInfo[1].startTime1;
                finishTime1 = formatDate(todayDateStr+1) + " " + oneZSInfo[1].endTime1;
            }

            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{  // 2- 中间未断开
            beginTime = todayDate + " " + oneZSInfo[0].startTime;
            finishTime = formatDate(todayDateStr+1) + " " + oneZSInfo[0].endTime;
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
            oneZSInfo.c_data.push(beginTime);
        } else {
            timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
            if(b_time1 && b_time2){
                if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                    continue;
                } else {
                    oneZSInfo.c_data.push(timeAdd);
                }
            }else{
                oneZSInfo.c_data.push(timeAdd);
            }
        }
        i++;
    }
    var cLen = oneZSInfo.c_data.length;
    for(var k = 0;k < cLen;k++){
        v_data.push(formatDate(oneZSInfo.c_data[k],"1"));
    }
    stockOne.history_data.length = cLen;
    stockOne.a_history_data.length = cLen;
    stockOne.z_history_data.length = cLen;
    return v_data;
}
//1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位
function compareTime(dataXML){
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
    typeIndex = dataXML.ProductType;//指数类型
    var start = parseInt(startTime.split(":")[0]);
    var end = parseInt(endTime.split(":")[0]);
    if(endTime1){
        end = parseInt(endTime1.split(":")[0]);
    }
    var json,json1;
    if(start > end){//国际时间，需要将当前时间减一
        json = {
            sub : -1,
            typeIndex:typeIndex,
            startTime:startTime,
            endTime:endTime1
        };
        ZSInfo.push(json);
    }else{
        json = {
            sub : 0,
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
function initChartInfo(){
    // 建立查询图表的连接
    socket = new WebSocketConnect({wsUrl:wsUrlDevelop});
    echartsWS = socket.createWebSocket(wsUrlDevelop);
    initChartInfoEvt();
}
function initChartInfoEvt(){
    echartsWS.onclose = function () {
        socket.reconnect(); //终端重连
    };
    echartsWS.onerror = function () {
        socket.reconnect(); //报错重连
    };
    echartsWS.onopen = function () {
        //心跳检测重置
        socket.reset().start(); //都第一次建立连接则启动心跳包
        for(var i=0;i<stockList.length;i++){
            ZCData={
                "MsgType":"S1010",
                "ExchangeID":stockList[i].exchangeID,
                "InstrumentID":stockList[i].id,
                "Instrumenttype":"1,11"
            };
            QPData={
                "MsgType":"Q8002",
                "ExchangeID":stockList[i].exchangeID,
                "InstrumentID":stockList[i].id,
                "PructType":"0"
            };
            // 获取历史数据
            getHistoryData(i);
            // 获取昨收值
            socket.request(ZCData);
            // 实时订阅
            // socket.request(DYData);
            // 清盘
            socket.request(QPData);
        }
    };
    echartsWS.onmessage = function (evt) {
        var data  = evt.data.split("|")[0];  //每个json包结束都带有一个| 所以分割最后一个为空
        data = eval( "(" + data + ")" );
        data = data || data[0];
        var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
        switch(MsgType){
            case "R3011"://订阅历史数据
                if(data.ErrorCode == 9999){
                    return;
                }
                // 初始化图表
                for(var i=0;i<stockList.length;i++){
                    if(data.InstrumentID == parseInt(stockList[i].stockCode) && data.ExchangeID == parseInt(stockList[i].exchangeID)){
                        initCharts(data,'',stockList[i]);
                    }
                }
            break;
            case "P0001"://订阅快照
                for(var i=0;i<stockList.length;i++){
                    if(data.InstrumentID == parseInt(stockList[i].stockCode) && data.ExchangeID == parseInt(stockList[i].exchangeID)){
                        if(stockList[i].yc){
                            return;
                        }
                        stockList[i].yc=data.PreClose; //获取昨收值

                        initYCCharts(data,stockList[i]);
                    }
                }
            break;
            case "P0011"://订阅分钟线
                for(var i=0;i<stockList.length;i++){
                    if(data.InstrumentID == parseInt(stockList[i].stockCode) && data.ExchangeID == parseInt(stockList[i].exchangeID)){
                        if(stockList[i].myChart != undefined){
                            initCharts(data,'add',stockList[i]);
                        }
                    }
                }
            break;
            case "R8002"://清盘
                MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                if(MarketStatus == 1){//收到清盘指令  操作图表
                    for(var i=0;i<stockList.length;i++){
                        redrawChart(data,stockList[i]);
                    }
                }
            case "R8050":  //心跳包
                // console.log(data);
            default:
            break;
            socket.reset().start();
        }
    };
}
// 获取历史数据请求
function getHistoryData(i){
    setTimeout(function(){
        LSData={
            "MsgType": "Q3011",
            "ExchangeID": stockList[i].exchangeID,
            "InstrumentID": stockList[i].id,
            "StartIndex": "0",
            "StartDate": "-1",
            "StartTime": "0", 
            "Count": "0"
        };
        socket.request( LSData );
    },100 * i);
}
// 清盘后重绘图表
function redrawChart(data,stockOne){
    stockOne.history_data = []; //价格历史记录
    stockOne.z_history_data = []; //涨跌幅历史记录
    stockOne.a_history_data = []; //成交量记录
    stockOne.v_data = [];
    stockOne.c_data = [];
    if(data){
        if(stockOne.myChart == undefined) return;
        yc = parseFloat(stockOne.yc);
        decimal = stockOne.xmlData.PriceDecimal;
        if (yc) {
            var minY = (yc - yc*0.03).toFixed(decimal);
            var middleY = yc.toFixed(decimal);
            var maxY = (yc + yc*0.03).toFixed(decimal);
        } else {
            var minY = 0;
            var middleY = 1;
            var maxY = 2;
        }
        var split = parseFloat(((maxY - minY) / 6).toFixed(4));

        var v_data =  getxAxis((data.Date),stockOne);
        var option ={
            yAxis: {
                type:"value",
                min: minY,
                max: maxY,
                interval: split,
                position:"right",
                boundaryGap: [0, '100%'],
                splitLine:{
                    lineStyle:{
                        color:"#e5e5e5"
                    }
                },
            },
            xAxis:{
                data:v_data
            },
            series: 
                {
                    type:'line',
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
                }
        };
        stockOne.myChart.setOption(option);
        $("#"+stockOne.elementId).parents("a").attr("href","./detail.html?exchangeID="+stockOne.exchangeID+"&id="+stockOne.id);
    }else{
        console.log("清盘有误");
    }
}
// 绘制历史数据和实时更新数据
function initCharts(data,type,stockOne){
    if(!data){
        console.log("没有数据");
        return;
    }
    var yc = parseFloat(stockOne.yc);//昨收
    var decimal = stockOne.xmlData.PriceDecimal;//保留的小数位数
    var limitUp = Number((yc + yc*0.1).toFixed(decimal));
    var limitDown = Number((yc - yc*0.1).toFixed(decimal));
    if(type=="add"){
        var a_lastData = data;
        var last_dataTime = formatTime(a_lastData.Time);//moment(parseFloat(a_lastData[0].Time + "000")).format("HH:mm"); //行情最新时间
        var last_date = dateToStamp(formatDate(a_lastData.Date) +" " + last_dataTime);
        var zVale = parseFloat(((parseFloat(a_lastData.Price) - yc) / yc * 100).toFixed(2)); //行情最新涨跌幅
        var aValue = parseFloat(a_lastData.Volume); //最新成交量
        if((parseFloat(a_lastData.Price)) >= limitUp){
            a_lastData.Price = limitUp;
        }else if((parseFloat(a_lastData.Price)) < limitDown){
            a_lastData.Price = limitDown;
        }

        for(var i=0;i<stockOne.oneZSInfo.c_data.length;i++){
            if(last_date == stockOne.oneZSInfo.c_data[i]){
                stockOne.history_data[i] = parseFloat(a_lastData.Price);
                stockOne.z_history_data[i] = parseFloat(zVale);
                stockOne.a_history_data[i] = parseFloat(aValue);
                // 中间有断开
                if(i > (stockOne.history_data.length-1) ){
                    for(var j=stockOne.history_data.length-1;j<=i;j++){
                        stockOne.history_data[j].push(null);
                        stockOne.z_history_data[j].push(null);
                        stockOne.a_history_data[j].push(null);
                        if(j == i){
                            stockOne.history_data[j] = parseFloat(a_lastData.Price);
                            stockOne.z_history_data[j] = parseFloat(zVale);
                            stockOne.a_history_data[j] = parseFloat(aValue);
                        }
                    }
                }
            }else{
                
            }
        }

        var fvalue, r1;
            fvalue = parseFloat(a_lastData.Price);
            r1 = Math.abs(fvalue - parseFloat(yc));
        if (r1 > stockOne.interval) {
            stockOne.interval = r1 + r1*0.1;
            var minY = (yc - stockOne.interval).toFixed(decimal);
            var middleY = yc.toFixed(decimal);
            var maxY = (yc + stockOne.interval).toFixed(decimal);
            if(minY <= limitDown){
                minY = limitDown;
            }
            if(maxY >= limitUp){
                maxY = limitUp;
            }
            var split = parseFloat(((maxY - minY) / 6).toFixed(4));
            stockOne.myChart.setOption({
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
        stockOne.myChart.setOption({
            xAxis:{
                data:stockOne.v_data
            },
            series: [
                {
                    data: stockOne.history_data,
                }
            ]
        });
        $("#"+stockOne.elementId).parents("a").attr("href","./detail.html?exchangeID="+stockOne.exchangeID+"&id="+stockOne.id);
    }else{
        if(!data.KLineSeriesInfo && data.KLineSeriesInfo.length<=0){
            console.log("暂时没有数据");
            return;
        }
        $("#"+stockOne.elementId).show();
        data = data.KLineSeriesInfo;
        var startTime=startTime1=endTime=endTime1=null;//各个指数的交易时间
        var oneZSInfo = stockOne.oneZSInfo = compareTime(stockOne.xmlData,stockOne.id);
        if(oneZSInfo.length>1){//分段计算时间
            startTime = oneZSInfo[0].startTime;
            endTime = oneZSInfo[0].endTime;
            startTime1 = oneZSInfo[1].startTime1;
            endTime1 = oneZSInfo[1].endTime1;
        }else{//时间连续交易
            startTime = oneZSInfo[0].startTime;
            endTime = oneZSInfo[0].endTime;
        }
        var v_data = getxAxis(data[0].Date,stockOne);
        stockOne.v_data = v_data;
        var lastDate = dateToStamp(formatDate(data[data.length-1].Date) +" "+formatTime(data[data.length-1].Time)),
            price = [],//价格
            volume = [],//成交量
            zdfData = [];//涨跌幅
            stockOne.interval = 0;
        for(var i=0;i<oneZSInfo.c_data.length;i++){
            if(lastDate < oneZSInfo.c_data[i]){
                break;
            }
            for(var j=0;j<data.length;j++){
                var dateStamp = dateToStamp(formatDate(data[j].Date) +" "+formatTime(data[j].Time));
                if(oneZSInfo.c_data[i] == dateStamp){
                    var fvalue = parseFloat(data[j].Price);//价格
                    if(fvalue >= limitUp){
                        price[i] = limitUp;
                        zdfData[i] = 0.10;
                    }else if(fvalue <= limitDown){
                        price[i] = limitDown;
                        zdfData[i] = -0.10;
                    }else{
                        price[i] = fvalue;
                        zdfData[i] = (((fvalue-yc)/yc)* 100).toFixed(2);
                    }
                    
                    volume[i] = data[j].Volume;
                    
                    if(fvalue > 0){
                        r1 = Math.abs(fvalue - yc);
                        if (r1 > stockOne.interval) {
                            stockOne.interval = r1;
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
        var dataLen = v_data.length;
        stockOne.history_data = price;//价格历史数据
        stockOne.z_history_data = zdfData;//涨跌幅历史数据
        stockOne.a_history_data = volume;//成交量历史数据
        
        stockOne.interval = stockOne.interval + stockOne.interval*0.1;
        yc = parseFloat(yc);
        var minY,middleY,maxY,minY1,maxY1;
        if (yc) {
            minY = (yc - stockOne.interval).toFixed(decimal);
            middleY = yc.toFixed(decimal);
            maxY = (yc + stockOne.interval).toFixed(decimal);

            var dd = ((parseFloat(minY) - (yc)) / (yc) );
            if(Math.abs(dd) > 1){
                minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
                maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
            }else{
                minY1 = ((parseFloat(minY) - (yc)) / (yc) * 100).toFixed(2);
                maxY1 = ((parseFloat(maxY) - (yc)) / (yc) * 100).toFixed(2);
            }
        } else {
            minY = 0;
            middleY = 1;
            maxY = 2;
        }

        var split = parseFloat(((maxY - minY) / 6).toFixed(decimal));
        var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(decimal));

        var option = {
            xAxis:{
                splitLine:{
                    show:true,
                    interval:120,
                    lineStyle:{
                        color:"#e5e5e5",
                        opacity:1
                    }
                },
                axisLine:{
                    show:false
                },
                axisTick:{
                    show:false
                },
                type:"category",
                data:v_data,
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
                    show:false,
                    label: {
                        formatter: function (params, value, s) {
                            return (params.value);
                        },
                        padding:[3,5,5,5],
                        show:false
                    }
                }
            },
            yAxis:{
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
        // stockOne.myChart = echarts.init(document.getElementById(stockOne.elementId));
        stockOne.myChart.setOption(option);

        var size = (parseFloat(stockOne.history_data[stockOne.history_data.length-1]) - parseFloat(yc)).toFixed(decimal);
        if(stockOne.history_data[stockOne.history_data.length-1] >= yc){
            htmlStr = '<label class="col_e22"><i style="font-size: 24px;margin-right: 10px;">'+parseFloat(stockOne.history_data[stockOne.history_data.length-1]).toFixed(decimal)+'</i><i style="margin-right: 10px;">+'+stockOne.z_history_data[stockOne.history_data.length-1]+'%</i><i>+'+size+'</i></label>';
        }else{
            htmlStr = '<label class="col_3bc"><i style="font-size: 24px;margin-right: 10px;">'+parseFloat(stockOne.history_data[stockOne.history_data.length-1]).toFixed(decimal)+'</i><i style="margin-right: 10px;">'+stockOne.z_history_data[stockOne.history_data.length-1]+'%</i><i>'+size+'</i></label>';
        }
        $("#"+stockOne.elementId).parents(".market-main-chart").siblings(".market-chart-decs").html(htmlStr);
        $("#"+stockOne.elementId).parents("a").attr("href","./detail.html?exchangeID="+stockOne.exchangeID+"&id="+stockOne.id);
    }
}
// 得到昨收后画空表
function initYCCharts(data,stockOne){
    if(!data){
        console.log("没有数据");
        return;
    }
    var yc = parseFloat(stockOne.yc);//昨收
    var decimal = stockOne.xmlData.PriceDecimal;//保留的小数位数
    var limitUp = Number((yc + yc*0.1).toFixed(decimal));
    var limitDown = Number((yc - yc*0.1).toFixed(decimal));
    $("#"+stockOne.elementId).show();
    var startTime=startTime1=endTime=endTime1=null;//各个指数的交易时间
    var oneZSInfo = stockOne.oneZSInfo = compareTime(stockOne.xmlData,stockOne.id);
    if(oneZSInfo.length>1){//分段计算时间
        startTime = oneZSInfo[0].startTime;
        endTime = oneZSInfo[0].endTime;
        startTime1 = oneZSInfo[1].startTime1;
        endTime1 = oneZSInfo[1].endTime1;
    }else{//时间连续交易
        startTime = oneZSInfo[0].startTime;
        endTime = oneZSInfo[0].endTime;
    }
    var v_data = getxAxis(data.Date,stockOne);
    stockOne.v_data = v_data;
    var minY,middleY,maxY,minY1,maxY1;
    if (yc) {
        minY = (yc - stockOne.interval).toFixed(decimal);
        middleY = yc.toFixed(decimal);
        maxY = (yc + stockOne.interval).toFixed(decimal);

        var dd = ((parseFloat(minY) - (yc)) / (yc) );//* 100);
        if(Math.abs(dd) > 1){
            minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
            maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
        }else{
            minY1 = ((parseFloat(minY) - (yc)) / (yc) * 100).toFixed(2);
            maxY1 = ((parseFloat(maxY) - (yc)) / (yc) * 100).toFixed(2);
        }
    } else {
        minY = 0;
        middleY = 1;
        maxY = 2;
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
        },
        tooltip:{
            trigger:"axis",
            show:false
        },
        axisPointer:{
            show:false,
            label:{
                show:false,
                backgroundColor:"#555"
            },
            lineStyle:{
                type:"dotted"
            }
        },
        xAxis:{
            splitLine:{
                show:true,
                interval:120,
                lineStyle:{
                    color:"#e5e5e5",
                    opacity:1
                }
            },
            axisLine:{
                show:false
            },
            axisTick:{
                show:false
            },
            type:"category",
            data:v_data,
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
                show:false,
                label: {
                    formatter: function (params, value, s) {
                        return (params.value);
                    },
                    padding:[3,5,5,5],
                    show:false
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
            data:''
        }
    };
    stockOne.myChart = echarts.init(document.getElementById(stockOne.elementId));
    stockOne.myChart.setOption(option);
    $("#"+stockOne.elementId).parents("a").attr("href","./detail.html?exchangeID="+stockOne.exchangeID+"&id="+stockOne.id);
}
// 填充报价表表单
function fillNewOfferForm(data){
    var strHtml = '';
    // if(count > 1){
    //     bgColor = 'col_bgC';
    // }
    for(var i=0;i<data.QueryRes.length;i++){
        var pColor = oColor = hColor = lColor = ucColor = urColor = '',
            pbgColor = obgColor = hbgColor = lbgColor = '';
        var price=openMC=high=low=yc=udChange=udRatio=0;
        price = parseFloat(data.QueryRes[i].Price);
        openMC = parseFloat(data.QueryRes[i].OpenPx);
        high = parseFloat(data.QueryRes[i].HighPx);
        low = parseFloat(data.QueryRes[i].LowPx);
        yc = parseFloat(data.QueryRes[i].PreClose);
        udChange = parseFloat(data.QueryRes[i].UDChange);
        udRatio = parseFloat(data.QueryRes[i].UDRatio);
        for(var j=0;j<priceForm.length;j++){
            if(data.QueryRes[i].ExchangeID == priceForm[j].ExchangeID && data.QueryRes[i].InstrumentID == priceForm[j].InstrumentID){
                if(price != parseFloat(priceForm[j].Price)){
                    pbgColor = 'col_bgC';
                }else{
                    pbgColor = '';
                }
                if(openMC != parseFloat(priceForm[j].OpenPx)){
                    obgColor = 'col_bgC';
                }else{
                    obgColor = '';
                }
                if(high != parseFloat(priceForm[j].HighPx)){
                    hbgColor = 'col_bgC';
                }else{
                    hbgColor = '';
                }
                if(low != parseFloat(priceForm[j].LowPx)){
                    lbgColor = 'col_bgC';
                }else{
                    lbgColor = '';
                }
                break;
            }
        }
        // // 去掉背景颜色
        // if(data.QueryRes[i].Time>=150000){
        //     setTimeout(function(){
        //         lbgColor = hbgColor = obgColor = pbgColor = '';
        //     },1000);
        // }
        if(price > yc){
            pColor = 'col_e22';
        }else if(price < yc){
            pColor = 'col_3bc';
        }else{
            pColor = '';
        }
        if(openMC > yc){
            oColor = 'col_e22';
        }else if(openMC < yc){
            oColor = 'col_3bc';
        }else{
            oColor = '';
        }
        if(high > yc){
            hColor = 'col_e22';
        }else if(high < yc){
            hColor = 'col_3bc';
        }else{
            hColor = '';
        }
        if(low > yc){
            lColor = 'col_e22';
        }else if(low < yc){
            lColor = 'col_3bc';
        }else{
            lColor = '';
        }
        if(udRatio > 0){
            urColor = 'col_e22';
        }else if(udRatio < 0){
            urColor = 'col_3bc';
        }else{
            urColor = '';
        }
        if(udChange > 0){
            ucColor = 'col_e22';
        }else if(udRatio < 0){
            ucColor = 'col_3bc';
        }else{
            ucColor = '';
        }
        
        strHtml += '<li class="zdf-list-one zdf-list-detail"><ul class="clearfix">'+
                    '<li>'+(nowPage==1?(i+1):(nowPage-1)*10+(i+1))+'</li>'+
                    '<li><a data-exchangeID='+data.QueryRes[i].ExchangeID+' data-id='+data.QueryRes[i].InstrumentID+' href="javascript:void(0)">'+data.QueryRes[i].InstrumentID+'</a></li>'+
                    '<li><a data-exchangeID='+data.QueryRes[i].ExchangeID+' data-id='+data.QueryRes[i].InstrumentID+' href="javascript:void(0)">'+data.QueryRes[i].InstrumentName+'</a></li>'+
                    '<li class="'+pColor+' '+pbgColor+'">'+price.toFixed(2)+'</li>'+
                    '<li class="'+ucColor+' '+pbgColor+'">'+udChange.toFixed(2)+'</li>'+
                    '<li class="'+urColor+' '+pbgColor+'">'+udRatio.toFixed(2)+'</li>'+
                    '<li class="'+oColor+' '+obgColor+'">'+openMC.toFixed(2)+'</li>'+
                    '<li class="'+hColor+' '+hbgColor+'">'+high.toFixed(2)+'</li>'+
                    '<li class="'+lColor+' '+lbgColor+'">'+low.toFixed(2)+'</li>'+
                    '<li>'+yc.toFixed(2)+'</li>'+
                    '<li>'+parseFloat(data.QueryRes[i].VolRatio).toFixed(2)+'</li>'+
                    '<li>'+parseFloat(data.QueryRes[i].Amplitude).toFixed(2)+'</li>'+
                    '<li>'+floatFixedTwo(data.QueryRes[i].AccVolume/10000)+'</li>'+
                    '<li>'+floatFixedTwo(data.QueryRes[i].AccTurover/10000)+'</li>'+
                    '</ul></li>';
    }
    $("#offerForm").html(strHtml);
    setTimeout(function(){
        $("#offerForm .col_bgC").css("background-color","transparent")
    },2000)
}
$("#offerForm").on("dblclick","a",function(event){
    var exchangeID = $(this).attr("data-exchangeID");
    var id = $(this).attr("data-id");
    location.href = "../html/detail.html?exchangeID="+exchangeID+"&id="+id+"";
});
// 建立报价表数据连接 websocket  
var WebSocketConnectBlock = function(options) {
    this.ws = null;
    var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
    wsUrl = options.wsUrl;  //开发
    var timeout = 60000,//60秒
        timeoutObj = null,
        serverTimeoutObj = null;
    var _target = this;
    //建立socket连接
    WebSocketConnectBlock.prototype.createWebSocket = function (wsUrl) {
        try {
            this.ws = new WebSocket(wsUrl);
            return this.ws;
        } catch (e) {
            this.reconnect(wsUrl); //如果失败重连
        }
    };
    // 关闭socket连接
    WebSocketConnectBlock.prototype.closeWebSocket = function () {
        this.ws.close();
    };
    //socket重连
    WebSocketConnectBlock.prototype.reconnect = function () {
        $this = this;
        if (lockReconnect) return;
        lockReconnect = true;
        //没连接上会一直重连，设置延迟避免请求过多
        setTimeout(function () {
            offerWs = _target.createWebSocket($this.ws.url);
            connectEvent(options);
            lockReconnect = false;
        }, 2000);
    };
    //发送请求
    WebSocketConnectBlock.prototype.request = function (data) {
        this.ws.send(JSON.stringify(data));
    };
};
// 建立图表数据连接 websocket  
var WebSocketConnect = function(options) {
    this.ws = null;
    var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
    wsUrl = options.wsUrl;  //开发
    var timeout = 60000,//60秒
        timeoutObj = null,
        serverTimeoutObj = null;
    var _target = this;
    var XTB = {
        "MsgType":"Q8050",
        "ExchangeID":"2",
        "InstrumentID":_FirstS[1].code
    };
    //建立socket连接
    WebSocketConnect.prototype.createWebSocket = function (wsUrl) {
        try {
            this.ws = new WebSocket(wsUrl);
            return this.ws;
        } catch (e) {
            this.reconnect(wsUrl); //如果失败重连
        }
    };
    // 关闭socket连接
    WebSocketConnect.prototype.closeWebSocket = function () {
        this.ws.close();
    };
    //socket重连
    WebSocketConnect.prototype.reconnect = function () {
        $this = this;
        if (lockReconnect) return;
        lockReconnect = true;
        //没连接上会一直重连，设置延迟避免请求过多
        setTimeout(function () {
            echartsWS = _target.createWebSocket($this.ws.url);
            initChartInfoEvt();
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

var index = 1;
// 按键功能
$("#searchInput").on("keyup",function(e){
    // 按键code
    var keyCode = e.keyCode?e.keyCode:8;
    var val = $(this).val();
    var _code = e.keyCode;

    // 38上、40下、13enter键
    switch (keyCode) {
        case 8: // 删除
            if(val==""||val==null){
                $("#searchEnd").hide();
            }
            break;
        case 13:    // 回车
            openDetail();
            return;
            break;
        case 37: // 左右
        case 39:
            clearTimeout(timer);
            return;
            break;
        case 38: //上
            var len = $(".stocklist").length;
            if(len==0) return;
            
            index--;
            if(index <= 0) {
                index = len-1;
            } 
            var stockCode = $(".stocklist").eq(index).data("instrumentid");
            $("#searchInput").val(stockCode);
            $(".stocklist").eq(index).addClass("tr-active");
            $(".stocklist").eq(index).siblings().attr("class","stocklist");
            return;
            break; 
        case 40: //下
            var len = $(".stocklist").length;
            if(len==0) return;
            index++;
            if(index >= len) {
                index = 1;
            }
            var stockCode = $(".stocklist").eq(index).data("instrumentid");
            $("#searchInput").val(stockCode);
            $(".stocklist").eq(index).addClass("tr-active");
            $(".stocklist").eq(index).siblings().attr("class","stocklist");
            return;
            break; 
        case 27:
            $("#searchInput").val("");
            $("#searchEnd").hide();
            $("#searchInput").blur();
            return;
            break;
        ;
        default:;
    }
    // Code是不为空的数字时，进行查询
    if(val!=""&&val!=null){
        clearTimeout(timer);
        search(val);
    }else{
        clearTimeout(timer);
    }

});
// 搜索
var timer=null,delay=200;
function search(value){
    timer = setTimeout(function(){
        var date = new Date();
        $.ajax({
            url:"http://103.66.33.58:443/GetCodes?time="+date.getMinutes()+date.getSeconds(),
            // url:"http://103.66.33.58:443/GetCodes",
            data:{"ExchangeID":0,"Codes":value},
            dataType:"json",
            cache:false,
            success:function(data){
                if(data.ReturnCode == 9999){
                    console.log("请输入正确的股票代码");
                    $("#searchEnd").hide();
                }else if(data.ReturnCode == 0){
                    $("#searchEnd").show();
                    var htmlStr = '<tr class="stockTitle"><th>选项</th><th>类型</th><th>代码</th><th>中文名称</th></tr>';
                    var ds,dr;
                    data = data.CodeInfo;
                    for(var i=0;i<data.length;i++){
                        htmlStr += '<tr class="stocklist" data-exchangeID='+data[i].ExchangeID+' data-instrumentID='+(data[i].InstrumentCode)+'>';
                        ds = data[i].InstrumentCode.split(value);
                        // 选项
                        htmlStr += '<td><a>';
                        for(var j=0;j<ds.length;j++){
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
                    index = 1;
                    var stockCode = $(".stocklist").eq(0).data("instrumentid");
                    $(".stocklist:eq(0)").addClass("tr-active").siblings().attr("class","stocklist");
                }
            }
        });
    },delay);
}

$("#searchInput").on("focus",function(){
    $("#searchInput").keyup();
})
// 搜索结果绑定事件  跳转详情页面
$(".search table").delegate(".stocklist","click",function(){
    openDetail();
});
// 点击搜索
$(".search-btn").on("click",function(){
    var value = $("#searchInput").val();
    if(!value) return;
    openDetail();
});
// 打开个股详情页面
function openDetail(){
    // tr-active 是高亮的类名
    var value = $("#searchEnd .tr-active td:eq(0) a").text();  
    var exchangeID = $("#searchEnd .tr-active").attr("data-exchangeid");
    if(!exchangeID || !value) return;
    $("#searchInput").val("");
    $("#searchEnd").hide();
    window.open('./detail.html?exchangeID='+exchangeID+'&id='+value,'_blank');
}
