import Head from "next/head";
import Spinner from "../Spinner/Spinner";
import Script from "next/script";
import dynamic from 'next/dynamic'
import React, { useEffect, useState, useRef } from "react";
//import * as L from "leaflet";
//import { SimpleMapScreenshoter } from "leaflet-simple-map-screenshoter";
import * as tf from '@tensorflow/tfjs';
import * as toggleStrategy from '../../helpers/toggleStrategy.js';
import { map } from "leaflet";
import { fetchPlace } from './fetchPlace';
import { SearchOutline } from 'react-ionicons'



const API_URI = process.env.NEXT_PUBLIC_API_URI;


async function load_model() {
  const model = await tf.loadLayersModel("models/model.json");
  return model;
}


export default function Map({ serverSwitch, segmentationSwitch }) {
  const [screenshotter, setScreenshotter] = useState(null);
  const [socket, setSocket] = useState(null);
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [city, setCity] = useState([]);
  const [autocompleteCities, setAutocompleteCities] = useState([]);
  const [autocompleteErr, setAutocompleteErr] = useState([]);
  let map = null;

  const maskImageOpacityRef = useRef();


  const access_key = '3f7755a8072884f2e602f8b9086e2038';

  const onButtonClick = () => {
    setIsLoading(true);
    screenshotter?.takeScreen('image', {})
      .then(image => {
        if (model == null) { return; }

        let i = new Image();

        i.onload = async function () {
          await toggleStrategy.toggleStrategy(model, i, 'prediction', segmentationSwitch, serverSwitch, socket, setIsLoading);
        };
        i.src = image;
      }).catch(e => {
        console.error(e.toString());
        setIsLoading(false);
      })
  };


  useEffect(async () => {
    tf.setBackend('webgl');
    const { io } = await import("socket.io-client");
    const L = await import('leaflet');
    const { SimpleMapScreenshoter } = await import('leaflet-simple-map-screenshoter');



    const mysocket = io(API_URI);

    mysocket.on('connect', function () {
      console.log('Se ha extablecido la conexión con el servidor');
    })

    mysocket.on("disconnect", (razón) => {
      console.log('Se ha cortado la conexión con el servidor', razón);
    });

    setSocket(mysocket);



    map = L.map("map").setView([40.419215, -3.693358], 13);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      minZoom: 17,
      subdomains: []
    }).addTo(map);

    const cur_screenshoter = new SimpleMapScreenshoter({ hidden: true });
    setScreenshotter(cur_screenshoter);
    /* 
    Este funciona bien
    https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}

    Poco zoom
    https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}

    http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}   ->    ['mt0', 'mt1', 'mt2', 'mt3']
    */

    cur_screenshoter.addTo(map);

    load_model().then(model => {
      setModel(model);
    });

  }, []);



  const handleCityChange = async (e) => {
    setCity(e.target.value);
    if (!city) return;

    const res = await fetchPlace(city);
    !autocompleteCities.includes(e.target.value) &&
      res.features &&
      setAutocompleteCities(res.features.map((place) => place.place_name));
    res.error ? setAutocompleteErr(res.error) : setAutocompleteErr("");
  };

  const handleClick = () => {

    const query = document.getElementById("city").value;
    var hasNumber = /\d/;
    if (hasNumber.test(query)) {
      const coords = query.split(",");

      const lat = coords[0];
      const lon = coords[1];


      map.setView([lat, lon], 13);
    }
    else {
      fetch('http://api.positionstack.com/v1/forward?access_key=' + access_key + '&query=' + query)
        .then(response => response.json())
        .then(data => {

          const lat = data.data[0].latitude;
          const lon = data.data[0].longitude;


          map.setView([lat, lon], 13);

        });

    }
  }

  return (
    <div>
      <Head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.4.0/dist/leaflet.css"
          integrity="sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA=="
          crossOrigin=""
        />
        <title>Proyecto Reconocimiento</title>
      </Head>
      <main>
        <div className="main-container-map">
          <div>
            <div className="places-autocomplete">
              <div className="shadow-container custom-search-container">
                <input
                  placeholder="Escribe aquí para buscar"
                  list="places"
                  type="text"
                  id="city"
                  className="custom-button"
                  onChange={handleCityChange}
                />
              </div>
              <datalist id="places">
                {autocompleteCities.map((city, i) => (
                  <option key={i}>{city}</option>
                ))}
              </datalist>
              <button
                className="custom-button" id="search-button" onClick={handleClick}
              ><SearchOutline />
              </button>
            </div>
            <div className="map-container">
              <div className="map" id="map" />
            </div>
          </div>

          {isLoading ? <Spinner className="map-spinner" /> :
            <span className="map-screenshot-button custom-button" id="button" onClick={onButtonClick}>Procesar imagen →</span>}
          <div className="map-container">


            {segmentationSwitch === false && (<>
              <div className="map-slider-container">
                <input type="range" min="0" max="1" className="custom-slider" step="0.1"
                  onInput={(e) => {
                    maskImageOpacityRef && (maskImageOpacityRef.current.style.opacity = e.target.value);
                  }} />
              </div>
              <canvas id='mask-image' className="map" />

            </>)}

            <canvas ref={maskImageOpacityRef} id='prediction' className="map"/>
          </div>
        </div>
      </main>
    </div>);
}