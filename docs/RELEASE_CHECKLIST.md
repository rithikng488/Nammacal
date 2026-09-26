# NammaCal — Production Release & Closed Beta Checklist

Use this checklist to track the end-to-end deployment of NammaCal from development to production release and closed-beta distribution.

---

## 1. Production Supabase & Database Setup
- [ ] Create production Supabase project in preferred region (e.g. `ap-south-1` Mumbai)
- [ ] Apply migration `20261001000000_phase1_foundation.sql` (Enums, profiles, invitations, RLS)
- [ ] Apply migration `20261002000000_phase2_food_system.sql` (Foods, aliases, pg_trgm search)
- [ ] Apply migration `20261002000001_seed_indian_foods.sql` (IFCT 2017 verified food records)
- [ ] Apply migration `20261003000000_phase3_meal_logging.sql` (meal_logs, meal_items, snapshots)
- [ ] Apply migration `20261004000000_phase4_recipes.sql` (Recipe engine, cooked yield factors)
- [ ] Apply migration `20261005000000_phase5_ai_logging.sql` (AI provenance, ai_usage_logs)
- [ ] Apply migration `20261006000000_phase6_dashboard_weight_analytics.sql` (weight_logs, target biometrics)
- [ ] Apply migration `20261007000000_phase7_activity_water_habits.sql` (activity_logs, summary, water, habits)
- [ ] Apply migration `20261008000000_phase8_health_connect.sql` (health_integrations, external records)
- [ ] Apply migration `20261009000000_phase9_admin_audit.sql` (admin_audit_events, immutable RLS)
- [ ] Bootstrap initial Owner user profile (`UPDATE profiles SET role = 'owner' WHERE id = '...'`)
- [ ] Configure Auth Site URL and Redirect URLs (`https://<domain>/**`, `https://localhost/**`)

---

## 2. Production Web Deployment (Vercel)
- [ ] Configure `NEXT_PUBLIC_SUPABASE_URL` in Vercel
- [ ] Configure `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- [ ] Configure `NEXT_PUBLIC_APP_URL` in Vercel
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Server-only)
- [ ] Configure `IP_HASH_SALT` in Vercel (Server-only, 32+ characters)
- [ ] Configure `AI_PROVIDER=gemini` in Vercel
- [ ] Configure production `GEMINI_API_KEY` in Vercel
- [ ] Configure `GEMINI_VISION_MODEL=gemini-2.5-flash` in Vercel
- [ ] Configure `GEMINI_TEXT_MODEL=gemini-2.5-flash` in Vercel
- [ ] Configure rate limits (`AI_PHOTO_RATE_LIMIT=20`, `AI_VOICE_RATE_LIMIT=30`, `AI_PARSE_RATE_LIMIT=60`)
- [ ] Configure `MEDIA_RETENTION_DAYS=0` in Vercel
- [ ] Deploy Next.js build to Vercel production
- [ ] Verify live domain loads over HTTPS with 0 console errors

---

## 3. Web & API Verification
- [ ] Test Owner login on live production domain
- [ ] Access `/admin` overview and verify zero permission errors
- [ ] Generate a beta test invitation in `/admin`
- [ ] Register new test user with invitation code on `/register`
- [ ] Log a cooked food item and verify deterministic macro calculation
- [ ] Create and log a custom recipe
- [ ] Test AI food photo upload and draft confirmation
- [ ] Test AI voice transcription and draft confirmation
- [ ] Log weight, water, and habit completion
- [ ] Verify events appear in `/admin/activity` with redacted metadata

---

## 4. Android Native Setup & Compilation
- [ ] Install Android Studio with Java 17 and Android SDK (API 34 & 36)
- [ ] Run `npm run build && npx cap sync android`
- [ ] Open `android/` directory in Android Studio
- [ ] Perform Gradle sync and verify 0 configuration errors
- [ ] Build Debug APK (`./gradlew.bat assembleDebug`)
- [ ] Verify debug APK exists at `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5. Physical Android Device Testing
- [ ] Install debug APK on physical Android 14+ test device
- [ ] Connect Health Connect integration in app settings
- [ ] Grant permissions for Steps, Exercise, Distance, and Calories
- [ ] Sync Health Connect steps and verify display on Dashboard
- [ ] Verify source hierarchy (`health_connect > device > manual`)
- [ ] Trigger repeat syncs and verify 0 duplicate activity records
- [ ] Take screenshot and verify privacy-safe event in `/admin/activity` (0 pixels captured)
- [ ] Test offline behavior (verify clean network retry message without app crash)

---

## 6. Production Android Release (AAB)
- [ ] Generate or locate release keystore
- [ ] Set `NAMMACAL_KEYSTORE_FILE`, `NAMMACAL_KEYSTORE_PASSWORD`, `NAMMACAL_KEY_ALIAS`, `NAMMACAL_KEY_PASSWORD`
- [ ] Run `./gradlew.bat bundleRelease`
- [ ] Verify signed release AAB at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Upload AAB to Google Play Console (Closed Testing Track)

---

## 7. Closed Beta Launch
- [ ] Generate private invitations for initial beta cohort (5–15 users)
- [ ] Distribute invitation codes to testers
- [ ] Monitor real-time application usage and errors via `/admin/activity`
- [ ] Monitor AI photo analysis logs via `/admin/media`
- [ ] Collect user feedback and review audit metrics
