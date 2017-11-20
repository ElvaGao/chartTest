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
function setFieldInfo(data,yc){
    if(data){
        FieldInfo.fLastPrice = data.Price;
        FieldInfo.fZD = FieldInfo.fLastPrice - yc;
        FieldInfo.fZDF = floatFixedTwo((FieldInfo.fZD/yc)*100);
    }
    
}
function fillFieldInfo(yc){
    $(".tb-fn-title").text(FieldInfo.fName+"("+FieldInfo.fFiledCode+"."+FieldInfo.fInstrCode+")");
    $(".tb-fn-num span:eq(0)").text(floatFixedDecimal(FieldInfo.fLastPrice))
            .attr("class",(FieldInfo.fLastPrice-yc)>0?"red":"green");
    $(".tb-fn-num span:eq(1)").text(floatFixedDecimal(FieldInfo.fZD))
            .attr("class",(FieldInfo.fLastPrice-yc)>0?"red":"green");
    $(".tb-fn-num span:eq(2)").text(FieldInfo.fZDF+"%")
            .attr("class",(FieldInfo.fLastPrice-yc)>0?"red":"green");
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
    }
}
function fillKZFieldInfo(yc){

    $(".tb-fielList li:eq(0) span").text(floatFixedDecimal(FieldInfo.fHighest))
            .attr("class",(FieldInfo.fHighest-yc)>0?"red":"green");
    $(".tb-fielList li:eq(1) span").text(floatFixedDecimal(FieldInfo.fOpen))
            .attr("class",(FieldInfo.fOpen-yc)>0?"red":"green");
    $(".tb-fielList li:eq(2) span").text(floatFixedDecimal(FieldInfo.fVolumnValue));
    // $(".tb-fielList li:eq(3) span").text();
    // $(".tb-fielList li:eq(4) span").text(111);
    $(".tb-fielList li:eq(5) span").text(floatFixedDecimal(FieldInfo.fLowest))
            .attr("class",(FieldInfo.fLowest-yc)>0?"red":"green");
    $(".tb-fielList li:eq(6) span").text(floatFixedDecimal(FieldInfo.fYCPrice));
    $(".tb-fielList li:eq(7) span").text(floatFixedTwo(FieldInfo.fVolumnNum));
    // $(".tb-fielList li:eq(8) span").text();
    $(".tb-fielList li:eq(9) span").text(floatFixedDecimal(FieldInfo.fZF));
}
function getFieldNameAndDemical(_codeList,id){
    $.each(_codeList,function(){
        if($(this).attr("id") == id){
            FieldInfo.fName = $(this).attr("name");
            FieldInfo.fPriceDecimal = $(this).parent().attr("PriceDecimal");
            FieldInfo.fInstrCode = $(this).parent().parent().attr("code");
            FieldInfo.fFiledCode = $(this).attr("code");
        };
    });
};
// 取两位小数点
function floatFixedTwo(data) {
    return parseFloat(data).toFixed(2);
};
// 取n位小数点
function floatFixedDecimal(data) {
    return parseFloat(data).toFixed(FieldInfo.fPriceDecimal);
};
var requireCom = function(loc,indId,reqIds){
    if(loc){
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
            }
        });
    }
    
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
// 按照 prop 从大到小排序
function compareSmall(prop){
    return function(obj1, obj2){
        var val1 = obj1[prop];
        var val2 = obj2[prop];

        if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
            val1 = Number(val1);
            val2 = Number(val2);
        }
       
        if(val1 < val2){
            return 1;
        }else if(val1 > val2){
            return -1;
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
    console.log(FieldInfo.fYCPrice)
    var bids = data.Bids;
    var offer = data.Offer;
    var titalB = data.TotalBidVolume/100000000?floatFixedTwo(data.TotalBidVolume/100000000)+"亿":(data.TotalBidVolume/10000?floatFixedTwo(data.TotalBidVolume/10000)+"万":data.TotalBidVolume);
    var titalO = data.TotalOfferVolume/100000000?floatFixedTwo(data.TotalOfferVolume/100000000)+"亿":(data.TotalOfferVolume/10000?floatFixedTwo(data.TotalOfferVolume/10000)+"万":data.TotalOfferVolume);
    
    var minus = data.TotalBidVolume-data.TotalOfferVolume;
    var percent = minus/(data.TotalBidVolume + data.TotalOfferVolume)*100;
    bids.sort(compareSmall("Bids"))
    offer.sort(compareSmall("Price"));
    var minusP = minus/100000000?floatFixedTwo(minus/100000000)+"亿":(minus/10000?floatFixedTwo(minus/10000)+"万":minus);
    $.each(bids,function(i,o){
        $(".cb-pk ul:eq(0) li:eq("+i+") span:eq(1)").text(floatFixedTwo(offer[i].Price))
            .attr("class",(offer[i].Price-FieldInfo.fYCPrice)>0?"red":"green");
        $(".cb-pk ul:eq(0) li:eq("+i+") span:eq(2)").text(offer[i].Volume);
        $(".cb-pk ul:eq(1) li:eq("+i+") span:eq(1)").text(floatFixedTwo(bids[i].Price))
            .attr("class",(offer[i].Price-FieldInfo.fYCPrice)>0?"red":"green");
        $(".cb-pk ul:eq(1) li:eq("+i+") span:eq(2)").text(bids[i].Volume);
    })

    $(".cb-title p:eq(0) span").text(floatFixedTwo(percent)+"%")
        .attr("class",minus>0?"red":"green");
    $(".cb-title p:eq(1) span").text(minusP)
        .attr("class",minus>0?"red":"green");
    $(".cb-title-sub .red").text(titalB)
    $(".cb-title-sub .green").text(titalO);

}
// 逐笔成交
function setfillZBCJ(data){
    var zbcj = data;
    zbcj.sort(compareSmall("RecorePrice"));
    $.each(zbcj,function(i,o){
        $(".cb-cj ul:eq(0) li:eq("+i+") span:eq(0)").text(formatTimeSec(zbcj[i].MarketTime));
        $(".cb-cj ul:eq(0) li:eq("+i+") span:eq(1)").text(floatFixedTwo(zbcj[i].RecorePrice));
        $(".cb-cj ul:eq(0) li:eq("+i+") span:eq(2)").text(zbcj[i].Volume);
    });
}
function formatTimeSec(time) {
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
    var s = time.substring(4, 6)
    time = H + ":" + m + ":" + s;
    return time;
};
$(function(){
    // 合并时候新加的内容
    // $.queryKLine({
    //     "InstrumentID": "1505",
    //     "ExchangeID":"101"
    // });

    // var loc = window.location.href.split("?")[1];

    // if(!loc){
    //     $(".bottom-bar").html("<div class='box feild-null' style='height: 560px;font-size: 16px;margin-bottom:20px'>指数页面该模块信息为空</div>")
    // }
    // /*
    //  * 个股信息
    //  */
    // var indId = "000001";
    // var reqIds = ["23000171","23000138","23000164"];
    // requireCom(loc,indId,reqIds);
});