// Global variables for map features
let data = [];
let map = [];
let allEarthquakeFeatures = [];
let filteredFeatures = [];

// https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
// API - Maybe I should allow users to select API request parameters and make the API call a global that gets formatted by a function

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

//   Call the USGS API to get earthquake data
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
    // call render function that houses the below
    allEarthquakeFeatures = L.geoJSON(json, {
        style: function(feature) {
            return {
                fillOpacity:0.1,
                fillColor: '#f56511',
                color: '#fa2605',
                opacity: 0.4
            };
        },
        // Style - circle size proportion to magnitude arbitrary number but maybe something better? 
        pointToLayer: function(geoJsonPoint,latlng){
            return L.circle(latlng, 50000*(geoJsonPoint.properties.mag));
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
          layer.on('mouseover',function(e) {
              e.target.setStyle({color: '#10b53c'})
          })
          layer.on('mouseout',function(e) {
              e.target.setStyle({color: '#181a18'})
          })  
      }
    }).bindPopup(function(layer){
        console.log(layer.feature.properties)
        return `<strong>Fault name</strong>:  ${layer.feature.properties.catalog_name}<br><strong>Slip type</strong>:  ${layer.feature.properties.slip_type}`;
    }).addTo(map);
}

function clearMapEvents() {
    map.removeLayer(allEarthquakeFeatures);
    map.removeLayer(filteredFeatures);
  }

function handleEarthquakeFilter(){
    $('#query').on('change', function(e){
        e.preventDefault();
        // clear the earthquakes
        clearMapEvents()

        // Get the magnitude value from the 'change' event
        let magnitude = $('#magnitude').val();

        console.log(magnitude.split("_"));
        let searchCriteria = magnitude.split("_");
        let bottomRange = 0;
        let topRange = 10;
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

        console.log(`here are the ranges: ${bottomRange} and ${topRange}`)
        // re-render the earthquake data with the filter applied
        filteredFeatures = L.geoJSON(data, {
            filter: function(feature, layer) {
                // check to see if the feature has a magnitude in range - if true, the feature will render to the map
                // console.log(feature.properties.mag)
                if(feature.properties.mag>=5){
                    console.log(feature.properties.mag)
                    console.log(Number(feature.properties.mag) > Number(bottomRange) && Number(feature.properties.mag) <= Number(topRange) )
                }
                
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
            // Style - circle size proportion to magnitude arbitrary number but maybe something better? 
            pointToLayer: function(geoJsonPoint,latlng){
                // ADD LOGIC FOR ZOOM SCALE VIEWING HERE? ASK PANOS!!!
                // SIMPLE CONDITIONAL BEFORE RETURN
                return L.circle(latlng, 50000*(geoJsonPoint.properties.mag));
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
            }).addTo(map);
    })
}

// ADD FUNCTION TO SELECT NEAREST EARTHQUAKES TO FAULT CLICKED ON GIVENT RADIUS
// click on a fault, calc a buffer of dist=x
// select eqs that intersect that buffer of that fault
// click off and it clears the selection

////////////////////////////////////// Call all the functions to 'run' the map //////////////////////////////////////////////

function start() {
    initializeMap()
    setFaultFeatures()
    getEarthquakeData()    
    handleEarthquakeFilter()
  }
  
  $(start);