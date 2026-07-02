# Glucofy API Documentation

> **Base URL:** `http://localhost:3000/api/v1`
>
> **Swagger UI:** `http://localhost:3000/docs`
>
> **OCR Engine:** Google Gemini Vision (Gemini 2.0 Flash) — requires `GEMINI_API_KEY` in `.env`
>
> **Authentication:** JWT Bearer token via `Authorization: Bearer <token>`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Nutrition](#3-nutrition)
4. [Summarize (Premium)](#4-summarize-premium)
5. [Business Logic Reference](#5-business-logic-reference)

---

## 1. Authentication

### POST `/auth/register`

Register a new user account. Returns a JWT token immediately.

**Auth:** None

**Request Body:**

| Field | Type | Required | Validation | Example |
|-------|------|----------|------------|---------|
| `email` | string | Yes | Valid email, unique | `"kevin@gmail.com"` |
| `password` | string | Yes | Min 8, max 100 chars | `"StrongPassword123"` |
| `name` | string | Yes | Max 100 chars | `"Kevin"` |

```json
{
  "email": "kevin@gmail.com",
  "password": "StrongPassword123",
  "name": "Kevin"
}
```

**Response `201 Created`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 604800
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Validation failed (invalid email, short password) |
| `409` | Email already registered |

---

### POST `/auth/login`

Authenticate and receive a JWT token.

**Auth:** None

**Request Body:**

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `email` | string | Yes | `"kevin@gmail.com"` |
| `password` | string | Yes | `"StrongPassword123"` |

```json
{
  "email": "kevin@gmail.com",
  "password": "StrongPassword123"
}
```

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 604800
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Validation failed |
| `401` | Wrong email or password |

---

## 2. Users

### GET `/users/me`

Get the authenticated user's profile.

**Auth:** Bearer JWT

**Response `200 OK`:**

```json
{
  "id": "clxyz123abc456def",
  "email": "kevin@gmail.com",
  "name": "Kevin",
  "role": "USER",
  "profileImage": null,
  "createdAt": "2024-01-15T08:30:00.000Z"
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `401` | Invalid or expired token |

---

### PATCH `/users/me/health-profile`

Update health profile data. BMI is auto-calculated when weight and height are provided. The personalized daily sugar limit is returned in the response.

**Auth:** Bearer JWT

**Request Body:** (all fields optional)

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| `age` | integer | 1–150 | `25` |
| `weight` | number | Min 1 (kg) | `70` |
| `height` | number | Min 30 (cm) | `175` |
| `gender` | enum | `MALE`, `FEMALE` | `"MALE"` |
| `activityLevel` | enum | `SEDENTARY`, `LIGHT`, `MODERATE`, `ACTIVE` | `"MODERATE"` |

```json
{
  "age": 25,
  "weight": 70,
  "height": 175,
  "gender": "MALE",
  "activityLevel": "MODERATE"
}
```

**Response `200 OK`:**

```json
{
  "id": "clxyz123abc456def",
  "age": 25,
  "weight": 70,
  "height": 175,
  "gender": "MALE",
  "activityLevel": "MODERATE",
  "bmi": 22.9,
  "dailySugarLimit": 64.8
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Validation failed |
| `401` | Invalid or expired token |

---

## 3. Nutrition

> All nutrition endpoints require Bearer JWT authentication.

### GET `/nutrition/scan-upload-url`

**Step 1 of scanning.** Get a pre-signed S3 URL so the frontend can upload the label image directly to S3 (bypassing the backend entirely).

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `contentType` | enum | `image/jpeg` | `image/jpeg` or `image/png` |

**Response `200 OK`:**

```json
{
  "uploadUrl": "https://glucofy-scans.s3.ap-southeast-1.amazonaws.com/scans/uuid.jpg?X-Amz-Signature=...",
  "s3Key": "scans/a1b2c3d4-5678-90ab-cdef-1234567890ab.jpg"
}
```

**Frontend then uploads the image:**

```
PUT <uploadUrl>
Content-Type: image/jpeg
Body: <raw image binary>
```

---

### POST `/nutrition/scan`

**Step 2 of scanning.** After the image is uploaded to S3, call this endpoint with the `s3Key`. The backend downloads the image from S3 and sends it to **Google Gemini Vision** for OCR extraction. It extracts sugar and serving size, calculates NutriGrade, and saves a consumption log.

**Request Body:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `s3Key` | string | Yes | S3 key from step 1 | `"scans/uuid.jpg"` |
| `productName` | string | No | Product name (max 200) | `"Pocari Sweat"` |
| `servingSizeMl` | number | No* | Serving size override (mL) | `250` |

> *Required if Textract fails to detect serving size from the label.

```json
{
  "s3Key": "scans/a1b2c3d4-5678-90ab-cdef-1234567890ab.jpg",
  "productName": "Pocari Sweat",
  "servingSizeMl": 250
}
```

**Response `201 Created`:**

```json
{
  "id": "clxyz789ghi012jkl",
  "productName": "Pocari Sweat",
  "nutriGrade": "C",
  "servingSizeMl": 250,
  "sugarPer100ml": 5.6,
  "saltPer100ml": 0.21,
  "saturatedFatPer100ml": 0,
  "entryMethod": "SCAN",
  "consumedAt": "2024-01-15T14:30:00.000Z",
  "scanImageUrl": "https://glucofy-scans.s3.amazonaws.com/scans/uuid.jpg?X-Amz-Signature=..."
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Sugar not detected from image |
| `400` | Serving size not detected and `servingSizeMl` not provided |
| `401` | Invalid or expired token |

---

### POST `/nutrition/manual`

Manually log a food/beverage consumption. NutriGrade is calculated based on sugar per 100mL only.

**Request Body:**

| Field | Type | Required | Validation | Example |
|-------|------|----------|------------|---------|
| `productName` | string | Yes | Max 200 chars | `"Teh Botol Sosro"` |
| `servingSizeMl` | number | Yes | > 0 | `250` |
| `sugarPer100ml` | number | Yes | >= 0 | `12` |
| `saltPer100ml` | number | Yes | >= 0 | `0.1` |
| `saturatedFatPer100ml` | number | Yes | >= 0 | `0.3` |

```json
{
  "productName": "Teh Botol Sosro",
  "servingSizeMl": 250,
  "sugarPer100ml": 12,
  "saltPer100ml": 0.1,
  "saturatedFatPer100ml": 0.3
}
```

**Response `201 Created`:**

```json
{
  "id": "clxyz789ghi012jkl",
  "productName": "Teh Botol Sosro",
  "nutriGrade": "D",
  "servingSizeMl": 250,
  "sugarPer100ml": 12,
  "saltPer100ml": 0.1,
  "saturatedFatPer100ml": 0.3,
  "entryMethod": "MANUAL",
  "consumedAt": "2024-01-15T14:30:00.000Z"
}
```

---

### GET `/nutrition/last-consumption`

Get the 10 most recent consumption logs, ordered newest first.

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "clxyz789ghi012jkl",
      "productName": "Teh Botol Sosro",
      "nutriGrade": "D",
      "servingSizeMl": 250,
      "sugarPer100ml": 12,
      "saltPer100ml": 0.1,
      "saturatedFatPer100ml": 0.3,
      "entryMethod": "MANUAL",
      "consumedAt": "2024-01-15T14:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET `/nutrition/dashboard-summary`

Get today's consumption summary, personalized daily limit, and streak status.

**Response `200 OK`:**

```json
{
  "consumedToday": 18.5,
  "dailyLimit": 64.8,
  "limitExceeded": false,
  "currentStreak": 5,
  "longestStreak": 12,
  "lastConsumptionAt": "2024-01-15T14:30:00.000Z"
}
```

> `dailyLimit` is calculated from the user's BMR and activity level. Defaults to `50g` if the health profile is incomplete.

---

### GET `/nutrition/charts/weekly`

Get 7-day historical sugar consumption data for chart rendering.

**Response `200 OK`:**

```json
{
  "data": [
    { "date": "2024-01-09", "totalSugar": 0, "logCount": 0, "exceeded": false },
    { "date": "2024-01-10", "totalSugar": 22.5, "logCount": 3, "exceeded": false },
    { "date": "2024-01-11", "totalSugar": 68.2, "logCount": 5, "exceeded": true },
    { "date": "2024-01-12", "totalSugar": 45.0, "logCount": 2, "exceeded": false },
    { "date": "2024-01-13", "totalSugar": 30.1, "logCount": 2, "exceeded": false },
    { "date": "2024-01-14", "totalSugar": 0, "logCount": 0, "exceeded": false },
    { "date": "2024-01-15", "totalSugar": 18.5, "logCount": 1, "exceeded": false }
  ],
  "dailyLimit": 64.8
}
```

---

### GET `/nutrition/daily-pattern`

Breakdown of sugar consumption by time of day.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | Today | Date to analyze (`YYYY-MM-DD`) |

**Response `200 OK`:**

```json
{
  "data": [
    { "period": "morning", "timeRange": "06:00 - 12:00", "totalSugar": 8.5, "logCount": 2, "percentage": 45.9 },
    { "period": "afternoon", "timeRange": "12:00 - 18:00", "totalSugar": 10.0, "logCount": 1, "percentage": 54.1 },
    { "period": "night", "timeRange": "18:00 - 06:00", "totalSugar": 0, "logCount": 0, "percentage": 0 }
  ],
  "date": "2024-01-15"
}
```

---

## 4. Summarize (Premium)

### POST `/summarize`

Generate personalized AI health recommendations based on the user's consumption patterns, BMI, and activity level.

**Auth:** Bearer JWT + Active Premium Subscription

**Request Body:** None

**Response `200 OK`:**

```json
{
  "recommendation": "Rata-rata konsumsi gula harian Anda (42.3g) di bawah batas personal 64.8g. Selamat! Karena Anda sangat aktif, tubuh Anda memerlukan lebih banyak energi. Namun pastikan sumber gula berasal dari makanan sehat, bukan hanya minuman kemasan.",
  "bmi": 22.9,
  "bmiCategory": "Normal",
  "avgDailySugar": 42.3,
  "tips": [
    "Rata-rata konsumsi gula Anda 42.3g/hari, di bawah batas personal 64.8g. Pertahankan!",
    "Konsumsi gula tertinggi Anda di waktu malam. Pertimbangkan alternatif yang lebih sehat di jam tersebut.",
    "Dengan tingkat aktivitas \"ACTIVE\", batas gula Anda lebih tinggi (64.8g). Namun tetap prioritaskan sumber karbohidrat kompleks."
  ]
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `401` | Invalid or expired token |
| `403` | No active premium subscription |

---

## 5. Business Logic Reference

### NutriGrade Calculation (Sugar-Only)

Grades are determined **solely by sugar concentration** (g per 100mL). Salt and saturated fat are recorded but do not affect the grade.

| Grade | Max Sugar per 100mL |
|-------|---------------------|
| A | ≤ 1.0g |
| B | ≤ 5.0g |
| C | ≤ 8.0g |
| D | > 8.0g |

### Dynamic Daily Sugar Limit

The daily limit is personalized using the **Mifflin-St Jeor BMR** equation:

**BMR:**
- Male: `(10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5`
- Female: `(10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161`

**TDEE (Total Daily Energy Expenditure):**

| Activity Level | Multiplier |
|----------------|------------|
| SEDENTARY | BMR x 1.2 |
| LIGHT | BMR x 1.375 |
| MODERATE | BMR x 1.55 |
| ACTIVE | BMR x 1.725 |

**Daily Sugar Limit:** `(TDEE x 0.10) / 4` grams

**Fallback:** `50g/day` (when health profile is incomplete)

**Example:** 25-year-old male, 70kg, 175cm, MODERATE activity:
- BMR = 1673 kcal
- TDEE = 1673 x 1.55 = 2593 kcal
- Limit = (2593 x 0.10) / 4 = **64.8g/day**

### Streak Rules

- Streak increments for each consecutive day where total sugar consumed **≤ Daily Limit**.
- Streak resets to 0 if:
  1. Sugar consumed **> Daily Limit** in a day.
  2. A calendar day passes with **zero** logs (empty day).
- If today has no logs yet, the streak shows through yesterday (doesn't break mid-day).

### Scan Flow (Pre-signed URL)

```
1. Frontend  →  GET /nutrition/scan-upload-url     →  { uploadUrl, s3Key }
2. Frontend  →  PUT <uploadUrl> (image binary)     →  Image stored in S3
3. Frontend  →  POST /nutrition/scan { s3Key }     →  OCR + Grade + Save
```

The backend never handles the image binary in the API handler. Gemini reads the image from S3 after the backend downloads it.
