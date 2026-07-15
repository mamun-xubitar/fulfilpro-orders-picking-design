import prisma from '@/lib/prisma.server';
import { DEFAULT_DECORATION_KEYWORDS, type DecorationKeywords } from '@/lib/decoration-detect';

function normalizeTags(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((tag): tag is string => typeof tag === 'string');
}

export async function getDecorationKeywords(): Promise<DecorationKeywords> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { embroideryKeywords: true, printKeywords: true },
  });

  return {
    embroidery: normalizeTags(settings?.embroideryKeywords, DEFAULT_DECORATION_KEYWORDS.embroidery),
    print: normalizeTags(settings?.printKeywords, DEFAULT_DECORATION_KEYWORDS.print),
  };
}
