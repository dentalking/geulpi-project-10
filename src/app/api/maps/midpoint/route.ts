import { NextRequest, NextResponse } from 'next/server';
import { googleMapsService } from '@/services/maps/GoogleMapsService';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';
import { cookies } from 'next/headers';

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

    const { userLocations, placeType = 'restaurant' } = await request.json();

    if (!userLocations || !Array.isArray(userLocations) || userLocations.length === 0) {
      return NextResponse.json(
        { error: 'User locations are required' },
        { status: 400 }
      );
    }

    // Validate location data
    for (const loc of userLocations) {
      if (!loc.location?.lat || !loc.location?.lng) {
        return NextResponse.json(
          { error: 'Invalid location data' },
          { status: 400 }
        );
      }
    }

    // Find midpoint and nearby places
    const result = await googleMapsService.findMeetingPlaces(
      userLocations,
      placeType
    );

    // Convert Map to object for JSON serialization
    const travelTimesObj: Record<string, any> = {};
    result.travelTimes.forEach((value, key) => {
      travelTimesObj[key] = value;
    });

    return NextResponse.json({
      success: true,
      midpoint: result.location,
      nearbyPlaces: result.nearbyPlaces,
      travelTimes: travelTimesObj
    });

  } catch (error) {
    console.error('Midpoint calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate midpoint' },
      { status: 500 }
    );
  }
}