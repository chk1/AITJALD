var validYearsForDataset = [];

/*
	Query all types of observation from the database
*/
function queryDatasets() {
	// queries/observations.txt
    var qry = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
			"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
			"PREFIX cube: <http://purl.org/linked-data/cube#> " +
			"SELECT ?observation ?label ?structure WHERE { GRAPH <http://course.introlinkeddata.org/G4> {" +
				"?observation rdf:type cube:DataSet ." +
				"?observation cube:structure ?structure ." +
				"?observation rdfs:label ?label FILTER (lang(?label) = 'en') }}";
    $.post("http://giv-lodumdata.uni-muenster.de:8282/parliament/sparql", {
        query: qry,
        output: 'json'
    },
    function(data){
        console.log(data);
        populateDatasetSelection(data);
    });
}

/*
	Populate the data set selection in the sidebar
*/
function populateDatasetSelection(data) {
	if(data.results.bindings.length > 0) {
		for(var i in data.results.bindings) {
			var label = data.results.bindings[i].label.value;
			var obsFull = data.results.bindings[i].observation.value;
			var obsShort = obsFull.split('/').pop();
			var structure = data.results.bindings[i].structure.value;
			var option = $("<option></option>");
			$(option).attr('value', obsShort);
			$(option).attr('data-uri', obsFull);
			$(option).attr('data-structure', obsFull);
			$(option).html(label);
			$('select#dataset').append(option);
		}
		$('select#dataset').attr('disabled', false);
	}
}

/*
	Query all possible choices for filtering a chosen dataset
*/
function queryDataSubsets(countType) {
	// queries/observations-subdivision.txt
    var qry = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + 
			"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " + 
			"PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> " + 
			"PREFIX cube: <http://purl.org/linked-data/cube#> " + 
			"PREFIX lodcom: <http://vocab.lodcom.de/> " + 
			"PREFIX greg: <http://reference.data.gov.uk/id/gregorian-interval/> " + 
			"PREFIX dimension: <http://purl.org/linked-data/sdmx/2009/dimension#> " + 
			"PREFIX gendercode: <http://purl.org/linked-data/sdmx/2009/code#> " + 
			"SELECT DISTINCT (CONCAT(?minAge, '-', ?maxAge) AS ?ageRanges) ?ageRange (STR(?refPeriod) AS ?refPeriods) ?gender WHERE { " + 
			"GRAPH <http://course.introlinkeddata.org/G4> {" + 
				"lodcom:"+countType+" cube:structure ?structure ." + 
				"?structure cube:component ?components . " + 
					"OPTIONAL {" + 
						"?components cube:dimension ?ageRangeDim . " + 
						"?obs cube:dataSet lodcom:"+countType+" . " + 
						"?obs lodcom:ageRange ?ageRange . " + 
						"?ageRange lodcom:min ?minAge . " + 
						"?ageRange lodcom:max ?maxAge } . " + 
					"OPTIONAL {" + 
						"?components cube:dimension ?refPeriodDim . " + 
						"?obs cube:dataSet lodcom:"+countType+" . " + 
						"?obs <http://purl.org/linked-data/sdmx/2009/dimension#refPeriod> ?refPeriod } . " + 
					"OPTIONAL {" + 
						"?components cube:dimension dimension:sex . " + 
						"?obs cube:dataSet lodcom:"+countType+" . " + 
						"?obs dimension:sex ?gender } " + 
			"}} ORDER BY ASC(?ageRanges) DESC(?refPeriods) ASC(?gender)";
    $.post("http://giv-lodumdata.uni-muenster.de:8282/parliament/sparql", {
        query: qry,
        output: 'json'
    },
    function(data){
        console.log(data);
        populateYearAndGenderSelection(data);

        $("#mapTheData").attr('disabled', false);
		$("#data_sheet_toggle").attr('disabled', false);
		$("#dataset-filters").slideDown();
    });
}

/*
	Fill the selection boxes with values to chose from
*/
function populateYearAndGenderSelection(data) {
	$('select#datasetyear').empty();
	$('select#datasetgender').empty();
	$('select#datasetage').empty();
	$('.timeslider-tick').addClass('disabled');
	validYearsForDataset = [];

	if(data.results.bindings.length > 0) {
		for(var i in data.results.bindings) {
			// age ranges
			if(data.results.bindings[i].ageRanges){
				var range = data.results.bindings[i].ageRanges;

				var optionAge = $("<option></option>");
				$(optionAge).attr('value', data.results.bindings[i].ageRange.value);
				//$(optionAge).attr('data-uri', data.results.bindings[i].ageRange.value);
				$(optionAge).html(range.value);
				$('select#datasetage').append(optionAge);
			}

			// time periods (years)
			if(data.results.bindings[i].refPeriods){
				var period = data.results.bindings[i].refPeriods;

				// filter just the year from the URI
				var year = period.value.match(/\/(\d{4})-01-01T/)[1];

				// do not insert duplicate entries
				if($('select#datasetyear option[value="'+year+'"]').length===0) {
					//var optionYear = $("<option></option>");
					//$(optionYear).attr('value', year);
					//$(optionYear).attr('data-uri', period.value);
					//$(optionYear).html(year);
					//$('select#datasetyear').append(optionYear);

					validYearsForDataset.push(year); // add year to this list for timeslider validation check
					$('.timeslider-tick[data-value="'+year+'"]').removeClass('disabled');
				}
			}

			// gender
			if(data.results.bindings[i].gender){
				var gender = data.results.bindings[i].gender;

				var abbr = gender.value.match(/sex-([MF])$/)[1];
				var full = (abbr == "F") ? "Female" : "Male";

				// do not insert duplicate entries
				if($('select#datasetgender option[value="'+gender.value+'"]').length===0) {
					var optionGender = $("<option></option>");
					$(optionGender).attr('value', gender.value);
					$(optionGender).html(full);
					$('select#datasetgender').append(optionGender);
				}
			}
		}
	}

	// disable all empty selects
	//$('select#datasetyear option').length === 0   ? $('select#datasetyear').attr('disabled', 'disabled')   : $('select#datasetyear').attr('disabled', false);
	$('select#datasetage option').length === 0    ? $('select#datasetage').attr('disabled', 'disabled')    : $('select#datasetage').attr('disabled', false);
	$('select#datasetgender option').length === 0 ? $('select#datasetgender').attr('disabled', 'disabled') : $('select#datasetgender').attr('disabled', false);
}

$('select#dataset').on('change', function(e){
	var countType = $(this).val();
	if(countType!=="") {
		queryDataSubsets(countType);
		$('select#dataset option.disabled').attr('disabled', 'disabled');
	}
});

$('input#yearslider').on('change', function(e){
	var newValue = $(this).val();
	if(validYearsForDataset.indexOf(newValue) === -1) {
		$(this).val(2014);
	}
});

$('button#mapTheData').on('click', function(){
	// see also map.js
	showThis.year = $('input#yearslider').val();
	showThis.dataset = $('select#dataset').val();
	showThis.agegroup = $('select#datasetage').val();
	showThis.gender = $('select#datasetgender').val();
	mapData();
});

queryDatasets(); // query available datasets for selection