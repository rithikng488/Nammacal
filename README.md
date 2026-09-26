# NammaCal — Indian & Tamil Nutrition, Fitness & Lifestyle Tracking

NammaCal is a private, invite-only Indian nutrition, activity, water, weight, and habit tracking Progressive Web Application (PWA) with native Android Health Connect integration.

---

## Architecture Highlights

- **Deterministic Nutrition Engine**: All calorie and macronutrient calculations are computed deterministically from verified datasets (IFCT 2017 / ICMR-NIN). AI is strictly an input assistant and never calculates calories.
- **Raw vs. Cooked Separation**: Accurately accounts for cooking yield, water loss/absorption, and density per 100g.
- **Historical Nutrition Snapshots**: Modifying food items or recipes never retroactively alters past logged meals.
- **Android Health Connect Integration**: Native Android 14+ step aggregation, workout session sync, and deduplication (`health_connect > device > manual`).
- **Privacy & Security**: Zero screen capture, zero gallery scanning, privacy-preserving SHA-256 IP hashing with salt, and immutable PostgreSQL Row Level Security (RLS) audit trails.

---

## 1. Local Development Guide

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` (`v10+`)
- **Git**

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Local Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your local Supabase credentials and Gemini API key in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
IP_HASH_SALT=local_dev_salt_12345
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_TEXT_MODEL=gemini-2.5-flash
AI_PHOTO_RATE_LIMIT=20
AI_VOICE_RATE_LIMIT=30
AI_PARSE_RATE_LIMIT=60
MEDIA_RETENTION_DAYS=0
```

### Step 3: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Run Tests & Typecheck
```bash
# Run Vitest test suite (279 automated tests)
npm test

# Run TypeScript compilation check
npm run typecheck

# Run ESLint validation
npm run lint

# Run Next.js production build test
npm run build
```

---

## 2. Production Web Deployment Guide (Supabase + Vercel)

### Step 1: Create Production Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Select your closest database region (e.g. `ap-south-1` Mumbai for Indian users).
3. Save your Database Password securely.

### Step 2: Apply Database Migrations (Phases 1–9)
In the Supabase Dashboard, navigate to the **SQL Editor** and execute the migration files located in `supabase/migrations/` in chronological order:
1. `20261001000000_phase1_foundation.sql` (Enums, profiles, invitations, RLS)
2. `20261002000000_phase2_food_system.sql` (Foods, aliases, recipe tables, trigram search)
3. `20261002000001_seed_indian_foods.sql` (IFCT 2017 verified South Indian food records)
4. `20261003000000_phase3_meal_logging.sql` (meal_logs, meal_items, snapshots)
5. `20261004000000_phase4_recipes.sql` (Recipe engine, cooked yield factors)
6. `20261005000000_phase5_ai_logging.sql` (AI provenance enum, ai_usage_logs)
7. `20261006000000_phase6_dashboard_weight_analytics.sql` (weight_logs, target biometrics)
8. `20261007000000_phase7_activity_water_habits.sql` (activity_logs, summary, water, habits)
9. `20261008000000_phase8_health_connect.sql` (health_integrations, external records)
10. `20261009000000_phase9_admin_audit.sql` (admin_audit_events, immutable RLS)

### Step 3: Bootstrap Initial Owner Account
To create your initial Owner profile:
1. In Supabase Dashboard → **Authentication** → **Users**, click **Add user** (or register using `/register`).
2. Run this SQL in the **SQL Editor** replacing with your registered User UID:
```sql
UPDATE public.profiles
SET role = 'owner', status = 'active'
WHERE id = '<YOUR_USER_UUID>';
```

### Step 4: Configure Supabase Auth URLs
In Supabase Dashboard → **Authentication** → **URL Configuration**:
- **Site URL**: `https://your-nammacal-domain.vercel.app`
- **Redirect URLs**:
  - `https://your-nammacal-domain.vercel.app/**`
  - `http://localhost:3000/**` (for local development)
  - `https://localhost/**` (for Capacitor Android webview)

### Step 5: Deploy to Vercel
1. Import your NammaCal repository into [Vercel](https://vercel.com).
2. Under **Environment Variables**, add the following production keys:

| Key | Value Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Browser Safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon public key | Browser Safe |
| `NEXT_PUBLIC_APP_URL` | `https://your-nammacal-domain.vercel.app` | Browser Safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role secret | **Server Only** |
| `IP_HASH_SALT` | High-entropy random secret (32+ chars) | **Server Only** |
| `AI_PROVIDER` | `gemini` | **Server Only** |
| `GEMINI_API_KEY` | Google AI Studio Production API key | **Server Only** |
| `GEMINI_VISION_MODEL` | `gemini-2.5-flash` | **Server Only** |
| `GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | **Server Only** |
| `AI_PHOTO_RATE_LIMIT` | `20` | **Server Only** |
| `AI_VOICE_RATE_LIMIT` | `30` | **Server Only** |
| `AI_PARSE_RATE_LIMIT` | `60` | **Server Only** |
| `MEDIA_RETENTION_DAYS` | `0` (Zero retention) | **Server Only** |

3. Click **Deploy**.
4. Test login at your live production URL: `https://your-nammacal-domain.vercel.app`.

---

## 3. Android Setup & Release Guide

### Prerequisites
- **Android Studio**: Ladybug / Hedgehog or newer (Install from [developer.android.com/studio](https://developer.android.com/studio))
- **JDK**: Java 17 (bundled with Android Studio)
- **Android SDK Platforms**: API 34 and API 36
- **Android SDK Build-Tools**: 34.0.0+ / 36.0.0

### Step 1: Sync Capacitor Web Assets
After any web UI or build changes, sync web assets to the native Android container:
```bash
npm run build
npx cap sync android
```

### Step 2: Open in Android Studio
1. Launch **Android Studio**.
2. Select **Open** and choose the `android/` directory in this repository:
   ```
   C:\CAFE CAL\android
   ```
3. Allow Gradle to download dependencies and synchronize.

### Step 3: Build Debug APK
In Android Studio:
- **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- Or via terminal inside `android/`:
  ```bash
  gradlew.bat assembleDebug
  ```
- **Output Artifact**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Physical Device Testing (Health Connect & Screenshots)
1. On your Android 14+ phone: Enable **Developer Options** and **USB Debugging**.
2. Connect phone via USB.
3. Install Health Connect from the Google Play Store (built into Android 14+ Settings → Health Connect).
4. Run the app on the physical device from Android Studio.
5. In NammaCal → Settings / Dashboard:
   - Connect Health Connect and grant permissions for Steps, Exercise, and Energy.
   - Trigger Sync and verify step count displays.
   - Take a screenshot and verify event appears in `/admin/activity` without capturing screen pixels.

### Step 5: Build Production Release AAB (Android App Bundle)
To build a signed Android App Bundle for Google Play / Closed Beta testing without committing passwords or keystores:

1. Generate a release keystore (if you haven't already):
   ```bash
   keytool -genkey -v -keystore nammacal-release.keystore -alias nammacal -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Set release signing environment variables:
   ```bash
   # Windows PowerShell
   $env:NAMMACAL_KEYSTORE_FILE="C:\path\to\nammacal-release.keystore"
   $env:NAMMACAL_KEYSTORE_PASSWORD="your-keystore-password"
   $env:NAMMACAL_KEY_ALIAS="nammacal"
   $env:NAMMACAL_KEY_PASSWORD="your-key-password"
   ```
3. Generate the Release Bundle:
   ```bash
   cd android
   ./gradlew.bat bundleRelease
   ```
- **Output Artifact**: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. Closed Beta Invitation Workflow

NammaCal is strictly private and invite-only. To onboard beta testers:
1. Log in as **Owner** at `/login`.
2. Open the Admin Center at `/admin`.
3. In the **Invitations** tab, enter the tester's email, role (`member`), and expiration duration (e.g. 7 days).
4. Click **Generate Invitation**.
5. Send the unique invitation code / link to the tester.
6. The tester navigates to `/register`, enters the code, their email, and sets their password.
7. Monitor tester activity and AI detections live in `/admin/activity` and `/admin/media`.
