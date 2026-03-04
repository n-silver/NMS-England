import React, { useState, useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { geoMercator, geoPath } from 'd3-geo';

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
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch('/uk-ireland-boundaries.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Missing GeoJSON data", err));
  }, []);

  const handleAnswer = (region) => {
    const city = CITIES[currentIndex];
    setAnswers([...answers, { ...city, region }]);
    setCurrentIndex(currentIndex + 1);
  };

  const isComplete = currentIndex >= CITIES.length;

  const mapShapes = useMemo(() => {
    if (!isComplete || !geoData) return null;

    const englandFeature = geoData.features.find(f => f.properties.name === 'England');
    const otherFeatures = geoData.features.filter(f => f.properties.name !== 'England');

    const points = turf.featureCollection(
      answers.map(ans => turf.point([ans.lng, ans.lat], { region: ans.region }))
    );
    const voronoiPolygons = turf.voronoi(points, { bbox: [-11.0, 49.0, 3.0, 61.0] });

    const clippedRegions = [];
    turf.featureEach(voronoiPolygons, (currentFeature) => {
      if (currentFeature && englandFeature) {
        // Crop the polygon to the English border
        const intersection = turf.intersect(currentFeature, englandFeature);
        
        if (intersection) {
          // Force correct D3-geo coordinate winding order to prevent inside-out rendering
          turf.rewind(intersection, { reverse: true, mutate: true });
          
          // Locate which specific city point lives inside this unclipped polygon
          const matchingPoint = answers.find(ans => 
            turf.booleanPointInPolygon(turf.point([ans.lng, ans.lat]), currentFeature)
          );
          
          if (matchingPoint) {
            intersection.properties = { region: matchingPoint.region };
            clippedRegions.push(intersection);
          }
        }
      }
    });

    return { otherFeatures, clippedRegions };
  }, [isComplete, answers, geoData]);

  const projection = geoMercator().center([-4.0, 54.5]).scale(2800).translate([300, 400]);
  const pathGenerator = geoPath().projection(projection);

  const styles = {
    container: { fontFamily: 'Inter, sans-serif', maxWidth: '600px', margin: '50px auto', textAlign: 'center', color: '#111' },
    button: { padding: '12px 24px', margin: '8px', border: '1px solid #eaeaea', borderRadius: '5px', background: '#fff', cursor: 'pointer', fontSize: '16px' },
    svgWrapper: { width: '100%', maxWidth: '600px', margin: '20px auto', border: '1px solid #eaeaea', borderRadius: '8px', background: '#fafafa' }
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
          {!geoData ? (
            <p>Loading map data...</p>
          ) : (
            <div style={styles.svgWrapper}>
              <svg viewBox="0 0 600 800" width="100%" height="auto">
                {mapShapes?.otherFeatures.map((feature, i) => (
                  <path 
                    key={`other-${i}`} 
                    d={pathGenerator(feature)} 
                    fill="#eaeaea" 
                    stroke="#fff" 
                    strokeWidth="1" 
                  />
                ))}
                {mapShapes?.clippedRegions.map((feature, i) => (
                  <path 
                    key={`region-${i}`} 
                    d={pathGenerator(feature)} 
                    fill={REGION_COLORS[feature.properties.region]} 
                    stroke="#fff" 
                    strokeWidth="1" 
                    opacity="0.8"
                  />
                ))}
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
