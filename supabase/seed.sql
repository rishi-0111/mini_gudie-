-- Mini Gudie Seed Data
-- Created: 2026-02-07
-- Description: Sample data for testing and development

-- ============================================================================
-- SAMPLE PLACES
-- ============================================================================

-- Temples
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, verified, amenities, contact_info, opening_hours) VALUES
('Meenakshi Amman Temple', 'temple', 9.9195, 78.1193, 'Madurai Main, Madurai, Tamil Nadu 625001', 'Historic Hindu temple dedicated to Goddess Meenakshi and Lord Sundareswarar. Famous for its stunning architecture and intricate sculptures.', 4.8, 1250, true, 
  '{"parking": true, "wheelchair_accessible": true, "guided_tours": true, "photography_allowed": false}'::jsonb,
  '{"phone": "+91-452-2345678", "email": "info@meenakshitemple.org", "website": "https://meenakshitemple.org"}'::jsonb,
  '{"monday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "tuesday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "wednesday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "thursday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "friday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "saturday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM", "sunday": "5:00 AM - 12:30 PM, 4:00 PM - 9:30 PM"}'::jsonb),

('Brihadeeswarar Temple', 'temple', 10.7825, 79.1314, 'Thanjavur, Tamil Nadu 613007', 'UNESCO World Heritage Site, one of the largest temples in India built by Raja Raja Chola I.', 4.9, 980, true,
  '{"parking": true, "wheelchair_accessible": true, "audio_guide": true, "museum": true}'::jsonb,
  '{"phone": "+91-4362-274461", "website": "https://brihadeeswarartemple.org"}'::jsonb,
  '{"monday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "tuesday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "wednesday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "thursday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "friday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "saturday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM", "sunday": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM"}'::jsonb),

('Ramanathaswamy Temple', 'temple', 9.2881, 79.3129, 'Rameswaram, Tamil Nadu 623526', 'One of the twelve Jyotirlinga temples, famous for its magnificent corridors and sacred water tanks.', 4.7, 1100, true,
  '{"parking": true, "wheelchair_accessible": false, "holy_bath": true, "prasadam": true}'::jsonb,
  '{"phone": "+91-4567-221223", "website": "https://ramanathaswamy.org"}'::jsonb,
  '{"monday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "tuesday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "wednesday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "thursday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "friday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "saturday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM", "sunday": "5:00 AM - 1:00 PM, 3:00 PM - 9:00 PM"}'::jsonb);

-- Hospitals
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, verified, amenities, contact_info, opening_hours) VALUES
('Apollo Hospitals', 'hospital', 13.0569, 80.2412, '21, Greams Lane, Off Greams Road, Chennai, Tamil Nadu 600006', 'Multi-specialty tertiary care hospital with 24/7 emergency services.', 4.5, 850, true,
  '{"emergency": true, "icu": true, "pharmacy": true, "parking": true, "ambulance": true, "blood_bank": true}'::jsonb,
  '{"phone": "+91-44-28293333", "emergency": "+91-44-28290200", "email": "contactus@apollohospitals.com", "website": "https://www.apollohospitals.com"}'::jsonb,
  '{"24x7": true}'::jsonb),

('Fortis Malar Hospital', 'hospital', 13.0605, 80.2548, '52, 1st Main Road, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020', 'Advanced multi-specialty hospital with state-of-the-art facilities.', 4.4, 620, true,
  '{"emergency": true, "icu": true, "nicu": true, "pharmacy": true, "parking": true, "cafeteria": true}'::jsonb,
  '{"phone": "+91-44-42892222", "emergency": "+91-44-42892000", "website": "https://www.fortismalar.com"}'::jsonb,
  '{"24x7": true}'::jsonb),

('JIPMER Puducherry', 'hospital', 11.9416, 79.7947, 'Dhanvantri Nagar, Puducherry 605006', 'Premier medical institution providing quality healthcare and medical education.', 4.3, 750, true,
  '{"emergency": true, "icu": true, "trauma_center": true, "pharmacy": true, "parking": true}'::jsonb,
  '{"phone": "+91-413-2296000", "emergency": "+91-413-2296289", "website": "https://www.jipmer.edu.in"}'::jsonb,
  '{"24x7": true}'::jsonb);

-- Emergency Services
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, verified, amenities, contact_info, opening_hours) VALUES
('Chennai City Police Control Room', 'emergency', 13.0827, 80.2707, 'Commissioner Office, Vepery, Chennai, Tamil Nadu 600007', 'Main police control room for Chennai city emergency response.', 4.2, 320, true,
  '{"24x7": true, "multilingual": true, "women_helpdesk": true}'::jsonb,
  '{"emergency": "100", "phone": "+91-44-23452345", "women_helpline": "1091"}'::jsonb,
  '{"24x7": true}'::jsonb),

('Fire & Rescue Services - Madurai', 'emergency', 9.9252, 78.1198, 'Fire Station Road, Madurai, Tamil Nadu 625001', 'Fire and rescue emergency services for Madurai district.', 4.4, 180, true,
  '{"24x7": true, "ambulance": true, "rescue_equipment": true}'::jsonb,
  '{"emergency": "101", "phone": "+91-452-2345100"}'::jsonb,
  '{"24x7": true}'::jsonb);

-- Hidden Spots
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, verified, amenities, contact_info, opening_hours) VALUES
('Gingee Fort Sunset Point', 'hidden_spot', 12.2530, 79.4170, 'Gingee, Tamil Nadu 604202', 'Spectacular sunset viewpoint from the ancient Gingee Fort. A hidden gem for photography enthusiasts.', 4.9, 145, true,
  '{"hiking": true, "photography": true, "scenic_view": true, "historical": true}'::jsonb,
  '{"best_time": "4:00 PM - 6:30 PM"}'::jsonb,
  '{"monday": "6:00 AM - 6:00 PM", "tuesday": "6:00 AM - 6:00 PM", "wednesday": "6:00 AM - 6:00 PM", "thursday": "6:00 AM - 6:00 PM", "friday": "6:00 AM - 6:00 PM", "saturday": "6:00 AM - 6:00 PM", "sunday": "6:00 AM - 6:00 PM"}'::jsonb),

('Hogenakkal Secret Falls', 'hidden_spot', 12.1196, 77.7797, 'Hogenakkal, Tamil Nadu 635123', 'Lesser-known waterfall spot away from the main tourist area. Perfect for peaceful nature walks.', 4.7, 98, true,
  '{"waterfall": true, "swimming": false, "picnic": true, "nature_walk": true}'::jsonb,
  '{"entry_fee": "Free", "best_season": "Post-monsoon (Oct-Feb)"}'::jsonb,
  '{"monday": "Sunrise - Sunset", "tuesday": "Sunrise - Sunset", "wednesday": "Sunrise - Sunset", "thursday": "Sunrise - Sunset", "friday": "Sunrise - Sunset", "saturday": "Sunrise - Sunset", "sunday": "Sunrise - Sunset"}'::jsonb),

('Tranquebar Beach Ruins', 'hidden_spot', 11.0270, 79.8510, 'Tranquebar, Tamil Nadu 609105', 'Serene beach with Danish colonial ruins. Quiet and perfect for solitude seekers.', 4.6, 67, true,
  '{"beach": true, "historical": true, "photography": true, "peaceful": true}'::jsonb,
  '{"parking": true, "best_time": "Early morning or evening"}'::jsonb,
  '{"monday": "Open 24 hours", "tuesday": "Open 24 hours", "wednesday": "Open 24 hours", "thursday": "Open 24 hours", "friday": "Open 24 hours", "saturday": "Open 24 hours", "sunday": "Open 24 hours"}'::jsonb);

-- Hostels
INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, verified, amenities, contact_info, opening_hours) VALUES
('Backpacker Panda Chennai', 'hostel', 13.0475, 80.2584, '7, Venkatesa Agraharam Street, Mylapore, Chennai, Tamil Nadu 600004', 'Budget-friendly hostel with vibrant atmosphere, perfect for solo travelers and backpackers.', 4.6, 420, true,
  '{"wifi": true, "ac": true, "common_area": true, "kitchen": true, "lockers": true, "laundry": true, "parking": false}'::jsonb,
  '{"phone": "+91-9876543210", "email": "chennai@backpackerpanda.com", "website": "https://backpackerpanda.com", "whatsapp": "+91-9876543210"}'::jsonb,
  '{"checkin": "2:00 PM", "checkout": "11:00 AM", "reception": "24x7"}'::jsonb),

('Zostel Pondicherry', 'hostel', 11.9341, 79.8306, 'No. 358, Mission Street, Pondicherry 605001', 'Stylish hostel in the French Quarter with rooftop cafe and social events.', 4.7, 580, true,
  '{"wifi": true, "ac": true, "cafe": true, "common_area": true, "events": true, "bicycle_rental": true, "lockers": true}'::jsonb,
  '{"phone": "+91-9123456789", "email": "pondy@zostel.com", "website": "https://zostel.com/zostel/pondicherry"}'::jsonb,
  '{"checkin": "2:00 PM", "checkout": "10:00 AM", "reception": "24x7"}'::jsonb),

('Moustache Hostel Goa', 'hostel', 15.5530, 73.7553, 'House No. 1190/2, Vagator Beach Road, Goa 403509', 'Beachside hostel with pool, bar, and amazing sunset views. Great for meeting fellow travelers.', 4.8, 890, true,
  '{"wifi": true, "pool": true, "bar": true, "beach_access": true, "common_area": true, "kitchen": true, "lockers": true, "parking": true, "bike_rental": true}'::jsonb,
  '{"phone": "+91-8888888888", "email": "goa@moustachehostel.com", "website": "https://moustachehostel.com", "instagram": "@moustachegoa"}'::jsonb,
  '{"checkin": "1:00 PM", "checkout": "11:00 AM", "reception": "24x7"}'::jsonb),

('The Hosteller Jaipur', 'hostel', 26.9124, 75.7873, 'C-Scheme, Jaipur, Rajasthan 302001', 'Heritage-style hostel in the Pink City with cultural activities and local tours.', 4.5, 650, true,
  '{"wifi": true, "ac": true, "common_area": true, "cafe": true, "cultural_events": true, "lockers": true, "laundry": true}'::jsonb,
  '{"phone": "+91-7777777777", "email": "jaipur@thehosteller.com", "website": "https://thehosteller.com"}'::jsonb,
  '{"checkin": "2:00 PM", "checkout": "11:00 AM", "reception": "24x7"}'::jsonb);

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Add helpful comments
COMMENT ON TABLE public.places IS 'Sample places data includes temples, hospitals, emergency services, hidden spots, and hostels across South India';
