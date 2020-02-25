// Global variables for map features
let data = [];
let map = [];
let earthquakesGeoJSON = [];

// https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
// API - Maybe I should allow users to select API request parameters and make the API call a global that gets formatted by a function

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Create the Leaflet map
function initializeMap() {
    map = L.map('mapid')
    //Add satellite mosaic basemap
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: US National Park Service',
        maxZoom: 8
    }).addTo(map);
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
        // console.log(json);
        // call render function that houses the below
        earthquakesGeoJSON = L.geoJSON(json, {
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

// Add countries and some interactivity - Maybe remove later and use a basemap with labels?
function setCountryFeatures() {
    const countryFeatures = L.geoJSON(COUNTRIES, {
      style:function(feature){
          return {
              color: '#1e0f24',
              fillOpacity:0, 
              opacity: 0.8,
              weight: 0.5
          }
        },
        onEachFeature: function(feature,layer){
          layer.on('mouseover',function(e) {
              e.target.setStyle({color: '#cc00cc', weight: 1})
          })
          layer.on('mouseout',function(e) {
              e.target.setStyle({color: '#1e0f24', weight: 0.5})
          })  
      }
      })
      .bindPopup(function(layer){
          return `<strong>${layer.feature.properties.name}</strong>`
      }).addTo(map);
  
    map.fitBounds(countryFeatures.getBounds(), {
      padding: [-40,-250]
    });
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

////////////////////////////////////// Call all the functions to 'run' the map //////////////////////////////////////////////

function start() {
    initializeMap()
    // setCountryFeatures()
    getEarthquakeData()
    setFaultFeatures()
  }
  
  $(start);