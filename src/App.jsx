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

  // Load the geographic boundaries on mount
  useEffect(() => {
    // Note: You will need to host this JSON file in your /public folder
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

  // Calculate Map Data using useMemo so it only runs once upon completion
  const mapShapes = useMemo(() => {
    if (!isComplete || !geoData) return null;

    // 1. Separate England from the rest of the landmasses
    const englandFeature = geoData.features.find(f => f.properties.name === 'England');
    const otherFeatures = geoData.features.filter(f => f.properties.name !== 'England');

    // 2. Generate chaotic Voronoi polygons
    const points = turf.featureCollection(
      answers.map(ans => turf.point([ans.lng, ans.lat], { region: ans.region }))
    );
    // Expand bounding box slightly beyond the UK
    const voronoiPolygons = turf.voronoi(points, { bbox: [-11.0, 49.0, 3.0, 61.0] });

    // 3. Clip the Voronoi polygons exactly to the English coastline/border
    const clippedRegions = [];
    turf.featureEach(voronoiPolygons, (currentFeature, featureIndex) => {
      if (currentFeature && englandFeature) {
        // Intersect mathematically crops the polygon
const intersection = turf.intersect(currentFeature, englandFeature);        if (intersection) {
          intersection.properties = { region: answers[featureIndex].region };
          clippedRegions.push(intersection);
        }
      }
    });

    return { otherFeatures, clippedRegions };
  }, [isComplete, answers, geoData]);

  // Setup D3 Projection for the SVG map
  // Centers on the UK and scales it to fit a 600x800 canvas
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
                {/* Draw Wales, Scotland, Ireland in grey */}
                {mapShapes?.otherFeatures.map((feature, i) => (
                  <path 
                    key={`other-${i}`} 
                    d={pathGenerator(feature)} 
                    fill="#eaeaea" 
                    stroke="#fff" 
                    strokeWidth="1" 
                  />
                ))}
                
                {/* Draw the specific clipped regions of England */}
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
