import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TextractClient,
  AnalyzeDocumentCommand,
  type Block,
} from '@aws-sdk/client-textract';

export interface TextractNutritionResult {
  sugarPerServing: number | null;
  saltPerServing: number | null;
  saturatedFatPerServing: number | null;
  servingSizeMl: number | null;
  rawText: string;
}

@Injectable()
export class TextractService {
  private readonly logger = new Logger(TextractService.name);
  private readonly client: TextractClient;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('AWS_S3_REGION') || 'ap-southeast-1';
    this.client = new TextractClient({ region });
  }

  /**
   * Run OCR on an image that is ALREADY in S3 (uploaded by the frontend via a
   * pre-signed URL). Textract reads directly from the bucket, so the image
   * buffer never touches the NestJS/Lambda backend.
   */
  async extractNutritionFromS3(
    bucket: string,
    s3Key: string,
  ): Promise<TextractNutritionResult> {
    const response = await this.client.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: s3Key } },
        FeatureTypes: ['TABLES'],
      }),
    );

    const blocks = response.Blocks ?? [];
    const rawText = blocks
      .filter((b: Block) => b.BlockType === 'LINE')
      .map((b: Block) => b.Text ?? '')
      .join('\n');

    this.logger.log(
      `Textract extracted ${blocks.length} blocks, ${rawText.length} chars from ${s3Key}`,
    );

    return {
      sugarPerServing: this.findNutrientValue(rawText, [
        'gula',
        'sugar',
        'total sugar',
        'gula total',
      ]),
      saltPerServing: this.findNutrientValue(rawText, [
        'garam',
        'natrium',
        'sodium',
        'salt',
        'na',
      ]),
      saturatedFatPerServing: this.findNutrientValue(rawText, [
        'lemak jenuh',
        'saturated fat',
        'lemak total',
      ]),
      servingSizeMl: this.findServingSize(rawText),
      rawText,
    };
  }

  /**
   * Extract serving size (takaran saji) in mL from the label text.
   * Looks for the ml quantity near a serving-size keyword.
   */
  private findServingSize(text: string): number | null {
    const lines = text.toLowerCase().split('\n');
    const keywords = [
      'takaran saji',
      'sajian per kemasan',
      'serving size',
      'per sajian',
      'takaran',
    ];

    for (const keyword of keywords) {
      for (const line of lines) {
        if (line.includes(keyword)) {
          const match = line.match(/(\d+[.,]?\d*)\s*(ml|mililiter|l|liter)/);
          if (match) {
            let value = parseFloat(match[1].replace(',', '.'));
            const unit = match[2];
            if (unit === 'l' || unit === 'liter') {
              value = value * 1000;
            }
            return value;
          }
        }
      }
    }

    // Fallback: any standalone ml value anywhere on the label.
    for (const line of lines) {
      const match = line.match(/(\d+[.,]?\d*)\s*(ml|mililiter)/);
      if (match) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }

    return null;
  }

  private findNutrientValue(text: string, keywords: string[]): number | null {
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
            return value;
          }
        }
      }
    }

    return null;
  }
}
