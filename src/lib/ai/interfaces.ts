import type {
  VisionAnalysisResult,
  VoiceTranscriptionResult,
  FoodParseResult,
} from "./types";

/**
 * Interface for AI Vision photo analysis.
 * Analyzes meals and extracts portion/food candidates without claiming 100% certainty.
 */
export interface IVisionFoodAnalyzer {
  readonly providerName: string;
  readonly modelId: string;

  /**
   * Analyzes an uploaded food photo.
   * @param imageBuffer - Raw image binary buffer
   * @param mimeType - Image MIME type (e.g. 'image/jpeg', 'image/png')
   * @returns Detected food items with portions, confidence scores, and visual assumptions
   */
  analyzeMealPhoto(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<VisionAnalysisResult>;
}

/**
 * Interface for Speech-to-Text transcription.
 * Transcribes audio recordings in English, Tamil, and Tanglish.
 */
export interface IVoiceTranscriber {
  readonly providerName: string;

  /**
   * Transcribes raw audio to text.
   * @param audioBuffer - Raw audio binary buffer
   * @param mimeType - Audio MIME type (e.g. 'audio/webm', 'audio/mp4')
   * @returns Transcribed text with language detection
   */
  transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<VoiceTranscriptionResult>;
}

/**
 * Interface for Natural Language Food & Quantity parsing.
 * Converts transcribed spoken text into structured food entries and detects ambiguities.
 */
export interface IFoodParser {
  readonly parserName: string;

  /**
   * Parses natural language food text into structured food and portion entities.
   * @param rawText - e.g. "rendu idli, oru cup sambar, ara spoon ghee"
   * @returns Structured entries and any detected ambiguities
   */
  parseFoodText(rawText: string): Promise<FoodParseResult>;
}
