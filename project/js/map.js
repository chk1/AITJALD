var wkt = new Wkt.Wkt(); // Wicket library for WKT geometries
var map = L.map('map').setView([51.9609808, 7.62416839], 13);

var currentYear = 2011;
var legend;
//var featureGroup = L.featureGroup().addTo(map);
var showThis = "Stadtteil"; // default data set to show
var colorScale; // chroma color scale object
var gjlayer; // GeoJSON layer

var defaults = {
    icon: new L.Icon({
        iconUrl: 'red_dot.png',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        shadowUrl: 'dot_shadow.png',
        shadowSize: [16, 16],
        shadowAnchor: [8, 8]
    }),
    editable: true,
    color: '#AA0000',
    weight: 3,
    opacity: 1.0,
    fillColor: '#AA0000',
    fillOpacity: 1
};

L.tileLayer('http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
}).addTo(map);
map.invalidateSize();

function updateLegend() {
    try { map.removeControl(legend); } catch(e) {}
    legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        var labels = [];
        gjlayer.eachLayer(function(feature, layer){
            try{
                labels.push('<i style="background:' + colorScale(feature.feature.properties.n) + '"></i>' + feature.feature.properties.n);
            } catch(e) {
                // not a feature with 'n' (number of households) property
            }
        });
        div.innerHTML = labels.join('<br/>');
        return div;
    };
    legend.addTo(map);
}

$('#map_tab').on('click', function(){
    showMap();
    hideDocumentation();
});

map.on('zoomend', function () {
    //console.log(map.getZoom());
    if (map.getZoom() >= 12){
        if(showThis == "Stadtbezirk") {
            showThis = "Stadtteil";
            year(currentYear);
        }
    } else {
        if(showThis == "Stadtteil") {
            showThis = "Stadtbezirk";
            year(currentYear);
        }
    }
});

function year(y) {
    var qry = "PREFIX afn: <http://jena.hpl.hp.com/ARQ/function#> "+
    "PREFIX fn: <http://www.w3.org/2005/xpath-functions#> "+
    "PREFIX geo: <http://www.opengis.net/ont/geosparql#> "+
    "PREFIX geof: <http://www.opengis.net/def/function/geosparql/> "+
    "PREFIX gml: <http://www.opengis.net/ont/gml#> "+
    "PREFIX owl: <http://www.w3.org/2002/07/owl#> "+
    "PREFIX par: <http://parliament.semwebcentral.org/parliament#> "+
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "+
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "+
    "PREFIX sf: <http://www.opengis.net/ont/sf#> "+
    "PREFIX time: <http://www.w3.org/2006/time#> "+
    "PREFIX units: <http://www.opengis.net/def/uom/OGC/1.0/> "+
    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> "+
    "PREFIX lodcom: <http://vocab.lodcom.de/> "+
    "SELECT ?id ?name ?n ?wkt "+
    "WHERE { "+
    "GRAPH <http://course.introlinkeddata.org/G4> {"+
    "?id rdf:type lodcom:"+showThis+" . "+
    "?id <http://www.w3.org/2000/01/rdf-schema#label> ?name . "+
    "?obs <http://purl.org/linked-data/cube#dataSet> lodcom:SingleHouseholdTotalCount . "+
    "?obs <http://vocab.lodcom.de/numberOfHouseholds> ?num . "+
    "?obs lodcom:refArea ?id . "+
    "?obs lodcom:refPeriod <http://reference.data.gov.uk/id/gregorian-interval/"+y+"-01-01T00:00:00/P1Y> . "+
    "?obs <http://purl.org/linked-data/sdmx/2009/measure#obsValue> ?n . "+
    "?id geo:hasGeometry ?geometry . "+
    "?geometry geo:asWKT ?wkt }}";
    $.post("http://giv-lodumdata.uni-muenster.de:8282/parliament/sparql", {
        query: qry,
        output: 'json'
    },
    function(data){
        console.log(data);
        processBindings(data);
        updateLegend();
    });
    currentYear = y;
}

function minmax(data) {
    var min = parseInt(data.results.bindings[0].n.value);
    var max = parseInt(data.results.bindings[0].n.value);
    for(var i in data.results.bindings) {
        if(parseInt(data.results.bindings[i].n.value) < min) {
            min = parseInt(data.results.bindings[i].n.value);
        }
        if(parseInt(data.results.bindings[i].n.value) > max) {
            max = parseInt(data.results.bindings[i].n.value);
        }
    }
    return [min, max];
}

function processBindings(data) {
    // map.removeLayer(featureGroup);
    // featureGroup = L.featureGroup();
    if (gjlayer) map.removeLayer(gjlayer);
    
    var mm = minmax(data);    
    colorScale = chroma.scale(chroma.brewer.OrRd).domain(mm, 'log');
    
    var collection = parseToGeoJSONFeatureCollection(data);
    //console.log(collection);
    
    gjlayer = L.geoJson(collection, {
        style: styleFeature,
        onEachFeature: function (feature, layer) {

            layer.on({
                click: function(e) {
                    //console.log(feature);
                    queryDataSheet(feature.id);
                    //console.log(e);
                }
            });
        }
    });
    addPopupToLayer();
    
    gjlayer.addTo(map);
}

function parseToGeoJSONFeatureCollection(data) {
    var geoJsonFeatureCollection = {
      "type": "FeatureCollection",
      "features": []  
    };
    for(var i in data.results.bindings) {
        var current = data.results.bindings[i];
        wkt.read(current.wkt.value);
        
        var geoJson = {
            "type": "Feature",
            "id": "",
            "properties": {},
            "geometry": {}
        };
        
        geoJson.geometry = wkt.toJson();
        geoJson.id = current.id.value;
        geoJson.properties.name = current.name.value;
        geoJson.properties.n = current.n.value;
        
        geoJsonFeatureCollection.features.push(geoJson);
    }
    return geoJsonFeatureCollection;
}

function styleFeature(feature) {
    return {
        color: colorScale(feature.properties.n),
        weight: 0,
        opacity: 0.9,
        fillOpacity: 0.6
    };
}

function addPopupToLayer() {
    gjlayer.eachLayer(function(layer) {
        var other = '<br><img src="dummygraph.jpg">';
        layer.bindPopup("<b>"+layer.feature.properties.name+"</b><br>"+layer.feature.properties.n+" households<br>"+other);
    });
}

function addWktToMap(wktstring, name, pupulation, col) {
    //console.log(wktstring, name, pupulation, col);
    //console.log(name);
    wkt.read(wktstring);
    //var rgb = "rgb("+Math.floor((Math.random()*255))+","+Math.floor((Math.random()*255))+","+Math.floor((Math.random()*255))+")"; // random colour
    //colourScale(Math.floor(Math.random()*255))
    var districtObj = wkt.toObject({
        color: col,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
    });

    var other = '<br><img src="dummygraph.jpg">';

    districtObj.bindPopup("<b>"+name+"</b><br>"+pupulation+" households<br>"+other);
    return districtObj;
}

$('#dataset').on('change', function(){

});

$('#datasetyear').on('change', function(){

});

year(2011);