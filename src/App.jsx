import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';

const CITIES = [
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'London', lat: 51.5074, lng: -0.1278 }
];

const REGION_COLORS = { North: '#0070f3', Midlands: '#f5a623', South: '#e00' };

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const handleAnswer = (region) => {
    const city = CITIES[currentIndex];
    setAnswers([...answers, { ...city, region }]);
    setCurrentIndex(currentIndex + 1);
  };

  const isComplete = currentIndex >= CITIES.length;

  let mapData = null;
  if (isComplete) {
    const points = turf.featureCollection(
      answers.map(ans => turf.point([ans.lng, ans.lat], { region: ans.region }))
    );
    const bbox = [-6.0, 49.9, 2.0, 55.8]; 
    mapData = turf.voronoi(points, { bbox });

    turf.featureEach(mapData, (currentFeature, featureIndex) => {
      if (currentFeature) {
        currentFeature.properties.region = answers[featureIndex].region;
      }
    });
  }

  const styles = {
    container: { fontFamily: 'Inter, sans-serif', maxWidth: '600px', margin: '50px auto', textAlign: 'center', color: '#111' },
    button: { padding: '12px 24px', margin: '8px', border: '1px solid #eaeaea', borderRadius: '5px', background: '#fff', cursor: 'pointer', fontSize: '16px' },
    mapWrapper: { height: '500px', width: '100%', marginTop: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eaeaea' }
  };

  return (
    <div style={styles.container}>
      <h1>Where is it?</h1>
      {!isComplete ? (
        <div>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{CITIES[currentIndex].name}</p>
          <button style={styles.button} onClick={() => handleAnswer('North')}>North</button>
          <button style={styles.button} onClick={() => handleAnswer('Midlands')}>Midlands</button>
          <button style={styles.button} onClick={() => handleAnswer('South')}>South</button>
        </div>
      ) : (
        <div>
          <h2>Your Map of England</h2>
          <div style={styles.mapWrapper}>
            <MapContainer center={[52.5, -1.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {mapData && <GeoJSON 
                data={mapData} 
                style={(feature) => ({ color: REGION_COLORS[feature.properties.region], weight: 2, fillOpacity: 0.4 })} 
              />}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
