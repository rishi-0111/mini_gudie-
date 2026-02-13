-- ============================================================================
-- SEED DATA: 10 Famous Indian Temples from Kaggle image dataset
-- Source: kaggle.com/datasets indian_temples (image classification)
-- Coordinates, descriptions, and metadata added manually for accuracy
-- ============================================================================

-- 1. Amarnath Cave Temple — Jammu & Kashmir
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Amarnath Cave Temple', 'temple',
  34.214700, 75.500200,
  'Amarnath Cave, Pahalgam, Anantnag, J&K 192401',
  'Sacred Hindu cave shrine in the Himalayas at 3,888 m, housing a naturally formed ice Shiva Lingam. Annual Yatra pilgrimage attracts lakhs of devotees. Accessible only during summer months via a challenging trek.',
  4.80, 6200,
  ARRAY['/temples/amarnath.jpg'],
  '{"trek_required": true, "medical_camps": true, "helicopter": true, "langars": true}'::jsonb,
  '{"phone": "+91-1 SASB helpline", "website": "https://shriamarnathjishrine.com"}'::jsonb,
  '{"jul_aug": "Yatra season only (June–August)", "rest": "closed"}'::jsonb,
  true
);

-- 2. Golden Temple (Harmandir Sahib) — Amritsar
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Golden Temple (Harmandir Sahib)', 'temple',
  31.619980, 74.876484,
  'Golden Temple Rd, Atta Mandi, Katra Ahluwalia, Amritsar, Punjab 143006',
  'The holiest Gurdwara of Sikhism, with a stunning gold-plated sanctum surrounded by the sacred Amrit Sarovar pool. The massive Langar (community kitchen) serves free meals to over 100,000 people daily.',
  4.90, 42000,
  ARRAY['/temples/golden_temple.jpg'],
  '{"langar": true, "free_meals": true, "accommodation": true, "wheelchair": true, "restrooms": true, "parking": true, "shoe_storage": true}'::jsonb,
  '{"phone": "+91-183-2553957", "website": "https://sgpc.net"}'::jsonb,
  '{"daily": "02:00-22:00", "note": "Open to all religions, head covering required"}'::jsonb,
  true
);

-- 3. Kashi Vishwanath Temple — Varanasi
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Kashi Vishwanath Temple', 'temple',
  25.310867, 83.010694,
  'Lahori Tola, Varanasi, Uttar Pradesh 221001',
  'One of the 12 Jyotirlingas dedicated to Lord Shiva, rebuilt in 1780. The new Kashi Vishwanath Corridor connects the temple to the Ganges ghats. Gold-domed spire weighs 800+ kg of gold.',
  4.90, 35000,
  ARRAY['/temples/kashi_vishwanath.jpg'],
  '{"parking": true, "restrooms": true, "locker": true, "prasad": true, "corridor": true}'::jsonb,
  '{"phone": "+91-542-2392629", "website": "https://shrikashivishwanath.org"}'::jsonb,
  '{"daily": "03:00-23:00", "aarti": "03:00, 11:15, 19:00, 21:00"}'::jsonb,
  true
);

-- 4. Kedarnath Temple — Uttarakhand
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Kedarnath Temple', 'temple',
  30.735170, 79.066895,
  'Kedarnath, Rudraprayag, Uttarakhand 246445',
  'One of the Char Dham pilgrimage sites and one of 12 Jyotirlingas, situated at 3,583 m near Chorabari Glacier. Built of massive stone slabs in the 8th century by Adi Shankaracharya. Survived the devastating 2013 floods.',
  4.90, 28000,
  ARRAY['/temples/kedarnath.jpg'],
  '{"trek_required": true, "helicopter": true, "mule_service": true, "medical_camps": true}'::jsonb,
  '{"phone": "+91-1364-263200", "website": "https://badrinath-kedarnath.gov.in"}'::jsonb,
  '{"may_nov": "06:00-21:00 (April/May–Nov only)", "winter": "closed (heavy snow)"}'::jsonb,
  true
);

-- 5. Meenakshi Amman Temple — Madurai
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Meenakshi Amman Temple', 'temple',
  9.919530, 78.119507,
  'Madurai Main, Madurai, Tamil Nadu 625001',
  'Historic Dravidian temple with 14 towering gopurams (gateway towers) covered in thousands of colorful sculptures. Dedicated to Goddess Meenakshi and Lord Sundareswarar. The Hall of 1000 Pillars and Golden Lotus Tank are iconic.',
  4.80, 31000,
  ARRAY['/temples/meenakshi.jpg'],
  '{"parking": true, "restrooms": true, "guide": true, "museum": true, "shoe_storage": true}'::jsonb,
  '{"phone": "+91-452-2334360", "website": "https://maduraimeenakshi.org"}'::jsonb,
  '{"daily": "05:00-12:30, 16:00-21:30"}'::jsonb,
  true
);

-- 6. Siddhivinayak Temple — Mumbai
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Siddhivinayak Temple', 'temple',
  19.016730, 72.830130,
  'SK Bole Marg, Prabhadevi, Mumbai, Maharashtra 400028',
  'One of the richest and most visited Ganesh temples in India. The idol is unique — the trunk tilts to the right. Celebrities, politicians, and millions of devotees visit annually. Tuesday darshan queues stretch for kilometers.',
  4.70, 38000,
  ARRAY['/temples/siddhivinayak.jpg'],
  '{"parking": true, "restrooms": true, "online_darshan": true, "prasad": true, "locker": true}'::jsonb,
  '{"phone": "+91-22-24373626", "website": "https://siddhivinayak.org"}'::jsonb,
  '{"daily": "05:30-21:50", "tuesday": "special 4-hour morning darshan from 03:15"}'::jsonb,
  true
);

-- 7. Sabarimala Ayyappa Temple — Kerala
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Sabarimala Ayyappa Temple', 'temple',
  9.435830, 77.075500,
  'Sabarimala, Pathanamthitta, Kerala 689711',
  'Hilltop temple at 914 m dedicated to Lord Ayyappa, visited by an estimated 50 million pilgrims annually during the Mandala-Makaravilakku season. Devotees observe 41 days of strict fasting (Vratham) before the trek.',
  4.80, 22000,
  ARRAY['/temples/sabarimala.jpg'],
  '{"trek_required": true, "medical_camps": true, "free_food": true}'::jsonb,
  '{"phone": "+91-4735-202024", "website": "https://sabarimala.kerala.gov.in"}'::jsonb,
  '{"mandala_season": "Nov 15–Dec 26 & Makaravilakku Jan", "monthly": "First 5 days of each Malayalam month"}'::jsonb,
  true
);

-- 8. Shri Jagannath Temple — Puri
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Shri Jagannath Temple', 'temple',
  19.804710, 85.818153,
  'Grand Road, Puri, Odisha 752001',
  'One of the Char Dham sites, famous for the annual Rath Yatra (chariot festival). The massive kitchen serves Mahaprasad — the largest community kitchen in the world after Golden Temple. Non-Hindus are not allowed inside.',
  4.80, 18000,
  ARRAY['/temples/jagannath.jpg'],
  '{"prasad": true, "parking": true, "restrooms": true, "shoe_storage": true}'::jsonb,
  '{"phone": "+91-6752-222002", "website": "https://jagannath.nic.in"}'::jsonb,
  '{"daily": "05:00-23:00", "rath_yatra": "June/July annually"}'::jsonb,
  true
);

-- 9. Shri Shirdi Sai Baba Temple — Shirdi
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Shri Sai Baba Samadhi Mandir', 'temple',
  19.766350, 74.477020,
  'Shirdi, Ahmednagar, Maharashtra 423109',
  'The main shrine where Sai Baba''s mortal remains are interred. One of the most visited pilgrimage sites in the world — receives 25,000+ devotees daily. The trust runs free meals, hospitals, and schools.',
  4.80, 45000,
  ARRAY['/temples/shirdi_sai.jpg'],
  '{"parking": true, "restrooms": true, "free_meals": true, "accommodation": true, "hospital": true, "wheelchair": true}'::jsonb,
  '{"phone": "+91-2423-258500", "website": "https://sai.org.in"}'::jsonb,
  '{"daily": "04:00-22:30", "aarti": "04:30, 12:00, 18:00, 22:00"}'::jsonb,
  true
);

-- 10. Tirumala Tirupati Venkateswara Temple — Tirupati
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES (
  'Tirumala Venkateswara Temple', 'temple',
  13.683260, 79.347130,
  'Tirumala, Tirupati, Andhra Pradesh 517504',
  'The richest and most visited temple in the world — receives ~75,000 pilgrims daily and collects ₹3,000+ crore annually. Located atop the seven hills of Tirumala. The Tonsure tradition sees a million heads shaved monthly.',
  4.90, 85000,
  ARRAY['/temples/tirupati.jpg'],
  '{"parking": true, "restrooms": true, "free_meals": true, "accommodation": true, "hospital": true, "wheelchair": true, "online_booking": true}'::jsonb,
  '{"phone": "+91-877-2277777", "website": "https://tirumala.org"}'::jsonb,
  '{"daily": "02:30-01:30 (next day)", "note": "Open ~23 hours/day. VIP & Sarva Darshan available."}'::jsonb,
  true
);
