

$('#voc_tab').on('click', function(){

    if (!GLOBAL.DOCUMENTATION_FETCHED) {
        $("#voc").empty();
        queryVocabulary();
    }
    showDocumentation();
});

var Prefixes = {
    /**
     * The used prefixes as a key-value pair JSON object 
     */
    vocabularies : {
        "afn": "http://jena.hpl.hp.com/ARQ/function#",
        "fn": "http://www.w3.org/2005/xpath-functions#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "sf": "http://www.opengis.net/ont/sf#",
        "time": "http://www.w3.org/2006/time#",
        "units": "http://www.opengis.net/def/uom/OGC/1.0/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "schema": "http://schema.org/",
        "sdmx":  "http://purl.org/linked-data/sdmx#",
        "vcard": "http://www.w3.org/2006/vcard/ns#",
        "dbo":   "http://dbpedia.org/ontology/",
        "qb":    "http://purl.org/linked-data/cube#",
        "sdmx-measure": "http://purl.org/linked-data/sdmx/2009/measure#",
        "sdmx-code": "http://purl.org/linked-data/sdmx/2009/code#",
        "lodcom": "http://vocab.lodcom.de/",
        "sdmx-concept": "http://purl.org/linked-data/sdmx/2009/concept#",
        "interval": "http://reference.data.gov.uk/def/intervals/",
        "sdmx-attribute": "http://purl.org/linked-data/sdmx/2009/attribute#",
        "sdmx-dimension": "http://purl.org/linked-data/sdmx/2009/dimension#",
        "dc":    "http://purl.org/dc/terms/" 
    },
    /**
     * Prints the prefixes in the SparQL query style 
     */
    toString: function() {
        var out = "";
        
        for (var key in this.vocabularies) {
            value = this.vocabularies[key];
            out += "PREFIX "+key+": <"+value+">\r\n\n";
        }
        
        return out;
    },
    /**
     * Replaces the occurrences of the selected keys in the given string
     * 
     * @param s The string that needs replacement
     * @param sel An array of string with the keys
     * @return The string with the replaced values
     */
    replaceURIs: function(s, sel) {
        var out = s;
        for (var i = 0; i < sel.length; i++) {
            var key = sel[i];
            var uri = this.vocabularies[key];
            if (uri) {
                out = out.replace(new RegExp(uri,'g'),key+":");
            }
        }
        return out;
    }
};
        
/**
 * A query to fetch the relevant description for selfmade vocabularies using subPropertyOf or subClassOf or that are
 * inherited from Class or Property. 
 */    
var QUERY_DOC = "SELECT DISTINCT ?x ?prop ?val\r\n" + 
            "WHERE {\r\n" + 
            "   GRAPH <http://course.introlinkeddata.org/G4> {\r\n" + 
            "       { \r\n" + 
            "           ?x a rdf:Property.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x rdfs:subPropertyOf ?y.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x a rdfs:Class.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x rdfs:subClassOf ?y.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x a qb:DataSet.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x a qb:DataStructureDefinition.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x rdfs:comment ?z.\r\n" + 
            "       } UNION {\r\n" + 
            "           ?x a qb:Dimension.\r\n" + 
            "       }\r\n" + 
            "\r\n" + 
            "       \r\n" + 
            "       ?x ?prop ?val.\r\n" + 
            "   }\r\n" + 
            "} ORDER BY ?x";

/**
 * Queries the parliament server for the vocabulary information by sending a HTTP POST request. The
 * data returned will be in the JSON format. 
 */
function queryVocabulary() {
    $.post("http://giv-lodumdata.uni-muenster.de:8282/parliament/sparql", {
        query: Prefixes.toString()+QUERY_DOC,
        output: 'json'
    },
    function(data){
        //console.log(data);
        visualizeVocabularyData(data);
        GLOBAL.DOCUMENTATION_FETCHED = true;
    });
}

/**
 * This callback function will be used to visualize the returning vocabulary data, that was created
 * during the course. It will create different div blocks containing a title, a description and the
 * assigned Property-Value statements.
 *  
 * @param {Object} data The returning JSON data bindings from the parliament server.
 */
function visualizeVocabularyData(data) {
    var topic = data.results.bindings[0].x.value;
    var entry = new VocabularyEntry();
    entry.setTitle(topic);
    
    for (var i = 0; i < data.results.bindings.length; i++) {
        var cursor = data.results.bindings[i];
        if (topic == cursor.x.value) {
            entry.addData(cursor.prop,cursor.val);
        } else {
            entry.appendTo("#voc");
            
            entry = new VocabularyEntry();
            topic = cursor.x.value;
            entry.setTitle(topic);
            entry.addData(cursor.prop,cursor.val);
        }
    }
    entry.appendTo("#voc");
}

/**
 * A template that will be constructed using the function 'VocabularyEntry'. This object
 * will organize the data structure of each entry of the vocabulary. 
 */
var VocabularyEntryTemplate = {
    /** the parent node of the entry */
    entryDiv: null,
    /** a link containing the URI as title for the block */
    title: null,
    /** a div containing the description (rdfs:comment) */
    commentDiv: null,
    /** the parent div of the properties table */
    tableDiv: null,
    /** the table structure */
    table: null,
    
    /**
     * A function that sets the title of the block as well as the ID.
     * 
     * @param {string} uri The URI of the element as a string.
     */
    setTitle: function(uri) {
        this.entryDiv.attr("id",uri);
        this.title.text(uri).attr("href","#"+uri);

    },
    /**
     * Setting the description.
     * 
     * @param {string} comment The description as a string obtained from rdfs:comment statement. 
     */
    setComment: function (comment) {
        this.commentDiv.text(comment);
    },
    /**
     * Function to add property and values to the entry. If the property is rdfs:comment, then it
     * will be assigned as the description otherwise it will be added to the property table. The input
     * objects can be derived from the JSON bindings received from the server for the used SparQL query.
     * 
     * @param {Object} propObj The object for variable 'prop' of the JSON bindings.
     * @param {Object} valObj The object for variable 'val' of the JSON bindings.
     */
    addData: function (propObj, valObj) {
        var property = evalType(propObj);
        var value = evalType(valObj);
        if (propObj.value == Prefixes.vocabularies["rdfs"]+"comment") {
            this.setComment(value);
        } else {
            var new_row = $("<tr>");
            var prop_td = $("<td>").append(property);
            var val_td = $("<td>").append(value);
            new_row.append(prop_td).append(val_td);
            
            this.table.append(new_row);
        }
    },
    /**
     * Appends this entry to a parent by stating the parents id (JQuery notion).
     * 
     * @param {string} idString The id of the parent element in JQuery notion, e.g. "#parent".
     */
    appendTo: function (idString) {
        this.entryDiv.append("<br/>");
        this.entryDiv.appendTo(idString);
    }
};

/**
 * Constructor for the div data block namely the vocabulary entry.
 * 
 * @return {Object} A new vocabulary entry object.
 */
function VocabularyEntry() {
    var topic_div = $("<div>");
    var title_div = $("<div>");
    var title = $("<a>");
    var title_h2 = $("<h2>");
    title_div.append(title_h2);
    title_h2.append(title);
    topic_div.append(title_div);
    var comment_div = $("<div>");
    topic_div.append(comment_div);
    var table_div = $("<div>").addClass("table-responsive");
    var table = $("<table>").addClass("table").addClass("table-striped");
    var header = $("<tr><th>Property</th><th>Value</th></tr>");
    table.append(header);
    table_div.append(table);
    topic_div.append(table);
    
    var obj = VocabularyEntryTemplate;
    obj.entryDiv = topic_div;
    obj.title = title;
    obj.commentDiv = comment_div;
    obj.tableDiv = table_div;
    obj.table = table;
    
    return obj;
}

/**
 * Simple evaluation function for the JSON bindings object. It will create links from URIs.
 *  
 * @param {Object} obj One object of the JSON bindings from the query result.
 */
function evalType(obj) {
    if (obj.type == "uri") {
        var uri = null;
        if (obj.value.indexOf(Prefixes.vocabularies["lodcom"]) > -1) {
            uri = $("<a>", {href: "#"+obj.value, text:obj.value});
        } else {
            uri = $("<a>", {href: obj.value, text:obj.value, target:"_blank"});
        }
        return uri;
    } else {
        return obj.value;
    }
}

