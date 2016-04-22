/* global angular */

'use strict';
/* Controllers */
var appControllers = angular.module('appControllers', []);
appControllers.controller('ReportController', function($scope,DHIS2URL,$http,$sce,$timeout,$compile) {

    $scope.data ={
        //selectedOrgUnit:{},
        dataSets:[],
        period:"",
        periodTypes: {
            "Monthly": {
                name: "Monthly", value: "Monthly", list: [],
                populateList: function (date) {
                    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    if(!date){
                        date = new Date();
                    }
                    this.list = [];
                    var that = this;
                    monthNames.forEach(function (monthName) {
                        that.list.push({name: monthName + " " + date.getFullYear()})
                    });
                }
            },
            "Quarterly": {
                name: "Quarterly", value: "Quarterly", list: [],
                populateList: function (date) {
                    var quarters = ["January - March" ,"April - June" ,"July - September" ,"October - December"];
                    if(!date){
                        date = new Date();
                    }
                    this.list = [];
                    var that = this;
                    quarters.forEach(function (quarter,index) {
                        that.list.push({name: quarter + " " + date.getFullYear(),value: date.getFullYear() +"Q" + index})
                    });
                }
            },
            "Yearly": {
                name: "Yearly", value: "Yearly", list: [],
                populateList: function () {
                    var date = new Date();
                    this.list = [];
                    for (var i = date.getFullYear() - 5; i < date.getFullYear() + 5; i++) {
                        this.list.push({name: "" + i});
                    }
                }
            },
            "Financial-July": {
                name: "Financial-July", value: "FinancialJuly"
            }
        }
    };
    $scope.currentDate = new Date();
    $scope.displayPreviousPeriods = function(){
        $scope.currentDate = new Date($scope.currentDate.getFullYear() - 1,$scope.currentDate.getMonth(),$scope.currentDate.getDate());
        $scope.data.periodTypes[$scope.data.dataSet.periodType].populateList($scope.currentDate);
    };
    $scope.displayNextPeriods = function(){
        $scope.currentDate = new Date($scope.currentDate.getFullYear() + 1,$scope.currentDate.getMonth(),$scope.currentDate.getDate());
        $scope.data.periodTypes[$scope.data.dataSet.periodType].populateList($scope.currentDate);
    };
    $scope.getPeriodType = function(name){
        var retPeriodType;
        $scope.data.periodTypes.forEach(function(periodType){
            if(name == periodType.name){
                retPeriodType = periodType;
            }
        });
        console.log(name,JSON.stringify(retPeriodType));
        return retPeriodType;
    }
    $scope.$watch("data.dataSet",function(value){
        if(value){
            $scope.currentDate = new Date();
            $scope.data.periodTypes[value.periodType].populateList();

        }
    })
    $http.get(DHIS2URL +"api/dataSets.json?fields=id,name,periodType").then(function(results){
        $scope.data.dataSets = results.data.dataSets;
        $http.get(DHIS2URL +"api/organisationUnits.json?filter=level:eq:1&fields=id,name,")//children[id,name,children[id,name,children[id,name,children[id,name,children]]]]")
            .then(function(results){
            $scope.data.organisationUnits = results.data.organisationUnits;

        });
    });
    $scope.dataElements = [];
    $scope.toTrustedHTML = function( html ){
        console.log("Here");
        var inputRegEx = /<input (.*?)>/g;
        var match = null;
        $scope.dataElements = [];
        while(true){
            match = inputRegEx.exec(html);
            if(match != null){
                console.log("Input:",JSON.stringify(match));
                var idRegEx = /id="(.*?)-(.*?)-val/g;
                var idMacth = idRegEx.exec(match[0]);
                console.log("IDs:",JSON.stringify(idMacth));
                if(idMacth != null){
                    html = html.replace(match[0],"<label>{{dataElements[" + idMacth[1]+"." + idMacth[2]+ "]}}</label>");
                    $scope.dataElements.push(idMacth[1]+"." + idMacth[2]);
                }


            }else{
                break;
            }
        }

        return $sce.trustAsHtml( html );

    }
    $scope.generateDataSetReport = function(){
        $http.get(DHIS2URL +"api/dataSets/"+$scope.data.dataSet.id+".json").then(function(results){
            $scope.data.dataSetForm = results.data;
            /**/
            $timeout(function(){
                var elms = document.getElementById("report").getElementsByTagName("input");
                var dataElements = [];
                for (var i = 0; i < elms.length; i++) {
                    console.log(elms[i]);
                    var ids = elms[i].id.split("-");
                    var newlabel = document.createElement("Label");
                    newlabel.innerHTML = "{{dataElements[" + ids[0]+"." + ids[1]+ "]}}" ;
                    elms[i].parentElement.appendChild(newlabel);
                    elms[i].parentElement.removeChild(elms[i]);
                    $compile(newlabel)($scope);
                    dataElements.push(ids[0] + "." + ids[1]);
                }
                $compile(newlabel)($scope);
                $http.get(DHIS2URL +"api/analytics.json?dimension=dx:"+$scope.dataElements.join(";")+"&dimension=pe:" +$scope.data.period+"&filter=ou:" + $scope.data.selectedOrgUnit.id + "&displayProperty=NAME")
                    .then(function(analyticsResults) {
                        analyticsResults.data.rows.forEach(function(row){
                            $scope.dataElements[row[0]] = row[2];
                        });

                });
            }, 1000);

        });
    }
});
