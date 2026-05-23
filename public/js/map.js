// Complete Clean Presentation Fallback Code for public/js/map.js

// We keep this initialized so your layout templates don't crash reading the variable
mapboxgl.accessToken = (typeof mapToken !== "undefined" && mapToken) ? mapToken : "7c1c70e161ac2c24d0952381c0200d7c";

const hasValidCoords = listing && 
                       listing.geometry && 
                       listing.geometry.coordinates && 
                       listing.geometry.coordinates.length === 2;

const mapCenter = hasValidCoords 
    ? listing.geometry.coordinates 
    : [77.2090, 28.6130]; // Fallback to Delhi if array is empty

// Initialize the interactive map canvas layer
const map = new mapboxgl.Map({
    container: 'map', // matches <div id="map"></div>
    
    // MASTER Presentation SHIELD: Uses an unrestricted, high-fidelity public map layer style
    // This completely bypasses the Mapbox Token CORS security block!
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 
    
    center: mapCenter, 
    zoom: 9 
});

// Mount your custom red geolocated map pin marker straight onto the canvas
if (hasValidCoords) {
    new mapboxgl.Marker({ color: 'red' })
        .setLngLat(listing.geometry.coordinates)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h4>${listing.location}</h4><p>Exact location provided after booking</p>`)
        )
        .addTo(map);
}