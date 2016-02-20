/**
 * A query to fetch all related data to a city district 
 */
QUERY_DATASHEET = "SELECT DISTINCT ?dataSet ?dataSetName ?district ?year ?sex ?ageRange ?value ?uomLabel\r\n" + 
            "WHERE {\r\n" + 
            "   GRAPH <http://course.introlinkeddata.org/G4> {\r\n" + 
            "       ?obs a qb:Observation;\r\n" + 
                "       lodcom:refArea <%DISTRICT%>;\r\n" + 
                "       lodcom:refPeriod ?year;\r\n" + 
                "       qb:dataSet ?dataSet;\r\n" + 
                "       qb:measureType ?measure;\r\n" + 
                "       ?measure ?value.\r\n" + 
                "       ?dataSet rdfs:label ?dataSetName.\r\n" + 
                "       <%DISTRICT%> rdfs:label ?district.\r\n" + 
                "       \r\n" + 
                "   OPTIONAL {\r\n" + 
                "       ?obs sdmx-dimension:sex ?sex.\r\n" + 
                "   }\r\n" + 
                "   OPTIONAL {\r\n" + 
                "       ?obs lodcom:ageRange ?age.\r\n" + 
                "       ?age lodcom:min ?minAge.\r\n" + 
                "       ?age lodcom:max ?maxAge.\r\n" + 
                "       BIND(CONCAT(?minAge, '-', ?maxAge) AS ?ageRange).\r\n"+
                "   }\r\n" +
                "   OPTIONAL {\r\n" + 
                "       ?obs lodcom:ageRange ?age.\r\n" + 
                "       ?age lodcom:min ?minAge.\r\n" + 
                "       FILTER(?minAge >= 80)\r\n" + 
                "       BIND(CONCAT('> ',?minAge) AS ?ageRange).\r\n"+
                "   }\r\n" + 
                "   \r\n" + 
                "   OPTIONAL {\r\n" + 
                "       ?obs qb:dataSet ?ds.\r\n" + 
                "       ?ds sdmx-attribute:unitMeasure ?uom.\r\n" + 
                "       ?uom rdfs:label ?uomLabel.\r\n" + 
                "   }\r\n" + 
                "   OPTIONAL {\r\n" + 
                "       ?obs sdmx-attribute:unitMeasure ?uom.\r\n" + 
                "       ?uom rdfs:label ?uomLabel.\r\n" + 
            "       }\r\n" + 
            "       FILTER (lang(?dataSetName) = 'en')\r\n" +
            "       FILTER (lang(?uomLabel) = 'en')\r\n" + 
            "       FILTER (lang(?district) = 'en')\r\n" + 
            "   }\r\n"+
            "}\r\n" + 
            "ORDER BY ?dataSet ASC(?year) ASC(?ageRange)";

/**
 * A function that executes the HTTP POST request to query and visualize the
 * returning data as different graphs  
 * @param uri The URI of the district, e.g. http://vocab.lodcom.de/aegidii
 * @return void
 */
function queryDataSheet(uri) {

    $("#datasheet .panel-body").empty();
    showBottomMenu();
    
    $.post("http://giv-lodumdata.uni-muenster.de:8282/parliament/sparql", {
        query: Prefixes.toString()+QUERY_DATASHEET.split("%DISTRICT%").join(uri),
        output: 'json'
    },
    function(data) {
        visualizeDataSheet(data);
    });
}

/**
 * The callback function of queryDataSheet that takes the returning data from the parliament
 * server and visualizes it in the datasheet bottom menu. 
 * @param {Object} data The data returned from the parliament server as JSON bindings
 */
function visualizeDataSheet(data) {

    //createSimpleTable(data);
    var total_group = [];
    total_group[0] = [];
    var ds_group = [];
    var block = [];
    var child_group = [];
    var child_block = [];
    var age_block = [];
    var gender_block = [];
    var average_group = [];
    average_group[0] = [];
    var districtName = data.results.bindings[0].district.value;
    $("#sheet_title").html("Data Overview for District: <b>"+districtName+"</b>");
    
    var attributes = keys(data.results.bindings[0]);
    attributes = remove(attributes, "dataSet");
    attributes = remove(attributes, "dataSetName");
    attributes = remove(attributes, "district");
    var dsEntry = new DistrictDatasetEntry(attributes);
    
    dsEntry.setTitle(data.results.bindings[0].dataSetName.value);
    
    for (var i in data.results.bindings) {
        var entry = data.results.bindings[i];
        var next=null;
        if (parseInt(i) < (data.results.bindings.length-1)) {
            next = data.results.bindings[parseInt(i)+1];
        } else {
            next = null;
        }

        //end of list
        if (!next) {
            //add this one and append it to page
            if (child_block.length > 0) {
                child_block.push(entry);
                var index = getIndexForDSType(entry.dataSet.value);
                child_group[index] = child_block;
                child_block = [];
            }
            
            if (block.length > 0) {
                block.push(entry);
                var index = getIndexForDSType(entry.dataSet.value);
                ds_group[index] = block;
                //createBarChart(block);
                block = [];
            } else {
                dsEntry.addTableRow(entry); 
                dsEntry.entryDiv.appendTo("#datasheet");
            }
            break;
        }
        switch(entry.dataSet.value) {
            case "http://vocab.lodcom.de/SingleHouseholdTotalCount":
            case "http://vocab.lodcom.de/TwoPersonsHouseholdCount":
            case "http://vocab.lodcom.de/ThreePersonsHouseholdCount":
            case "http://vocab.lodcom.de/FourPersonsHouseholdCount":
            case "http://vocab.lodcom.de/FivePersonsMoreHouseholdCount":
                block.push(entry);
                if (entry.dataSet.value != next.dataSet.value) {
                    //create chart
                    //createBarChart(block);
                    var index = getIndexForDSType(entry.dataSet.value);
                    ds_group[index] = block;
                    // empty block
                    block = [];
                }
                break;
            case "http://vocab.lodcom.de/SingleHouseholdAgeRangeCount":
                age_block.push(entry);
                break;
            case "http://vocab.lodcom.de/SingleHouseholdGenderCount":
                gender_block.push(entry);
                break;
            case "http://vocab.lodcom.de/TotalHouseholdCount":
                total_group[0].push(entry);
                break;
            case "http://vocab.lodcom.de/AveragePersonsPerHousehold":
                average_group[0].push(entry);
                break;
            case "http://vocab.lodcom.de/HouseholdsWithChildrenCount":
            case "http://vocab.lodcom.de/SingleParentHouseholdCount":
                child_block.push(entry);
                if (entry.dataSet.value != next.dataSet.value) {
                    //create chart
                    //createBarChart(block);
                    var index = getIndexForDSType(entry.dataSet.value);
                    child_group[index] = child_block;
                    // empty block
                    child_block = [];
                }
            break;
            default:
                dsEntry.addTableRow(entry);
                if (entry.dataSet.value != next.dataSet.value) {
                    //append
                    dsEntry.entryDiv.appendTo("#ds_tables");
                }
            break;
        } 
        if (entry.dataSet.value != next.dataSet.value) {
            switch (next.dataSet.value) {
                case "http://vocab.lodcom.de/SingleHouseholdTotalCount":
                case "http://vocab.lodcom.de/TwoPersonsHouseholdCount":
                case "http://vocab.lodcom.de/ThreePersonsHouseholdCount":
                case "http://vocab.lodcom.de/FourPersonsHouseholdCount":
                case "http://vocab.lodcom.de/FivePersonsMoreHouseholdCount":
                break;
                case "http://vocab.lodcom.de/SingleHouseholdAgeRangeCount":
                break;
                case "http://vocab.lodcom.de/SingleHouseholdGenderCount":
                break;
                case "http://vocab.lodcom.de/HouseholdsWithChildrenCount":
                case "http://vocab.lodcom.de/SingleParentHouseholdCount":
                break;
                default:
                    //prepare next table block
                    attributes = keys(next);
                    attributes = remove(attributes, "dataSet");
                    attributes = remove(attributes, "dataSetName");
                    attributes = remove(attributes, "district");
                    dsEntry = new DistrictDatasetEntry(attributes);
                    dsEntry.setTitle(next.dataSetName.value);
                break;
            }
        }

        
    }
    
    
    createSheetBarChart(total_group,"Households Dynamic from 2010 to 2014","300px","35%",$("#ds_charts_body"),false);
    createSheetBarChart(average_group,"Average Persons per Household","300px","35%",$("#ds_charts_body"),false);
    createSheetBarChart(ds_group,"Households Dynamic by Household type 2010-2014","300px","70%",$("#ds_charts_body"),true);
    createSheetPieChart(age_block,"ageRange","value",$("#single_charts_body"));
    createGenderChart(gender_block,$("#single_charts_body"));
    createSheetBarChart(child_group,"Households with children compared to single parent Households","300px","60%",$("#child_charts_body"),true);
}

/**
 * This function creates a bar chart for the data sheet. It takes a specific set of data entries, a title, the extent in height
 * and width, the parent DOM node at which the chart will be appended and also information whether or not the
 * display a legend for the chart.
 * 
 * @param array group An array of sorted response data from the Parliament server
 * @param string title The title for the chart
 * @param string  height The height of the chart that is passed as CSS statement
 * @param string  width The width of the chart that is passed as CSS statement
 * @param {Object} parentNode The parent DOM node referenced to by JQuery at which the chart will be appended.
 * @param boolean legend A boolean to state whether or not a legend shall be created.
 */
function createSheetBarChart(group,title,height,width,parentNode,legend) {
    var datasets = [];
    for (var j=0; j < group.length; j++) {
        var arr = group[j];
        if (!arr || arr.length == 0) continue;
        var points = [];
        for (var i in arr) {
            var obj = arr[i];
            var year = extractYear(obj.year.value);
            var value = obj.value.value;
            points.push({label: year, y: parseFloat(value)});
        }

        datasets.push({
            type: "column",
            name: arr[0].dataSetName.value,
            legendText: arr[0].dataSetName.value,
            showInLegend: legend,
            dataPoints: points
        });
    }
    
    
    var obj = group[0][0];
    var chartDiv = $("<div>", {"id": "chart_"+obj.dataSet.value});
    chartDiv.css("height",height).css("width",width).css("display","inline-block");
    chartDiv.appendTo(parentNode);
    
    var chartOptions = {
        theme: "theme2",//theme1
        title:{
            text: title              
        },
        animationEnabled: false,   // change to true
        data: datasets
      };
    if (legend) {
        chartOptions.legend = {
            cursor:"pointer",
            itemclick: function(e) {
                if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                  e.dataSeries.visible = false;
                }
                else {
                  e.dataSeries.visible = true;
                }
                chart.render();
            }
          };
    }
    var chart = new CanvasJS.Chart("chart_"+obj.dataSet.value, chartOptions);
      
    chart.render();
}

/**
 * This function rounds mathematically a number to two decimal cifers (0.009 to 0.01) 
 * @param number num
 * @return The rounded number.
 */
function roundToTwo(num) {    
    return +(Math.round(num + "e+2")  + "e-2");
}

/**
 * This function creates a pie chart for selected entries of the JSON bindings.
 * 
 * @param Array block An array of JSON binding entries
 * @param string labelAttr A string that defines the labeling attribute out of the data bindings in each individual block element
 * @param string valueAttr A string that defines the attribute name of the value in the block element.
 * @param {Object} parentNode The DOM node at which the chart will be appended.
 */
function createSheetPieChart(block, labelAttr,valueAttr,parentNode) {
    var points = [];
    var totalSingle = 0;
    for (var i in block) {
        var obj = block[i];
        var year = extractYear(obj.year.value);
        var value = parseInt(obj[valueAttr].value);
        totalSingle += value;
        
        points.push({
            label: obj[labelAttr].value, 
            y: value,
            legendText: obj[labelAttr].value
        });
    }
    
    var run = 0;
    for (var i in points) {
        if (i == points.length) {
            points[i].perc = roundToTwo(100.00-run);
            break;
        }
        points[i].perc = roundToTwo((points[i].y / totalSingle) * 100);
        run += points[i].perc;
    }
    
    var dataset = {
        type: "pie",       
        indexLabel: "{label}: {perc}%",
        startAngle:-90,      
        showInLegend: true,
        toolTipContent:"{legendText}: {y} Households",
        dataPoints: points
    };
    
    var chartDiv = $("<div>", {"id": "chart_"+obj.dataSet.value});
    chartDiv.css("height","300px").css("width","40%").css("display","inline-block");
    chartDiv.appendTo(parentNode);
    
    var chart = new CanvasJS.Chart("chart_"+obj.dataSet.value,
    {
        title:{
            text: block[0].dataSetName.value
        },
        animationEnabled: false,
        legend:{
            verticalAlign: "bottom",
            horizontalAlign: "center"   
        },
        theme: "theme2",
        data: [dataset]
    });

    chart.render();
}

/**
 *  This function creates several charts for the gender related data sets and puts it under the correct DOM node.
 * 
 * @param Array block An array of JSON binding entries
 * @param {Object} parentNode The DOM node at which the charts will be appended.
 */
function createGenderChart(block,parentNode) {
    var dataset = {
        type: "pie",       
        indexLabel: "{label}: {perc}%",
        startAngle:-90,      
        showInLegend: true,
        toolTipContent:"{legendText}: {y} Households",
        dataPoints: [{
            label: "Female",
            y: parseInt(block[0].value.value),
            perc: parseFloat(block[2].value.value),
            legendText: "Female"
        },{
            label: "Male",
            y: parseInt(block[1].value.value),
            perc: parseFloat(block[3].value.value),
            legendText: "Male"
        }]
    };
    var chartDiv = $("<div>", {"id": "chart_"+block[0].dataSet.value});
    chartDiv.css("height","300px").css("width","40%").css("display","inline-block");
    chartDiv.appendTo(parentNode);
    
    var chart = new CanvasJS.Chart("chart_"+block[0].dataSet.value,
    {
        title:{
            text: block[0].dataSetName.value
        },
        animationEnabled: false,
        legend:{
            verticalAlign: "bottom",
            horizontalAlign: "center"   
        },
        theme: "theme2",
        data: [dataset]
    });

    chart.render();
}

/**
 * A default handling to visualize returned data from the parliament server. It will create a table listing
 * all entries as rows.
 *  
 * @param {Object} data JSON bindings returned from the Parliament triple store
 */
function createSimpleTable(data) {
    var _table = $("<table>").addClass("table").addClass("table-striped");
    var _headerRow = $("<tr>");
    
    for (var i = 0; i < data.head.vars.length; i++) {
        var current = data.head.vars[i];
        var _th= $("<th>").text(current);
        _th.appendTo(_headerRow);
    }
    _headerRow.appendTo(_table);
    
    for (var k in data.results.bindings) {
        var row = $("<tr>");
        var curr = data.results.bindings[k];
        
        for (var j = 0; j < data.head.vars.length; j++) {
            var head = data.head.vars[j];
            var val = curr[head];
            var _td = $("<td>");
            if (val) {
                _td.text(val.value);
            }
            
            _td.appendTo(row);
        }
        row.appendTo(_table);
    }
    
    _table.appendTo("#ds_tables");
}

/**
 * A data structure for the table visualization 
 */
var DistrictDatasetTemplate = {
    /** The parent node */
    entryDiv: null,
    /** The DOM node for the tables title */
    titleDiv: null,
    /** The DOM node to the "div" of the table */
    tableDiv: null,
    /** The DOM node to the "table" element */
    table: null,
    /** An array stating the attribute that shall be visualized in the table (the columns) */
    selectedAttributes: null,
    /**
     * A function to set the tables title
     * 
     * @param string text The title
     */
    setTitle: function(text) {
        this.titleDiv.text(text);

    },
    /**
     * A function that initializes the table by creating and linking all relevant DOM
     * elements. 
     */
    initTable: function() {
        if (this.selectedAttributes && this.selectedAttributes.length > 1) {
            this.tableDiv = $("<div>").addClass("table-responsive");
            this.tableDiv.appendTo(this.entryDiv);
            this.table = $("<table>").addClass("table").addClass("table-striped");
            this.tableDiv.append(this.table);
            var header = $("<tr>");
            header.appendTo(this.table);
            
            for (var i in this.selectedAttributes) {
                var attributeName = this.selectedAttributes[i];
                var th = $("<th>").text(attributeName);
                header.append(th);
            }
        }
    },
    /**
     * This function reads the data of the JSON binding entry and puts the information for the
     * prior selected attributes into the table.
     * 
     * @param {Object} obj One element of the JSON bindings
     */
    addTableRow: function(obj) {
        if (this.table) {
            var row = $("<tr>");
            
            for (var i in this.selectedAttributes) {
                var attributeName = this.selectedAttributes[i];
                var val;
                if (attributeName == "year") {
                    val= extractYear(obj[attributeName].value);
                }else {
                    val= obj[attributeName].value;
                }
                
                var td = $("<td>").text(val);
                row.append(td);
            }
            
            row.appendTo(this.table);
        }
    }
};

/**
 * A constructor function for the DistrictDatasetTemplate
 *  
 * @param Array attr An array stating the attribute names of individual elements in the JSON bindings
 */
function DistrictDatasetEntry(attr) {
    var obj = DistrictDatasetTemplate;
    obj.selectedAttributes = attr;
    
    obj.entryDiv = $("<div>");
    obj.titleDiv = $("<h3>");
    obj.titleDiv.appendTo(obj.entryDiv);
    obj.initTable();
    
    return obj;
}

/**
 * A utility function that extracts all attribute names of a JSON object 
 * 
 * @param {Object} obj A JSON object
 * @return array An array containing the names of each attribute of an JSON object
 */
function keys(obj) {
    var arr = [];
    for (var key in obj) {
        arr.push(key);
    }
    return arr;
}

/**
 * Removes a certain object from an array.
 * 
 * @param arr The source array.
 * @param obj The object to be removed from the source array.
 * @return The array containing the remaining objects.
 */
function remove(arr, obj) {
    var index = arr.indexOf(obj);
    arr.splice(index,1);
    return arr;
}

/**
 * Searches for the year in an reference.gov.uk URI and returns its position index in the string
 *  
 * @param {Object} str A reference.gov.uk URI
 * @return the position index
 */
function extractYear(str) {
    var index = str.match(/\d{4}/);
    return index[0];
}

/**
 * A utility function to order different data set types according to a certain pattern (e.g. single to five or more person households)
 *  
 * @param {Object} uri The URI of the data set.
 * @return int An ordering value for a data set URI.
 */
function getIndexForDSType (uri) {
    switch(uri) {
        case "http://vocab.lodcom.de/SingleHouseholdTotalCount":
            return 0;
        case "http://vocab.lodcom.de/TwoPersonsHouseholdCount":
            return 1;
        case "http://vocab.lodcom.de/ThreePersonsHouseholdCount":
            return 2;
        case "http://vocab.lodcom.de/FourPersonsHouseholdCount":
            return 3;
        case "http://vocab.lodcom.de/FivePersonsMoreHouseholdCount":
            return 4;
        case "http://vocab.lodcom.de/HouseholdsWithChildrenCount":
            return 0;
        case "http://vocab.lodcom.de/SingleParentHouseholdCount":
            return 1;
    }
    
}
