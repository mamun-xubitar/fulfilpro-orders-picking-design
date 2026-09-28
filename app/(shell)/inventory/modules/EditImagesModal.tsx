'use client';

import { ModalShell } from '@/components/ModalShell';
import ImageCardsGrid from './ImageCardsGrid';
import type { useProductImageMutations } from './hooks/useProductImageMutations';
import type { ColourOption, ProductImage } from './types';

type ImageMutations = ReturnType<typeof useProductImageMutations>;

type EditImagesModalProps = {
  images: ProductImage[];
  colours: ColourOption[];
  imageMutations: ImageMutations;
  onClose: () => void;
};

export default function EditImagesModal({ images, colours, imageMutations, onClose }: EditImagesModalProps) {
  return (
    <ModalShell disableBackdropClose title="Edit images" compact onClose={onClose} extraWide>
      <ImageCardsGrid images={images} colours={colours} imageMutations={imageMutations} />
    </ModalShell>
  );
}
