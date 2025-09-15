'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Users, Clock, Navigation, Calendar, ChevronRight } from 'lucide-react';
import PlaceSearchInput from './PlaceSearchInput';
import { googleMapsService } from '@/services/maps/GoogleMapsService';

interface Friend {
  id: string;
  name: string;
  email: string;
  location?: { lat: number; lng: number };
  address?: string;
}

interface MeetingSchedulerProps {
  friends?: Friend[];
  onSchedule?: (data: any) => void;
  locale?: string;
}

export default function FriendMeetingScheduler({ 
  friends = [], 
  onSchedule,
  locale = 'ko' 
}: MeetingSchedulerProps) {
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('19:00');
  const [placeType, setPlaceType] = useState('restaurant');
  const [midpointPlaces, setMidpointPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [travelTimes, setTravelTimes] = useState<Map<string, any>>(new Map());

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Seoul if location access denied
          setUserLocation({ lat: 37.5665, lng: 126.9780 });
        }
      );
    }
  }, []);

  const findMidpointPlaces = async () => {
    if (selectedFriends.length === 0 || !userLocation) {
      alert(locale === 'ko' ? '친구를 선택하고 위치를 설정해주세요' : 'Please select friends and set location');
      return;
    }

    setIsLoading(true);
    
    const userLocations = [
      { userId: 'me', location: userLocation },
      ...selectedFriends.map(friend => ({
        userId: friend.id,
        location: friend.location || { lat: 37.5665, lng: 126.9780 }
      }))
    ];

    try {
      const response = await fetch('/api/maps/midpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userLocations, 
          placeType 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMidpointPlaces(data.nearbyPlaces || []);
        
        // Convert travel times object to Map
        const timesMap = new Map();
        for (const [key, value] of Object.entries(data.travelTimes || {})) {
          timesMap.set(key, value);
        }
        setTravelTimes(timesMap);
      }
    } catch (error) {
      console.error('Error finding midpoint:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleMeeting = () => {
    if (!selectedPlace || !meetingDate || !meetingTime) {
      alert(locale === 'ko' ? '모든 정보를 입력해주세요' : 'Please fill in all information');
      return;
    }

    const eventData = {
      title: `${selectedFriends.map(f => f.name).join(', ')}${locale === 'ko' ? '와의 모임' : ' Meeting'}`,
      date: meetingDate,
      time: meetingTime,
      location: selectedPlace.name,
      address: selectedPlace.formatted_address,
      placeDetails: {
        ...selectedPlace,
        travelTimes: Array.from(travelTimes.entries())
      },
      attendees: selectedFriends.map(f => f.email),
      description: `${locale === 'ko' ? '중간 지점 모임' : 'Midpoint meeting'} - ${selectedPlace.name}`
    };

    if (onSchedule) {
      onSchedule(eventData);
    }
  };

  const formatTravelTime = (travelTime: any) => {
    if (!travelTime) return '계산 중...';
    return `${travelTime.duration.text} (${travelTime.distance.text})`;
  };

  return (
    <div className="space-y-6 p-4 bg-gray-900 rounded-xl">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">
          {locale === 'ko' ? '친구와의 중간 지점 모임' : 'Midpoint Meeting with Friends'}
        </h2>
      </div>

      {/* Friend Selection */}
      <div className="space-y-3">
        <h3 className="text-sm text-gray-400">
          {locale === 'ko' ? '참석자 선택' : 'Select Attendees'}
        </h3>
        
        <div className="space-y-2">
          {/* Mock friends for demo - in real app, fetch from contacts */}
          {[
            { id: '1', name: '김철수', email: 'chulsoo@example.com', address: '강남역' },
            { id: '2', name: '이영희', email: 'younghee@example.com', address: '홍대입구역' },
            { id: '3', name: '박민수', email: 'minsoo@example.com', address: '신촌역' }
          ].map(friend => (
            <label
              key={friend.id}
              className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedFriends.some(f => f.id === friend.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFriends([...selectedFriends, friend as Friend]);
                  } else {
                    setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
                  }
                }}
                className="w-4 h-4 text-purple-500 rounded"
              />
              <div className="flex-1">
                <div className="text-white">{friend.name}</div>
                <div className="text-xs text-gray-400">{friend.address}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Date & Time Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            {locale === 'ko' ? '날짜' : 'Date'}
          </label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            {locale === 'ko' ? '시간' : 'Time'}
          </label>
          <input
            type="time"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Place Type Selection */}
      <div>
        <label className="text-sm text-gray-400 block mb-2">
          {locale === 'ko' ? '장소 유형' : 'Place Type'}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'restaurant', label: locale === 'ko' ? '음식점' : 'Restaurant' },
            { value: 'cafe', label: locale === 'ko' ? '카페' : 'Cafe' },
            { value: 'bar', label: locale === 'ko' ? '술집' : 'Bar' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setPlaceType(type.value)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                placeType === type.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Find Midpoint Button */}
      <button
        onClick={findMidpointPlaces}
        disabled={isLoading || selectedFriends.length === 0}
        className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {locale === 'ko' ? '검색 중...' : 'Searching...'}
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5" />
            {locale === 'ko' ? '중간 지점 찾기' : 'Find Midpoint'}
          </>
        )}
      </button>

      {/* Midpoint Results */}
      {midpointPlaces.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-gray-400">
            {locale === 'ko' ? '추천 장소' : 'Recommended Places'}
          </h3>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {midpointPlaces.map((place, index) => (
              <button
                key={index}
                onClick={() => setSelectedPlace(place)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedPlace?.place_id === place.place_id
                    ? 'bg-purple-500/20 border border-purple-500'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{place.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {place.formatted_address}
                    </p>
                    
                    {/* Show rating and price level */}
                    <div className="flex items-center gap-3 mt-2">
                      {place.rating && (
                        <span className="text-xs text-yellow-400">
                          ⭐ {place.rating}
                        </span>
                      )}
                      {place.price_level && (
                        <span className="text-xs text-green-400">
                          {'$'.repeat(place.price_level)}
                        </span>
                      )}
                    </div>

                    {/* Travel times for each participant */}
                    {selectedPlace?.place_id === place.place_id && (
                      <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                        <div className="text-xs text-gray-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {locale === 'ko' ? '예상 이동 시간:' : 'Travel times:'}
                        </div>
                        <div className="text-xs text-gray-300">
                          {locale === 'ko' ? '나' : 'You'}: {formatTravelTime(travelTimes.get('me'))}
                        </div>
                        {selectedFriends.map(friend => (
                          <div key={friend.id} className="text-xs text-gray-300">
                            {friend.name}: {formatTravelTime(travelTimes.get(friend.id))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedPlace?.place_id === place.place_id && (
                    <div className="ml-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Button */}
      {selectedPlace && (
        <button
          onClick={scheduleMeeting}
          className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          {locale === 'ko' ? '일정 등록하기' : 'Schedule Meeting'}
        </button>
      )}
    </div>
  );
}