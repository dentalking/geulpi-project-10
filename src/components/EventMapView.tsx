'use client';

import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { Calendar, Clock, MapPin, Navigation } from 'lucide-react';
import type { CalendarEvent } from '@/types';

const libraries: any = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780 // Seoul
};

interface EventMapViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  locale?: string;
}

export default function EventMapView({ events, onEventClick, locale = 'ko' }: EventMapViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markers, setMarkers] = useState<Array<{ event: CalendarEvent; position: { lat: number; lng: number } }>>([]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    // Extract events with location coordinates
    const eventsWithLocation = events.filter(event => {
      // Check if event has placeDetails with coordinates
      return event.placeDetails?.location || event.location;
    });

    const newMarkers = eventsWithLocation.map(event => {
      if (event.placeDetails?.location) {
        return {
          event,
          position: event.placeDetails.location
        };
      }
      // Fallback: try to geocode the location string
      // For now, just return null if no coordinates
      return null;
    }).filter(Boolean) as Array<{ event: CalendarEvent; position: { lat: number; lng: number } }>;

    setMarkers(newMarkers);

    // Center map on first marker if available
    if (newMarkers.length > 0) {
      setMapCenter(newMarkers[0].position);
    }
  }, [events]);

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-red-500">
        지도를 불러올 수 없습니다
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="animate-pulse text-gray-400">지도 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={13}
        options={{
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#242f3e" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ lightness: -80 }]
            },
            {
              featureType: "administrative",
              elementType: "labels.text.fill",
              stylers: [{ color: "#746855" }]
            },
            {
              featureType: "poi",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#38414e" }]
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#212a37" }]
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#9ca5b3" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#17263c" }]
            }
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            onClick={() => setSelectedEvent(marker.event)}
            icon={{
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#8B5CF6" stroke="white" stroke-width="2"/>
                  <circle cx="20" cy="20" r="8" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            }}
          />
        ))}

        {selectedEvent && selectedEvent.placeDetails?.location && (
          <InfoWindow
            position={selectedEvent.placeDetails.location}
            onCloseClick={() => setSelectedEvent(null)}
          >
            <div className="p-3 min-w-[200px]">
              <h3 className="font-semibold text-gray-900 mb-2">
                {selectedEvent.summary || '제목 없음'}
              </h3>
              
              {selectedEvent.start?.dateTime && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDateTime(selectedEvent.start.dateTime)}</span>
                </div>
              )}
              
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {onEventClick && (
                <button
                  onClick={() => onEventClick(selectedEvent)}
                  className="mt-2 px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  상세보기
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Event List Sidebar */}
      <div className="absolute top-4 left-4 bg-gray-900/95 backdrop-blur rounded-xl p-4 max-w-xs max-h-96 overflow-y-auto">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          {locale === 'ko' ? '장소가 있는 일정' : 'Events with Location'}
        </h3>
        
        {markers.length > 0 ? (
          <div className="space-y-2">
            {markers.map((marker, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedEvent(marker.event);
                  setMapCenter(marker.position);
                }}
                className="w-full text-left p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="text-sm text-white font-medium">
                  {marker.event.summary || '제목 없음'}
                </div>
                {marker.event.start?.dateTime && (
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDateTime(marker.event.start.dateTime)}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            {locale === 'ko' ? '장소가 설정된 일정이 없습니다' : 'No events with location'}
          </p>
        )}
      </div>

      {/* Current Location Button */}
      <button
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setMapCenter({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              },
              (error) => {
                console.error('Error getting location:', error);
              }
            );
          }
        }}
        className="absolute bottom-4 right-4 p-3 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-colors"
        title={locale === 'ko' ? '현재 위치로 이동' : 'Go to current location'}
      >
        <Navigation className="w-5 h-5" />
      </button>
    </div>
  );
}