# Gradeup Study – Online Mock Test Platform (Production Ready)

A high-performance, secure online mock test platform designed for real competitive exam practice with simultaneous student concurrency, anti-cheating monitoring, state-level leaderboards, and server-side scoring.

---

## 🛠 Tech Stack & Architecture

- **Frontend & UI**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Hosting & Deployment**: Vercel (with `vercel.json` SPA rewrites)
- **Database & Auth**: Supabase PostgreSQL + Row Level Security (RLS) + Stored RPC Functions
- **Custom Domain**: Namecheap DNS → Vercel CNAME/A Records

---

## 🚀 Step 1: Supabase Database Setup

1. Log in to [Supabase Console](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open the file `supabase/schema.sql` from this repository.
4. Copy the entire contents of `supabase/schema.sql` and run it in the SQL Editor.
5. This creates the required production tables:
   - `public.tests`
   - `public.questions`
   - `public.students`
   - `public.attempts`
   - `public.answers`
   - `public.social_platforms`
   - `public.admin_settings`
6. It also sets up secure server-side RPC functions:
   - `get_public_test_questions`: Omits answer keys from student browsers.
   - `submit_attempt_secure`: Calculates test scores securely on PostgreSQL.
   - `get_top_leaderboard`: Obfuscates candidate names for privacy while ranking scores.
   - `get_student_rank`: Computes real-time student position.

---

## 🔐 Step 2: Environment Variables

In Vercel or your local `.env` file, configure the following keys:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
PUBLIC_APP_URL="https://mocktest.gradeupstudy.com"
```

---

## 🌐 Step 3: Vercel Deployment & Namecheap Custom Domain

### Deploying to Vercel
1. Push this repository to **GitHub**.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy**.

### Setting up Custom Domain in Namecheap
1. Log in to **Namecheap** and go to **Domain List** -> **Manage**.
2. Click on **Advanced DNS**.
3. Add the following DNS Records:
   - **A Record**:
     - Host: `@`
     - Value: `76.76.21.21` (Vercel IP)
   - **CNAME Record**:
     - Host: `www` or `mocktest`
     - Value: `cname.vercel-dns.com`
4. In your Vercel Project Settings -> **Domains**, add `mocktest.gradeupstudy.com` or your domain.
5. Vercel will automatically provision SSL certificates.

---

## 📊 Shared Link Structure

Once deployed, shared test links work automatically for real students:

- `https://your-domain.com/?t=demo`
- `https://your-domain.com/t/demo`
- `https://your-domain.com/test/demo`

---

## 🛡 Security & Concurrency Verification

- **Anti-Cheating**: Tracks tab switches during active exams and alerts students.
- **Answer Key Protection**: Correct answers are kept hidden on the server until completion.
- **Server Scoring**: Evaluated via PostgreSQL stored procedure `submit_attempt_secure`.
- **Privacy Leaderboard**: Names are masked (e.g. `Rahul S.`) to keep phone numbers & emails private.
