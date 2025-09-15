import { NextRequest, NextResponse } from 'next/server';
import { googleMapsService } from '@/services/maps/GoogleMapsService';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const authToken = cookieStore.get('auth-token')?.value;

    if (!accessToken && !authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    
    const places = await googleMapsService.searchPlaces(query, location);

    return NextResponse.json({
      success: true,
      places
    });

  } catch (error) {
    console.error('Place search error:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const authToken = cookieStore.get('auth-token')?.value;

    if (!accessToken && !authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { placeId } = await request.json();

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    const placeDetails = await googleMapsService.getPlaceDetails(placeId);

    if (!placeDetails) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      place: placeDetails
    });

  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json(
      { error: 'Failed to get place details' },
      { status: 500 }
    );
  }
}