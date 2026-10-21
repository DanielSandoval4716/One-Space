import { ReactNode } from 'react';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  titulo: string;
  children: ReactNode;
};

// Tarjeta con un título en negrita. Agrupa cada paso de un formulario.
export function Seccion({ titulo, children }: Props) {
  return (
    <ThemedCard style={{ gap: 12 }}>
      <ThemedText style={{ fontWeight: 'bold' }}>{titulo}</ThemedText>
      {children}
    </ThemedCard>
  );
}
