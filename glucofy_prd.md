# Product Requirements Document (PRD): Glucofy / CareFull

## 1. Background & Purpose
**Background:** 
The Indonesian government has introduced the "Nutrigrade" program, a standardized grading system to classify the sugar, salt, and fat content in commercial beverages and foods. However, consumers often struggle to interpret complex nutrition labels manually to understand where a product falls on this scale.

**Purpose:**
Glucofy (also known as CareFull) is a mobile application designed to bridge the gap between the government's Nutrigrade initiative and daily consumer habits. The app empowers users to easily track and control their sugar intake by simply scanning nutrition labels. Through AI-driven insights, the app helps users build healthier consumption habits and avoid the long-term health risks associated with excessive sugar consumption.

## 2. Target Audience
- Health-conscious individuals looking to monitor their daily sugar intake.
- General consumers seeking an easy way to understand the health impact of the beverages they purchase.
- Users looking to build healthier lifestyle habits through data-driven tracking.

## 3. Core Features & Functional Requirements

### 3.1. AI Nutrition Scanner (Core)
- **Description:** Users can take a photo of the "Informasi Nilai Gizi" (Nutrition Facts) table on any food or beverage packaging.
- **Functionality:** 
  - AI/OCR extracts the GGL values: **Sugar (Gula)**, **Salt (Garam)**, and **Saturated Fat (Lemak Jenuh)** along with serving size per 100ml.
  - The system calculates and displays the official Nutri-Level grade (**A, B, C, or D**) based on government thresholds.
  - Provides a manual entry fallback (`/nutrition/manual`) if the scan fails. Manual entry also requires all three GGL values.

### 3.2. Daily Habit & Intake Dashboard
- **Description:** A central hub for users to monitor their real-time consumption.
- **Functionality:**
  - **Daily Limit Tracking:** Visual progress bar showing consumed sugar vs. personalized daily limit (e.g., 25g).
  - **Fasting Timer:** A live clock displaying time elapsed since the last sugary drink.
  - **Streak System:** Gamification that counts consecutive days the user stays under their daily sugar limit.

### 3.3. Analytics & Reporting
- **Description:** Historical data visualization to help users understand their long-term behavior.
- **Functionality:**
  - Weekly, Monthly, and Yearly bar charts.
  - **Timing Patterns:** Breakdown of consumption by time of day (Morning, Afternoon, Night) to identify bad habits.
  - **Alerts:** Notifications when users exceed their limits multiple times a week.

### 3.4. AI Smart Recommendations (Premium Feature)
- **Description:** Personalized, AI-generated health advice tailored to the user's specific body profile and habits.
- **Functionality:**
  - **Health Profile:** Users input Weight, Height, Age, and Gender to calculate BMI.
  - **Pattern Analysis:** AI identifies risk patterns (e.g., "Consumption spikes at night").
  - **Actionable Insights:** LLM-generated recommendations, such as substituting sweet drinks with water at night, or adjusting intake based on metabolic rates.
  - **Subscription Gate:** Locked behind an active premium subscription.

---

## 4. Technical Specifications & Cloud Infrastructure (AWS Focus)

### 4.1. High-Level Architecture (AWS Free Tier Strategy)
To optimize for a 3-month trial and semi-production testing, the infrastructure will be heavily serverless and managed using AWS Free Tier services.

- **Frontend / Client:** **Next.js PWA** hosted on **AWS Amplify**. Building a Progressive Web App allows for a unified codebase for both desktop and mobile testing without the overhead of App Store/Play Store deployments.
- **Backend API:** **NestJS** deployed on **AWS Lambda** (via API Gateway). 
- **Database:** **PostgreSQL** hosted on **Amazon RDS** (db.t3.micro is eligible for free tier, 750 hrs/month).
- **Image Storage:** **Amazon S3** (5GB standard storage free tier).
- **AI/ML Layer:** 
  - **OCR:** **Amazon Textract** (Free tier: 1,000 pages/month). Excellent for extracting structured data from tables.
  - **LLM Service:** OpenAI API (GPT-4o-mini) or Anthropic Claude via AWS Bedrock (if credits are available) for generating the natural language "Smart Recommendations".

### 4.2. Infrastructure Breakdown & Optimization
#### 4.2.1. Serverless Backend (NestJS on Lambda)
NestJS will be adapted for serverless execution using `@vendia/serverless-express`. 
*   **Cold Start Mitigation:** NestJS can suffer from slow cold starts due to Dependency Injection overhead. To mitigate this:
    *   Bundle the application using `esbuild` or `webpack`.
    *   Keep the app modular; avoid importing heavy libraries globally.
    *   Alternatively, utilize Provisioned Concurrency if cold starts severely impact UX (though this falls outside the standard free tier).

#### 4.2.2. Smooth OCR Processing (Amazon Textract)
Because OCR can be processing-intensive:
*   **Method 1 (Synchronous - For MVP):** The client sends the image via API to NestJS. NestJS calls the `AnalyzeDocument` API (specifying the `TABLES` feature) on AWS Textract synchronously and returns the parsed sugar data.
*   **Method 2 (Asynchronous - For Scale/Smooth UX):** The client uploads the image directly to an S3 bucket via a pre-signed URL. This triggers an S3 Event Notification to a Lambda function that calls Textract, saving the result to RDS. The frontend polls or uses WebSockets to get the result.

#### 4.2.3. Frontend (Next.js PWA on AWS Amplify)
*   **Unified Testing:** Using `next-pwa`, the Next.js app will be installable on mobile devices (Add to Home Screen). 
*   **Hosting:** AWS Amplify Hosting provides native support for Next.js SSR (Server-Side Rendering) and API routes. It handles CI/CD out of the box by connecting directly to your GitHub repository.

### 4.3. Draft Database Schema (Core Tables)
```sql
-- User Profile
CREATE TABLE Users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    name VARCHAR,
    role VARCHAR(20) DEFAULT 'USER', -- USER, PREMIUM
    age INT,
    weight FLOAT,
    height FLOAT,
    gender VARCHAR(10)
);

-- Consumption Logs (GGL = Gula, Garam, Lemak)
CREATE TABLE ConsumptionLogs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES Users(id),
    product_name VARCHAR,
    serving_size_ml FLOAT,            -- Serving size in ml
    sugar_per_100ml FLOAT,            -- Gula (g per 100ml)
    salt_per_100ml FLOAT,             -- Garam (g per 100ml)
    saturated_fat_per_100ml FLOAT,    -- Lemak Jenuh (g per 100ml)
    nutri_grade VARCHAR(1),           -- A, B, C, or D
    scan_image_s3_key VARCHAR,        -- NULL if entered manually
    entry_method VARCHAR(20) DEFAULT 'SCAN', -- 'SCAN' or 'MANUAL'
    consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nutri-Level Grading Thresholds (reference table, seeded from gov regulation)
-- This allows easy updates if the government changes thresholds
CREATE TABLE NutriGradeThresholds (
    id SERIAL PRIMARY KEY,
    grade VARCHAR(1) UNIQUE,          -- A, B, C, D
    max_sugar_per_100ml FLOAT,
    max_salt_per_100ml FLOAT,
    max_saturated_fat_per_100ml FLOAT
);
```

### 4.4. API Endpoint Architecture (Restructured)
The API follows strict RESTful conventions.
- `POST /auth/register` & `POST /auth/login`
- `GET /users/me` & `PATCH /users/me/health-profile`
- `POST /nutrition/scan` & `POST /nutrition/manual`
- `GET /nutrition/last-consumption`
- `GET /nutrition/charts/weekly?mode=all`
- `GET /nutrition/daily-pattern`
- `POST /summarize` (Premium AI Feature)
