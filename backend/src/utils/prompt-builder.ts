import Handlebars from 'handlebars';
import { ImageAnalysis } from './image-analysis';

// Регистрируем хелперы
Handlebars.registerHelper('or', function (value: any, fallback: string) {
  if (value && typeof value === 'string' && value.trim()) {
    return value;
  }
  return fallback;
});

Handlebars.registerHelper('eq', function (this: any, a: any, b: any, options: any) {
  return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('neq', function (this: any, a: any, b: any, options: any) {
  return a !== b ? options.fn(this) : options.inverse(this);
});

export function buildPrompt(
  template: string,
  analysis: ImageAnalysis,
  negativePrompt?: string
): string {
  const context = {
    gender: analysis.gender || 'person',
    age: analysis.ageGroup || '',
    clothing: analysis.clothing || '',
    background: analysis.background || '',
    description: analysis.description || '',
    hasDescription: !!analysis.description && analysis.description.trim().length > 0,
    hasAge: !!analysis.ageGroup && analysis.ageGroup.trim().length > 0,
    hasClothing: !!analysis.clothing && analysis.clothing.trim().length > 0,
    hasBackground: !!analysis.background && analysis.background.trim().length > 0,
    hasGender: !!analysis.gender && analysis.gender !== 'person',
  };

  try {
    const compiled = Handlebars.compile(template, { noEscape: true });
    let prompt = compiled(context);

    // Добавляем описание в начало, если оно есть
    if (context.hasDescription && !prompt.startsWith(context.description)) {
      prompt = `${context.description}, ${prompt}`;
    }

    // Убираем множественные пробелы и запятые
    prompt = prompt.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/,\s*,/g, ',').trim();
    
    return prompt;
  } catch (error) {
    console.error('Prompt compilation error:', error);
    // Fallback — возвращаем шаблон как есть с базовыми заменами
    return template
      .replace('{{gender}}', analysis.gender || 'person')
      .replace('{{age}}', analysis.ageGroup || '')
      .replace('{{clothing}}', analysis.clothing || '')
      .replace('{{background}}', analysis.background || '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}