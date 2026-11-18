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
    <div>
      <MapContainer
        center={selected || INDIA_CENTER}
        zoom={selected ? 13 : 4}
        scrollWheelZoom={false}
        style={{ height: 240, width: '100%', borderRadius: 16, overflow: 'hidden' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToSelect onSelect={onChange} />
        {selected && <Marker position={selected} icon={CAMPUS_ICON} />}
      </MapContainer>
      <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', margin: '8px 0 0' }}>
        Click the map at your university's campus to place its pin.
      </p>
    </div>
  );
}
