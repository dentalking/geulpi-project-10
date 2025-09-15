'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Clock, Star, DollarSign, Navigation, Users } from 'lucide-react';
import { useLoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';

const libraries: Libraries = ['places'];

interface PlaceSearchInputProps {
  value?: string;
  onChange?: (place: google.maps.places.PlaceResult | null) => void;
  onSelectPlace?: (place: {
    name: string;
    address: string;
    placeId: string;
    location: { lat: number; lng: number };
    details?: any;
  }) => void;
  placeholder?: string;
  className?: string;
  showDetails?: boolean;
  friendLocations?: Array<{ userId: string; location: { lat: number; lng: number } }>;
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  value = '',
  onChange,
  onSelectPlace,
  placeholder = '장소를 검색하세요...',
  className = '',
  showDetails = true,
  friendLocations = [],
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [showMidpointSuggestion, setShowMidpointSuggestion] = useState(false);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    searchBoxRef.current = ref;
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        setSelectedPlace(place);
        setInputValue(place.formatted_address || place.name || '');
        
        if (onChange) {
          onChange(place);
        }
        
        if (onSelectPlace && place.geometry?.location) {
          onSelectPlace({
            name: place.name || '',
            address: place.formatted_address || '',
            placeId: place.place_id || '',
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            details: {
              rating: place.rating,
              price_level: place.price_level,
              opening_hours: place.opening_hours,
              website: place.website,
              phone: place.formatted_phone_number,
              photos: place.photos?.map(photo => photo.getUrl()),
            },
          });
        }
      }
    }
  }, [onChange, onSelectPlace]);

  const findMidpointPlaces = async () => {
    if (friendLocations.length === 0) return;

    try {
      const response = await fetch('/api/maps/midpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userLocations: friendLocations }),
      });

      if (response.ok) {
        const data = await response.json();
        // 중간 지점 추천 장소들을 표시
        console.log('Midpoint suggestions:', data);
        setShowMidpointSuggestion(true);
      }
    } catch (error) {
      console.error('Error finding midpoint:', error);
    }
  };

  if (loadError) {
    return <div className="text-red-500">지도를 불러올 수 없습니다.</div>;
  }

  if (!isLoaded) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded-lg" />;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <StandaloneSearchBox onLoad={onLoad} onPlacesChanged={onPlacesChanged}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </StandaloneSearchBox>

        {friendLocations.length > 0 && (
          <button
            onClick={findMidpointPlaces}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600"
            title="친구들과의 중간 지점 찾기"
          >
            <Users className="h-5 w-5" />
          </button>
        )}
      </div>

      {showDetails && selectedPlace && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-lg">{selectedPlace.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedPlace.formatted_address}
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            {selectedPlace.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">{selectedPlace.rating}</span>
              </div>
            )}

            {selectedPlace.price_level && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {'$'.repeat(selectedPlace.price_level)}
                </span>
              </div>
            )}

            {selectedPlace.opening_hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  {selectedPlace.opening_hours.isOpen() ? '영업 중' : '영업 종료'}
                </span>
              </div>
            )}
          </div>

          {selectedPlace.photos && selectedPlace.photos.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {selectedPlace.photos.slice(0, 3).map((photo, index) => (
                <img
                  key={index}
                  src={photo.getUrl({ maxWidth: 200 })}
                  alt={`${selectedPlace.name} 사진 ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          {selectedPlace.website && (
            <a
              href={selectedPlace.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm mt-2"
            >
              웹사이트 방문
              <Navigation className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {showMidpointSuggestion && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            🎯 중간 지점 추천 장소
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            친구들과 만나기 좋은 중간 지점의 장소들을 찾고 있습니다...
          </p>
        </div>
      )}
    </div>
  );
};

export default PlaceSearchInput;