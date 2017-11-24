// 1109新增：设置页面中顶部指数信息
var FieldInfo = {
    fInstrCode: null,    // 交易所Code
    fFiledCode: null,    // 股票Code
    fPriceDecimal: null, // 小数位数
    fName: null,         // 指数名称  ---代码表查询
    fLastPrice: null,    // 最新价   ---分钟线
    fZD: null,           // 涨跌幅  ---分钟线
    fZDF: null,          // 涨跌幅  ---分钟线
    fHighest: null,      // 最高值  ---今日-快照
    fLowest: null,       // 最低值  ---今日-快照
    fOpen: null,         // 今日开盘值    ---今日-快照
    fYCPrice: null,      // 昨收   ---今日-快照
    fVolumnValue: null,  // 成交额  ---今日-快照
    fVolumnNum: null,    // 成交量  ---今日-快照
    fMarketRate: null,   // 市盈率  ---今日-快照
    fMarketValue: null,  // 市值   ---今日-快照
    fHSRate: null,       // 换手率
    fZF: null            // 振幅   ---今日-快照
}
function setKZFieldInfo(data){
    if(data){
        FieldInfo.fHighest = data.High;
        FieldInfo.fLowest = data.Low;
        FieldInfo.fOpen = data.Open;
        FieldInfo.fYCPrice = data.PreClose;
        FieldInfo.fVolumnValue = data.Value/10000>1?data.Value/10000+"万":data.Value;
        FieldInfo.fVolumnNum = data.Volume/10000>1?data.Volume/10000+"万":data.Volume;
        // FieldInfo.fMarketRate = data.fMarketRate;
        // FieldInfo.fMarketValue = data.fMarketValue;
        // FieldInfo.fHSRate = data.fHSRate;
        FieldInfo.fZF = FieldInfo.fHighest - FieldInfo.fLowest;

        FieldInfo.fLastPrice = data.Last;
        FieldInfo.fZD = FieldInfo.fLastPrice - FieldInfo.fYCPrice;
        FieldInfo.fZDF = floatFixedTwo((FieldInfo.fZD/FieldInfo.fYCPrice)*100);
    }
}
function fillKZFieldInfo(){

    $(".tb-fielList li:eq(0) span").text(floatFixedDecimal(FieldInfo.fHighest))
            .attr("class",(FieldInfo.fHighest-FieldInfo.fYCPrice)>0?"red":"green");
    $(".tb-fielList li:eq(1) span").text(floatFixedDecimal(FieldInfo.fOpen))
            .attr("class",(FieldInfo.fOpen-FieldInfo.fYCPrice)>0?"red":"green");
    $(".tb-fielList li:eq(2) span").text(floatFixedDecimal(FieldInfo.fVolumnValue));
    // $(".tb-fielList li:eq(3) span").text();
    // $(".tb-fielList li:eq(4) span").text(111);
    $(".tb-fielList li:eq(5) span").text(floatFixedDecimal(FieldInfo.fLowest))
            .attr("class",(FieldInfo.fLowest-FieldInfo.fYCPrice)>0?"red":"green");
    $(".tb-fielList li:eq(6) span").text(floatFixedDecimal(FieldInfo.fYCPrice));
    $(".tb-fielList li:eq(7) span").text(floatFixedTwo(FieldInfo.fVolumnNum));
    // $(".tb-fielList li:eq(8) span").text();
    $(".tb-fielList li:eq(9) span").text(floatFixedDecimal(FieldInfo.fZF));


    $(".tb-fn-num span:eq(0)").text(floatFixedDecimal(FieldInfo.fLastPrice))
            .attr("class",(FieldInfo.fLastPrice-FieldInfo.fYCPrice)>0?"red":"green");
    $(".tb-fn-num span:eq(1)").text(floatFixedDecimal(FieldInfo.fZD))
            .attr("class",(FieldInfo.fLastPrice-FieldInfo.fYCPrice)>0?"red":"green");
    $(".tb-fn-num span:eq(2)").text(FieldInfo.fZDF+"%")
            .attr("class",(FieldInfo.fLastPrice-FieldInfo.fYCPrice)>0?"red":"green");
}
function getStockInfo(_codeList,id){
    $.each(_codeList,function(){
        if($(this).attr("id") == id){
            FieldInfo.fName = $(this).attr("name");
            FieldInfo.fPriceDecimal = $(this).parent().attr("PriceDecimal");
            FieldInfo.fInstrCode = $(this).parent().parent().attr("code");
            FieldInfo.fFiledCode = $(this).attr("code");
        };
    });
    $(".tb-fn-title").text(FieldInfo.fName+"("+FieldInfo.fFiledCode+"."+FieldInfo.fInstrCode+")");
    // 个股需要查询企业信息，公司信息
    var reqIds = ["23000171","23000138","23000164"];
    requireCom(reqIds);
};
// 取两位小数点
function floatFixedTwo(data) {
    return parseFloat(data).toFixed(2);
};
// 取n位小数点
function floatFixedDecimal(data) {
    return parseFloat(data).toFixed(FieldInfo.fPriceDecimal);
};
var requireCom = function(reqIds){
    
    var indId = FieldInfo.fFiledCode;

    // 公司资料
    $.each(reqIds, function(i,o){
        $.ajax({
            url:  "http://172.17.20.178:8080/DKService/GetService?Service=DataSourceService.Gets&ReturnType=JSON&OBJID="+reqIds[i]+"&P_NODE_CODE="+indId,
            type: 'GET',
            dataType: 'json',
            async:false,
            cache:false,
            error: function(data){
                console.log("请求公司信息出错");
            },
            success: function(data){

                if(data.response.data){
                    var com_Obj = data.response.data[0];
                    
                    if(com_Obj.TEL){
                        // 主营产品 23000138
                        $("#com_main_pro").text(com_Obj.MAIN_PROD);
                        // 董秘电话 
                        $("#com_tel").text(com_Obj.TEL);
                    }else{
                        if(com_Obj.TTL_SHR_LF){

                            com_Obj.TTL_SHR = com_Obj.TTL_SHR.replace(/,/g,"");
                            com_Obj.TTL_SHR_LF = com_Obj.TTL_SHR_LF.replace(/,/g,"");

                            var com_Ltg = com_Obj.TTL_SHR/100000000>1?(floatFixedTwo(com_Obj.TTL_SHR/100000000)+"亿股"):(com_Obj.TTL_SHR/10000>1?(floatFixedTwo(com_Obj.TTL_SHR/10000)+"万股"):com_Obj.TTL_SHR+"股");
                            var com_Fltg = com_Obj.TTL_SHR_LF/100000000>1?(floatFixedTwo(com_Obj.TTL_SHR_LF/100000000)+"亿股"):(com_Obj.TTL_SHR_LF/10000>1?(floatFixedTwo(com_Obj.TTL_SHR_LF/10000)+"万股"):com_Obj.TTL_SHR_LF+"股");
                            // 流通股（非限售） 23000164
                            $("#com_ttl_shrl").text(com_Ltg);
                            // 总股本 
                            $("#com_ttl_shr").text(com_Fltg);

                        }else{
                            // 注册资本 23000171
                            com_Obj.REG_CPTL = com_Obj.REG_CPTL.replace(/,/g,"");
                            var com_Zczb = com_Obj.REG_CPTL/100000000>1?(floatFixedTwo(com_Obj.REG_CPTL/100000000)+"亿"):(com_Obj.REG_CPTL/10000>1?(floatFixedTwo(com_Obj.REG_CPTL/10000)+"万"):com_Obj.REG_CPTL);
                            
                            // 公司名称
                            $("#com_name").text(com_Obj.COM_NAME);
                            // 董事长
                            $("#com_psn").text(com_Obj.PSN_NAME);
                            // 总经理
                            $("#com_gm").text(com_Obj.GM);
                            // 办公地址
                            $("#com_addr").text(com_Obj.OFS_ADDR);
                            // 办公网址
                            $("#com_website").text(com_Obj.WEB_SITE);
                            // 注册资本
                            $("#com_zc").text(com_Zczb);
                            // 上市日期
                            $("#com_ss").text((com_Obj.LST_DT).split(" ")[0]);

                        }

                    }
                }else{
                    $(".bottom-bar").html("<div class='box feild-null' style='height: 560px;font-size: 20px;margin-bottom:20px'>指数页面该公司信息为空~~~~~^_^</div>");
                } 
            }
        });
    });

    // 企业基本信息
    $.ajax({
        url:  "http://172.17.20.178:8080/DKService/GetService?Service=DataSourceService.Gets&ReturnType=JSON&OBJID=23000188&P_NODE_CODE="+indId,
        type: 'GET',
        dataType: 'json',
        async:false,
        cache:false,
        error: function(data){
            console.log("请求公司信息出错");
        },
        success: function(data){
            if(data.response.data){
                var com_Obj = data.response.data;
                // 获取最新的报告期
                var endDate = getEndDate(com_Obj);
                // 找到最新报告期的十大流通股东
                var comList = getComList(com_Obj,endDate);
                comList.sort(compareTop("SH_SN"));
                // 取前十
                var comList = comList.slice(0,10);
                // 拼接字符串
                setInfo(comList);
            }else{
                $(".bottom-bar").html("<div class='box feild-null' style='height: 560px;font-size: 20px;margin-bottom:20px'>指数页面该公司信息为空~~~~~^_^</div>");
            }
        }
    });
    
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
// 按照 prop 从小到大排序
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
// 十大流通股 信息
function setInfo(list){
    var txt =  $(".bb-info ul").html();
    $.each(list,function(i,obj){
        var s_hld_shr = obj.HLD_SHR.replace(/,/g,"").trim()/10000;
        if(obj.DIRECT==0){
            obj.DIRECT = "不变";
        }
        // var name = obj.SH_NAME.split("－")[0].split("-")[0];
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
// 五档盘口
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
        txtOffer = setPKAndZBHtml(obj,"卖",offer[i]) + txtOffer;
        txtBids += setPKAndZBHtml(obj,"买",bids[i]);
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
// 获取数据单位
function setUnit(data){
    return data/100000000?floatFixedTwo(data/100000000)+"亿":(data/10000?floatFixedTwo(data/10000)+"万":data);
}
// 拼接盘口和逐笔成交的拼接字符串
function setPKAndZBHtml(obj, status, data){
    if(data){
        var txtData = "<span class="+((data.Price-FieldInfo.fYCPrice)>0?"red":"green")+">"+floatFixedTwo(data.Price)+"</span>\
                       <span>"+Math.round(data.Volume/100)+"</span>";
    }else{
        var txtData = "<span>--</span><span>--</span>";
    }
    
    var text = "<li><span>"+status+obj+"</span>"+txtData+"</li>";
    return text;
}
// 逐笔成交
function setfillZBCJ(data){

    var text = $(".cb-cj ul")[0]?$(".cb-cj ul").html():"";

    $.each(data,function(i,obj){
        var abside = (obj.ABSide==83)?("<span class='green'>卖出</span>"):((obj.ABSide==66)?("<span class='red'>买入</span>"):"");
        // var abside = (obj.ABSide==83)?("<span class='green'>S</span>"):("<span class='red'>B</span>");
        text = text + "<li><span>"+formatTimeSec(obj.MarketTime)+"</span><span>"+floatFixedTwo(obj.RecorePrice)+"</span><span>"+Math.round(obj.Volume/100)+"</span>"+abside+"</li>";
    });

    var innerHtmlStr = "<h2>逐笔成交</h2>\
                        <ul>"+text+"</ul>";
    $(".cb-cj").html(innerHtmlStr);

    // 保留5条
    if($(".cb-cj li").length>5){
        // console.log($(".cb-cj li").length-1)
        $(".cb-cj li:lt("+($(".cb-cj li").length-5)+")").remove();
    }

}0