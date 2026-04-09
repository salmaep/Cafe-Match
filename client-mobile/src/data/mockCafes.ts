import { Cafe } from "../types";

export const MOCK_CAFES: Cafe[] = [
  {
    id: "1",
    name: "Kopi Kenangan Heritage",
    photos: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800",
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800",
    ],
    distance: 0.3,
    address: "Jl. Sudirman No. 12, Jakarta Selatan",
    latitude: -6.2088,
    longitude: 106.8456,
    purposes: ["WFC", "Me Time"],
    facilities: ["WiFi", "Power Outlet", "Quiet Atmosphere"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Americano", price: 28000 },
          { name: "Cappuccino", price: 32000 },
          { name: "Latte", price: 35000 },
        ],
      },
      {
        category: "Non-Coffee",
        items: [
          { name: "Matcha Latte", price: 35000 },
          { name: "Chocolate", price: 30000 },
        ],
      },
      {
        category: "Snacks",
        items: [
          { name: "Croissant", price: 25000 },
          { name: "Banana Bread", price: 22000 },
        ],
      },
    ],
    matchScore: 95,
    favoritesCount: 243,
    bookmarksCount: 89,
  },
  {
    id: "2",
    name: "Titik Temu Coffee",
    photos: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
    ],
    distance: 0.7,
    address: "Jl. Kemang Raya No. 45, Jakarta Selatan",
    latitude: -6.2615,
    longitude: 106.8106,
    purposes: ["Date", "Me Time"],
    facilities: ["WiFi", "Outdoor Area", "Quiet Atmosphere"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Pour Over V60", price: 38000 },
          { name: "Flat White", price: 36000 },
          { name: "Espresso", price: 25000 },
        ],
      },
      {
        category: "Food",
        items: [
          { name: "Avocado Toast", price: 45000 },
          { name: "Eggs Benedict", price: 55000 },
        ],
      },
      {
        category: "Dessert",
        items: [{ name: "Tiramisu", price: 42000 }],
      },
    ],
    matchScore: 88,
    favoritesCount: 187,
    bookmarksCount: 56,
  },
  {
    id: "3",
    name: "Rumah Kopi Nusantara",
    photos: [
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    ],
    distance: 1.2,
    address: "Jl. Senopati No. 78, Jakarta Selatan",
    latitude: -6.235,
    longitude: 106.8,
    purposes: ["Family Time", "Group Study"],
    facilities: ["WiFi", "Parking", "Kid-Friendly", "Large Tables", "Mushola"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Kopi Tubruk", price: 20000 },
          { name: "Es Kopi Susu", price: 28000 },
          { name: "Kopi Gayo", price: 32000 },
        ],
      },
      {
        category: "Food",
        items: [
          { name: "Nasi Goreng", price: 35000 },
          { name: "Mie Goreng", price: 32000 },
          { name: "Roti Bakar", price: 22000 },
        ],
      },
    ],
    matchScore: 76,
    favoritesCount: 312,
    bookmarksCount: 145,
    promotionType: "A",
  },
  {
    id: "4",
    name: "Senja Coffee Lab",
    photos: [
      "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
      "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800",
    ],
    distance: 0.5,
    address: "Jl. Cipete Raya No. 33, Jakarta Selatan",
    latitude: -6.27,
    longitude: 106.795,
    purposes: ["WFC", "Group Study"],
    facilities: ["WiFi", "Power Outlet", "Large Tables", "Quiet Atmosphere"],
    menu: [
      {
        category: "Specialty Coffee",
        items: [
          { name: "Single Origin Filter", price: 42000 },
          { name: "Cold Brew", price: 35000 },
          { name: "Affogato", price: 38000 },
        ],
      },
      {
        category: "Tea",
        items: [
          { name: "Jasmine Tea", price: 25000 },
          { name: "Earl Grey", price: 28000 },
        ],
      },
      {
        category: "Pastry",
        items: [{ name: "Cinnamon Roll", price: 30000 }],
      },
    ],
    matchScore: 92,
    favoritesCount: 156,
    bookmarksCount: 72,
  },
  {
    id: "5",
    name: "Cafe Batavia",
    photos: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800",
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
    ],
    distance: 1.5,
    address: "Jl. Panglima Polim No. 21, Jakarta Selatan",
    latitude: -6.245,
    longitude: 106.798,
    purposes: ["Date", "Family Time"],
    facilities: ["Parking", "Outdoor Area", "Kid-Friendly", "Mushola"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "House Blend", price: 30000 },
          { name: "Caramel Macchiato", price: 38000 },
        ],
      },
      {
        category: "Food",
        items: [
          { name: "Club Sandwich", price: 48000 },
          { name: "Caesar Salad", price: 42000 },
          { name: "Pasta Carbonara", price: 55000 },
        ],
      },
    ],
    matchScore: 81,
    favoritesCount: 421,
    bookmarksCount: 198,
    promotionType: "B",
    promoTitle: "Buy 1 Get 1 All Coffee",
    promoPhoto:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
  },
  {
    id: "6",
    name: "Anomali Coffee",
    photos: [
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800",
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    ],
    distance: 0.9,
    address: "Jl. Fatmawati No. 56, Jakarta Selatan",
    latitude: -6.292,
    longitude: 106.797,
    purposes: ["Me Time", "WFC"],
    facilities: ["WiFi", "Power Outlet", "Parking"],
    menu: [
      {
        category: "Single Origin",
        items: [
          { name: "Aceh Gayo", price: 35000 },
          { name: "Toraja Sapan", price: 38000 },
          { name: "Bali Kintamani", price: 40000 },
        ],
      },
      {
        category: "Snacks",
        items: [
          { name: "Pisang Goreng", price: 18000 },
          { name: "Kentang Goreng", price: 25000 },
        ],
      },
    ],
    matchScore: 85,
    favoritesCount: 198,
    bookmarksCount: 67,
  },
  {
    id: "7",
    name: "Kedai Filosofi",
    photos: [
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
      "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800",
    ],
    distance: 1.8,
    address: "Jl. Radio Dalam No. 89, Jakarta Selatan",
    latitude: -6.258,
    longitude: 106.783,
    purposes: ["Group Study", "WFC"],
    facilities: ["WiFi", "Power Outlet", "Large Tables", "Mushola", "Parking"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Kopi Susu Gula Aren", price: 25000 },
          { name: "Americano", price: 22000 },
          { name: "Vietnam Drip", price: 28000 },
        ],
      },
      {
        category: "Rice Bowl",
        items: [
          { name: "Chicken Katsu Bowl", price: 38000 },
          { name: "Beef Teriyaki Bowl", price: 42000 },
        ],
      },
      {
        category: "Dessert",
        items: [{ name: "Es Cendol", price: 18000 }],
      },
    ],
    matchScore: 70,
    favoritesCount: 89,
    bookmarksCount: 34,
    promotionType: "A",
  },
  {
    id: "8",
    name: "Hario Cafe",
    photos: [
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    ],
    distance: 0.4,
    address: "Jl. Gandaria No. 15, Jakarta Selatan",
    latitude: -6.248,
    longitude: 106.79,
    purposes: ["Me Time", "Date"],
    facilities: ["WiFi", "Quiet Atmosphere", "Outdoor Area"],
    menu: [
      {
        category: "Pour Over",
        items: [
          { name: "Hario V60", price: 40000 },
          { name: "Chemex", price: 45000 },
          { name: "Aeropress", price: 38000 },
        ],
      },
      {
        category: "Light Bites",
        items: [
          { name: "Granola Bowl", price: 35000 },
          { name: "Bruschetta", price: 32000 },
        ],
      },
    ],
    matchScore: 90,
    favoritesCount: 167,
    bookmarksCount: 78,
  },
  {
    id: "9",
    name: "Warung Kopi Limarasa",
    photos: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
      "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800",
      "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800",
    ],
    distance: 1.1,
    address: "Jl. Blok M No. 67, Jakarta Selatan",
    latitude: -6.244,
    longitude: 106.798,
    purposes: ["Family Time", "Group Study"],
    facilities: [
      "Parking",
      "Large Tables",
      "Kid-Friendly",
      "Mushola",
      "Power Outlet",
    ],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Kopi Hitam", price: 15000 },
          { name: "Kopi Susu", price: 20000 },
        ],
      },
      {
        category: "Food",
        items: [
          { name: "Ayam Geprek", price: 28000 },
          { name: "Indomie Goreng", price: 18000 },
          { name: "Nasi Uduk", price: 25000 },
        ],
      },
      {
        category: "Drinks",
        items: [
          { name: "Es Teh Manis", price: 10000 },
          { name: "Jus Alpukat", price: 22000 },
        ],
      },
    ],
    matchScore: 73,
    favoritesCount: 256,
    bookmarksCount: 112,
    promotionType: "B",
    promoTitle: "Free Snack with Any Coffee",
    promoPhoto:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
  },
  {
    id: "10",
    name: "The Goods Cafe",
    photos: [
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800",
    ],
    distance: 1.4,
    address: "Jl. Pejaten Barat No. 102, Jakarta Selatan",
    latitude: -6.28,
    longitude: 106.83,
    purposes: ["Date", "WFC", "Me Time"],
    facilities: ["WiFi", "Power Outlet", "Outdoor Area", "Parking"],
    menu: [
      {
        category: "Signature Drinks",
        items: [
          { name: "Goods Latte", price: 42000 },
          { name: "Iced Mocha", price: 40000 },
          { name: "Butterfly Pea Latte", price: 38000 },
        ],
      },
      {
        category: "Brunch",
        items: [
          { name: "Pancake Stack", price: 48000 },
          { name: "French Toast", price: 45000 },
        ],
      },
      {
        category: "Mains",
        items: [{ name: "Truffle Fries", price: 52000 }],
      },
    ],
    matchScore: 83,
    favoritesCount: 334,
    bookmarksCount: 156,
  },
  // ── Dago Bandung (5 cafes) ──────────────────────────────────────────────────
  {
    id: "11",
    name: "Hutan Kota Dago",
    photos: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
    ],
    distance: 0.4,
    address: "Jl. Ir. H. Djuanda No. 28, Dago, Bandung",
    latitude: -6.8793,
    longitude: 107.6102,
    purposes: ["Me Time", "Date"],
    facilities: ["WiFi", "Outdoor Area", "Quiet Atmosphere", "Parking"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Arabika Dago", price: 30000 },
          { name: "Cold Brew", price: 33000 },
        ],
      },
      { category: "Snacks", items: [{ name: "Pisang Bakar", price: 20000 }] },
    ],
    matchScore: 88,
    favoritesCount: 214,
    bookmarksCount: 93,
  },
  {
    id: "12",
    name: "Filosofi Kopi Dago",
    photos: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    ],
    distance: 0.7,
    address: "Jl. Dago Asri No. 12, Bandung",
    latitude: -6.881,
    longitude: 107.6088,
    purposes: ["WFC", "Group Study"],
    facilities: ["WiFi", "Power Outlet", "Large Tables", "Mushola"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "V60 Gayo", price: 38000 },
          { name: "Espresso", price: 25000 },
        ],
      },
      {
        category: "Food",
        items: [{ name: "Nasi Goreng Kampung", price: 30000 }],
      },
    ],
    matchScore: 82,
    favoritesCount: 176,
    bookmarksCount: 67,
  },
  {
    id: "13",
    name: "Kopi Toko Djawa Dago",
    photos: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
    ],
    distance: 1.0,
    address: "Jl. Dago Pojok No. 5, Bandung",
    latitude: -6.878,
    longitude: 107.612,
    purposes: ["Date", "Me Time"],
    facilities: ["WiFi", "Quiet Atmosphere", "Outdoor Area"],
    menu: [
      {
        category: "Signature",
        items: [
          { name: "Es Kopi Susu Djawa", price: 27000 },
          { name: "Kopi Tubruk", price: 18000 },
        ],
      },
    ],
    matchScore: 79,
    favoritesCount: 143,
    bookmarksCount: 55,
  },
  {
    id: "14",
    name: "Dago Raya Cafe",
    photos: [
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
    ],
    distance: 0.6,
    address: "Jl. Dago Raya No. 90, Bandung",
    latitude: -6.882,
    longitude: 107.6095,
    purposes: ["Family Time", "Group Study"],
    facilities: ["Parking", "Kid-Friendly", "Large Tables", "Mushola", "WiFi"],
    menu: [
      { category: "Coffee", items: [{ name: "Cappuccino", price: 32000 }] },
      {
        category: "Food",
        items: [
          { name: "Mie Kocok Bandung", price: 35000 },
          { name: "Batagor", price: 25000 },
        ],
      },
    ],
    matchScore: 75,
    favoritesCount: 290,
    bookmarksCount: 110,
    promotionType: "B",
    promoTitle: "Gratis Batagor untuk Setiap Pembelian Kopi",
    promoPhoto:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    promotionContent: {
      title: "Gratis Batagor untuk Setiap Pembelian Kopi",
      description: "Pesan kopi apapun dan dapatkan satu porsi batagor gratis!",
      validHours: "10:00 – 21:00",
      validDays: "Senin – Jumat",
      promoPhoto:
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    },
  },
  {
    id: "15",
    name: "Puncak Dago Koffie",
    photos: [
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800",
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800",
    ],
    distance: 1.4,
    address: "Jl. Bukit Dago Utara No. 3, Bandung",
    latitude: -6.876,
    longitude: 107.613,
    purposes: ["Me Time", "Date", "WFC"],
    facilities: ["WiFi", "Power Outlet", "Outdoor Area", "Quiet Atmosphere"],
    menu: [
      {
        category: "Specialty Coffee",
        items: [
          { name: "Single Origin Flores", price: 42000 },
          { name: "Flat White", price: 36000 },
        ],
      },
      {
        category: "Pastry",
        items: [{ name: "Croissant Almond", price: 28000 }],
      },
    ],
    matchScore: 91,
    favoritesCount: 325,
    bookmarksCount: 148,
  },

  // ── Tebet Jakarta (5 cafes) ─────────────────────────────────────────────────
  {
    id: "16",
    name: "Tebet Social House",
    photos: [
      "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800",
      "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800",
    ],
    distance: 0.3,
    address: "Jl. Tebet Barat Dalam No. 7, Jakarta Selatan",
    latitude: -6.224,
    longitude: 106.845,
    purposes: ["WFC", "Me Time"],
    facilities: ["WiFi", "Power Outlet", "Quiet Atmosphere"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Latte", price: 34000 },
          { name: "Americano", price: 26000 },
        ],
      },
      { category: "Brunch", items: [{ name: "Eggs Benedict", price: 52000 }] },
    ],
    matchScore: 86,
    favoritesCount: 201,
    bookmarksCount: 79,
  },
  {
    id: "17",
    name: "Ruang Kopi Tebet",
    photos: [
      "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
    ],
    distance: 0.5,
    address: "Jl. Tebet Timur Dalam No. 33, Jakarta Selatan",
    latitude: -6.2255,
    longitude: 106.846,
    purposes: ["Group Study", "WFC"],
    facilities: ["WiFi", "Power Outlet", "Large Tables", "Parking"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Pour Over", price: 36000 },
          { name: "Cold Brew", price: 32000 },
        ],
      },
      { category: "Snacks", items: [{ name: "Kentang Goreng", price: 22000 }] },
    ],
    matchScore: 83,
    favoritesCount: 167,
    bookmarksCount: 63,
  },
  {
    id: "18",
    name: "Dapur Tebet",
    photos: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
    ],
    distance: 0.8,
    address: "Jl. Tebet Raya No. 88, Jakarta Selatan",
    latitude: -6.223,
    longitude: 106.844,
    purposes: ["Family Time", "Date"],
    facilities: ["Parking", "Kid-Friendly", "Outdoor Area", "Mushola"],
    menu: [
      {
        category: "Food",
        items: [
          { name: "Ayam Bakar", price: 45000 },
          { name: "Gado-Gado", price: 32000 },
        ],
      },
      { category: "Coffee", items: [{ name: "Kopi Susu", price: 22000 }] },
    ],
    matchScore: 74,
    favoritesCount: 278,
    bookmarksCount: 105,
  },
  {
    id: "19",
    name: "Quarter Tebet",
    photos: [
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
    ],
    distance: 0.6,
    address: "Jl. DR. Saharjo No. 126, Tebet, Jakarta Selatan",
    latitude: -6.226,
    longitude: 106.843,
    purposes: ["Me Time", "Date", "WFC"],
    facilities: ["WiFi", "Quiet Atmosphere", "Power Outlet"],
    menu: [
      {
        category: "Specialty Coffee",
        items: [
          { name: "Aeropress", price: 38000 },
          { name: "Chemex", price: 42000 },
        ],
      },
      { category: "Dessert", items: [{ name: "Tiramisu", price: 40000 }] },
    ],
    matchScore: 89,
    favoritesCount: 234,
    bookmarksCount: 98,
  },
  {
    id: "20",
    name: "Warung Literasi Tebet",
    photos: [
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    ],
    distance: 1.1,
    address: "Jl. Tebet Utara No. 12, Jakarta Selatan",
    latitude: -6.222,
    longitude: 106.8455,
    purposes: ["Group Study", "Me Time"],
    facilities: ["WiFi", "Large Tables", "Quiet Atmosphere", "Power Outlet"],
    menu: [
      {
        category: "Coffee",
        items: [
          { name: "Kopi Susu Gula Aren", price: 24000 },
          { name: "Matcha", price: 30000 },
        ],
      },
      { category: "Snacks", items: [{ name: "Roti Bakar", price: 18000 }] },
    ],
    matchScore: 77,
    favoritesCount: 152,
    bookmarksCount: 59,
  },

  // ── Morningside Coffee — Type A "New Cafe" at Dago Bandung ──────────────────
  {
    id: "21",
    name: "Morningside Coffee",
    photos: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800",
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
    ],
    distance: 0.2,
    address: "Jl. Ir. H. Djuanda No. 55, Dago, Bandung",
    latitude: -6.88,
    longitude: 107.61,
    purposes: ["Me Time", "Date", "WFC"],
    facilities: [
      "WiFi",
      "Power Outlet",
      "Outdoor Area",
      "Quiet Atmosphere",
      "Parking",
    ],
    menu: [
      {
        category: "Signature Drinks",
        items: [
          { name: "Morning Blend Filter", price: 38000 },
          { name: "Morningside Latte", price: 40000 },
          { name: "Sunrise Cold Brew", price: 36000 },
        ],
      },
      {
        category: "Breakfast",
        items: [
          { name: "Avocado Toast", price: 48000 },
          { name: "Granola Bowl", price: 40000 },
          { name: "French Toast", price: 44000 },
        ],
      },
    ],
    matchScore: 97,
    favoritesCount: 18,
    bookmarksCount: 7,
    promotionType: "A",
    hasActivePromotion: true,
    activePromotionType: "new_cafe",
    newCafeContent: {
      openingSince: "April 2026",
      highlightText:
        "Bandung's newest specialty coffee destination — perched on Dago hill with panoramic city views.",
      keunggulan: [
        "Single-origin beans sourced from Aceh & Flores",
        "Panoramic Dago hill view",
        "Specialty pour-over bar",
        "Full breakfast menu",
        "Free WiFi 50 Mbps",
      ],
      promoOffer: "Grand Opening: 20% off all drinks for the first month!",
      promoPhoto:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    },
  },
];

// Default user location (Jakarta Selatan)
export const DEFAULT_LOCATION = {
  latitude: -6.26,
  longitude: 106.81,
};
