import React, { useState, useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { geoMercator, geoPath } from 'd3-geo';

// Expanded list of 22 cities spanning the length of England
const CITIES = [
  { name: 'Brighton', lat: 50.8225, lng: -0.1372 },
  { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
  { name: 'Plymouth', lat: 50.3755, lng: -4.1427 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'Oxford', lat: 51.7520, lng: -1.2577 },
  { name: 'Cambridge', lat: 52.2053, lng: 0.1218 },
  { name: 'Norwich', lat: 52.6309, lng: 1.2974 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Leicester', lat: 52.6369, lng: -1.1398 },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581 },
  { name: 'Lincoln', lat: 53.2307, lng: -0.5406 },
  { name: 'Chester', lat: 53.1934, lng: -2.8931 },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'York', lat: 53.9599, lng: -1.0873 },
  { name: 'Hull', lat: 53.7676, lng: -0.3274 },
  { name: 'Middlesbrough', lat: 54.5742, lng: -1.2325 },
  { name: 'Carlisle', lat: 54.8925, lng: -2.9329 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 }
];

const REGION_COLORS = { North: '#0070f3', Midlands: '#f5a623', South: '#e00' };

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // Directly fetch the high-resolution Natural Earth vector map
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_subunits.geojson')
      .then(res => res.json())
      .then(data => {
        // Filter out the rest of the world, keeping only UK & Ireland
        const targetRegions = ['england', 'wales', 'scotland', 'northern ireland', 'ireland', 'republic of ireland'];
        const ukAndIreland = data.features.filter(f => {
          const name = (f.properties.SUBUNIT || f.properties.NAME || '').toLowerCase();
          return targetRegions.includes(name);
        });
        setGeoData({ type: 'FeatureCollection', features: ukAndIreland });
      })
      .catch(err => console.error("Error fetching map boundaries:", err));
  }, []);

  const handleAnswer = (region) => {
    const city = CITIES[currentIndex];
    setAnswers([...answers, { ...city, region }]);
    setCurrentIndex(currentIndex + 1);
  };

  const isComplete = currentIndex >= CITIES.length;

  const mapShapes = useMemo(() => {
    if (!isComplete || !geoData) return null;

    // Separate England (for the colored clipping) from the grey backgrounds
    const englandFeature = geoData.features.find(f => {
      const name = (f.properties.SUBUNIT || f.properties.NAME || '').toLowerCase();
      return name === 'england';
    });
    
    const otherFeatures = geoData.features.filter(f => {
      const name = (f.properties.SUBUNIT || f.properties.NAME || '').toLowerCase();
      return name !== 'england';
    });

    const points = turf.featureCollection(
      answers.map(ans => turf.point([ans.lng, ans.lat], { region: ans.region }))
    );
    
    // Generate the raw Voronoi regions
    const voronoiPolygons = turf.voronoi(points, { bbox: [-11.0, 49.0, 3.0, 61.0] });

    const clippedRegions = [];
    turf.featureEach(voronoiPolygons, (currentFeature) => {
      if (currentFeature && englandFeature) {
        
        // 1. Mathematically clip the Voronoi shape to the English border
        const intersection = turf.intersect(currentFeature, englandFeature);
        
        if (intersection) {
          // 2. Force D3-geo right-hand rule to prevent inside-out full-screen rendering
          turf.rewind(intersection, { reverse: true, mutate: true });
          
          // 3. Attach the correct color based on which city is inside this shape
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

  // Centers the projection specifically on the UK coordinates
  const projection = geoMercator().center([-4.0, 54.5]).scale(2800).translate([300, 400]);
  const pathGenerator = geoPath().projection(projection);

  const styles = {
    container: { fontFamily: 'Inter, sans-serif', maxWidth: '600px', margin: '50px auto', textAlign: 'center', color: '#111' },
    button: { padding: '12px 24px', margin: '8px', border: '1px solid #eaeaea', borderRadius: '5px', background: '#fff', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' },
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
            <p>Loading precise map boundaries...</p>
          ) : (
            <div style={styles.svgWrapper}>
              <svg viewBox="0 0 600 800" width="100%" height="auto">
                {/* 1. Draw Wales, Scotland, and Ireland in pale grey */}
                {mapShapes?.otherFeatures.map((feature, i) => (
                  <path 
                    key={`other-${i}`} 
                    d={pathGenerator(feature)} 
                    fill="#e0e0e0" 
                    stroke="#ffffff" 
                    strokeWidth="0.5" 
                  />
                ))}
                
                {/* 2. Draw the chaotic, user-defined regions locked into England */}
                {mapShapes?.clippedRegions.map((feature, i) => (
                  <path 
                    key={`region-${i}`} 
                    d={pathGenerator(feature)} 
                    fill={REGION_COLORS[feature.properties.region]} 
                    stroke="#ffffff" 
                    strokeWidth="1" 
                    opacity="0.9"
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
