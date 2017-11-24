/*
 * 时间格式化
 */
// 000000 -> 00:00:00 转为时分秒
function formatTimeSec(time) {
    time = time.toString();
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
    var s = time.substring(4, 6)
    time = H + ":" + m + ":" + s;
    return time;
};
//日期时间20170908 2017-09-08
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
// 取两位小数点
function floatFixedTwo(data) {
    return parseFloat(data).toFixed(2);
};
// 取n位小数点
function floatFixedDecimal(data) {

    return parseFloat(data).toFixed(Field.Decimal);
};
// Text填写-dom的text和color
function setTextAndColor(domObj,data,compareData,unit){
    var unit = unit?unit:"";
    if(compareData){
        domObj.text(data+unit).attr("class",(data-compareData)>0?"red":"green");
    }else{
        domObj.text(data+unit);
    } 
}
// 数据单位统一
function setUnit(data,type){
    if(type){
        var obj={};
        var unit,value;
        data/100000000000>1?((unit="千亿")&&(value=data/100000000000)):
            (data/10000000000>1?((unit="百亿")&&(value=data/10000000000)):
                (data/1000000000>1?((unit="十亿")&&(value=data/1000000000)):
                    (data/100000000>1?((unit="亿")&&(value=data/100000000)):
                        (data/10000000>1?((unit="千万")&&(value=data/10000000)):
                            (data/1000000>1?((unit="百万")&&(value=data/1000000)):
                                (data/100000>1?((unit="十万")&&(value=data/100000)):
                                    (data/10000>1?((unit="万")&&(value=data/10000)):
                                        "量")))))));
        obj.unit = unit;
        obj.value = value;
        return obj;
    }else{
        return data/100000000>1?floatFixedTwo(data/100000000)+"亿":(data/10000>1?floatFixedTwo(data/10000)+"万":data);
    }
}
// 对象组成的数组，按照 prop 从小到大排序
function compareTop(prop){
    return function(obj1, obj2){
        var val1 = obj1[prop];
        var val2 = obj2[prop];

        if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
            val1 = Number(val1);
            val2 = Number(val2);
        }
       
        if(val1 < val2){
            return -1;
        }else if(val1 > val2){
            return 1;
        }else{
            return 0;
        }

    }
}
/*
 * 详情页面 指数/个股 信息相关函数
 */
 // 设置顶部信息  当前指数/个股 请求快照数据
function setFieldInfo(data){
    var high,low,open,zf,price,zd,zdf,dealVal,dealVol;
    if(data){
        Field.PrePrice = data.PreClose;

        high = data.High;
        low = data.Low;
        open = data.Open;
        dealVal = setUnit(data.Value);
        dealVol = setUnit(data.Volume);
        // Field.fMarketRate = data.fMarketRate;
        // Field.fMarketValue = data.fMarketValue;
        // Field.fHSRate = data.fHSRate;
        zf = high - low;
        price = data.Last;
        zd = price - Field.PrePrice;
        zdf = floatFixedTwo((zd/Field.PrePrice)*100);

        $.each($(".tb-fielList li"),function(index,obj){

            var spanObj = $(obj).children("span"),
                compareData = Field.PrePrice,
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
                    data = setUnit(floatFixedDecimal(dealVal));
                    compareData = false;
                    unit = "元"
                    break;
                case 3:
                    return;
                case 4:
                    return;
                case 5:
                    data = floatFixedDecimal(low);
                    break;
                case 6:
                    data = floatFixedDecimal(compareData);
                    compareData = false;
                    break;
                case 7:
                    data = setUnit(dealVol);
                    compareData = false;
                    break;
                case 8:
                    return;
                case 9:
                    data = floatFixedDecimal(zf);
                    compareData = false;
                    break;
                default:;
            }
            setTextAndColor(spanObj, data, compareData);
            compareData = Field.PrePrice;
        });

        $.each($(".tb-fn-num span"),function(index,obj){

            var spanObj = $(obj),
                compareData = Field.PrePrice,
                data,
                unit;
            switch(index){
                case 0:
                    data = floatFixedDecimal(price);
                    break;
                case 1:
                    data = floatFixedDecimal(zd);
                    compareData = "0";
                    break;
                case 2:
                    data = zdf;
                    compareData = "0";
                    unit = "%";
                    break;
                default:;
            }
            setTextAndColor(spanObj, data, compareData, unit);
            compareData = Field.PrePrice;
        });

    }
}
// 代码表：获取 指数/个股 名称，小数位数，InstrumentCode，Code
function getStockInfo(_codeList,id){
    var instrumentCode,
        reqCode;
    $.each(_codeList,function(){
        if($(this).attr("id") == id){

            Field.Name = $(this).attr("name");
            Field.Decimal = $(this).parent().attr("PriceDecimal");
            // 所属市场代码
            fieldInsCode = $(this).parent().parent().attr("code");
            // 股票代码
            fieldCode = $(this).attr("code");
        };
    });
    $(".tb-fn-title").text(Field.Name+"("+fieldCode+"."+fieldInsCode+")");
    // 个股需要查询企业信息，公司信息
    var reqComOpt = ["23000171","23000138","23000164","23000188"];
    requireCom(reqComOpt, fieldCode);
};
// 查询十大流通股和公司信息
function requireCom(reqComOpt,code){
    
    var reqUrl = "http://172.17.20.178:8080/DKService/GetService?Service=DataSourceService.Gets&ReturnType=JSON&OBJID=";
    
    $.each(reqComOpt, function(i,reqComObj){
        $.ajax({
            url:  reqUrl+reqComObj+"&P_NODE_CODE="+code,
            type: 'GET',
            dataType: 'json',
            async:false,
            cache:false,
            error: function(data){
                console.log("请求公司信息出错");
            },
            success: function(data){
                if(data.response.data){
                    var responseInfo = data.response.data;
                    switch(reqComObj){
                        case "23000188":
                            getSDLTG(responseInfo);
                            break;
                        case "23000171":
                        case "23000138":
                        case "23000164":
                            getCompanyInfo(responseInfo[0]);
                            break;
                        default:;
                    }
                }else{
                    $(".bottom-bar").html("<div class='box feild-null' style='height: 560px;font-size: 20px;margin-bottom:20px'>指数页面该公司信息为空~~~~~^_^</div>");
                } 
            }
        });
    }); 
}
// 获取公司信息数据
function getCompanyInfo(responseInfo){
    if(responseInfo.TEL){
        // 主营产品 23000138
        $("#com_main_pro").text(responseInfo.MAIN_PROD);
        // 董秘电话 
        $("#com_tel").text(responseInfo.TEL);
    }else{
        if(responseInfo.TTL_SHR_LF){

            responseInfo.TTL_SHR = responseInfo.TTL_SHR.replace(/,/g,"");
            responseInfo.TTL_SHR_LF = responseInfo.TTL_SHR_LF.replace(/,/g,"");

            var com_Ltg = setUnit(responseInfo.TTL_SHR);
            var com_Fltg = setUnit(responseInfo.TTL_SHR_LF);
            // 流通股（非限售） 23000164
            $("#com_ttl_shrl").text(com_Ltg+"股");
            // 总股本 
            $("#com_ttl_shr").text(com_Fltg+"股");

        }else{
            // 注册资本 23000171
            responseInfo.REG_CPTL = responseInfo.REG_CPTL.replace(/,/g,"");
            var com_Zczb = setUnit(responseInfo.REG_CPTL);
            
            // 公司名称
            $("#com_name").text(responseInfo.COM_NAME);
            // 董事长
            $("#com_psn").text(responseInfo.PSN_NAME);
            // 总经理
            $("#com_gm").text(responseInfo.GM);
            // 办公地址
            $("#com_addr").text(responseInfo.OFS_ADDR);
            // 办公网址
            $("#com_website").text(responseInfo.WEB_SITE);
            // 注册资本
            $("#com_zc").text(com_Zczb);
            // 上市日期
            $("#com_ss").text((responseInfo.LST_DT).split(" ")[0]);

        }

    }
}
// 获取十大流通股数据
function getSDLTG(responseInfo){
    // 获取最新的报告期
    var endDate = getEndDate(responseInfo);
    // 找到最新报告期的十大流通股东
    var comList = getComList(responseInfo,endDate);
    comList.sort(compareTop("SH_SN"));
    // 取前十
    var comList = comList.slice(0,10);
    // 拼接字符串
    setSDLTGInfo(comList);
}
// 获取最新报告期
function getEndDate(data){
    var g_endDate = "0000-00-00";
    $.each(data,function(i,obj){
        if(obj.END_DT.split(" ")[0]>g_endDate.split(" ")[0]){
            g_endDate = obj.END_DT;
        }
    });
    return g_endDate;
}
// 获取最新报告期的流通股
function getComList(data,endDate){
    var comList = [];
    $.each(data,function(i,obj){
        if(obj.END_DT==endDate){
            comList.push(obj);
        }
    });
    return comList;
}
// 十大流通拼接整个模块
function setSDLTGInfo(list){
    var txt =  $(".bb-info ul").html();
    $.each(list,function(i,obj){
        var s_hld_shr = obj.HLD_SHR.replace(/,/g,"").trim()/10000;
        if(obj.DIRECT==0){
            obj.DIRECT = "不变";
        }
        var className = obj.DIRECT=="减持"?"green":(obj.DIRECT=="增持"?"red":null);
        var s_hld_shr_chg = parseInt(obj.HLD_SHR_CHG_LST)!=0?floatFixedTwo(obj.HLD_SHR_CHG_LST.replace(/,/g,"").trim()/10000):"";
        txt += "<li>\
                    <span>"+obj.SH_NAME+"</span>\
                    <span>"+floatFixedTwo(obj.TTL_CPTL_RAT)+"%</span>\
                    <span>"+floatFixedTwo(s_hld_shr)+"</span>\
                    <span class="+className+">"+obj.DIRECT+s_hld_shr_chg+"</span>\
                </li>";
        
    })
    $(".bb-info ul").html(txt)
}
// 五档盘口拼接li
function setfillPK(data){

    var bids = data.Bids,       // 买
        offer = data.Offer,     // 卖
        titalB = setUnit(data.TotalBidVolume),      // 买盘(外盘)总量
        titalO = setUnit(data.TotalOfferVolume),    // 卖盘(内盘)
        minus = setUnit(data.TotalBidVolume-data.TotalOfferVolume),         // 委差
        percent = (data.TotalBidVolume-data.TotalOfferVolume)/(data.TotalBidVolume + data.TotalOfferVolume)*100,  // 委比
        txtOffer = "",
        txtBids = "",
        upperCase = ["一","二","三","四","五"];

    $.each(upperCase,function(i,obj){
        // 拼接盘口和逐笔成交的拼接字符串
        txtOffer = setPKHtml(obj,"卖",offer[i]) + txtOffer;
        txtBids += setPKHtml(obj,"买",bids[i]);
    })


    var innerHtmlStr = "<h2>五档盘口</h2>\
                        <div class=\"cb-title\">\
                            <p>委比：<span class=\"cbt-wb "+(minus>0? "red":"green")+"\">"+floatFixedTwo(percent)+"%"+"</span></p>\
                            <p>委差：<span class=\"cbt-wc "+(minus>0? "red":"green")+"\">"+minus+"</span></p>\
                        </div>\
                        <ul>"+txtOffer+"</ul>\
                        <ul>"+txtBids+"</ul>\
                        <div class=\"cb-title cb-title-sub\">\
                            <p>外盘：<span class=\"red cbt-wp\">"+titalB+"</span></p>\
                            <p>内盘：<span class=\"green cbt-np\">"+titalO+"</span></p>\
                        </div>";



    $(".cb-pk").html(innerHtmlStr);
}
// 五档盘口的统一拼接整个模块
function setPKHtml(obj, status, data){
    if(data){
        var txtData = "<span class="+((data.Price-Field.PrePrice)>0?"red":"green")+">"+floatFixedTwo(data.Price)+"</span>\
                       <span>"+data.Volume+"</span>";
    }else{
        var txtData = "<span>--</span><span>--</span>";
    }
    
    var text = "<li><span>"+status+obj+"</span>"+txtData+"</li>";
    return text;
}
// 逐笔成交拼接
function setfillZBCJ(data){

    var text = $(".cb-cj ul")[0]?$(".cb-cj ul").html():"";

    $.each(data,function(i,obj){
        var abside = (obj.ABSide==83)?("<span class='green'>卖出</span>"):((obj.ABSide==66)?("<span class='red'>买入</span>"):"");
        text = text + "<li><span>"+formatTimeSec(obj.MarketTime)+"</span><span>"+floatFixedTwo(obj.RecorePrice)+"</span><span>"+Math.round(obj.Volume/100)+"</span>"+abside+"</li>";
    });

    var innerHtmlStr = "<h2>逐笔成交</h2>\
                        <ul>"+text+"</ul>";
    $(".cb-cj").html(innerHtmlStr);

    // 保留5条
    if($(".cb-cj li").length>5){

        $(".cb-cj li:lt("+($(".cb-cj li").length-5)+")").remove();

    }
}

/*
 * 绘制KCharts图相关函数
 */
// K线图方法
function KCharts (dataList, isHistory){
    if(dataList.length>0){
        $("#withoutData").hide()

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
    }else{
         $("#kline").html("<div style='font-size:18px;margin-top: 40px;'>亲，暂时没有数据哦~~~~ ^_^</div>");
    }
}
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
                e_volume = (e_price-e_open)>0?[KLineData.hVolumesList.length,object.Volume,-1]:[KLineData.hVolumesList.length,object.Volume,1];
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
// 保存获取的数据到相对应的数据中，存入数据对象
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
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_zValues = data.zValues[0];        // 涨跌
        var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
        var n_volumes = data.volumes[0];            // 成交量
        var n_valuesPercent = data.valuesPercent[0];
        var n_zf = data.amplitude[0];
        var n_zfList = data.amplPercent[0];
        var lastTime = KLineData.hCategoryList[KLineData.hCategoryList.length-1];

        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            n_volumes[0] = n_volumes[0]-1;

            KLineData.hValuesList[KLineData.hValuesList.length-1] = n_values;
            KLineData.hVolumesList[KLineData.hVolumesList.length-1] = n_volumes;
            KLineData.hZValuesList[KLineData.hZValuesList.length-1] = n_zValues;
            KLineData.hZValuesListPercent[KLineData.hZValuesListPercent.length-1] = n_zValuePercent;
            KLineData.hValuesPercentList[KLineData.hValuesPercentList.length-1] = n_valuesPercent;
            KLineData.hZf[KLineData.hZf.length-1] = n_zf;
            KLineData.hZfList[KLineData.hZfList.length-1] = n_zfList;
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
// 绘制/画K线图
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
                        return KLineData.hCategoryList[valueStr];
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
                            return (value).toFixed(Field.Decimal);
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
                            var obj = setUnit(value,true);
                            var f_value = obj.value;
                            setyAsixName(obj.unit);
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
                }
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
                }
            ],
            series: [
                {
                    data: KLineData.hValuesList,
                },
                {
                    data: KLineData.hVolumesList
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
// 设置成交量的单位变化状况
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
// 信息提示框和提示栏：横幅信息和tooltip的显示
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
        $(".name", countent).text(Field.Name); //指数名称
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
/*
 * K线图事件绑定
 */
// ecahrts图进行缩放
$(window).resize(function(){

    chartResize(); 
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