/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export interface VisionNutritionResult {
  sugarPerServing: number | null;
  saltPerServing: number | null;
  saturatedFatPerServing: number | null;
  servingSizeMl: number | null;
  rawText: string;
}

@Injectable()
export class TextractService {
  private readonly logger = new Logger(TextractService.name);
  private readonly ai: GoogleGenAI;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — OCR will fail until configured.',
      );
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey ?? '' });

    const region =
      this.configService.get<string>('AWS_S3_REGION') || 'ap-southeast-1';
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET') || 'glucofy-scans';
    this.s3 = new S3Client({ region });
    this.model =
      this.configService.get<string>('GEMINI_OCR_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Run OCR on an image already in S3 using Google Gemini Vision.
   *
   * Option A (implemented): download the image from S3 into a Buffer, convert
   * to base64, and send inline to Gemini. Reliable, zero trust issues, but
   * uses a small amount of Lambda memory for the buffer.
   */
  async extractNutritionFromS3(
    _bucket: string,
    s3Key: string,
  ): Promise<VisionNutritionResult> {
    // 1. Download the image from S3 into memory.
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );

    const imageBuffer = await response.Body?.transformToByteArray();
    if (!imageBuffer) {
      throw new Error(`Failed to read S3 object: ${this.bucket}/${s3Key}`);
    }

    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = s3Key.endsWith('.png') ? 'image/png' : 'image/jpeg';

    this.logger.log(
      `Downloaded ${s3Key} from S3 (${imageBuffer.length} bytes), sending to Gemini`,
    );

    // 2. Send to Gemini with a structured extraction prompt.
    const prompt = `Anda adalah ahli OCR untuk label Informasi Nilai Gizi Indonesia. 
Analisis gambar label nutrisi ini dan ekstrak data berikut dalam format JSON SAJA — tanpa markdown, tanpa penjelasan:

{
  "sugarPerServing": <angka gula per sajian dalam gram, atau null>,
  "saltPerServing": <angka garam/natrium per sajian dalam gram, atau null>,
  "saturatedFatPerServing": <angka lemak jenuh per sajian dalam gram, atau null>,
  "servingSizeMl": <angka takaran saji dalam mililiter, atau null>
}

Aturan:
- sugarPerServing: cari kata "Gula" atau "Sugar" di tabel. Ambil angka per SAJIAN (bukan per 100ml).
- saltPerServing: cari kata "Garam" atau "Natrium" atau "Sodium". Ambil angka per sajian.
- saturatedFatPerServing: cari "Lemak Jenuh" atau "Saturated Fat". Ambil angka per sajian.
- servingSizeMl: cari "Takaran Saji" atau "Serving Size". Ambil volume dalam mL.
- Jika hanya ada nilai per 100ml tanpa per sajian, catat servingSizeMl sebagai null.
- Kembalikan JSON VALID tanpa teks lain.`;

    const result = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = result.text ?? '';
    this.logger.log(`Gemini response received (${rawText.length} chars)`);

    // 3. Parse the JSON response from Gemini.
    try {
      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gm, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      return {
        sugarPerServing: parsed.sugarPerServing ?? null,
        saltPerServing: parsed.saltPerServing ?? null,
        saturatedFatPerServing: parsed.saturatedFatPerServing ?? null,
        servingSizeMl: parsed.servingSizeMl ?? null,
        rawText,
      };
    } catch {
      this.logger.warn(
        `Gemini returned non-JSON response. Falling back to raw text parsing.`,
      );

      // Fallback: regex extraction from raw text.
      return {
        sugarPerServing: this.fallbackExtract(rawText, [
          'gula',
          'sugar',
          'total sugar',
        ]),
        saltPerServing: this.fallbackExtract(rawText, [
          'garam',
          'natrium',
          'sodium',
          'salt',
        ]),
        saturatedFatPerServing: this.fallbackExtract(rawText, [
          'lemak jenuh',
          'saturated fat',
        ]),
        servingSizeMl: this.fallbackServingSize(rawText),
        rawText,
      };
    }
  }

  private fallbackExtract(text: string, keywords: string[]): number | null {
    const lines = text.toLowerCase().split('\n');
    for (const keyword of keywords) {
      for (const line of lines) {
        if (line.includes(keyword)) {
          const match = line.match(/(\d+[.,]?\d*)\s*(g|mg|gram|miligram)?/);
          if (match) {
            let value = parseFloat(match[1].replace(',', '.'));
            if (match[2] && (match[2] === 'mg' || match[2] === 'miligram')) {
              value = value / 1000;
            }
            return Math.round(value * 100) / 100;
          }
        }
      }
    }
    return null;
  }

  private fallbackServingSize(text: string): number | null {
    const lines = text.toLowerCase().split('\n');
    const keywords = [
      'takaran saji',
      'sajian per kemasan',
      'serving size',
      'per sajian',
    ];
    for (const keyword of keywords) {
      for (const line of lines) {
        if (line.includes(keyword)) {
          const match = line.match(/(\d+[.,]?\d*)\s*(ml|mililiter|l|liter)/);
          if (match) {
            let value = parseFloat(match[1].replace(',', '.'));
            if (match[2] === 'l' || match[2] === 'liter') {
              value = value * 1000;
            }
            return value;
          }
        }
      }
    }
    return null;
  }
}
