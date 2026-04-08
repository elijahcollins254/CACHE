export type MarketType = "binary" | "versus" | "list" | "updown";

export interface Outcome {
  label: string;
  probability: number;
}

export interface Market {
  id: string;
  question: string;
  category: string;
  type: MarketType;
  outcomes?: Outcome[]; // For "list" or "versus"
  yesProbability?: number; // For "binary"
  volume: string;
  image: string;
  endDate: string;
  live?: boolean;
}

export const markets: Market[] = [
  {
    id: "1",
    question: "Seahawks vs Patriots",
    category: "NFL",
    type: "versus",
    outcomes: [
      { label: "Seahawks", probability: 69 },
      { label: "Patriots", probability: 31 }
    ],
    volume: "KES 10M",
    image: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=64&h=64&fit=crop",
    endDate: "Feb 09, 2:30 AM"
  },
  {
    id: "2",
    question: "US strikes Iran by...?",
    category: "Geopolitics",
    type: "list",
    outcomes: [
      { label: "February 13", probability: 12 },
      { label: "February 20", probability: 18 }
    ],
    volume: "KES 175M",
    image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=64&h=64&fit=crop",
    endDate: "Feb 28, 2026"
  },
  {
    id: "3",
    question: "BTC 15 Minute Up or Down",
    category: "Crypto",
    type: "updown",
    yesProbability: 76,
    volume: "KES 25M",
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=64&h=64&fit=crop",
    endDate: "LIVE",
    live: true
  },
  {
    id: "4",
    question: "Will Nairobi experience above-average rainfall in March 2026?",
    category: "Environment",
    type: "binary",
    yesProbability: 65,
    volume: "KES 1.2M",
    image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=64&h=64&fit=crop",
    endDate: "Mar 31, 2026"
  },
  {
    id: "5",
    question: "Will the KES/USD exchange rate stay below 130.00 until June 2026?",
    category: "Economy",
    type: "binary",
    yesProbability: 42,
    volume: "KES 4.5M",
    image: "https://images.unsplash.com/photo-1526303328194-ed252289912c?w=64&h=64&fit=crop",
    endDate: "Jun 30, 2026"
  },
  {
    id: "6",
    question: "Mamdani opens city-owned grocery store by...?",
    category: "Politics",
    type: "binary",
    yesProbability: 14,
    volume: "KES 167K",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=64&h=64&fit=crop",
    endDate: "Apr 15, 2026"
  },
  {
    id: "7",
    question: "Where will Giannis be traded?",
    category: "Sports",
    type: "list",
    outcomes: [
      { label: "Not Traded", probability: 83 },
      { label: "Heat", probability: 7 }
    ],
    volume: "KES 3M",
    image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=64&h=64&fit=crop",
    endDate: "Jun 1, 2026"
  },
  {
    id: "8",
    question: "S&P 500 (SPX) Opens Up or Down on February 5?",
    category: "Finance",
    type: "updown",
    yesProbability: 54,
    volume: "KES 232K",
    image: "https://images.unsplash.com/photo-1611974714022-293e5454687d?w=64&h=64&fit=crop",
    endDate: "Feb 5, 2026"
  }
];
