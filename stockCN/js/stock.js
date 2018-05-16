
var initStock = function(options){
    // 初始化股票查询参数
    StockInfo = new CreateStock(options);
    // 请求代码表
    StockInfo.initCodeList();
    
};
var CreateStock = function(options){

    this.ExchangeID = options.ExchangeID;
    this.InstrumentID = options.InstrumentID;
    this.stockXMlUrl = options.stockXMlUrl;

    this.PreClose = null; // 昨收
    this.decimal = 2;
    this.typeIndex = '';  // 指数类型-编号 指数[0~8],股票[16~31]
    this.stockType = '';  // 指数类型-文字
    this.Date = '';     // 当前日期

    this.nowDateTime = []; // 市场时间
    this.todayDate = ''; //通过xml查询得到的当前日期
    this.sub = 0; // 用于计算是否跨天

    this.MarketStatus = null; //市场状态

    this.hasKZ = false; // 是否已经订阅了快照
    
    //避免有重复数据出现，存储逐笔最后一条数据：时间、成交量、成交价格、买卖方向，
    // 将和最新数据进行对比
    this.HistoryDataZBCJ = {   
                                time: null,
                                price: null,
                                volumn: null,
                                dir: null
                            },
    this.option = {
        MarketStatus : {
            InstrumentID: options.InstrumentID,
            ExchangeID: options.ExchangeID,
            MsgType:"Q8002",
            PructType:"0"
        },
        WatchKZ: {
            InstrumentID: options.InstrumentID,
            ExchangeID: options.ExchangeID,
            MsgType:"S1010",
            Instrumenttype:"1"
        },
        // 快照、盘口、扩展盘口、逐笔
        KWatchKZ_PK_KZPK_ZB:{              
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType:"S1010",
            Instrumenttype:"2,3,32"
        },
        // 快照、扩展盘口、逐笔
        KWatchKZ_KZPK_ZB:{              
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType:"S1010",
            Instrumenttype:"1,3,32"
        },
        // 盘口
        watchPK : {
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType: "S1010",
            Instrumenttype: "2"
        },
        // 扩展盘口----个股
        watchPKExt: {
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType: "S1010",
            Instrumenttype: "3"
        },
        // 扩展盘口---指数
        watchPKExtZS: {
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType: "S1010",
            Instrumenttype: "3"
        },
        // 逐笔成交
        watchZBCJ : {
            "ExchangeID":options.ExchangeID,
            "InstrumentID":options.InstrumentID,
            MsgType: "S1010",
            Instrumenttype: "32"
        }
    }
}
CreateStock.prototype = {
    initCodeList :   function(){
        var _this = this;
        //第一次打开终端,初始化代码表第一次默认请求
        var date = new Date();
        $.ajax({
            url:  StockInfo.stockXMlUrl,
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
                    data = data.CodeInfo[0];
                    // 从代码表中获取昨收值
                    //指数[0~8],股票[16~31]
                    if(data.ProductType>=0&&data.ProductType<=8){
                        StockInfo.stockType = "Field";
                    }
                    if(data.ProductType>=16&&data.ProductType<=31){
                        StockInfo.stockType = "Stock";
                    }
                    StockInfo.PreClose = data.PreClose?parseFloat(data.PreClose):null;
                    StockInfo.decimal = parseInt(data.PriceDecimal);//保留小数位数
                    StockInfo.typeIndex = data.ProductType; //指数类型-编号
                    compareTime(data);
                }else{
                    console.log("请求码表出错");
                }
            }
        });
    },
    //市场状态查询
    getMarketStatus:    function(){
                            socket.request(this.option.MarketStatus);
                        },
    // 订阅快照信息
    getWatchKZ: function(){
                    socket.request(this.option.WatchKZ);
                },
    // 快照、盘口、扩展盘口、逐笔成交   个股
    getKWatchKZ_PK_KZPK_ZB :    function(){
                                    socket.request(this.option.KWatchKZ_PK_KZPK_ZB);
                                },
    //快照、扩展盘口、逐笔成交   指数
    getKWatchKZ_KZPK_ZB :   function(){
                                socket.request(this.option.KWatchKZ_KZPK_ZB);
                            },
    // 盘口
    getWatchPK :    function(){
                        socket.request(this.option.watchPK);
                    },
    // 盘口扩展
    getWatchPKExt : function(){
                        socket.request(this.option.watchPKExt);
                    },
    // 指数扩展盘口
    getWatchPKExtZS :   function(){
                            socket.request(this.option.watchPKExtZS);
                        },
    // 逐笔成交
    getWatchZBCJ :  function(){
                        socket.request(this.option.watchZBCJ);
                    }
}; 
//1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位
function compareTime(data){
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
    //指数[0~8],股票[16~31]
    if(data.ProductType>=0&&data.ProductType<=8){
        StockInfo.stockType = "Field";
    }
    if(data.ProductType>=16&&data.ProductType<=31){
        StockInfo.stockType = "Stock";
    }
    // 股票代码
    $(".tb-fn-title").text(data.InstrumentName+"("+data.InstrumentCode+")");
    var startT = parseInt(startTime.split(":")[0]);
    var endT = parseInt(endTime.split(":")[0]);
    if(endTime1){
        endT = parseInt(endTime1.split(":")[0]);
    }
    var json,json1;
    if(startT > endT){//国际时间，跨天了，需要将当前时间减一
        StockInfo.sub = -1;
        json = {
            startTime:startTime,
            endTime:endTime1
        };
        StockInfo.nowDateTime.push(json);
    }else{//未跨天
        StockInfo.sub = 0;
        json = {
            startTime:startTime,
            endTime:endTime
        };
        StockInfo.nowDateTime.push(json);
        if(startTime1){
            json1 = {
                startTime1:startTime1,
                endTime1:endTime1
            };
            StockInfo.nowDateTime.push(json1);
        }
    }
}
// 查询历史信息
function fillTrading(data){
        var strHtml = '';
        data.forEach(function (item){
            var abside = "";
            if(StockInfo.stockType != "Field"){
                abside = (item.ABSide==83)?("<span class='green'>卖出</span>"):((item.ABSide==66)?("<span class='red'>买入</span>"):(item.ABSide==0)?("<span>平盘</span>"):"");
            }
            strHtml += '<li><span>'+formatTimeSec(item.Time)+'</span><span>'+parseFloat(item.RecorePrice).toFixed(2)+'</span><span>'+Math.round(item.Volume/100)+'</span>'+abside +'</li>';
        });
        $(".cb-cj ul").html(strHtml);
}
// 设置顶部信息  当前指数/个股 请求快照数据
function setFieldInfo(data){
        var high,low,open,zf,price,zd,zdf,dealVal,dealVol,preClose;
        if(data){
            high = data.High;
            low = data.Low;
            open = data.Open;
            dealVal = data.Value;
            dealVol = data.Volume;
            price = data.Last;
            preClose = data.PreClose;
            // 未开盘时，昨收为0，计算涨跌幅和振幅会出现NAN，于是进行区分，为0%
            zf = preClose==0?floatFixedTwo(0):floatFixedTwo((high - low)/preClose*100);
            zd = price - preClose;
            zdf = preClose==0?floatFixedTwo(0):floatFixedTwo((zd/preClose)*100);
            if(price==0){
                zd = 0;
                zdf = floatFixedTwo(0.00);
            }

            var html = "";
            //指数[0~8],股票[16~31]
            if(StockInfo.stockType=="Field"){
                html = "<li><p>最高：</p><span class="+getColorName(high,preClose)+">"+floatFixedDecimal(high)+"</span></li>"
                        +"<li><p>最低：</p><span class="+getColorName(low,preClose)+">"+floatFixedDecimal(low)+"</span></li>"
                        +"<li><p>成交额：</p><span>"+setUnit(floatFixedDecimal(dealVal))+"元</span></li>"
                        +"<li><p>成交量：</p><span>"+(dealVol>=100?setUnit(dealVol/100)+"手":dealVol+"股")+"</span></li>"
                        +"<li><p>今开：</p><span class="+getColorName(open,preClose)+">"+floatFixedDecimal(open)+"</span></li>"
                        +"<li><p>昨收：</p><span>"+floatFixedDecimal(preClose)+"</span></li>"

                        +"<li><p>振&nbsp;&nbsp;&nbsp;&nbsp;幅：</p><span>"+zf+"%</span></li>";
                $(".tb-fielList").addClass("tb-fielList-field");
            }else{
                html = "<li><p>最高：</p><span class="+getColorName(high,preClose)+">"+floatFixedDecimal(high)+"</span></li>"
                        +"<li><p>今开：</p><span class="+getColorName(open,preClose)+">"+floatFixedDecimal(open)+"</span></li>"
                        +"<li><p>成交额：</p><span>"+setUnit(floatFixedDecimal(dealVal))+"元</span></li>"
                        +"<li><p>市盈率：</p><span>-</span></li>"
                        +"<li><p>换手率：</p><span>-</span></li>"
                        +"<li><p>最低：</p><span class="+getColorName(low,preClose)+">"+floatFixedDecimal(low)+"</span></li>"
                        +"<li><p>昨收：</p><span>"+floatFixedDecimal(preClose)+"</span></li>"
                        +"<li><p>成交量：</p><span>"+(dealVol>=100?setUnit(dealVol/100)+"手":dealVol+"股")+"</span></li>"
                        +"<li><p>市&nbsp;&nbsp;&nbsp;&nbsp;值：</p><span>-</span></li>"
                        +"<li><p>振&nbsp;&nbsp;&nbsp;&nbsp;幅：</p><span>"+zf+"%</span></li>";
            }

            

            var html2 = "<span class="+(price==0?"black":getColorName(price,preClose))+">"+(price==0?"-":floatFixedDecimal(price))+"</span>"
                        +"<span class="+getColorName(zd,"0")+">"+floatFixedDecimal(zd)+"</span>"
                        +"<span class="+getColorName(zdf,"0")+">"+zdf+"%</span>";
            $(".tb-fn-num").html(html2);
            $(".tb-fielList").html(html);
        }
}
// 五档盘口-五档盘口数据，没有委比委差
function setfillPK(data){
        if($(".cb-pk h2").length==0){
            var html =  "<h2>五档盘口</h2>\
                        <div class=\"cb-title\">\
                            <p>委比：<span class=\"cbt-wb \"></span></p>\
                            <p>委差：<span class=\"cbt-wc \"></span></p>\
                        </div>\
                        <ul class=\"cb-txtOffer\"></ul>\
                        <ul class=\"cb-txtBids\"></ul>\
                        <div class=\"cb-title cb-title-sub\">\
                            <p>外盘：<span class=\"red cbt-wp\"></span></p>\
                            <p>内盘：<span class=\"green cbt-np\"></span></p>\
                        </div>";

            $(".cb-pk").html(html);
        }
        var bids = data.Bids,       // 买
            offer = data.Asks,     // 卖
            // obj_titalB = setUnit(data.TotalBidVolume/100,true,false,true).value,      // 买盘(外盘)总量
            // obj_titalO = setUnit(data.TotalOfferVolume/100,true,false,true).value,    // 卖盘(内盘)总量
            txtOffer = "",
            txtBids = "", 
            upperCase = ["一","二","三","四","五"];
        $.each(upperCase,function(i,obj){
            // 拼接盘口和逐笔成交的拼接字符串
            txtOffer = setPKHtml(obj,"卖",offer[i]) + txtOffer;
            txtBids += setPKHtml(obj,"买",bids[i]);
        });

        $(".cb-txtOffer").html(txtOffer);
        $(".cb-txtBids").html(txtBids);
}
// 五档扩展接口的委比委差-个股信息-存在五笔盘口信息
function setfillPKExt(data){
        var wb = data.Entrustment/10000;
        var wc = data.EntrustmentSub;
        $(".cbt-wb").attr("class","cbt-wb "+getColorName(wb,0)).html( floatFixedTwo(wb)+"%" );
        $(".cbt-wc").attr("class","cbt-wc "+getColorName(wc,0)).html( floatFixedZero(wc/100) );

        $(".cbt-np").html( floatFixedZero(data.InnerVolume/100));
        $(".cbt-wp").html( floatFixedZero(data.OuterVolume/100));
}
// 五档扩展接口-指数接口-没有五笔盘口数据信息
function setfillPKExtZS(data){
        if($(".cb-pk h2").length==0){
            var html = "<ul class=\"cb-zs-pk\">\
                            <li><span>上涨数</span><span class=\"cb-zspk-szs\"></span></li>\
                            <li><span>平盘数</span><span class=\"cb-zspk-pps\"></span></li>\
                            <li><span>下跌数</span><span class=\"cb-zspk-xds\"></span></li>\
                        </ul>";
            $(".cb-pk").html(html);
        }
        // $(".cb-zspk-szs").text(data.Ups!=undefined?(StockInfo.PreClose!=undefined?floatFixedDecimal(data.Ups):floatFixedTwo(data.Ups)):"");
        // $(".cb-zspk-pps").text(data.HoldLines!=undefined?(StockInfo.PreClose!=undefined?floatFixedDecimal(data.HoldLines):floatFixedTwo(data.HoldLines)):"");
        // $(".cb-zspk-xds").text(data.Downs!=undefined?(StockInfo.PreClose!=undefined?floatFixedDecimal(data.Downs):floatFixedTwo(data.Downs)):"");
        $(".cb-zspk-szs").text(data.Ups!=undefined?(StockInfo.PreClose!=undefined?data.Ups:data.Ups):"");
        $(".cb-zspk-pps").text(data.HoldLines!=undefined?(StockInfo.PreClose!=undefined?data.HoldLines:data.HoldLines):"");
        $(".cb-zspk-xds").text(data.Downs!=undefined?(StockInfo.PreClose!=undefined?data.Downs:data.Downs):"");
}
// 五档盘口的统一拼接整个模块
function setPKHtml(obj, status, data){
        var price,volume;
        if(data){
            if(data.Price==0){
                price = "--"
            }else{
                price = StockInfo.PreClose!=undefined?floatFixedDecimal(data.Price):floatFixedTwo(data.Price);
            }
            if(data.Volume==0){
                volume = "--"
            }else{
                volume = Math.round(data.Volume/100);
            }
            var txtData = "<span class="+getColorName(data.Price,StockInfo.PreClose)+">"+price+"</span>\
                        <span>"+volume+"</span>";
        }else{
            var txtData = "<span></span><span></span>";
        }
        
        var text = "<li><span>"+status+obj+"</span>"+txtData+"</li>";
        return text;
};
// 逐笔成交拼接
function setfillZBCJ(data){
        // 停盘后，数据日期返回0
        if(data.Date=="0"||data.Date==undefined){
            return
        }
        // 数据处理
        var absideStr = abside = "";
        if(StockInfo.stockType != "Field"){
            absideStr = (data.ABSide==83)?("卖出"):((data.ABSide==66)?("买入"):(data.ABSide==0)?("平盘"):"");
            abside = (data.ABSide==83)?("<span class='green'>卖出</span>"):((data.ABSide==66)?("<span class='red'>买入</span>"):(data.ABSide==0)?("<span>平盘</span>"):"");
        }
        
        var timeIsAlready = StockInfo.HistoryDataZBCJ.time==formatTimeSec(data.Time),
            priceIsAlready = StockInfo.HistoryDataZBCJ.price==(StockInfo.PreClose!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice)),
            volumnIsAlready = StockInfo.HistoryDataZBCJ.volumn==Math.round(data.Volume/100),
            dirIsAlready = StockInfo.HistoryDataZBCJ.dir==absideStr;
        // 断网重连处理-存入数据，将新数据和存储的数据进行对比
        StockInfo.HistoryDataZBCJ.time = formatTimeSec(data.Time);
        StockInfo.HistoryDataZBCJ.price = (StockInfo.PreClose!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice));
        StockInfo.HistoryDataZBCJ.volumn = Math.round(data.Volume/100);
        StockInfo.HistoryDataZBCJ.dir = absideStr;

        if(timeIsAlready&&priceIsAlready&&volumnIsAlready&&dirIsAlready){
            return;
        }

        if($(".cb-cj ul").length==0){
            $(".cb-cj").html("<h2>逐笔成交</h2><ul></ul>");
        }
        // 创建新的li-内容是字符串的拼接
        var liHtml = "<li><span>"+formatTimeSec(data.Time)+"</span><span>"+(StockInfo.PreClose!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice))+"</span><span>"+Math.round(data.Volume/100)+"</span>"+abside+"</li>";
        var html = $(".cb-cj ul").html();
        html += liHtml;
        $(".cb-cj ul").html(html);

        // 列表中保留最多能显示的几条，移除多余的-从下而上为更新顺序
        var minHeight = $(".cb-right")[0].offsetHeight-$(".cb-pk")[0].offsetHeight-40*3-16;
        var length = Math.floor(minHeight/30);

        if($(".cb-cj li").length>length){
            $(".cb-cj li:lt("+ ( $(".cb-cj li").length-length ) +")").remove();
        }
}
/*
* 详情页面 指数/个股 信息相关函数
*/
// 查询十大流通股和公司信息
function requireCom(reqComOpt,code){
    var date = new Date();
    // var reqUrl = DKServiceUrl + "DKService/GetService?time="+date.getMinutes()+date.getSeconds()+"&Service=DataSourceService.Gets&ReturnType=JSON&OBJID=";
    var reqUrl = DKServiceUrl + "DKService/GetService?time="+date.getMinutes()+date.getSeconds()+"&Service=DataSourceService.Gets&ReturnType=JSON&OBJID=";
    
    // 1=》000001
    if(code.length<6){
        code = new Array(6-code.length+1).join("0") + code;
    }
    $.each(reqComOpt, function(i,reqComObj){
        $.ajax({
            url:  reqUrl+reqComObj+"&P_NODE_CODE="+code,
            type: 'GET',
            dataType: 'json',
            async:true,
            cache:false,
            error: function(data){
                console.log("请求公司信息出错");
            },
            // complete:function(xhr){
            //     console.log(xhr)
            // },
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
                } 
            }
        });
    }); 
};
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

            $("#withoutComData").hide().siblings().show();
        }

    }
};
// 获取十大流通股数据
function getSDLTG(responseInfo){
    $("#withoutStcData").hide().siblings().show();
    // 获取最新的报告期
    var endDate = getEndDate(responseInfo);
    // 找到最新报告期的十大流通股东
    var comList = getComList(responseInfo,endDate);
    comList.sort(compareTop("SH_SN"));
    // 取前十
    var comList = comList.slice(0,10);
    // 拼接字符串
    setSDLTGInfo(comList);
};
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
};
// 获取最新报告期
function getEndDate(data){
    var g_endDate = "0000-00-00";
    $.each(data,function(i,obj){
        if(obj.END_DT.split(" ")[0]>g_endDate.split(" ")[0]){
            g_endDate = obj.END_DT;
        }
    });
    return g_endDate;
};
// 获取最新报告期的流通股
function getComList(data,endDate){
    var comList = [];
    $.each(data,function(i,obj){
        if(obj.END_DT==endDate){
            comList.push(obj);
        }
    });
    return comList;
};
// 十大流通拼接整个模块
function setSDLTGInfo(list){
    var txt =  $(".bb-info ul").html();
    $.each(list,function(i,obj){
        var s_hld_shr = setUnit(obj.HLD_SHR.replace(/,/g,"").trim());
        if(obj.DIRECT==0){
            obj.DIRECT = "不变";
        }
        var className = obj.DIRECT=="减持"?"green":(obj.DIRECT=="增持"?"red":null);
        var s_hld_shr_chg = parseInt(obj.HLD_SHR_CHG_LST)!=0?setUnit(obj.HLD_SHR_CHG_LST.replace(/,/g,"").trim()):"";
        
        txt += "<li>\
                    <span title="+obj.SH_NAME+">"+obj.SH_NAME+"</span>\
                    <span>"+floatFixedTwo(obj.TTL_CPTL_RAT)+"%</span>\
                    <span>"+s_hld_shr+"</span>\
                    <span class="+className+">"+obj.DIRECT+s_hld_shr_chg+"</span>\
                </li>";
        
    })
    $(".bb-info ul").html(txt)
}
