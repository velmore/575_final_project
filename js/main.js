/* tory elmore 
   geography 575 final project
   Map Tour of Audubon Alaska Project Regions*
   
   Many thanks to James Carney for pointing me in the direction of Jack Dougherty and assisting with the associated code*/

// call initialize function after page ready
$(document).ready(initialize);

//container margins and scroll- credit to Jack Dougherty at DataVizforAll
var imageContainerMargin = 70;  // Margin + padding
// This watches for the scrollable container
var scrollPosition = 0;
$('div#contents').scroll(function() {
    scrollPosition = $(this).scrollTop();
});


// starting point for script
function initialize() {

    // enable bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();

    });

    // show splash screen on page load
    $("#splashModal").modal('show');

    // resize function wraps the main function to allow responsive sizing
    resize(map());

};

// Main script. All functions except "resize" are within map(). This main function returns the map object to allow the
// resize function to work.

function map() {
    // track whether a marker is highlighted via a click
    let lastClickedMarkerLatLon = L.latLng(64,-157); //dummy initial data
    let markerClickStatus = "off";

    // track whether to show polygon boundaries layer in the legend
    let boundaryLayerIs = "off";

    // basemaps
    let bmStreets = L.tileLayer('https://api.mapbox.com/styles/v1/jhcarney/cjk1yuwd6b9mv2sqvu8452gfu/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ', {
        maxZoom: 18,
        minZoom: 3
    });
    let bmSatelliteStreets = L.tileLayer('https://api.mapbox.com/styles/v1/jhcarney/cjk1ywa89015v2sqks2r6ivwj/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ', {
        maxZoom: 18,
        minZoom: 3
    });
    let bmLight = L.tileLayer('https://api.mapbox.com/styles/v1/jhcarney/cjk1yvox82csb2rlk24kxg3o2/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ', {
        maxZoom: 18,
        minZoom: 3
    });

    // basemap group
    let bmGroup = {
        "Streets": bmStreets,
        "Aerial": bmSatelliteStreets,
        "Light Gray": bmLight,
    };

    // declare data layerGroups
    let ibaLG = L.layerGroup();  // points for ibas
    let ibaHighlightLG = L.layerGroup();  // can use to highlight a clicked point
    let boundaryLG = L.layerGroup();  // for national park, preserve, forest, wildlife refuge boundaries

    // map, add one basemap
    var map = map = L.map('map',{
        center: [64, -157],
        zoom: 4,
        layers: [bmLight]
    });

    // pane to be able to control drawing order of layers
    map.createPane('polygonPane');
    map.getPane('polygonPane').style.zIndex = 200;
    map.getPane('polygonPane').style.pointerEvents = 'none';

    // async load xmlhttprequest object of json data type
    $.ajax("data/iba.geojson", {
        dataType: "json",
        success: function(response1){

            // make markers
            ibaLG = createMarkerLayer(response1);

            // create legend
            createLegend(map);

            // Feature search
              // search control
            let search = new L.Control.Search({
                layer: ibaLG,
                propertyName: 'name',
                marker: {
                    circle: {
                        radius: 10,
                        color: '#ffff00',
                        opacity: .85,
                        weight: 6,
                        fillOpacity: 0
                    },
                    icon: false,
                },
                collapsed: true,
                textPlaceholder:'Search IBA Names',
                position: 'topleft',
                hideMarkerOnCollapse: true,
                moveToLocation: function (latlng, title, map) {
                    map.setView(latlng, 10);
                }
            });
              // style search result marker and open its popup
            search.on('search:locationfound', function(e) {
                //e.layer.setStyle({fillColor: '#ff00fb', color: '#df00db'});
                if (e.layer._popup) {
                    let popup = e.layer.getPopup();
                    e.layer.bindPopup(popup, {offset: [0,-16]});
                    e.layer.openPopup();
                }
              // restore original style on popup close
            }).on('search:collapsed', function(e) {
                ibaLG.eachLayer(function(layer) {
                    ibaLG.resetStyle(layer);
                });
            });
            map.addControl(search);

            // add button to reset map position
            L.easyButton({
                states:[
                    {
                        icon: 'fa-sync',
                        title: 'Reset View',
                        onClick: function (btn, map) {
                            $("#btnScrollUp")[0].click();
                            var ctr = [64, -157];
                            map.setView(ctr, 4);
                        }
                    }
                ]
            }).addTo(map);
            
            var myStyle = {
                "color": "black",
                "weight": 0.5,
                "fillColor": "gray",
                "fillOpacity": 0.01
                };

            // cycle through boundaries geojson to get an array for layer control
            jQuery.getJSON("data/Places_Polys.json", function(json){
                L.geoJSON(json, {
                    onEachFeature: addMyData,
                    style: myStyle,
                    pane: 'polygonPane'
                })
            });

            var overlayMaps = {
                "Region Boundaries": boundaryLG
            };

            // function to toggle on/off layer control with custom icon
            setupLayerControl(overlayMaps);

            // force boundaries layer to back
            boundaryLG.eachLayer(function(layer){
               layer.bringToBack();
            });

            ibaLG.eachLayer(function (layer) {
                layer.bringToFront();
            });
        }
    });

    // create legend function
    function createLegend() {

        // container
        let container = L.DomUtil.create('div', 'legend-control-container');





        // make control
        let LegendControl = L.Control.extend({
            options: {
                position: 'bottomleft'
            },
            onAdd: function (map) {
                let icon1 = ["Important Bird Areas"],
                    icon2 = ["National Park, Preserve, Forest, or Wildlife Refuge Boundary"],
                    label1 = ["img/iba.png"],
                    label2 = ["img/boundary.png"];

                // initial add
                container.innerHTML = (" <img src=" + label1[0] + " height='20' width='20'>") + " " + icon1[0] + '<br>';


                // listen for map add/remove layer events
                map.on('overlayadd',function(layer){
                    container.innerHTML = (" <img src=" + label1[0] + " height='20' width='20'>") + " " + icon1[0] +
                        '<br>' + (" <img src=" + label2[0] + " height='20' width='20'>") + " " + icon2[0] + '<br>';
                });

                map.on('overlayremove',function(layer){
                    container.innerHTML = (" <img src=" + label1[0] + " height='20' width='20'>") + " " + icon1[0] + '<br>';
                });

                return container;
            }
        });
        map.addControl(new LegendControl());

    }


    //add states to layer control
    function addMyData(feature, layer){
        boundaryLG.addLayer(layer);
    }

    // function to setup layer control
    function setupLayerControl(overlayMaps) {
        // control as var
        let layerControl = L.control.layers(bmGroup,overlayMaps, {
            position: 'topleft',
            collapsed: false,
        });

        // add custom icon button for layer control that acts as toggle
        L.easyButton({
            states:[
                {
                    stateName: 'closed',
                    icon: 'fa-layer-group',
                    title: 'Layer Control',
                    onClick: function (btn, map) {
                        // add basemap control
                        layerControl.addTo(map);
                        this.state('open');
                    }
                },
                {
                    stateName: 'open',
                    icon: 'fa-layer-group text-primary',
                    title: 'Layer Control',
                    onClick: function (btn, map) {
                        map.removeControl(layerControl);
                        this.state('closed');
                    }
                }
            ]
        }).addTo(map);
    }

    // parent function to make point features
    function createMarkerLayer(data){
        // iterate through all features in json
        return L.geoJson(data, {
            // for each feature, call function
            pointToLayer: function (feature, latlng) {
                return pointToLayer(feature, latlng);
            }
        });
    }

    //story map boilerplate script - credit to Jack Dougherty at DataVizforAll
    //get map data for targeted features
    $.getJSON('data/map.geojson', function(data) {
        var geojson = L.geoJson(data, {
            onEachFeature: function (feature, layer) {
                (function(layer, properties) {
                    // This creates numerical icons to match the ID numbers
                    // OR remove the next 6 lines for default blue Leaflet markers
                    var numericMarker = L.ExtraMarkers.icon({
                        icon: 'fa-number',
                        number: feature.properties['id'],
                        markerColor: 'yellow'
                    });

                    layer.setIcon(numericMarker);

                    // This creates the contents of each chapter from the GeoJSON data. Unwanted items can be removed, and new ones can be added
                    var chapter = $('<p></p>', {
                        text: feature.properties['chapter'],
                        class: 'chapter-header'
                    });


                    var source = $('<a>', {
                        text: feature.properties['source-credit'],
                        href: feature.properties['source-link'],
                        target: "_blank",
                        class: 'source'
                    });

                    var image = $('<img>', {
                        alt: feature.properties['alt'],
                        src: feature.properties['image']
                    });

                    var source = $('<a>', {
                        text: feature.properties['source-credit'],
                        href: feature.properties['source-link'],
                        target: "_blank",
                        class: 'source'
                    });

                    var description = $('<p></p>', {
                        text: feature.properties['description'],
                        class: 'description'
                    });

                    var container = $('<div></div>', {
                        id: 'container' + feature.properties['id'],
                        class: 'image-container'
                    });

                    var imgHolder = $('<div></div>', {
                        class: 'img-holder'
                    });

                    imgHolder.append(image);

                    container.append(chapter).append(imgHolder).append(source).append(description);
                    $('#contents').append(container);


                    var i;
                    var areaTop = -90;
                    var areaBottom = 0;

                    // Calculating total height of blocks above active
                    for (i = 1; i < feature.properties['id']; i++) {
                        areaTop += $('div#container' + i).height() + imageContainerMargin;
                    }

                    areaBottom = areaTop + $('div#container' + feature.properties['id']).height();

                    $('div#contents').scroll(function() {
                        if ($(this).scrollTop() >= areaTop && $(this).scrollTop() < areaBottom) {
                            $('.image-container').removeClass("inFocus").addClass("outFocus");
                            $('div#container' + feature.properties['id']).addClass("inFocus").removeClass("outFocus");
                            map.flyTo([feature.geometry.coordinates[1], feature.geometry.coordinates[0] ], feature.properties['zoom']);
                        }
                    });

                    // Make markers clickable
                    layer.on('click', function() {
                        $("div#contents").animate({scrollTop: areaTop + "px"});
                    });

                    // make popup
                    let storyPopup = "<p>"+feature.properties.alt+"</p>";
                    layer.bindPopup(storyPopup, {
                        closeButton: false,
                        className: 'customPopup1'
                    });

                    // popup listeners
                    layer.on({
                        mouseover: function () {
                            this.openPopup()
                        },
                        mouseout: function () {
                            this.closePopup();
                        }
                    });

                })(layer, feature.properties);
            }
        });

        $('div#container1').addClass("inFocus");
        $('#contents').append("<div class='space-at-the-bottom'><a href='#space-at-the-top' id='btnScrollUp'><i class='fa fa-chevron-up'></i></br><small>Top</small></a></div>");

        //listener for "top" button to reset story map too
        $("#btnScrollUp").click(function(event){
            setTimeout(function () {
                var ctr = [64, -157];
                map.setView(ctr, 4.2);
            },250);
        });

        geojson.addTo(map);
    });


    // marker styling 
    function pointToLayer(feature, latlng) {
        //make a style for markers
        let geojsonMarkerOptions = defaultMarkerOptions();
        // marker
        let marker = L.circleMarker(latlng, geojsonMarkerOptions);

        // make popup
        let popupContent = "<p><b>IBA: </b>"+feature.properties.name+ 
                           "<br><b>Status: </b>" + feature.properties.STATUS+
                           "<br><b>Priority: </b>" + feature.properties.PRIORITY+"</p>";
        marker.bindPopup(popupContent, {
            closeButton: false
        });
        // add listeners for hover popup
        addListeners(marker);
        // return the marker to the caller
        return marker;
    }

    // called on creation of each marker to add listeners to it
    function addListeners (marker){
        // marker options for highlight
        let markerOptions = {
            radius: 6,
            color: "#df00db",
            weight: 11,
            opacity: 1,
            fillColor: "#df00db",
            fillOpacity: 1
        };

        marker.on({
            mouseover: function(){
                this.openPopup()
            },
            mouseout: function(){
                this.closePopup();
            },
            click: function () {
                if (lastClickedMarkerLatLon.equals(marker.getLatLng()) && markerClickStatus == "on") {
                    // same marker clicked, turn off highlight
                    ibaHighlightLG.clearLayers();
                    markerClickStatus = "off";
                } else if (lastClickedMarkerLatLon.equals(marker.getLatLng()) && markerClickStatus == "off") {
                    // same marker clicked back on, turn on highlight
                    ibaHighlightLG.clearLayers();
                    // add new highlight
                    L.circleMarker(marker.getLatLng(),markerOptions).addTo(ibaHighlightLG).bringToBack();
                    markerClickStatus = "on";
                } else {
                    // clear and add new
                    ibaHighlightLG.clearLayers();
                    // add new highlight
                    L.circleMarker(marker.getLatLng(),markerOptions).addTo(ibaHighlightLG).bringToBack();
                    markerClickStatus = "on";
                }
                // update tracking var
                lastClickedMarkerLatLon = marker.getLatLng();
            }
        });
    }

    // for circle markers
    function defaultMarkerOptions() {
        let markerOptions = {
            radius: 6,
            stroke: true,
            color: "#ffffff",
            weight: 1,
            opacity: .5,
            fill: true,
            fillColor: "#0AA8E3",
            fillOpacity: .5
        };

        return markerOptions;
    }

    // return map object
    return map;
}

function resize(map) {
    // window resize listener
    $(window).on("resize", function () {

        // make map height responsive to available space
        //   get heights
        let navbarHeight = $("#header1").outerHeight();
        let footerHeight = $("#footer").outerHeight();
        let windowHeight = $(window).outerHeight();
        let storyMapHeaderHeight = $("#storyMapTitleBlock").outerHeight();

        // set new map height
        let newMapHeight = windowHeight - navbarHeight - footerHeight;
        $("#map").css({"height": newMapHeight});

        // set new storymap panel height
        let newStoryMapHeight = windowHeight - navbarHeight - footerHeight - storyMapHeaderHeight -15;
        $("#story").css({"height": newStoryMapHeight});

        // adjust body padding
        $('body').css({"padding-top": navbarHeight});

        // shrink title and footer font size on mobile devices
        let result = $('#device-size-detector').find('div:visible').first().attr('id');
        if (result === "xs") {
            $("#appTitle").css({"font-size": "0.75em"});
            $("#footerText").css({"font-size": "0.75em"});
        } else {
            $("#appTitle").css({"font-size": "1em"});
            $("#footerText").css({"font-size": "1em"});
        }

        // force Leaflet redraw
        map.invalidateSize();
    }).trigger("resize");
}