// Complete Clean Code for public/js/map.js

// Hardcoded presentation backup token shield
const tokenToUse = (typeof mapToken !== "undefined" && mapToken) ? mapToken : "7c1c70e161ac2c24d0952381c0200d7c";

mapboxgl.accessToken = tokenToUse;

// Verify coordinates exist and follow GeoJSON standards [longitude, latitude]
const hasValidCoords = listing && 
                       listing.geometry && 
                       listing.geometry.coordinates && 
                       listing.geometry.coordinates.length === 2;

const mapCenter = hasValidCoords 
    ? listing.geometry.coordinates 
    : [77.2090, 28.6130]; // Smooth fallback to Delhi center if unpopulated

// Initialize the interactive Mapbox layer canvas
const map = new mapboxgl.Map({
    container: 'map', // matches <div id="map"></div>
    style: 'mapbox://styles/mapbox/streets-v12', // official style map layer
    center: mapCenter, 
    zoom: 9 // comfortable neighborhood zoom distance
});

// Drop a clean red marker pin onto the exact location map coordinates
if (hasValidCoords) {
    new mapboxgl.Marker({ color: 'red' })
        .setLngLat(listing.geometry.coordinates)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h4>${listing.location}</h4><p>Exact location will be provided after booking</p>`)
        )
        .addTo(map);
}