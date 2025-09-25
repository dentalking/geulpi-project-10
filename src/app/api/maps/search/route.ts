import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

const GOOGLE_MAPS_API_KEY = env.get('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '1000'; // Default 1km

    if (!query && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Query or coordinates required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Search by text query
    if (query) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_API_KEY}&language=ko`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${data.status}`);
      }

      return NextResponse.json({
        success: true,
        places: data.results?.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: place.geometry.location,
          types: place.types,
          rating: place.rating,
          priceLevel: place.price_level,
          openNow: place.opening_hours?.open_now
        })) || []
      });
    }

    // Search nearby places
    if (lat && lng) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_MAPS_API_KEY}&language=ko`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${data.status}`);
      }

      return NextResponse.json({
        success: true,
        places: data.results?.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          location: place.geometry.location,
          types: place.types,
          rating: place.rating,
          priceLevel: place.price_level,
          openNow: place.opening_hours?.open_now
        })) || []
      });
    }
  } catch (error: any) {
    logger.error('Maps search error:', error);
    return NextResponse.json(
      { error: 'Failed to search places', details: error.message },
      { status: 500 }
    );
  }
}