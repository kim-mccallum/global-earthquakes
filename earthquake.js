// Global variables for map features - put these into a single global object later
let data = [];
let map = [];
let allEarthquakeFeatures = [];
let bottomRange = 0;
let topRange = 15;
let symbolScaler = {
    scaler: 60000,
    prevZoom: 0,
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Create the Leaflet map
function initializeMap() {
    map = L.map('mapid', {zoomControl:false})
    //Add default basemap
    var natGeo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
        maxZoom: 16
    }).addTo(map);

    // Add alternative night basemap
    var nasaNight = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/{time}/{tilematrixset}{maxZoom}/{z}/{y}/{x}.{format}', {
        attribution: 'Imagery provided by services from the Global Imagery Browse Services (GIBS), operated by the NASA/GSFC/Earth Science Data and Information System (<a href="https://earthdata.nasa.gov">ESDIS</a>) with funding provided by NASA/HQ.',
        bounds: [[-85.0511287776, -179.999999975], [85.0511287776, 179.999999975]],
        minZoom: 1,
        maxZoom: 8,
        format: 'jpg',
        time: '',
        tilematrixset: 'GoogleMapsCompatible_Level'
    });

    createLayerSwitcher();
    // function to create a layer switcher control
    function createLayerSwitcher() {
    // define basemap and add layer switcher control
        var basemaps = {
            "National Geographic": natGeo,
            "NASA GIBS 2012 night": nasaNight
        };
    L.control.layers(basemaps).addTo(map);
    }
    //Fit the map to the world
    map.fitWorld( { animate: false } );
  
    //Constrain the map so you can't pan off the map
    //Code from stack overflow question https://stackoverflow.com/questions/22155017/can-i-prevent-panning-leaflet-map-out-of-the-worlds-edge
    const southWest = L.latLng(-89.98155760646617, -180),
    northEast = L.latLng(89.99346179538875, 180);
    const bounds = L.latLngBounds(southWest, northEast);
  
    map.setMaxBounds(bounds);
    map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false });
    });
    //Prevent zooming out beyond map - code below from here: https://gis.stackexchange.com/questions/224383/leaflet-maxbounds-doesnt-prevent-zooming-out
    map.setMinZoom(map.getBoundsZoom(map.options.maxBounds));
  }

//   Call the USGS API to GET earthquake data
function getEarthquakeData() {
    const eventRequest = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson`
    // Fetch the data
    fetch(eventRequest,{
      method:'GET'
    })
    .then(response => response.json())
    .then(json => {
    //assign the response to the global data object to allow easy manipulation by other functions
    data = json
    renderEqFeatures(bottomRange, topRange); 
    })
    .catch(error => console.log(error.message));
  }

function setFaultFeatures(){
    L.geoJSON(FAULTS, {
        style:function(features){
            return {
                color: '#434f43', 
                opacity: 0.5
            }
        },
        onEachFeature: function(feature,layer){
        //   INSTEAD OF CHANGING STYLE, MAKE THIS EVENT LISTENER USE TURF TO BUFFER THE FEATURE AND SELECT THE EARTHQUAKE FEATURES?
        // IF SO, HOW DO I SELECT THE EARTHQUAKE FEATURES?
          layer.on('mouseover',function(e) {
              e.target.setStyle({color: '#10b53c'})
          })
          layer.on('mouseout',function(e) {
              e.target.setStyle({color: '#181a18'})
          })  
      }
    }).bindPopup(function(layer){
        return `<strong>Fault name</strong>:  ${layer.feature.properties.catalog_name}<br><strong>Slip type</strong>:  ${layer.feature.properties.slip_type}`;
    }).addTo(map);
}

function resetEqData() {
    map.removeLayer(allEarthquakeFeatures);
    bottomRange = 0;
    topRange = 15;
  }

function handleEarthquakeFilter(){
    $('#query').on('change', function(e){
        e.preventDefault();
        // clear the earthquakes
        resetEqData()

        // Get the magnitude value from the 'change' event
        let magnitude = $('#magnitude').val();

        // console.log(magnitude.split("_"));
        let searchCriteria = magnitude.split("_");
        let op = searchCriteria[1];

        if (op === 'lt'){
            topRange = searchCriteria[2];
        }
        else if (op === 'gt'){
            bottomRange = searchCriteria[2];
        }
        else if (op === 'btwn'){
            bottomRange = searchCriteria[2];
            topRange = searchCriteria[3];
        }
        renderEqFeatures();

        if(allEarthquakeFeatures.getLayers().length === 0){
            alert(`No recent earthquakes found in selected magnitude range. \nTry another category.`)
        }
        })
}

function renderEqFeatures(){
    // console.log(eqData)
    allEarthquakeFeatures = L.geoJSON(data, {   
        filter: function(feature,layer){
            return (feature.properties.mag > Number(bottomRange) && feature.properties.mag <= Number(topRange) ); 
        },     
        style: function(feature) {
            return {
                fillOpacity:0.1,
                fillColor: '#f56511',
                color: '#fa2605',
                opacity: 0.4
            };
        },
        // Style - circle size proportion to magnitude * scaler
        pointToLayer: function(geoJsonPoint,latlng){
            // console.log(`symbol scaler here: ${symbolScaler}`)
            return L.circle(latlng, symbolScaler.scaler*(geoJsonPoint.properties.mag));
        },
        onEachFeature: function(feature,layer){
            layer.on('mouseover',function(e) {
                e.target.setStyle({fillOpacity:0.9})
            })
            layer.on('mouseout',function(e) {
                e.target.setStyle({fillOpacity:0.4})
            })  
        }
    }).bindPopup(function(layer){
        return `<strong>Earthquake location</strong>:  ${layer.feature.properties.place}<br><strong>Time:</strong>  ${new Date(layer.feature.properties.time)}<br><strong>Magnitude:</strong>  ${layer.feature.properties.mag}`
        })
    .addTo(map);
}

function zoomHandler(){
    map.on('zoomend', function() {
        let currentZoom = map.getZoom();
        console.log(currentZoom)
        // Conditional add logic to set minimum diameter 
        // if currentZoom === 6 then set the scaler to 1000 and skip the other conditionals
        if(currentZoom < symbolScaler.prevZoom){
            symbolScaler.scaler += 10000;
            symbolScaler.prevZoom = currentZoom;
        }
        if (currentZoom > symbolScaler.prevZoom){
            symbolScaler.scaler -= 10000;
            symbolScaler.prevZoom = currentZoom;            
        }
        if(currentZoom === 6){
            symbolScaler.scaler = 8000;
        }
        if(currentZoom === 7){
            symbolScaler.scaler = 5000;
        }
        if(currentZoom === 8){
            symbolScaler.scaler = 3000;
        }
        if(currentZoom === 9){
            symbolScaler.scaler = 1000;
        }
        if(currentZoom === 10){
            symbolScaler.scaler = 500;
        }
        if(currentZoom === 11){
            symbolScaler.scaler = 250;
        }
        if(currentZoom >= 12){
            symbolScaler.scaler = 100;
        }
        map.removeLayer(allEarthquakeFeatures)
        renderEqFeatures();
    });
}
// ADD FUNCTION TO SELECT NEAREST EARTHQUAKES TO FAULT CLICKED ON USING A HARDCODED RADIUS? SHOULD THIS BE HERE OR IN THE FAULT FUNCTION EVENT LISTENER? 
function faultEqSelector(){
    // click on a fault, calc a buffer of dist=x
    // select eqs that intersect that buffer of that fault
    // click off and it clears the selection
}

////////////////////////////////////// Call all the functions to 'run' the map //////////////////////////////////////////////

function start() {
    initializeMap()
    getEarthquakeData()  
    handleEarthquakeFilter()
    setFaultFeatures()
    zoomHandler()
  }
  
  $(start);