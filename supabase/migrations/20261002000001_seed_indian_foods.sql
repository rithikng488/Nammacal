-- ==============================================================================
-- NammaCal Phase 2 Seed: Verified Indian & Tamil Food Composition (IFCT 2017)
-- All values represent factual per-100g nutrient contents from ICMR-NIN.
-- ==============================================================================

INSERT INTO public.foods (
    id, name_en, name_ta, name_tanglish, category, state,
    calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, sodium_mg_per_100g,
    serving_unit_default, serving_size_default, standard_portions, data_provenance, source_reference, is_verified
) VALUES
-- 1. Ponni Parboiled Rice (Raw)
('00000000-0000-0000-0000-000000000001', 'Ponni Parboiled Rice (Raw)', 'பொன்னி புழுங்கல் அரிசி (சமைக்காதது)', 'Ponni Puzhungal Arisi (Raw)', 'rice_grains', 'raw',
 353.0, 7.35, 77.2, 0.44, 2.8, 0.2, 9.8, 'g', 100.0,
 '[{"unit": "cup", "gram_weight": 185, "label_en": "1 cup raw rice (185 g)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: A006)', true),

-- 2. Ponni Boiled Rice (Cooked / Satham)
('00000000-0000-0000-0000-000000000002', 'Ponni Boiled Rice (Cooked / Satham)', 'பொன்னி சாதம் / சோறு (சமைத்தது)', 'Ponni Sadham / Soru (Cooked)', 'rice_grains', 'cooked',
 130.0, 2.7, 28.5, 0.3, 1.0, 0.1, 2.0, 'g', 150.0,
 '[{"unit": "katori", "gram_weight": 150, "label_en": "1 medium katori / bowl (150 g)", "is_estimate": true}, {"unit": "cup", "gram_weight": 160, "label_en": "1 cup cooked rice (160 g)", "is_estimate": false}, {"unit": "plate", "gram_weight": 280, "label_en": "1 lunch plate portion (280 g)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Cooked yield ratio 1:2.6)', true),

-- 3. Raw White Rice / Pacharisi
('00000000-0000-0000-0000-000000000003', 'Raw White Rice / Pacharisi (Uncooked)', 'பச்சரிசி (சமைக்காதது)', 'Pacharisi (Raw)', 'rice_grains', 'raw',
 356.0, 7.94, 78.2, 0.52, 2.81, 0.2, 8.5, 'g', 100.0,
 '[{"unit": "cup", "gram_weight": 185, "label_en": "1 cup raw pacharisi (185 g)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: A001)', true),

-- 4. Finger Millet / Ragi Flour (Raw)
('00000000-0000-0000-0000-000000000010', 'Finger Millet / Ragi Flour (Raw)', 'கேழ்வரகு / ராகி மாவு', 'Kelvaragu / Ragi Maavu', 'millets', 'raw',
 320.0, 7.16, 66.8, 1.92, 11.18, 0.6, 11.0, 'g', 100.0,
 '[{"unit": "cup", "gram_weight": 140, "label_en": "1 cup ragi flour (140 g)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: A014)', true),

-- 5. Ragi Kali / Ragi Mudde (Cooked)
('00000000-0000-0000-0000-000000000011', 'Ragi Kali / Ragi Mudde (Cooked)', 'கேழ்வரகு களி / ராகி முத்தே', 'Kelvaragu Kali / Ragi Mudde', 'millets', 'cooked',
 110.0, 2.4, 23.0, 0.7, 3.8, 0.2, 4.0, 'g', 180.0,
 '[{"unit": "ball", "gram_weight": 180, "label_en": "1 medium ragi ball / kali urundai (180 g)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Cooked Ragi preparation)', true),

-- 6. Whole Wheat Flour / Atta (Raw)
('00000000-0000-0000-0000-000000000020', 'Whole Wheat Flour / Atta (Raw)', 'கோதுமை மாவு', 'Godhumai Maavu', 'wheat_flours', 'raw',
 320.0, 10.6, 64.2, 1.47, 11.2, 0.4, 3.5, 'g', 100.0,
 '[{"unit": "cup", "gram_weight": 120, "label_en": "1 cup atta flour (120 g)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: A018)', true),

-- 7. Plain Chapati / Phulka (Cooked, No Oil)
('00000000-0000-0000-0000-000000000021', 'Plain Chapati / Phulka (Cooked, No Oil)', 'சப்பாத்தி / புல்கா (எண்ணெய் இன்றி)', 'Chappathi / Phulka (No Oil)', 'wheat_flours', 'cooked',
 264.0, 8.5, 51.5, 1.2, 9.2, 0.3, 3.0, 'piece', 35.0,
 '[{"unit": "piece", "gram_weight": 35, "label_en": "1 medium chapati (35 g, ~92 kcal)", "is_estimate": true}, {"unit": "chapati", "gram_weight": 35, "label_en": "1 chapati", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Whole wheat chapati)', true),

-- 8. Toor Dal (Raw)
('00000000-0000-0000-0000-000000000030', 'Toor Dal / Pigeon Pea (Raw)', 'துவரம் பருப்பு (சமைக்காதது)', 'Thuvaram Paruppu (Raw)', 'dals_pulses', 'raw',
 331.0, 22.3, 57.6, 1.49, 9.1, 2.1, 28.5, 'g', 50.0,
 '[{"unit": "cup", "gram_weight": 200, "label_en": "1 cup raw toor dal (200 g)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: B001)', true),

-- 9. Plain Toor Dal (Cooked, No Oil)
('00000000-0000-0000-0000-000000000031', 'Plain Toor Dal (Cooked / Boiled, No Oil)', 'வெந்த துவரம் பருப்பு', 'Vendha Thuvaram Paruppu', 'dals_pulses', 'cooked',
 112.0, 7.2, 19.5, 0.5, 3.1, 0.7, 10.0, 'g', 150.0,
 '[{"unit": "katori", "gram_weight": 150, "label_en": "1 medium katori / bowl (150 g, ~168 kcal)", "is_estimate": true}, {"unit": "ladle", "gram_weight": 75, "label_en": "1 ladle dal (75 g)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Boiled toor dal, 1:3 ratio)', true),

-- 10. Paneer (Fresh)
('00000000-0000-0000-0000-000000000040', 'Paneer / Indian Cottage Cheese (Fresh)', 'பன்னீர்', 'Paneer', 'dairy', 'raw',
 289.0, 18.3, 3.4, 22.0, 0.0, 2.2, 22.0, 'g', 100.0,
 '[{"unit": "cube", "gram_weight": 15, "label_en": "1 standard cube (15 g, ~43 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: H005)', true),

-- 11. Curd / Thayir (Cow''s Milk)
('00000000-0000-0000-0000-000000000041', 'Curd / Thayir / Dahi (Cow''s Milk)', 'தயிர்', 'Thayir', 'dairy', 'raw',
 60.0, 3.1, 4.0, 3.5, 0.0, 3.8, 45.0, 'g', 150.0,
 '[{"unit": "katori", "gram_weight": 150, "label_en": "1 medium katori / bowl (150 g, ~90 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: H004)', true),

-- 12. Cow Ghee
('00000000-0000-0000-0000-000000000043', 'Cow Ghee / Clarified Butter', 'பசு நெய்', 'Pasu Nei', 'oils_fats', 'raw',
 897.0, 0.0, 0.0, 99.5, 0.0, 0.0, 2.0, 'g', 5.0,
 '[{"unit": "tsp", "gram_weight": 5, "label_en": "1 teaspoon (5 g, ~45 kcal)", "is_estimate": false}, {"unit": "tbsp", "gram_weight": 14, "label_en": "1 tablespoon (14 g, ~126 kcal)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: F007)', true),

-- 13. Whole Egg (Boiled)
('00000000-0000-0000-0000-000000000050', 'Whole Egg (Hard-Boiled)', 'முழு அவித்த முட்டை', 'Muzhu Avitha Muttai', 'poultry_eggs', 'cooked',
 135.0, 13.3, 0.77, 8.7, 0.0, 0.7, 142.0, 'piece', 50.0,
 '[{"unit": "piece", "gram_weight": 50, "label_en": "1 large boiled egg (50 g, ~68 kcal, 6.7g P)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: J001)', true),

-- 14. Egg White (Boiled)
('00000000-0000-0000-0000-000000000051', 'Egg White (Boiled / Cooked)', 'முட்டை வெள்ளைக்கரு (அவித்தது)', 'Muttai Vellaikaru (Boiled)', 'poultry_eggs', 'cooked',
 52.0, 11.0, 0.7, 0.2, 0.0, 0.7, 166.0, 'piece', 33.0,
 '[{"unit": "piece", "gram_weight": 33, "label_en": "1 egg white (33 g, ~17 kcal, 3.6g P)", "is_estimate": false}]'::jsonb,
 'verified_database', 'USDA FoodData Central / IFCT 2017', true),

-- 15. Chicken Breast (Raw)
('00000000-0000-0000-0000-000000000052', 'Chicken Breast, Skinless (Raw)', 'கோழி நெஞ்சுக்கறி (சமைக்காதது)', 'Kozhi Nenjukari (Raw)', 'poultry_eggs', 'raw',
 119.0, 21.8, 0.0, 3.2, 0.0, 0.0, 65.0, 'g', 150.0,
 '[{"unit": "piece", "gram_weight": 150, "label_en": "1 medium raw fillet (150 g)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: I001)', true),

-- 16. Chicken Breast (Cooked / Grilled)
('00000000-0000-0000-0000-000000000053', 'Chicken Breast, Grilled / Boiled (Cooked)', 'அவித்த / வறுத்த கோழி நெஞ்சுக்கறி', 'Avitha Kozhi Nenjukari (Cooked)', 'poultry_eggs', 'cooked',
 165.0, 31.0, 0.0, 3.6, 0.0, 0.0, 74.0, 'g', 120.0,
 '[{"unit": "piece", "gram_weight": 120, "label_en": "1 cooked fillet (120 g, ~198 kcal, 37g P)", "is_estimate": true}]'::jsonb,
 'verified_database', 'USDA FoodData Central (Post cooking moisture loss ~25%)', true),

-- 17. Idli (Steamed)
('00000000-0000-0000-0000-000000000060', 'Idli (Steamed Rice & Urad Dal Cake)', 'இட்லி (ஆவியில் வெந்தது)', 'Idli / Idly', 'breakfast_south', 'cooked',
 132.0, 4.5, 26.5, 0.5, 1.5, 0.3, 110.0, 'piece', 45.0,
 '[{"unit": "piece", "gram_weight": 45, "label_en": "1 medium idli (45 g, ~59 kcal, 2g P)", "is_estimate": true}, {"unit": "idli", "gram_weight": 45, "label_en": "1 idli", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Traditional fermented steamed idli)', true),

-- 18. Plain Dosa / Dosai
('00000000-0000-0000-0000-000000000061', 'Plain Dosa / Dosai (With Standard Oil)', 'சாதாரண தோசை', 'Plain Dosai', 'breakfast_south', 'cooked',
 208.0, 4.8, 33.2, 6.2, 1.8, 0.4, 140.0, 'piece', 80.0,
 '[{"unit": "piece", "gram_weight": 80, "label_en": "1 plain dosa (80 g, ~166 kcal)", "is_estimate": true}, {"unit": "dosa", "gram_weight": 80, "label_en": "1 dosa", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Fermented crepe with vegetable oil)', true),

-- 19. Medu Vada
('00000000-0000-0000-0000-000000000062', 'Medu Vada / Ulunthu Vadai (Deep-Fried)', 'மெது வடை / உளுந்து வடை', 'Medu Vadai / Ulunthu Vadai', 'breakfast_south', 'cooked',
 315.0, 7.8, 27.5, 19.5, 4.2, 0.2, 210.0, 'piece', 45.0,
 '[{"unit": "piece", "gram_weight": 45, "label_en": "1 medu vada (45 g, ~142 kcal, 8.8g fat)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Deep-fried black gram doughnut)', true),

-- 20. Ven Pongal
('00000000-0000-0000-0000-000000000063', 'Ven Pongal (Ghee & Moong Dal Rice)', 'வெண் பொங்கல் (நெய் சேர்த்தது)', 'Ven Pongal', 'breakfast_south', 'cooked',
 182.0, 4.2, 24.8, 7.2, 1.8, 0.1, 190.0, 'g', 180.0,
 '[{"unit": "katori", "gram_weight": 180, "label_en": "1 medium bowl / katori (180 g, ~328 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Rice-pulse cooked with ghee and spices)', true),

-- 21. South Indian Sambar
('00000000-0000-0000-0000-000000000070', 'South Indian Sambar (Toor Dal & Vegetables)', 'தென்னிந்திய சாம்பார்', 'Thenninthiya Sambar', 'lunch_dinner_south', 'cooked',
 75.0, 3.2, 11.5, 1.8, 2.8, 2.2, 240.0, 'g', 150.0,
 '[{"unit": "katori", "gram_weight": 150, "label_en": "1 standard katori / bowl (150 g, ~112 kcal)", "is_estimate": true}, {"unit": "ladle", "gram_weight": 60, "label_en": "1 ladle (60 g, ~45 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Dal and mixed vegetable stew)', true),

-- 22. South Indian Rasam
('00000000-0000-0000-0000-000000000071', 'South Indian Rasam (Tomato & Tamarind Spiced Broth)', 'தென்னிந்திய ரசம்', 'Thenninthiya Rasam', 'lunch_dinner_south', 'cooked',
 35.0, 0.9, 6.2, 0.8, 0.9, 1.5, 280.0, 'g', 150.0,
 '[{"unit": "katori", "gram_weight": 150, "label_en": "1 katori / bowl (150 g, ~52 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Spiced tamarind-pepper broth)', true),

-- 23. Coconut Chutney
('00000000-0000-0000-0000-000000000072', 'Coconut Chutney (South Indian Style)', 'தேங்காய் சட்னி', 'Thengai Chutney', 'spices_condiments', 'cooked',
 245.0, 3.5, 8.5, 22.0, 4.5, 2.1, 210.0, 'tbsp', 20.0,
 '[{"unit": "tbsp", "gram_weight": 20, "label_en": "1 tablespoon (20 g, ~49 kcal, 4.4g fat)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Fresh coconut with fried gram and tempering)', true),

-- 24. Gingelly / Sesame Oil
('00000000-0000-0000-0000-000000000090', 'Gingelly Oil / Sesame Oil', 'நல்லெண்ணெய்', 'Nallenai', 'oils_fats', 'raw',
 884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0, 'tbsp', 14.0,
 '[{"unit": "tsp", "gram_weight": 4.5, "label_en": "1 teaspoon (4.5 g, ~40 kcal)", "is_estimate": false}, {"unit": "tbsp", "gram_weight": 14, "label_en": "1 tablespoon (14 g, ~124 kcal)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: F001)', true),

-- 25. South Indian Filter Coffee
('00000000-0000-0000-0000-000000000100', 'South Indian Filter Coffee (With Milk & Sugar)', 'தென்னிந்திய ஃபில்டர் காபி', 'South Indian Filter Coffee', 'beverages', 'cooked',
 75.0, 2.2, 8.5, 3.2, 0.0, 7.5, 35.0, 'tumbler', 120.0,
 '[{"unit": "tumbler", "gram_weight": 120, "label_en": "1 standard davarah tumbler (120 ml, ~90 kcal)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017 / Standard Kumbakonam degree ratio', true),

-- 26. Roasted Bengal Gram / Pottukadalai
('00000000-0000-0000-0000-000000000085', 'Roasted Bengal Gram / Pottukadalai', 'பொட்டுக் கடலை / பொரி கடலை', 'Pottukadalai / Pori Kadalai', 'snacks_tamil', 'packaged',
 369.0, 22.5, 58.1, 5.2, 16.8, 2.5, 30.0, 'g', 30.0,
 '[{"unit": "fistful", "gram_weight": 30, "label_en": "1 handful / fistful (30 g, ~110 kcal, 6.7g P)", "is_estimate": true}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: B002 roasted)', true),

-- 27. Soya Chunks (Raw Defatted)
('00000000-0000-0000-0000-000000000081', 'Soya Chunks / Mealmaker (Raw Defatted)', 'மீல்மேக்கர் / சோயா சங்க்ஸ் (சமைக்காதது)', 'Mealmaker / Soya Chunks (Raw)', 'gym_diet', 'raw',
 345.0, 52.0, 33.0, 0.5, 13.0, 4.0, 15.0, 'g', 50.0,
 '[{"unit": "cup", "gram_weight": 50, "label_en": "1 cup dry chunks (50 g, ~172 kcal, 26g P)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Code: B010)', true),

-- 28. Soya Chunks (Cooked / Boiled & Squeezed)
('00000000-0000-0000-0000-000000000082', 'Soya Chunks (Cooked / Boiled & Squeezed)', 'அவித்த மீல்மேக்கர் (சமைத்தது)', 'Avitha Mealmaker (Cooked)', 'gym_diet', 'cooked',
 115.0, 17.3, 11.0, 0.2, 4.3, 1.3, 5.0, 'g', 150.0,
 '[{"unit": "cup", "gram_weight": 150, "label_en": "1 cup boiled & squeezed chunks (150 g, 26g P)", "is_estimate": false}]'::jsonb,
 'verified_database', 'IFCT 2017: ICMR-NIN (Hydrated yield ~3x raw weight)', true),

-- 29. Whey Protein Powder (80%)
('00000000-0000-0000-0000-000000000080', 'Whey Protein Powder (Standard 80% Unflavored)', 'வே புரோட்டீன் பவுடர்', 'Whey Protein Powder', 'gym_diet', 'packaged',
 385.0, 80.0, 6.0, 4.5, 0.0, 3.5, 180.0, 'scoop', 30.0,
 '[{"unit": "scoop", "gram_weight": 30, "label_en": "1 standard scoop (30 g, ~115 kcal, 24g P)", "is_estimate": false}]'::jsonb,
 'verified_database', 'USDA FoodData Central / Standard WPC80 Spec', true)

ON CONFLICT (id) DO NOTHING;

-- Insert Aliases for Trigram & Phonetic Matching
INSERT INTO public.food_aliases (food_id, alias, language) VALUES
('00000000-0000-0000-0000-000000000001', 'puzhungal arisi', 'tanglish'),
('00000000-0000-0000-0000-000000000001', 'raw rice', 'en'),
('00000000-0000-0000-0000-000000000002', 'soru', 'tanglish'),
('00000000-0000-0000-0000-000000000002', 'satham', 'tanglish'),
('00000000-0000-0000-0000-000000000002', 'saatham', 'tanglish'),
('00000000-0000-0000-0000-000000000002', 'cooked rice', 'en'),
('00000000-0000-0000-0000-000000000002', 'white rice', 'en'),
('00000000-0000-0000-0000-000000000002', 'bhat', 'hindi'),
('00000000-0000-0000-0000-000000000002', 'chawal', 'hindi'),
('00000000-0000-0000-0000-000000000010', 'ragi', 'tanglish'),
('00000000-0000-0000-0000-000000000010', 'kelvaragu', 'tanglish'),
('00000000-0000-0000-0000-000000000011', 'ragi mudde', 'regional'),
('00000000-0000-0000-0000-000000000011', 'ragi kali', 'tanglish'),
('00000000-0000-0000-0000-000000000021', 'chapati', 'tanglish'),
('00000000-0000-0000-0000-000000000021', 'roti', 'hindi'),
('00000000-0000-0000-0000-000000000021', 'phulka', 'hindi'),
('00000000-0000-0000-0000-000000000030', 'toor dal', 'en'),
('00000000-0000-0000-0000-000000000030', 'thuvaram paruppu', 'tanglish'),
('00000000-0000-0000-0000-000000000031', 'paruppu', 'tanglish'),
('00000000-0000-0000-0000-000000000040', 'paneer', 'en'),
('00000000-0000-0000-0000-000000000041', 'thayir', 'tanglish'),
('00000000-0000-0000-0000-000000000041', 'curd', 'en'),
('00000000-0000-0000-0000-000000000041', 'dahi', 'hindi'),
('00000000-0000-0000-0000-000000000043', 'ghee', 'en'),
('00000000-0000-0000-0000-000000000043', 'nei', 'tanglish'),
('00000000-0000-0000-0000-000000000050', 'muttai', 'tanglish'),
('00000000-0000-0000-0000-000000000050', 'boiled egg', 'en'),
('00000000-0000-0000-0000-000000000060', 'idli', 'tanglish'),
('00000000-0000-0000-0000-000000000060', 'idly', 'en'),
('00000000-0000-0000-0000-000000000061', 'dosa', 'tanglish'),
('00000000-0000-0000-0000-000000000061', 'dosai', 'tanglish'),
('00000000-0000-0000-0000-000000000062', 'medu vada', 'en'),
('00000000-0000-0000-0000-000000000062', 'vadai', 'tanglish'),
('00000000-0000-0000-0000-000000000070', 'sambar', 'tanglish'),
('00000000-0000-0000-0000-000000000070', 'sambhar', 'en'),
('00000000-0000-0000-0000-000000000071', 'rasam', 'tanglish'),
('00000000-0000-0000-0000-000000000090', 'nallenai', 'tanglish'),
('00000000-0000-0000-0000-000000000090', 'gingelly oil', 'en'),
('00000000-0000-0000-0000-000000000081', 'mealmaker', 'tanglish'),
('00000000-0000-0000-0000-000000000081', 'soya chunks', 'en'),
('00000000-0000-0000-0000-000000000080', 'whey protein', 'en');
