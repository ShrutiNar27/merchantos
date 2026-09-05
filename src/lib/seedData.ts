export interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  priceInr: number;
  stock: number;
  sizes: string;
  deliveryDays: string;
  aiTags: string;
  description: string;
  imageEmoji: string;
}

const SHOE_SIZES = "7,8,9,10,11";
const ONE_SIZE = "One Size";

export const PRODUCTS: SeedProduct[] = [
  // Running Shoes
  { sku: "RS-001", name: "StrideX ProRun X1", category: "Running Shoes", priceInr: 4299, stock: 42, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "daily running,beginner friendly,lightweight,road running,cushioned", description: "Lightweight everyday trainer built for daily road running.", imageEmoji: "👟" },
  { sku: "RS-002", name: "StrideX ProRun X2 Elite", category: "Running Shoes", priceInr: 6499, stock: 18, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "marathon,premium,cushioned,road running,durable", description: "Race-day cushioning for serious marathon training.", imageEmoji: "👟" },
  { sku: "RS-003", name: "StrideX TrailBlaze", category: "Running Shoes", priceInr: 5299, stock: 27, sizes: SHOE_SIZES, deliveryDays: "3-4 days", aiTags: "trail running,durable,waterproof,rugged", description: "Grip-focused trail shoe for off-road running.", imageEmoji: "🥾" },
  { sku: "RS-004", name: "StrideX AirLite", category: "Running Shoes", priceInr: 3799, stock: 35, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "daily running,lightweight,breathable,budget", description: "Breathable mesh trainer, our lightest daily runner.", imageEmoji: "👟" },
  { sku: "RS-005", name: "StrideX NightRunner", category: "Running Shoes", priceInr: 4999, stock: 22, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "daily running,reflective,cushioned,evening running", description: "Reflective trim trainer built for low-light runs.", imageEmoji: "👟" },

  // Training Shoes
  { sku: "TS-001", name: "StrideX CrossTrain Pro", category: "Training Shoes", priceInr: 4599, stock: 30, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "gym,training,stable,durable", description: "Stable base for lifting, HIIT and cross-training.", imageEmoji: "🏋️" },
  { sku: "TS-002", name: "StrideX FlexGrip", category: "Training Shoes", priceInr: 3999, stock: 40, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "gym,training,lightweight,breathable", description: "Flexible grip sole for functional training circuits.", imageEmoji: "🏋️" },
  { sku: "TS-003", name: "StrideX PowerLift", category: "Training Shoes", priceInr: 5499, stock: 15, sizes: SHOE_SIZES, deliveryDays: "3-4 days", aiTags: "gym,training,stable,premium", description: "Flat, stable sole purpose-built for heavy lifts.", imageEmoji: "🏋️" },
  { sku: "TS-004", name: "StrideX HIIT One", category: "Training Shoes", priceInr: 3599, stock: 33, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "gym,training,lightweight,budget", description: "Entry-level training shoe for daily gym sessions.", imageEmoji: "🏋️" },
  { sku: "TS-005", name: "StrideX CoreFit", category: "Training Shoes", priceInr: 4199, stock: 24, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "gym,training,breathable,stable", description: "All-round training shoe for mixed workouts.", imageEmoji: "🏋️" },

  // Sports Socks
  { sku: "SO-001", name: "StrideX Performance Socks (Pack of 3)", category: "Sports Socks", priceInr: 399, stock: 120, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "daily running,breathable,cushioned,moisture-wicking", description: "Cushioned, moisture-wicking socks for daily runs.", imageEmoji: "🧦" },
  { sku: "SO-002", name: "StrideX Compression Running Socks", category: "Sports Socks", priceInr: 599, stock: 85, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "marathon,recovery,compression,premium", description: "Graduated compression for long-distance recovery.", imageEmoji: "🧦" },
  { sku: "SO-003", name: "StrideX Ankle Sport Socks (Pack of 5)", category: "Sports Socks", priceInr: 499, stock: 95, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "gym,training,breathable,budget", description: "Everyday ankle socks for gym and training.", imageEmoji: "🧦" },
  { sku: "SO-004", name: "StrideX Trail Crew Socks", category: "Sports Socks", priceInr: 449, stock: 60, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "trail running,durable,cushioned", description: "Crew-length cushioned socks for trail runs.", imageEmoji: "🧦" },
  { sku: "SO-005", name: "StrideX No-Show Socks (Pack of 3)", category: "Sports Socks", priceInr: 349, stock: 110, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "daily running,lightweight,breathable", description: "Low-cut breathable socks for warm-weather runs.", imageEmoji: "🧦" },

  // Running Shorts
  { sku: "SH-001", name: "StrideX AeroShort", category: "Running Shorts", priceInr: 999, stock: 55, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "daily running,lightweight,breathable", description: "Split-hem shorts built for airflow on daily runs.", imageEmoji: "🩳" },
  { sku: "SH-002", name: "StrideX 2-in-1 Training Short", category: "Running Shorts", priceInr: 1299, stock: 40, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "gym,training,compression,premium", description: "Compression liner shorts for gym and track.", imageEmoji: "🩳" },
  { sku: "SH-003", name: "StrideX Marathon Short", category: "Running Shorts", priceInr: 1499, stock: 25, sizes: "S,M,L,XL", deliveryDays: "3-4 days", aiTags: "marathon,lightweight,premium", description: "Zip-pocket racing shorts for race day.", imageEmoji: "🩳" },
  { sku: "SH-004", name: "StrideX Basic Gym Short", category: "Running Shorts", priceInr: 699, stock: 70, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "gym,budget,breathable", description: "Everyday shorts for the gym floor.", imageEmoji: "🩳" },
  { sku: "SH-005", name: "StrideX Trail Short", category: "Running Shorts", priceInr: 1199, stock: 30, sizes: "S,M,L,XL", deliveryDays: "3-4 days", aiTags: "trail running,durable,water-resistant", description: "Rugged shorts with storage for trail days.", imageEmoji: "🩳" },

  // Gym Bags
  { sku: "GB-001", name: "StrideX Duffel 35L", category: "Gym Bags", priceInr: 1899, stock: 45, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "gym,durable,spacious", description: "35L duffel with dedicated shoe compartment.", imageEmoji: "🎒" },
  { sku: "GB-002", name: "StrideX Backpack Pro", category: "Gym Bags", priceInr: 2299, stock: 32, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "gym,training,durable,premium", description: "Structured backpack with laptop and gym sleeves.", imageEmoji: "🎒" },
  { sku: "GB-003", name: "StrideX Compact Gym Tote", category: "Gym Bags", priceInr: 1299, stock: 50, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "gym,lightweight,budget", description: "Compact tote for quick gym sessions.", imageEmoji: "🎒" },
  { sku: "GB-004", name: "StrideX Trail Hydration Pack", category: "Gym Bags", priceInr: 2799, stock: 18, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "trail running,hydration,premium", description: "Hydration-ready vest pack for trail runs.", imageEmoji: "🎒" },
  { sku: "GB-005", name: "StrideX Weekender 50L", category: "Gym Bags", priceInr: 3199, stock: 12, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "travel,spacious,durable,premium", description: "50L weekender for travel and training camps.", imageEmoji: "🎒" },

  // Water Bottles
  { sku: "WB-001", name: "StrideX Sport Bottle 750ml", category: "Water Bottles", priceInr: 599, stock: 140, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "daily running,lightweight,budget", description: "Leak-proof 750ml bottle with flip cap.", imageEmoji: "🥤" },
  { sku: "WB-002", name: "StrideX Insulated Steel Bottle 1L", category: "Water Bottles", priceInr: 999, stock: 75, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "gym,durable,premium,insulated", description: "24-hour insulated steel bottle, 1L.", imageEmoji: "🥤" },
  { sku: "WB-003", name: "StrideX Trail Soft Flask 500ml", category: "Water Bottles", priceInr: 449, stock: 90, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "trail running,lightweight,collapsible", description: "Collapsible soft flask for hydration vests.", imageEmoji: "🥤" },
  { sku: "WB-004", name: "StrideX Shaker Bottle 700ml", category: "Water Bottles", priceInr: 349, stock: 130, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "gym,budget,shaker", description: "Wire-whisk shaker for pre/post workout mixes.", imageEmoji: "🥤" },
  { sku: "WB-005", name: "StrideX Marathon Handheld Bottle 300ml", category: "Water Bottles", priceInr: 699, stock: 48, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "marathon,lightweight,handheld", description: "Ergonomic handheld bottle for race day.", imageEmoji: "🥤" },

  // Fitness Watches
  { sku: "FW-001", name: "StrideX Pulse Lite", category: "Fitness Watches", priceInr: 3499, stock: 38, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "daily running,budget,heart rate", description: "Entry fitness watch with heart-rate tracking.", imageEmoji: "⌚" },
  { sku: "FW-002", name: "StrideX Pulse GPS", category: "Fitness Watches", priceInr: 7999, stock: 20, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "marathon,gps,premium,training", description: "Built-in GPS watch for pace and route tracking.", imageEmoji: "⌚" },
  { sku: "FW-003", name: "StrideX Pulse Elite", category: "Fitness Watches", priceInr: 18999, stock: 9, sizes: ONE_SIZE, deliveryDays: "4-5 days", aiTags: "marathon,premium,gps,advanced analytics", description: "Flagship multisport watch with advanced training analytics.", imageEmoji: "⌚" },
  { sku: "FW-004", name: "StrideX Band Fit", category: "Fitness Watches", priceInr: 2299, stock: 60, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "gym,budget,step tracking", description: "Lightweight fitness band for everyday step tracking.", imageEmoji: "⌚" },
  { sku: "FW-005", name: "StrideX Pulse Sport", category: "Fitness Watches", priceInr: 5499, stock: 26, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "training,gym,heart rate,durable", description: "Mid-range training watch with heart-rate zones.", imageEmoji: "⌚" },

  // Sports T-Shirts
  { sku: "TSH-001", name: "StrideX DriFit Tee", category: "Sports T-Shirts", priceInr: 799, stock: 100, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "daily running,breathable,lightweight", description: "Moisture-wicking tee for daily training.", imageEmoji: "👕" },
  { sku: "TSH-002", name: "StrideX CoolMax Tee", category: "Sports T-Shirts", priceInr: 999, stock: 70, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "gym,training,breathable,premium", description: "Advanced cooling fabric for high-intensity workouts.", imageEmoji: "👕" },
  { sku: "TSH-003", name: "StrideX Marathon Singlet", category: "Running Shorts", priceInr: 899, stock: 35, sizes: "S,M,L,XL", deliveryDays: "3-4 days", aiTags: "marathon,lightweight,race day", description: "Ultra-light singlet built for race day.", imageEmoji: "👕" },
  { sku: "TSH-004", name: "StrideX Basic Tee (Pack of 2)", category: "Sports T-Shirts", priceInr: 1099, stock: 85, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "gym,budget,breathable", description: "Everyday cotton-blend training tee, pack of 2.", imageEmoji: "👕" },
  { sku: "TSH-005", name: "StrideX LongSleeve Thermal Tee", category: "Sports T-Shirts", priceInr: 1299, stock: 28, sizes: "S,M,L,XL", deliveryDays: "3-4 days", aiTags: "trail running,durable,winter running", description: "Thermal long-sleeve for cold-weather runs.", imageEmoji: "👕" },

  // Insoles
  { sku: "IN-001", name: "StrideX ComfortFit Insoles", category: "Insoles", priceInr: 499, stock: 90, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "daily running,cushioned,comfort", description: "Everyday cushioned insoles for daily runners.", imageEmoji: "🦶" },
  { sku: "IN-002", name: "StrideX Arch Support Insoles", category: "Insoles", priceInr: 699, stock: 55, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "training,arch support,premium", description: "Structured arch support for high-mileage weeks.", imageEmoji: "🦶" },
  { sku: "IN-003", name: "StrideX Recovery Gel Insoles", category: "Insoles", priceInr: 799, stock: 40, sizes: SHOE_SIZES, deliveryDays: "3-4 days", aiTags: "recovery,cushioned,premium", description: "Gel cushioning insoles to reduce joint impact.", imageEmoji: "🦶" },
  { sku: "IN-004", name: "StrideX Trail Support Insoles", category: "Insoles", priceInr: 649, stock: 33, sizes: SHOE_SIZES, deliveryDays: "3-4 days", aiTags: "trail running,durable,arch support", description: "Reinforced insoles for uneven trail terrain.", imageEmoji: "🦶" },
  { sku: "IN-005", name: "StrideX Everyday Insoles (Budget)", category: "Insoles", priceInr: 349, stock: 100, sizes: SHOE_SIZES, deliveryDays: "2-3 days", aiTags: "gym,budget,comfort", description: "Affordable replacement insoles for everyday shoes.", imageEmoji: "🦶" },

  // Recovery
  { sku: "RC-001", name: "StrideX Foam Roller", category: "Recovery", priceInr: 899, stock: 65, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "recovery,muscle relief,training", description: "High-density foam roller for post-run recovery.", imageEmoji: "🧘" },
  { sku: "RC-002", name: "StrideX Massage Gun Mini", category: "Recovery", priceInr: 3999, stock: 24, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "recovery,premium,muscle relief", description: "Compact percussion massage gun for muscle recovery.", imageEmoji: "🧘" },
  { sku: "RC-003", name: "StrideX Compression Sleeves", category: "Recovery", priceInr: 799, stock: 58, sizes: "S,M,L,XL", deliveryDays: "2-3 days", aiTags: "recovery,compression,marathon", description: "Calf compression sleeves for faster recovery.", imageEmoji: "🧘" },
  { sku: "RC-004", name: "StrideX Cooling Ice Roller", category: "Recovery", priceInr: 649, stock: 42, sizes: ONE_SIZE, deliveryDays: "3-4 days", aiTags: "recovery,cooling,budget", description: "Cooling roller for post-run inflammation relief.", imageEmoji: "🧘" },
  { sku: "RC-005", name: "StrideX Resistance Band Set", category: "Recovery", priceInr: 599, stock: 80, sizes: ONE_SIZE, deliveryDays: "2-3 days", aiTags: "recovery,training,mobility,budget", description: "5-band mobility and rehab set.", imageEmoji: "🧘" },
];

export const FIRST_NAMES = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Ananya","Diya","Saanvi","Aadhya","Myra","Pari","Anika","Navya","Riya","Ira",
  "Rohan","Karan","Nikhil","Varun","Siddharth","Rahul","Aman","Dev","Kabir","Arnav",
  "Priya","Neha","Pooja","Sneha","Kavya","Meera","Tanvi","Isha","Shreya","Sanya",
];

export const LAST_NAMES = [
  "Sharma","Verma","Gupta","Iyer","Nair","Patel","Reddy","Rao","Mehta","Kapoor",
  "Singh","Kumar","Joshi","Malhotra","Chatterjee","Bose","Pillai","Menon","Desai","Agarwal",
];

export const CAMPAIGN_TEMPLATES = [
  { name: "Weekend Bundle Blitz", goal: "Increase weekend revenue via bundling", target: "Repeat customers", action: "Bundle running shoes + performance socks at 8% off", expectedRevenueInr: 18400, discountCostInr: 1600, status: "COMPLETED" },
  { name: "Cart Recovery Sprint", goal: "Recover abandoned carts", target: "Abandoned carts (last 14 days)", action: "Reminder email + 8% limited-time incentive", expectedRevenueInr: 9800, discountCostInr: 900, status: "COMPLETED" },
  { name: "Premium Watch Push", goal: "Upsell high-value customers", target: "High-value customers", action: "Recommend StrideX Pulse GPS to recent shoe buyers", expectedRevenueInr: 12200, discountCostInr: 0, status: "ACTIVE" },
  { name: "Marathon Season Kickoff", goal: "Drive marathon category sales", target: "Customers tagged 'marathon' preference", action: "Feature marathon shoes + compression socks bundle", expectedRevenueInr: 21500, discountCostInr: 2100, status: "COMPLETED" },
  { name: "New Customer Welcome Bundle", goal: "Increase first-order AOV", target: "New customers (first 30 days)", action: "Shoes + socks starter bundle at 10% off", expectedRevenueInr: 8600, discountCostInr: 860, status: "COMPLETED" },
  { name: "Recovery Range Awareness", goal: "Cross-sell recovery products", target: "Customers with 3+ orders", action: "Foam roller + compression sleeve bundle offer", expectedRevenueInr: 7200, discountCostInr: 500, status: "ACTIVE" },
  { name: "Low-Stock Clearance — Trail Shoes", goal: "Move low-stock inventory", target: "Trail running segment", action: "Limited stock alert + 9% incentive", expectedRevenueInr: 6100, discountCostInr: 550, status: "COMPLETED" },
  { name: "Insole Attach Campaign", goal: "Increase insole attach rate at checkout", target: "Shoe purchasers at checkout", action: "One-click insole add-on at 10% off", expectedRevenueInr: 5400, discountCostInr: 400, status: "ACTIVE" },
  { name: "Festive Fitness Push", goal: "Seasonal revenue boost", target: "All active customers", action: "Storewide fitness watch + band spotlight", expectedRevenueInr: 15600, discountCostInr: 1200, status: "DRAFT" },
  { name: "Gym Bag Bundle Trial", goal: "Test bundle attach on bags", target: "Training shoe purchasers", action: "Gym bag + shaker bottle bundle at 7% off", expectedRevenueInr: 4300, discountCostInr: 300, status: "DRAFT" },
];
