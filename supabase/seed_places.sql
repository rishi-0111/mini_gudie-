-- ============================================================================
-- SEED DATA: Real places across India for Mini Gudie
-- Run: supabase db reset (applies migrations + seed.sql)
-- Or: psql -f supabase/seed_places.sql
-- ============================================================================

-- Delhi
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Lotus Temple', 'temple', 28.553492, 77.258820, 'Lotus Temple Rd, Bahapur, New Delhi 110019', 'Bahá''í House of Worship shaped like a lotus flower. Stunning white marble architecture surrounded by gardens.', 4.70, 2841, ARRAY['https://upload.wikimedia.org/wikipedia/commons/f/fc/LotusDelhi.jpg'], '{"parking": true, "wheelchair": true, "restrooms": true}'::jsonb, '{"phone": "+91-11-26444029", "website": "https://www.bahaihouseofworship.in"}'::jsonb, '{"tue_sun": "09:00-17:30", "mon": "closed"}'::jsonb, true),
  
  ('Hauz Khas Village', 'hidden_spot', 28.549544, 77.194622, 'Hauz Khas Village, New Delhi 110016', 'A hip urban village with ruins of a 13th-century reservoir, art galleries, cafes, and designer boutiques.', 4.40, 987, ARRAY['https://upload.wikimedia.org/wikipedia/commons/1/1b/Hauz_Khas_Complex.jpg'], '{"wifi": true, "food": true}'::jsonb, '{}'::jsonb, '{"daily": "10:00-22:00"}'::jsonb, true),

  ('AIIMS Hospital', 'hospital', 28.567562, 77.210034, 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029', 'All India Institute of Medical Sciences — premier government hospital with 24/7 emergency.', 4.20, 3201, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true, "ambulance": true}'::jsonb, '{"phone": "+91-11-26588500", "emergency": "102"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Safdarjung Hospital', 'hospital', 28.568350, 77.206620, 'Ansari Nagar West, New Delhi 110029', 'Major government hospital with emergency services and trauma centre.', 3.90, 1543, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true}'::jsonb, '{"phone": "+91-11-26707437"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Delhi Police Emergency', 'emergency', 28.627800, 77.220800, 'ITO, New Delhi 110002', 'Delhi Police headquarters — dial 100 for police, 112 for unified emergency.', 4.00, 0, ARRAY[]::TEXT[], '{}'::jsonb, '{"phone": "100", "emergency": "112"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Zostel Delhi', 'hostel', 28.633400, 77.221070, '8 Arakashan Rd, Paharganj, New Delhi 110055', 'Popular backpacker hostel close to New Delhi Railway Station. Dorms from ₹499.', 4.30, 612, ARRAY['https://www.zostel.com/zostel/delhi/images/zostel-delhi-1.jpg'], '{"wifi": true, "ac": true, "locker": true, "kitchen": true}'::jsonb, '{"phone": "+91-9599-332233", "website": "https://www.zostel.com/zostel/delhi"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Majnu Ka Tilla', 'hidden_spot', 28.700100, 77.226900, 'Majnu Ka Tilla, North Delhi', 'Little Tibet of Delhi — Tibetan colony with momos, thukpa stalls, Buddhist monastery, and affordable stays.', 4.50, 423, ARRAY[]::TEXT[], '{"food": true}'::jsonb, '{}'::jsonb, '{"daily": "08:00-22:00"}'::jsonb, true),

  ('Akshardham Temple', 'temple', 28.612675, 77.277327, 'Noida Mor, Pandav Nagar, New Delhi 110092', 'Massive Hindu temple complex with exhibitions, boat ride, and musical fountain show.', 4.80, 5120, ARRAY['https://upload.wikimedia.org/wikipedia/commons/2/2a/Akshardham_Delhi.jpg'], '{"parking": true, "wheelchair": true, "restrooms": true, "food": true}'::jsonb, '{"phone": "+91-11-43442344", "website": "https://akshardham.com"}'::jsonb, '{"tue_sun": "09:30-18:30", "mon": "closed"}'::jsonb, true),

  ('Humayun''s Tomb', 'hidden_spot', 28.593282, 77.250710, 'Mathura Rd, Nizamuddin, New Delhi 110013', 'UNESCO World Heritage mughal garden-tomb. Inspiration for the Taj Mahal, far less crowded.', 4.60, 2100, ARRAY['https://upload.wikimedia.org/wikipedia/commons/4/4e/Humayun_Tomb.jpg'], '{"parking": true, "restrooms": true}'::jsonb, '{"phone": "+91-11-24358275"}'::jsonb, '{"daily": "06:00-18:00"}'::jsonb, true),

  ('Chandni Chowk Street Food', 'hidden_spot', 28.650795, 77.230190, 'Chandni Chowk, Old Delhi 110006', 'Legendary street-food lane: paranthas at Paranthe Wali Galli, jalebis at Old Famous, chole bhature at Sita Ram.', 4.50, 3500, ARRAY[]::TEXT[], '{"food": true}'::jsonb, '{}'::jsonb, '{"daily": "08:00-22:00"}'::jsonb, true);

-- Jaipur
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Amer Fort', 'temple', 26.985584, 75.851321, 'Devisinghpura, Amer, Jaipur 302001', 'Majestic hilltop fort-palace with ornate courtyards, mirror-work halls, and panoramic views.', 4.80, 6200, ARRAY['https://upload.wikimedia.org/wikipedia/commons/4/41/Amber_Fort_Jaipur.jpg'], '{"parking": true, "restrooms": true, "guide": true}'::jsonb, '{"phone": "+91-141-2530293"}'::jsonb, '{"daily": "08:00-17:30"}'::jsonb, true),

  ('Nahargarh Fort', 'hidden_spot', 26.937700, 75.815300, 'Krishna Nagar, Brahampuri, Jaipur 302002', 'Lesser-known fort with the best sunset view over Jaipur Pink City. Wax museum inside.', 4.50, 1800, ARRAY[]::TEXT[], '{"parking": true, "food": true}'::jsonb, '{}'::jsonb, '{"daily": "10:00-17:30"}'::jsonb, true),

  ('Moustache Jaipur', 'hostel', 26.924510, 75.824530, 'D-237, Bani Park, Jaipur 302016', 'Award-winning backpacker hostel with rooftop, free breakfast, and city tours.', 4.60, 890, ARRAY[]::TEXT[], '{"wifi": true, "ac": true, "breakfast": true, "locker": true}'::jsonb, '{"phone": "+91-8696-010101", "website": "https://www.moustachescapes.com"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('SMS Hospital Jaipur', 'hospital', 26.899240, 75.803780, 'JLN Marg, Jaipur 302004', 'Sawai Man Singh Hospital — largest government hospital in Rajasthan with 24/7 emergency.', 4.00, 2300, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true, "ambulance": true}'::jsonb, '{"phone": "+91-141-2518274", "emergency": "108"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true);

-- Goa
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Basilica of Bom Jesus', 'temple', 15.500920, 73.911690, 'Old Goa, Goa 403402', 'UNESCO World Heritage 16th-century church holding the relics of St. Francis Xavier.', 4.60, 3400, ARRAY['https://upload.wikimedia.org/wikipedia/commons/6/6a/Basilica_of_Bom_Jesus_Goa.jpg'], '{"parking": true, "restrooms": true}'::jsonb, '{}'::jsonb, '{"daily": "09:00-18:30"}'::jsonb, true),

  ('Divar Island', 'hidden_spot', 15.519300, 73.895500, 'Divar Island, Tiswadi, North Goa', 'Sleepy island reached by free ferry — crumbling Portuguese churches, paddy fields, zero tourist crowds.', 4.70, 210, ARRAY[]::TEXT[], '{}'::jsonb, '{}'::jsonb, '{"daily": "open"}'::jsonb, true),

  ('The Hostel Crowd', 'hostel', 15.547500, 73.768200, 'Near Titos Lane, Baga, Goa 403516', 'Social beachside hostel with pool, bar crawls, and Baga beach a 5-min walk away.', 4.40, 560, ARRAY[]::TEXT[], '{"wifi": true, "pool": true, "bar": true, "locker": true}'::jsonb, '{"phone": "+91-9876-543210"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Goa Medical College', 'hospital', 15.396000, 73.872800, 'Bambolim, Goa 403202', 'Principal government hospital and medical college in Goa with 24/7 emergency.', 3.80, 1100, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true, "ambulance": true}'::jsonb, '{"phone": "+91-832-2458727", "emergency": "108"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true);

-- Varanasi
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Kashi Vishwanath Temple', 'temple', 25.310900, 83.010600, 'Lahori Tola, Varanasi 221001', 'One of the most famous Hindu temples dedicated to Lord Shiva, with the new grand corridor.', 4.90, 8900, ARRAY[]::TEXT[], '{"parking": true, "restrooms": true}'::jsonb, '{"website": "https://shrikashivishwanath.org"}'::jsonb, '{"daily": "03:00-23:00"}'::jsonb, true),

  ('Assi Ghat', 'hidden_spot', 25.291400, 83.003800, 'Assi Ghat, Varanasi 221005', 'Quieter southern ghat — morning aarti, chai stalls, live music, and the best sunrise over the Ganges.', 4.60, 1200, ARRAY[]::TEXT[], '{"food": true}'::jsonb, '{}'::jsonb, '{"daily": "open"}'::jsonb, true),

  ('Stops Hostel Varanasi', 'hostel', 25.296400, 83.006200, 'D-22/35, Nagwa, Lanka, Varanasi 221005', 'Clean, social hostel near BHU and Assi Ghat. Rooftop with Ganges views.', 4.50, 340, ARRAY[]::TEXT[], '{"wifi": true, "ac": true, "locker": true}'::jsonb, '{"phone": "+91-9876-543211"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true);

-- Mumbai
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Gateway of India', 'temple', 18.921984, 72.834654, 'Apollo Bandar, Colaba, Mumbai 400001', 'Iconic arch monument on the Mumbai waterfront, overlooking the Arabian Sea.', 4.50, 12000, ARRAY['https://upload.wikimedia.org/wikipedia/commons/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg'], '{"parking": true}'::jsonb, '{}'::jsonb, '{"daily": "open"}'::jsonb, true),

  ('Banganga Tank', 'hidden_spot', 18.944700, 72.797400, 'Walkeshwar Rd, Malabar Hill, Mumbai 400006', 'Ancient sacred water tank hidden among Malabar Hill high-rises — 1,000-year old temples, serene atmosphere.', 4.40, 320, ARRAY[]::TEXT[], '{}'::jsonb, '{}'::jsonb, '{"daily": "06:00-21:00"}'::jsonb, true),

  ('KEM Hospital', 'hospital', 18.998600, 72.840500, 'Acharya Donde Marg, Parel, Mumbai 400012', 'King Edward Memorial Hospital — major public hospital in central Mumbai with 24/7 emergency.', 3.70, 2800, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true, "ambulance": true}'::jsonb, '{"phone": "+91-22-24136051", "emergency": "108"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true),

  ('Bombay Backpackers', 'hostel', 18.929700, 72.831100, 'Colaba Causeway, Colaba, Mumbai 400005', 'Central Colaba hostel close to Gateway of India. Common room, free walking tours.', 4.30, 450, ARRAY[]::TEXT[], '{"wifi": true, "ac": true, "locker": true}'::jsonb, '{"phone": "+91-9876-543212"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true);

-- Kerala
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('Padmanabhaswamy Temple', 'temple', 8.482960, 76.943500, 'West Nada, Fort, Thiruvananthapuram 695023', 'Ancient temple with richest treasure vault ever discovered. Strict dress code enforced.', 4.80, 4500, ARRAY[]::TEXT[], '{"parking": true, "restrooms": true}'::jsonb, '{"phone": "+91-471-2450233"}'::jsonb, '{"daily": "03:30-12:00, 17:00-19:30"}'::jsonb, true),

  ('Munroe Island', 'hidden_spot', 9.006200, 76.560800, 'Munroe Island, Kollam, Kerala', 'Network of tiny islands in Ashtamudi Lake — canoe through narrow canals, toddy shops, coir-making villages.', 4.70, 180, ARRAY[]::TEXT[], '{}'::jsonb, '{}'::jsonb, '{"daily": "open"}'::jsonb, true),

  ('KIMS Hospital', 'hospital', 8.530200, 76.929700, 'Anayara P.O., Thiruvananthapuram 695029', 'Kerala Institute of Medical Sciences — top private hospital with 24/7 emergency.', 4.30, 1600, ARRAY[]::TEXT[], '{"emergency": true, "pharmacy": true, "ambulance": true}'::jsonb, '{"phone": "+91-471-2447575", "emergency": "108"}'::jsonb, '{"daily": "24 hours"}'::jsonb, true);

-- Udaipur
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified)
VALUES
  ('City Palace Udaipur', 'temple', 24.576100, 73.683500, 'City Palace Complex, Udaipur 313001', 'Sprawling lakeside palace complex — museums, courtyards, and panoramic views of Lake Pichola.', 4.70, 5100, ARRAY[]::TEXT[], '{"parking": true, "restrooms": true, "guide": true}'::jsonb, '{"phone": "+91-294-2419021"}'::jsonb, '{"daily": "09:30-17:30"}'::jsonb, true),

  ('Bundi Step-wells', 'hidden_spot', 25.442800, 75.637300, 'Bundi, Rajasthan 323001', 'Stunning centuries-old stepwells (baori) with geometric patterns — rarely visited compared to Jaipur sites.', 4.60, 95, ARRAY[]::TEXT[], '{}'::jsonb, '{}'::jsonb, '{"daily": "open"}'::jsonb, true);
