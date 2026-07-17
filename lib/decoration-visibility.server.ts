import prisma from '@/lib/prisma.server';

export async function getDecorationCrossVisibility(): Promise<boolean> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { decorationCrossVisibilityEnabled: true },
  });
  return settings?.decorationCrossVisibilityEnabled ?? false;
}
