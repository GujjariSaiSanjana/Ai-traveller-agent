export function buildPrompt(input: {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
  season: string;
}): string {
  return `Generate a travel itinerary for a trip to ${input.destination} for ${input.durationDays} days during the ${input.season} season.
The budget tier is ${input.budgetTier}.
The interests are: ${input.interests.join(', ')}.

Provide the output in JSON format matching this schema:
{
  "itinerary": [
    {
      "dayNumber": number,
      "activities": [
        {
          "name": string,
          "description": string,
          "estimatedCostUSD": number,
          "timeOfDay": "Morning" | "Afternoon" | "Evening"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": string,
      "tier": string,
      "estimatedCostNightUSD": number,
      "rating": string
    }
  ],
  "estimatedBudget": {
    "transport": number,
    "accommodation": number,
    "food": number,
    "activities": number,
    "total": number
  },
  "packingList": [
    {
      "item": string,
      "category": "Documents" | "Clothing" | "Gear" | "Other",
      "isPacked": false
    }
  ]
}

IMPORTANT PACKING LIST GENERATION INSTRUCTIONS:
You MUST cross-reference the destination (${input.destination}), the season (${input.season}), and the generated day-by-day activities to produce a highly customized packing list:
1. **Weather/Season Adaptability**: Research the typical weather in ${input.destination} during the ${input.season} season.
   - If cold (e.g. winter in Tokyo, autumn in London), include appropriate clothing such as thermal wear, heavy coat, scarf, gloves, and thick socks.
   - If hot/sunny (e.g. summer in Bali, spring in Rome), include light clothing, sunglasses, high-SPF sunscreen, and a sun hat.
   - If rainy, include waterproof gear, rain shell, or umbrella.
2. **Activity-Driven Gear**: Examine the activities you generated for each day.
   - If there is hiking, walking trails, or climbing, automatically add "hiking boots", "trekking poles", or "reusable water bottle".
   - If there is beach, pool, or snorkeling, automatically add "swimwear", "beach towel", or "waterproof bag".
   - If there is sightseeing or museum visits, add "comfortable walking shoes".
   - If there is fine dining, add "formal attire".
   - If there is photography/nature, add "camera" or "power bank".
Ensure items are placed in their correct categories ("Documents", "Clothing", "Gear", "Other").`;
}
