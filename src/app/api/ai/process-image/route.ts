import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/GeminiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', { 
      hasImage: !!body.image, 
      imageLength: body.image?.length,
      mimeType: body.mimeType,
      sessionId: body.sessionId 
    });
    
    const { image, mimeType, sessionId } = body;

    if (!image || !mimeType) {
      console.log('Missing required fields:', { image: !!image, mimeType: !!mimeType });
      return NextResponse.json(
        { success: false, error: 'Image and mimeType are required' },
        { status: 400 }
      );
    }

    console.log('Creating GeminiService instance...');
    // Initialize Gemini service
    const geminiService = new GeminiService();
    console.log('GeminiService instance created successfully');

    // Process image to extract event data
    const eventData = await geminiService.parseEventFromImage(image, mimeType);

    // Return extracted event data
    return NextResponse.json({
      success: true,
      eventData,
      sessionId
    });

  } catch (error) {
    console.error('Image processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process image' 
      },
      { status: 500 }
    );
  }
}