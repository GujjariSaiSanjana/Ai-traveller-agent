export function buildPrompt(input: {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
}): string {
  return `Generate a travel itinerary for a trip to ${input.destination} for ${input.durationDays} days.
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
}`;
}
