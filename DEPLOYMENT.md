# 🚀 Deployment Guide: AgriKart Prototype

This guide outlines the step-by-step process to deploy the AgriKart prototype. The frontend will be deployed on **Vercel**, the backend (optional API) on **Render**, and the database on **Supabase**.

---

## 1️⃣ Database Setup (Supabase)

1. Create a free account and a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `consolidated_schema.sql` (from the root of this repository) into a new query and click **Run**.
4. Paste the contents of `seed.sql` into a new query and click **Run**.
5. Go to **Project Settings -> API** and copy your `Project URL` and `anon public` API key.

---

## 2️⃣ Backend Deployment (Render)

*Note: The frontend prototype connects directly to Supabase for most mock features, but if you extend the backend API endpoints, here is how to deploy it.*

1. Create an account on [Render](https://render.com) and connect your GitHub account.
2. Click **New +** and select **Web Service**.
3. Select your AgriKart GitHub repository.
4. **Configuration settings**:
   - **Name**: `agrikart-backend` (or similar)
   - **Root Directory**: `backend` (Important!)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (Make sure your `package.json` in the `backend` folder has `"start": "node server.js"`)
5. **Environment Variables** (Click Advanced -> Add Environment Variables):
   - `PORT`: `10000` (Render defaults to 10000)
   - `SUPABASE_URL`: (Your Supabase URL)
   - `SUPABASE_SERVICE_KEY`: (Your Supabase Service Role Key)
   - `FRONTEND_URL`: (Leave blank for now, you will update this after deploying Vercel)
6. Click **Create Web Service**. 
7. Once deployed, copy the Render URL (e.g., `https://agrikart-backend.onrender.com`).

---

## 3️⃣ Frontend Deployment (Vercel)

1. Create an account on [Vercel](https://vercel.com) and connect your GitHub account.
2. Click **Add New -> Project** and import your AgriKart repository.
3. **Configuration settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: Click Edit and select `frontend`.
4. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
   - `NEXT_PUBLIC_API_URL`: (Your Render Backend URL, e.g., `https://agrikart-backend.onrender.com`)
5. Click **Deploy**. Vercel will automatically build and deploy your Next.js application.

---

## 4️⃣ Finalizing the Connection

Once Vercel gives you your live frontend URL (e.g., `https://agrikart-prototype.vercel.app`), go back to your **Render** dashboard:
1. Open your backend web service.
2. Go to **Environment**.
3. Update the `FRONTEND_URL` variable to your new Vercel URL.
4. Render will automatically redeploy with the correct CORS configuration.

🎉 **You are fully deployed!** You can now access your live prototype on the Vercel URL.
