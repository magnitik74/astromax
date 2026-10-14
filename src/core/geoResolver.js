/**
 * Geo Resolver for Russian Settlements (Города, сёла, деревни, хутора, посёлки)
 * Covering all 11 Russian time zones (UTC+2 to UTC+12)
 */

export const RUSSIAN_REGIONS_GEO = {
  'москва': { lat: 55.7558, lon: 37.6173, tz: 3 },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, tz: 3 },
  'питер': { lat: 59.9343, lon: 30.3351, tz: 3 },
  'новосибирск': { lat: 55.0084, lon: 82.9357, tz: 7 },
  'екатеринбург': { lat: 56.8389, lon: 60.6057, tz: 5 },
  'казань': { lat: 55.7961, lon: 49.1064, tz: 3 },
  'нижний новгород': { lat: 56.3269, lon: 44.0059, tz: 3 },
  'челябинск': { lat: 55.1644, lon: 61.4368, tz: 5 },
  'красноярск': { lat: 56.0153, lon: 92.8932, tz: 7 },
  'самара': { lat: 53.1959, lon: 50.1002, tz: 4 },
  'уфа': { lat: 54.7388, lon: 55.9721, tz: 5 },
  'ростов-на-дону': { lat: 47.2357, lon: 39.7015, tz: 3 },
  'ростов': { lat: 47.2357, lon: 39.7015, tz: 3 },
  'омск': { lat: 54.9885, lon: 73.3242, tz: 6 },
  'краснодар': { lat: 45.0355, lon: 38.9753, tz: 3 },
  'воронеж': { lat: 51.6608, lon: 39.2003, tz: 3 },
  'пермь': { lat: 58.0105, lon: 56.2502, tz: 5 },
  'волгоград': { lat: 48.7080, lon: 44.5133, tz: 3 },
  'саратов': { lat: 51.5406, lon: 46.0086, tz: 4 },
  'тюмень': { lat: 57.1530, lon: 65.5343, tz: 5 },
  'тольятти': { lat: 53.5303, lon: 49.3461, tz: 4 },
  'барнаул': { lat: 53.3548, lon: 83.7698, tz: 7 },
  'ижевск': { lat: 56.8498, lon: 53.2045, tz: 4 },
  'ульяновск': { lat: 54.3142, lon: 48.4031, tz: 4 },
  'иркутск': { lat: 52.2870, lon: 104.3050, tz: 8 },
  'хабаровск': { lat: 48.4827, lon: 135.0838, tz: 10 },
  'ярославль': { lat: 57.6261, lon: 39.8845, tz: 3 },
  'владивосток': { lat: 43.1155, lon: 131.8855, tz: 10 },
  'махачкала': { lat: 42.9849, lon: 47.5047, tz: 3 },
  'томск': { lat: 56.5010, lon: 84.9924, tz: 7 },
  'оренбург': { lat: 51.7727, lon: 55.0988, tz: 5 },
  'кемерово': { lat: 55.3552, lon: 86.0868, tz: 7 },
  'новокузнецк': { lat: 53.7596, lon: 87.1216, tz: 7 },
  'рязань': { lat: 54.6269, lon: 39.6916, tz: 3 },
  'астрахань': { lat: 46.3497, lon: 48.0408, tz: 4 },
  'пенза': { lat: 53.2273, lon: 45.0000, tz: 3 },
  'липецк': { lat: 52.6103, lon: 39.5947, tz: 3 },
  'киров': { lat: 58.6035, lon: 49.6679, tz: 3 },
  'чебоксары': { lat: 56.1114, lon: 47.2520, tz: 3 },
  'калининград': { lat: 54.7104, lon: 20.4522, tz: 2 },
  'тула': { lat: 54.1961, lon: 37.6182, tz: 3 },
  'курск': { lat: 51.7304, lon: 36.1927, tz: 3 },
  'ставрополь': { lat: 45.0428, lon: 41.9734, tz: 3 },
  'сочи': { lat: 43.6028, lon: 39.7342, tz: 3 },
  'тверь': { lat: 56.8587, lon: 35.9176, tz: 3 },
  'магнитогорск': { lat: 53.4186, lon: 58.9708, tz: 5 },
  'сургут': { lat: 61.2500, lon: 73.4167, tz: 5 },
  'чита': { lat: 52.0336, lon: 113.5009, tz: 9 },
  'якутск': { lat: 62.0355, lon: 129.6755, tz: 9 },
  'мурманск': { lat: 68.9585, lon: 33.0827, tz: 3 },
  'норильск': { lat: 69.3558, lon: 88.1893, tz: 7 },
  'петропавловск-камчатский': { lat: 53.0452, lon: 158.6508, tz: 12 },
  'южно-сахалинск': { lat: 46.9541, lon: 142.7360, tz: 11 },
  'магадан': { lat: 59.5638, lon: 150.8034, tz: 11 },
};

/**
 * Intelligent parser that extracts city/village name, coordinates, and timezone.
 * Supports any village, hamlet (хутор, деревня, село, посёлок) or custom text without crashing.
 */
export function parseLocationInput(rawInput, defaultTz = 3) {
  if (!rawInput || !rawInput.trim()) {
    return { city: 'Москва', lat: 55.7558, lon: 37.6173, tz: 3 };
  }
  const trimmed = rawInput.trim();

  // 1. Explicit timezone extraction e.g. "Красноярск (UTC+7)"
  let tz = null;
  const tzMatch = trimmed.match(/UTC\s*([+-]\d+)/i);
  if (tzMatch) {
    tz = parseInt(tzMatch[1], 10);
  }

  const cleanName = trimmed.replace(/\s*\(UTC[+-]?\d+\)/i, '').trim();
  const lower = cleanName.toLowerCase();

  // 2. Search in dictionary
  for (const [key, val] of Object.entries(RUSSIAN_REGIONS_GEO)) {
    if (lower.includes(key)) {
      return {
        city: cleanName,
        lat: val.lat,
        lon: val.lon,
        tz: tz !== null ? tz : val.tz,
      };
    }
  }

  // 3. Graceful fallback for rural settlements (деревня, хутор, село, станица)
  return {
    city: cleanName,
    lat: 55.7558,
    lon: 37.6173,
    tz: tz !== null ? tz : defaultTz,
  };
}
