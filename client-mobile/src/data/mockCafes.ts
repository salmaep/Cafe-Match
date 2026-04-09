import { Cafe } from '../types';

export const MOCK_CAFES: Cafe[] = [
  {
    id: '1',
    name: 'Kopi Kenangan Heritage',
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800',
    ],
    distance: 0.3,
    address: 'Jl. Sudirman No. 12, Jakarta Selatan',
    latitude: -6.2088,
    longitude: 106.8456,
    purposes: ['WFC', 'Me Time'],
    facilities: ['WiFi', 'Power Outlet', 'Quiet Atmosphere'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Americano', price: 28000 },
          { name: 'Cappuccino', price: 32000 },
          { name: 'Latte', price: 35000 },
        ],
      },
      {
        category: 'Non-Coffee',
        items: [
          { name: 'Matcha Latte', price: 35000 },
          { name: 'Chocolate', price: 30000 },
        ],
      },
      {
        category: 'Snacks',
        items: [
          { name: 'Croissant', price: 25000 },
          { name: 'Banana Bread', price: 22000 },
        ],
      },
    ],
    matchScore: 95,
    favoritesCount: 243,
    bookmarksCount: 89,
  },
  {
    id: '2',
    name: 'Titik Temu Coffee',
    photos: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
      'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
    ],
    distance: 0.7,
    address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
    latitude: -6.2615,
    longitude: 106.8106,
    purposes: ['Date', 'Me Time'],
    facilities: ['WiFi', 'Outdoor Area', 'Quiet Atmosphere'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Pour Over V60', price: 38000 },
          { name: 'Flat White', price: 36000 },
          { name: 'Espresso', price: 25000 },
        ],
      },
      {
        category: 'Food',
        items: [
          { name: 'Avocado Toast', price: 45000 },
          { name: 'Eggs Benedict', price: 55000 },
        ],
      },
      {
        category: 'Dessert',
        items: [
          { name: 'Tiramisu', price: 42000 },
        ],
      },
    ],
    matchScore: 88,
    favoritesCount: 187,
    bookmarksCount: 56,
  },
  {
    id: '3',
    name: 'Rumah Kopi Nusantara',
    photos: [
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    ],
    distance: 1.2,
    address: 'Jl. Senopati No. 78, Jakarta Selatan',
    latitude: -6.2350,
    longitude: 106.8000,
    purposes: ['Family Time', 'Group Study'],
    facilities: ['WiFi', 'Parking', 'Kid-Friendly', 'Large Tables', 'Mushola'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Kopi Tubruk', price: 20000 },
          { name: 'Es Kopi Susu', price: 28000 },
          { name: 'Kopi Gayo', price: 32000 },
        ],
      },
      {
        category: 'Food',
        items: [
          { name: 'Nasi Goreng', price: 35000 },
          { name: 'Mie Goreng', price: 32000 },
          { name: 'Roti Bakar', price: 22000 },
        ],
      },
    ],
    matchScore: 76,
    favoritesCount: 312,
    bookmarksCount: 145,
    promotionType: 'A',
  },
  {
    id: '4',
    name: 'Senja Coffee Lab',
    photos: [
      'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
      'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800',
    ],
    distance: 0.5,
    address: 'Jl. Cipete Raya No. 33, Jakarta Selatan',
    latitude: -6.2700,
    longitude: 106.7950,
    purposes: ['WFC', 'Group Study'],
    facilities: ['WiFi', 'Power Outlet', 'Large Tables', 'Quiet Atmosphere'],
    menu: [
      {
        category: 'Specialty Coffee',
        items: [
          { name: 'Single Origin Filter', price: 42000 },
          { name: 'Cold Brew', price: 35000 },
          { name: 'Affogato', price: 38000 },
        ],
      },
      {
        category: 'Tea',
        items: [
          { name: 'Jasmine Tea', price: 25000 },
          { name: 'Earl Grey', price: 28000 },
        ],
      },
      {
        category: 'Pastry',
        items: [
          { name: 'Cinnamon Roll', price: 30000 },
        ],
      },
    ],
    matchScore: 92,
    favoritesCount: 156,
    bookmarksCount: 72,
  },
  {
    id: '5',
    name: 'Cafe Batavia',
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800',
      'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
    ],
    distance: 1.5,
    address: 'Jl. Panglima Polim No. 21, Jakarta Selatan',
    latitude: -6.2450,
    longitude: 106.7980,
    purposes: ['Date', 'Family Time'],
    facilities: ['Parking', 'Outdoor Area', 'Kid-Friendly', 'Mushola'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'House Blend', price: 30000 },
          { name: 'Caramel Macchiato', price: 38000 },
        ],
      },
      {
        category: 'Food',
        items: [
          { name: 'Club Sandwich', price: 48000 },
          { name: 'Caesar Salad', price: 42000 },
          { name: 'Pasta Carbonara', price: 55000 },
        ],
      },
    ],
    matchScore: 81,
    favoritesCount: 421,
    bookmarksCount: 198,
    promotionType: 'B',
    promoTitle: 'Buy 1 Get 1 All Coffee',
    promoPhoto: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
  },
  {
    id: '6',
    name: 'Anomali Coffee',
    photos: [
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    ],
    distance: 0.9,
    address: 'Jl. Fatmawati No. 56, Jakarta Selatan',
    latitude: -6.2920,
    longitude: 106.7970,
    purposes: ['Me Time', 'WFC'],
    facilities: ['WiFi', 'Power Outlet', 'Parking'],
    menu: [
      {
        category: 'Single Origin',
        items: [
          { name: 'Aceh Gayo', price: 35000 },
          { name: 'Toraja Sapan', price: 38000 },
          { name: 'Bali Kintamani', price: 40000 },
        ],
      },
      {
        category: 'Snacks',
        items: [
          { name: 'Pisang Goreng', price: 18000 },
          { name: 'Kentang Goreng', price: 25000 },
        ],
      },
    ],
    matchScore: 85,
    favoritesCount: 198,
    bookmarksCount: 67,
  },
  {
    id: '7',
    name: 'Kedai Filosofi',
    photos: [
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
      'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800',
    ],
    distance: 1.8,
    address: 'Jl. Radio Dalam No. 89, Jakarta Selatan',
    latitude: -6.2580,
    longitude: 106.7830,
    purposes: ['Group Study', 'WFC'],
    facilities: ['WiFi', 'Power Outlet', 'Large Tables', 'Mushola', 'Parking'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Kopi Susu Gula Aren', price: 25000 },
          { name: 'Americano', price: 22000 },
          { name: 'Vietnam Drip', price: 28000 },
        ],
      },
      {
        category: 'Rice Bowl',
        items: [
          { name: 'Chicken Katsu Bowl', price: 38000 },
          { name: 'Beef Teriyaki Bowl', price: 42000 },
        ],
      },
      {
        category: 'Dessert',
        items: [
          { name: 'Es Cendol', price: 18000 },
        ],
      },
    ],
    matchScore: 70,
    favoritesCount: 89,
    bookmarksCount: 34,
    promotionType: 'A',
  },
  {
    id: '8',
    name: 'Hario Cafe',
    photos: [
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    ],
    distance: 0.4,
    address: 'Jl. Gandaria No. 15, Jakarta Selatan',
    latitude: -6.2480,
    longitude: 106.7900,
    purposes: ['Me Time', 'Date'],
    facilities: ['WiFi', 'Quiet Atmosphere', 'Outdoor Area'],
    menu: [
      {
        category: 'Pour Over',
        items: [
          { name: 'Hario V60', price: 40000 },
          { name: 'Chemex', price: 45000 },
          { name: 'Aeropress', price: 38000 },
        ],
      },
      {
        category: 'Light Bites',
        items: [
          { name: 'Granola Bowl', price: 35000 },
          { name: 'Bruschetta', price: 32000 },
        ],
      },
    ],
    matchScore: 90,
    favoritesCount: 167,
    bookmarksCount: 78,
  },
  {
    id: '9',
    name: 'Warung Kopi Limarasa',
    photos: [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
      'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800',
      'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800',
    ],
    distance: 1.1,
    address: 'Jl. Blok M No. 67, Jakarta Selatan',
    latitude: -6.2440,
    longitude: 106.7980,
    purposes: ['Family Time', 'Group Study'],
    facilities: ['Parking', 'Large Tables', 'Kid-Friendly', 'Mushola', 'Power Outlet'],
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Kopi Hitam', price: 15000 },
          { name: 'Kopi Susu', price: 20000 },
        ],
      },
      {
        category: 'Food',
        items: [
          { name: 'Ayam Geprek', price: 28000 },
          { name: 'Indomie Goreng', price: 18000 },
          { name: 'Nasi Uduk', price: 25000 },
        ],
      },
      {
        category: 'Drinks',
        items: [
          { name: 'Es Teh Manis', price: 10000 },
          { name: 'Jus Alpukat', price: 22000 },
        ],
      },
    ],
    matchScore: 73,
    favoritesCount: 256,
    bookmarksCount: 112,
    promotionType: 'B',
    promoTitle: 'Free Snack with Any Coffee',
    promoPhoto: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
  },
  {
    id: '10',
    name: 'The Goods Cafe',
    photos: [
      'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
    ],
    distance: 1.4,
    address: 'Jl. Pejaten Barat No. 102, Jakarta Selatan',
    latitude: -6.2800,
    longitude: 106.8300,
    purposes: ['Date', 'WFC', 'Me Time'],
    facilities: ['WiFi', 'Power Outlet', 'Outdoor Area', 'Parking'],
    menu: [
      {
        category: 'Signature Drinks',
        items: [
          { name: 'Goods Latte', price: 42000 },
          { name: 'Iced Mocha', price: 40000 },
          { name: 'Butterfly Pea Latte', price: 38000 },
        ],
      },
      {
        category: 'Brunch',
        items: [
          { name: 'Pancake Stack', price: 48000 },
          { name: 'French Toast', price: 45000 },
        ],
      },
      {
        category: 'Mains',
        items: [
          { name: 'Truffle Fries', price: 52000 },
        ],
      },
    ],
    matchScore: 83,
    favoritesCount: 334,
    bookmarksCount: 156,
  },
];

// Default user location (Jakarta Selatan)
export const DEFAULT_LOCATION = {
  latitude: -6.2600,
  longitude: 106.8100,
};
