interface BaseInput {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
  season: string;
  weather?: string; // optional real-weather summary sentence
}

function weatherLine(input: BaseInput): string {
  return input.weather
    ? `Real weather data for the trip: ${input.weather}`
    : `Assume typical ${input.season}-season weather for the destination.`;
}

export function buildPrompt(input: BaseInput): string {
  return `Generate a travel itinerary for a trip to ${input.destination} for ${input.durationDays} days.
The budget tier is ${input.budgetTier}.
The interests are: ${input.interests.join(', ') || 'general sightseeing'}.
${weatherLine(input)}

Provide the output in JSON format matching this schema:
{
  "itinerary": [
    {
      "dayNumber": number,
      "activities": [
        { "name": string, "description": string, "estimatedCostUSD": number, "timeOfDay": "Morning" | "Afternoon" | "Evening" }
      ]
    }
  ],
  "hotels": [
    { "name": string, "tier": string, "estimatedCostNightUSD": number, "rating": string }
  ],
  "estimatedBudget": {
    "transport": number, "accommodation": number, "food": number, "activities": number, "total": number
  },
  "packingList": [
    { "item": string, "category": "Documents" | "Clothing" | "Gear" | "Other", "reason": string, "isPacked": false }
  ]
}

PACKING LIST RULES (most important part):
Cross-reference (a) the weather/season above and (b) the activities you generated, to produce a tailored list.
- Cold conditions -> thermal layers, coat, scarf, gloves.
- Hot/sunny -> light clothing, high-SPF sunscreen, sunglasses, hat.
- Rainy (high rain chance) -> rain shell / compact umbrella / waterproof bag.
- Hiking or trails in the plan -> hiking boots, reusable water bottle.
- Beach / pool / snorkeling -> swimwear, quick-dry towel.
- Museums / sightseeing -> comfortable walking shoes.
- Fine dining -> one smart outfit.
Always include essential "Documents" (passport, tickets, insurance/ID).
For EVERY item, set "reason" to a short phrase referencing the weather or a specific scheduled activity
(e.g. "for the ~70% rain chance", "for the Mt Fuji hike on Day 2"). Place each item in the correct category.`;
}

interface DayActivity {
  name: string;
  description?: string;
  estimatedCostUSD?: number;
  timeOfDay?: string;
}

export function buildDayPrompt(
  input: BaseInput & { dayNumber: number; instruction: string; current?: DayActivity[] },
): string {
  const currentBlock =
    input.current && input.current.length
      ? `\nThe day CURRENTLY has these activities:\n${JSON.stringify(
          input.current.map((a) => ({ name: a.name, description: a.description, estimatedCostUSD: a.estimatedCostUSD, timeOfDay: a.timeOfDay })),
          null,
          2,
        )}\nApply the user's request to THIS list: add, remove, reorder, or replace activities exactly as asked, and KEEP every existing activity the request does not mention. Then return the FULL updated day.`
      : '';

  return `Update day ${input.dayNumber} of a ${input.durationDays}-day trip to ${input.destination}.
Budget tier: ${input.budgetTier}. Interests: ${input.interests.join(', ') || 'general sightseeing'}.
${weatherLine(input)}
User request for this day: "${input.instruction}".${currentBlock}

Return JSON for the single day only:
{
  "dayNumber": ${input.dayNumber},
  "activities": [
    { "name": string, "description": string, "estimatedCostUSD": number, "timeOfDay": "Morning" | "Afternoon" | "Evening" }
  ]
}`;
}
