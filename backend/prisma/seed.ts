import { PrismaClient, Provider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Создаём админа
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aistudio.com' },
    update: {},
    create: {
      email: 'admin@aistudio.com',
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      subscription: {
        create: {
          tier: 'ENTERPRISE',
          credits: 999999,
        },
      },
    },
  });

  console.log('Admin created:', admin.email);

  // Создаём тестового пользователя
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@aistudio.com' },
    update: {},
    create: {
      email: 'user@aistudio.com',
      passwordHash: userPassword,
      name: 'Test User',
      emailVerified: true,
      subscription: {
        create: {
          tier: 'FREE',
          credits: 20,
        },
      },
    },
  });

  console.log('Test user created:', user.email);

  // Шаблоны по категориям
  const templates = [
    // Бизнес
    {
      name: 'Professional LinkedIn',
      description: 'Professional LinkedIn profile photo',
      category: 'Business',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}professional corporate portrait, {{or gender "person"}}{{#if hasAge}} in {{age}}{{/if}}, wearing business attire, clean studio lighting, white background, confident expression, 8k',
      negativePrompt: 'casual, messy, lowres, bad lighting, blurry',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7, width: 1024, height: 1024 } },
        { provider: Provider.HUGGINGFACE, modelId: 'stabilityai/stable-diffusion-xl-base-1.0', params: { steps: 30, cfg: 7, width: 1024, height: 1024 } },
        { provider: Provider.COMFYUI, modelId: 'sdxl', params: { steps: 30, cfg: 7, width: 1024, height: 1024 } },
      ],
    },
    {
      name: 'CEO Magazine Cover',
      description: 'Magazine cover style business portrait',
      category: 'Business',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}magazine cover portrait of {{or gender "a professional"}}{{#if hasAge}} in {{age}}{{/if}}, {{#if hasClothing}}wearing {{clothing}}{{/if}}, power pose, dramatic lighting, Forbes magazine style, 8k, hyperrealistic',
      negativePrompt: 'casual, amateur, distorted face, ugly',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 35, cfg: 8, width: 1024, height: 1024 } },
        { provider: Provider.HUGGINGFACE, modelId: 'stabilityai/stable-diffusion-xl-base-1.0', params: { steps: 35, cfg: 8 } },
      ],
    },
    // Cyberpunk
    {
      name: 'Cyberpunk Hacker',
      description: 'Cyberpunk hacker aesthetic portrait',
      category: 'Cyberpunk',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}cyberpunk portrait of {{or gender "a person"}}{{#if hasAge}} in {{age}}{{/if}}, neon lights, cybernetic enhancements, rain, futuristic city background, blade runner style, 8k, highly detailed',
      negativePrompt: 'natural, daylight, rural, boring, lowres',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7, width: 1024, height: 1024 } },
        { provider: Provider.HUGGINGFACE, modelId: 'stabilityai/stable-diffusion-xl-base-1.0', params: { steps: 30 } },
      ],
    },
    {
      name: 'Neon Samurai',
      description: 'Futuristic neon samurai warrior',
      category: 'Cyberpunk',
      systemPrompt: 'cyberpunk samurai warrior, neon katana, glowing armor, rain-slicked streets, holographic advertisements, night city, 8k, cinematic lighting',
      negativePrompt: 'historical, traditional, daylight, lowres',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Fantasy
    {
      name: 'Elven Royalty',
      description: 'Elegant elven royalty portrait',
      category: 'Fantasy',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}portrait of {{or gender "an elven noble"}} as elven royalty, {{#if hasClothing}}wearing elegant {{clothing}} style elven robes,{{/if}} magical aura, ethereal glow, fantasy forest background, lotr style, 8k',
      negativePrompt: 'modern, technology, urban, ugly',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Dragon Rider',
      description: 'Epic dragon rider portrait',
      category: 'Fantasy',
      systemPrompt: '{{or gender "a warrior"}} riding a majestic dragon, epic fantasy, dramatic sky, fire and smoke, cinematic composition, game of thrones style, 8k',
      negativePrompt: 'modern, cartoon, anime, lowres',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 35, cfg: 8 } },
      ],
    },
    // Anime
    {
      name: 'Anime Character',
      description: 'Anime style character portrait',
      category: 'Anime',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}anime style portrait of {{or gender "a character"}}, studio ghibli inspired, vibrant colors, detailed hair, sparkle effects, manga art style, 4k',
      negativePrompt: 'realistic, 3d, photorealistic, western',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'anything-v5', params: { steps: 25, cfg: 7 } },
        { provider: Provider.HUGGINGFACE, modelId: 'cagliostrolab/anything-v5.0', params: { steps: 25 } },
      ],
    },
    {
      name: 'Manga Hero',
      description: 'Shonen manga hero pose',
      category: 'Anime',
      systemPrompt: 'manga style hero, dynamic pose, action scene, speed lines, dramatic shading, shonen jump style, black and white manga art, detailed',
      negativePrompt: 'color, realistic, 3d',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'anything-v5', params: { steps: 25, cfg: 7 } },
      ],
    },
    // Sci-Fi
    {
      name: 'Space Explorer',
      description: 'Futuristic space explorer portrait',
      category: 'Sci-Fi',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}futuristic space explorer portrait of {{or gender "an astronaut"}}, advanced spacesuit, distant galaxy background, nebula colors, sci-fi movie style, 8k',
      negativePrompt: 'medieval, fantasy, historical',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Alien World',
      description: 'Alien world explorer',
      category: 'Sci-Fi',
      systemPrompt: '{{or gender "an explorer"}} on an alien planet, strange flora, two moons in sky, otherworldly colors, sci-fi concept art, 8k',
      negativePrompt: 'earth, normal, boring',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Instagram
    {
      name: 'Instagram Lifestyle',
      description: 'Instagram lifestyle influencer photo',
      category: 'Instagram',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}instagram lifestyle photo of {{or gender "a person"}}, {{#if hasClothing}}wearing trendy {{clothing}},{{/if}} golden hour lighting, aesthetic composition, cafe background, warm tones, shot on iphone, 4k',
      negativePrompt: 'dark, scary, professional studio, formal',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 25, cfg: 7 } },
      ],
    },
    {
      name: 'Instagram Fashion',
      description: 'Fashion blogger Instagram photo',
      category: 'Instagram',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}fashion influencer photo of {{or gender "a model"}}, {{#if hasClothing}}wearing stylish {{clothing}},{{/if}} urban street background, editorial fashion, soft natural light, vsco aesthetic, 4k',
      negativePrompt: 'formal, corporate, studio',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 25, cfg: 7 } },
      ],
    },
    // YouTube
    {
      name: 'YouTube Thumbnail',
      description: 'Click-worthy YouTube thumbnail',
      category: 'YouTube',
      systemPrompt: 'youtube thumbnail style, {{or gender "a person"}} with shocked expression, colorful background, bold text space at top, high contrast, vibrant colors, mrbeast style, 4k',
      negativePrompt: 'boring, muted, calm, low contrast',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 25, cfg: 8 } },
      ],
    },
    {
      name: 'Gaming Channel',
      description: 'Gaming YouTube thumbnail',
      category: 'YouTube',
      systemPrompt: 'gaming youtube thumbnail, {{or gender "gamer"}} with headset, RGB lighting, game scene in background, dramatic pose, esports style, neon colors, 4k',
      negativePrompt: 'office, formal, casual',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 25, cfg: 8 } },
      ],
    },
    // Movie Posters
    {
      name: 'Action Movie Poster',
      description: 'Action movie poster style',
      category: 'Movie Posters',
      systemPrompt: 'action movie poster featuring {{or gender "a hero"}}, explosions in background, dramatic pose, cinematic composition, hollywood blockbuster style, film grain, 8k',
      negativePrompt: 'comedy, cartoon, lowres',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 35, cfg: 8 } },
      ],
    },
    {
      name: 'Horror Movie Poster',
      description: 'Horror movie poster aesthetic',
      category: 'Movie Posters',
      systemPrompt: 'horror movie poster featuring {{or gender "a person"}}, dark atmosphere, shadows, creepy lighting, thriller style, 8k, cinematic',
      negativePrompt: 'comedy, bright, cheerful',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Gaming
    {
      name: 'RPG Character',
      description: 'RPG game character portrait',
      category: 'Gaming',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}rpg character portrait of {{or gender "a warrior"}}, {{#if hasClothing}}wearing {{clothing}} style armor,{{/if}} fantasy inventory screen background, game asset style, diablo meets witcher, 4k',
      negativePrompt: 'modern, photo, realistic portrait',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Pixel Art Character',
      description: 'Retro pixel art character',
      category: 'Gaming',
      systemPrompt: 'pixel art character, 16-bit style, {{or gender "hero"}}, retro rpg sprite, gameboy advance style, vibrant pixel colors, clean pixels, upscaled 4k',
      negativePrompt: '3d, realistic, smooth, blurry',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 20, cfg: 7, width: 512, height: 512 } },
      ],
    },
    // Pets
    {
      name: 'Royal Pet Portrait',
      description: 'Royal style pet portrait',
      category: 'Pets',
      systemPrompt: 'royal portrait of a pet, renaissance painting style, ornate frame, regal pose, oil painting texture, dramatic lighting, 8k',
      negativePrompt: 'modern, photograph, casual',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Superhero Pet',
      description: 'Pet as superhero',
      category: 'Pets',
      systemPrompt: 'a pet dressed as superhero, cape, dynamic pose, comic book style, action scene, vibrant colors, marvel style, 4k',
      negativePrompt: 'scary, aggressive, dark',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Wedding
    {
      name: 'Fairytale Wedding',
      description: 'Fairytale wedding portrait',
      category: 'Wedding',
      systemPrompt: 'fairytale wedding portrait, {{or gender "couple"}}, enchanted forest, magical lighting, flower petals, princess style wedding dress, disney inspired, 8k',
      negativePrompt: 'modern, urban, casual, dark',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Vintage Wedding',
      description: 'Vintage style wedding photo',
      category: 'Wedding',
      systemPrompt: 'vintage wedding photo, {{or gender "couple"}}, 1920s style, sepia tone, old photograph texture, classic composition, romantic, 8k',
      negativePrompt: 'modern, colorful, digital',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Architecture
    {
      name: 'Modern Architecture',
      description: 'Modern architectural visualization',
      category: 'Architecture',
      systemPrompt: 'modern architectural visualization, glass and steel building, minimalist design, dramatic sky, professional architectural photography, 8k, unreal engine',
      negativePrompt: 'old, traditional, people',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Gothic Cathedral',
      description: 'Gothic cathedral interior',
      category: 'Architecture',
      systemPrompt: 'gothic cathedral interior, vaulted ceilings, stained glass windows, dramatic light rays, dark souls architecture, photorealistic, 8k',
      negativePrompt: 'modern, minimalist, bright',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Cars
    {
      name: 'Luxury Car',
      description: 'Luxury car advertisement style',
      category: 'Automotive',
      systemPrompt: 'luxury car advertisement, sports car, dramatic lighting, wet asphalt, city夜景 background, professional automotive photography, 8k',
      negativePrompt: 'old car, dirty, rural',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Retro Car',
      description: 'Vintage car in retro setting',
      category: 'Automotive',
      systemPrompt: 'vintage classic car, 1960s, retro diner background, neon signs, sunset lighting, nostalgic atmosphere, 8k',
      negativePrompt: 'modern, futuristic',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    // Fitness
    {
      name: 'Fitness Model',
      description: 'Professional fitness photoshoot',
      category: 'Fitness',
      systemPrompt: '{{#if hasDescription}}{{description}}, {{/if}}fitness photoshoot of {{or gender "athlete"}}, muscular physique, gym background, dramatic lighting, sweat, action pose, fitness magazine cover, 8k',
      negativePrompt: 'obese, unhealthy, casual',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
    {
      name: 'Yoga Pose',
      description: 'Yoga pose in nature',
      category: 'Fitness',
      systemPrompt: '{{or gender "yogi"}} in yoga pose, mountain top at sunrise, peaceful atmosphere, mist, spiritual vibe, national geographic style, 8k',
      negativePrompt: 'urban, gym, crowded',
      providers: [
        { provider: Provider.STABLE_DIFFUSION, modelId: 'sdxl', params: { steps: 30, cfg: 7 } },
      ],
    },
  ];

  // Создаём шаблоны с провайдерами (только если их ещё нет)
  const existingCount = await prisma.template.count();
  if (existingCount > 0) {
    console.log(`Templates already seeded (${existingCount} found), skipping...`);
  } else {
    for (const t of templates) {
      const { providers, ...templateData } = t;
      const template = await prisma.template.create({
        data: {
          ...templateData,
          isPublic: true,
          isApproved: true,
          compatibleProviders: {
            create: providers.map(p => ({
              provider: p.provider,
              modelId: p.modelId,
              params: p.params,
              priority: p.provider === Provider.STABLE_DIFFUSION ? 1 : 2,
            })),
          },
        },
      });
      console.log(`Template created: ${template.name}`);
    }
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('Admin: admin@aistudio.com / admin123');
  console.log('User: user@aistudio.com / user123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });