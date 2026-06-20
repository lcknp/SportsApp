import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type PhotoMacroEstimate = {
  description: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'low' | 'medium' | 'high';
};

// Schickt ein Foto an die analyze-food-photo Edge Function (Google Gemini
// Vision) und liefert eine Makro-Schätzung zur Übernahme/Korrektur. Das Foto
// selbst wird nirgends gespeichert.
export function usePhotoMacroEstimate() {
  const [estimate, setEstimate] = useState<PhotoMacroEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (base64: string, mimeType: string) => {
    setIsLoading(true);
    setError(null);
    setEstimate(null);

    const { data, error: invokeError } = await supabase.functions.invoke('analyze-food-photo', {
      body: { image: base64, mimeType },
    });

    setIsLoading(false);
    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    setEstimate(data as PhotoMacroEstimate);
  }, []);

  const reset = useCallback(() => {
    setEstimate(null);
    setError(null);
  }, []);

  return { estimate, isLoading, error, analyze, reset };
}
