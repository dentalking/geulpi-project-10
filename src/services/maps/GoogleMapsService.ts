import { Client } from '@googlemaps/google-maps-services-js';

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  types?: string[];
  website?: string;
  formatted_phone_number?: string;
}

export interface TravelTime {
  duration: {
    text: string;
    value: number; // seconds
  };
  distance: {
    text: string;
    value: number; // meters
  };
  mode: 'driving' | 'walking' | 'transit' | 'bicycling';
}

export interface MidpointResult {
  location: {
    lat: number;
    lng: number;
  };
  nearbyPlaces: PlaceDetails[];
  travelTimes: Map<string, TravelTime>; // userId -> travel time
}

class GoogleMapsService {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_API_KEY || '';
  }

  /**
   * 장소 자동완성 검색
   */
  async searchPlaces(query: string, location?: { lat: number; lng: number }) {
    try {
      const response = await this.client.placeAutocomplete({
        params: {
          input: query,
          key: this.apiKey,
          location: location ? `${location.lat},${location.lng}` : undefined,
          radius: location ? 50000 : undefined, // 50km
          language: 'ko' as any,
          components: ['country:kr'],
        },
      });

      return response.data.predictions.map(prediction => ({
        place_id: prediction.place_id,
        description: prediction.description,
        structured_formatting: prediction.structured_formatting,
      }));
    } catch (error) {
      console.error('Place search error:', error);
      throw error;
    }
  }

  /**
   * 장소 상세 정보 가져오기
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'opening_hours',
            'rating',
            'user_ratings_total',
            'price_level',
            'photos',
            'types',
            'website',
            'formatted_phone_number',
          ],
          language: 'ko' as any,
        },
      });

      return response.data.result as PlaceDetails;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }

  /**
   * 두 지점 사이의 이동 시간 계산
   */
  async calculateTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
  ): Promise<TravelTime | null> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [`${origin.lat},${origin.lng}`],
          destinations: [`${destination.lat},${destination.lng}`],
          key: this.apiKey,
          mode: mode as any,
          language: 'ko' as any,
          departure_time: 'now' as any,
        },
      });

      const element = response.data.rows[0]?.elements[0];
      if (element?.status === 'OK') {
        return {
          duration: element.duration,
          distance: element.distance,
          mode: mode as any,
        };
      }

      return null;
    } catch (error) {
      console.error('Travel time calculation error:', error);
      return null;
    }
  }

  /**
   * 여러 위치의 중간 지점 찾기
   */
  async findMidpoint(locations: Array<{ lat: number; lng: number }>): Promise<{ lat: number; lng: number }> {
    if (locations.length === 0) {
      throw new Error('No locations provided');
    }

    // 지리적 중심점 계산
    const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0);
    const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0);

    return {
      lat: sumLat / locations.length,
      lng: sumLng / locations.length,
    };
  }

  /**
   * 중간 지점 근처의 추천 장소 찾기
   */
  async findMeetingPlaces(
    userLocations: Array<{ userId: string; location: { lat: number; lng: number } }>,
    placeType: string = 'restaurant'
  ): Promise<MidpointResult> {
    // 중간 지점 계산
    const midpoint = await this.findMidpoint(userLocations.map(u => u.location));

    // 중간 지점 근처 장소 검색
    const nearbyResponse = await this.client.placesNearby({
      params: {
        location: midpoint,
        radius: 2000, // 2km
        type: placeType as any,
        key: this.apiKey,
        language: 'ko' as any,
      },
    });

    // 상위 5개 장소 선택
    const places = nearbyResponse.data.results
      .slice(0, 5)
      .map(place => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.vicinity || '',
        geometry: place.geometry,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        photos: place.photos,
        types: place.types,
      } as PlaceDetails));

    // 각 사용자별 이동 시간 계산
    const travelTimes = new Map<string, TravelTime>();
    
    for (const user of userLocations) {
      const travelTime = await this.calculateTravelTime(
        user.location,
        midpoint,
        'transit'
      );
      if (travelTime) {
        travelTimes.set(user.userId, travelTime);
      }
    }

    return {
      location: midpoint,
      nearbyPlaces: places,
      travelTimes,
    };
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
          language: 'ko' as any,
          components: { country: 'KR' },
        },
      });

      const result = response.data.results[0];
      if (result) {
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * 좌표를 주소로 변환 (Reverse Geocoding)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: this.apiKey,
          language: 'ko' as any,
        },
      });

      return response.data.results[0]?.formatted_address || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * 장소 사진 URL 생성
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }
}

export const googleMapsService = new GoogleMapsService();