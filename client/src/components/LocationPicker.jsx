import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [22.9734, 78.6569];
const CAMPUS_ICON = L.divIcon({ className: 'civic-map-marker', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] });

function ClickToSelect({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/** Small OpenStreetMap picker used to capture the university campus pin. */
export default function LocationPicker({ latitude, longitude, onChange }) {
  const selected = latitude !== '' && longitude !== ''
    ? [Number(latitude), Number(longitude)]
    : null;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
      <MapContainer
        center={selected || INDIA_CENTER}
        zoom={selected ? 13 : 4}
        scrollWheelZoom={false}
        style={{ height: 260, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToSelect onSelect={onChange} />
        {selected && <Marker position={selected} icon={CAMPUS_ICON} />}
      </MapContainer>
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-white)', borderTop: '1px solid var(--color-gray-200)', fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
        <span>📍 Click anywhere on the map to set location</span>
        {selected && (
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            {selected[0].toFixed(4)}, {selected[1].toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
