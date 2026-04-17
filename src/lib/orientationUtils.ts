export interface OrientationData {
  service: string;
  annotation: string;
}

export const parseOrientations = (orientationRaw: any, annotationRaw: any): OrientationData[] => {
  if (!orientationRaw) return [];
  
  try {
    const parsed = typeof orientationRaw === 'string' ? JSON.parse(orientationRaw) : orientationRaw;
    if (Array.isArray(parsed) && parsed.length > 0 && 'service' in parsed[0]) {
      // It's already the new JSON format
      return parsed as OrientationData[];
    }
  } catch (e) {
    // Fall back to legacy string
  }

  // If it's not JSON, it's the old single-string format
  return [
    {
      service: orientationRaw || '',
      annotation: annotationRaw || '',
    }
  ];
};

export const serializeOrientations = (orientations: OrientationData[]): string => {
  return JSON.stringify(orientations);
};

// Helper to get exactly the list of unique services from a dossier
export const extractServices = (orientationRaw: any): string[] => {
  const data = parseOrientations(orientationRaw, null);
  return data.map(d => d.service).filter(Boolean);
};
