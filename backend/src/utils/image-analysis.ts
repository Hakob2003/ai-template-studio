import axios from 'axios';

export interface ImageAnalysis {
  description: string;
  gender: string;
  ageGroup: string;
  clothing: string;
  background: string;
}

const DEFAULT_ANALYSIS: ImageAnalysis = {
  description: '',
  gender: 'person',
  ageGroup: '',
  clothing: '',
  background: '',
};

export async function analyzeImage(
  imageBuffer: Buffer,
  hfToken?: string | null
): Promise<ImageAnalysis> {
  if (!hfToken) {
    console.log('No HF token, using default analysis');
    return DEFAULT_ANALYSIS;
  }

  try {
    // BLIP image captioning
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 15000,
      }
    );

    let description = '';
    if (Array.isArray(response.data) && response.data[0]?.generated_text) {
      description = response.data[0].generated_text;
    }

    return {
      ...DEFAULT_ANALYSIS,
      description: description || '',
      gender: extractGender(description),
      ageGroup: extractAge(description),
      clothing: extractClothing(description),
      background: extractBackground(description),
    };
  } catch (error: any) {
    console.error('Image analysis failed:', error.message);
    return DEFAULT_ANALYSIS;
  }
}

// Простые эвристики для извлечения информации из описания
function extractGender(description: string): string {
  const lower = description.toLowerCase();
  if (/man|male|gentleman|boy/.test(lower)) return 'man';
  if (/woman|female|lady|girl/.test(lower)) return 'woman';
  return 'person';
}

function extractAge(description: string): string {
  const lower = description.toLowerCase();
  if (/baby|toddler|child|kid|young boy|young girl/.test(lower)) return 'young';
  if (/teen|teenager|young adult|young man|young woman/.test(lower)) return 'young adult';
  if (/middle aged|middle-aged|adult/.test(lower)) return 'adult';
  if (/elderly|old|senior|grandma|grandpa/.test(lower)) return 'elderly';
  return '';
}

function extractClothing(description: string): string {
  const lower = description.toLowerCase();
  if (/suit|formal|business|blazer|tie/.test(lower)) return 'formal attire';
  if (/casual|t-shirt|jeans|hoodie|sweater/.test(lower)) return 'casual wear';
  if (/dress|gown|elegant|fashion/.test(lower)) return 'elegant dress';
  if (/armor|armour|plate|chainmail/.test(lower)) return 'armor';
  if (/uniform|military|police/.test(lower)) return 'uniform';
  if (/sport|athletic|gym|workout/.test(lower)) return 'sportswear';
  return '';
}

function extractBackground(description: string): string {
  const lower = description.toLowerCase();
  if (/city|urban|street|building|skyline/.test(lower)) return 'urban';
  if (/forest|nature|mountain|river|tree|garden/.test(lower)) return 'natural';
  if (/beach|ocean|sea|coast/.test(lower)) return 'beach';
  if (/studio|white background|backdrop/.test(lower)) return 'studio';
  if (/interior|room|house|indoor/.test(lower)) return 'indoor';
  if (/night|neon|dark/.test(lower)) return 'night';
  return '';
}