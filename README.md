# 🌾 AgriKart Prototype — Demand-First Agricultural Supply Chain Platform (SIH 26033)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)

> **Note:** This repository contains the **interactive prototype** for AgriKart. It has been streamlined to demonstrate the core user workflows, frontend UI, and Supabase integration. Extra modules (like machine learning models) have been removed from this specific prototype version for simplicity.

AgriKart is a demand-first B2B/B2F agricultural supply chain platform engineered for **Smart India Hackathon (SIH) Problem Statement 26033**. The platform directly connects bulk buyers with farmers and Farmer Producer Organizations (FPOs) by starting with **confirmed demand**, eliminating speculative farming and reducing multi-tiered middleman markups.

---

## 🎯 Problem Statement: SIH 26033

*   **Problem:** Multiple intermediaries in the agricultural supply chain reduce farmers' earnings and increase prices for end consumers.
*   **Expected Solution:**
    1.  **Direct Farmer/FPO Connectivity:** Connect producers directly with bulk buyers via confirmed demand.
    2.  **Micro-Logistics Support:** Shared transport pooling and route optimization.
    3.  **Price Realization & Efficiency:** Better returns for farmers, lower costs for buyers, and payment transparency.

---

## 🚀 Core Prototype Features

### 1. 📋 Demand-Led Aggregation
*   **Confirmed Demand First:** Institutional buyers post verified crop requirements (crop type, quantity, max price, min quality, deadline).
*   **Dynamic Supply Matching:** Connects demands directly with FPO yields based on crop type, quality grade, and real-time inventory.

### 2. 🔬 Verifiable Quality Grading
*   **Quality Audits:** Mocked workflows showing how field agents log physical crop metrics to generate verifiable Quality Certificates.
*   **UI Transparency:** Supply cards display accurate quality grades and units.

### 3. 🚛 Logistics & Order Management
*   **Order Fulfillment:** Workflow demonstrations showing the journey from partially matched to delivered.
*   **Authentic Mock Data:** Data seeded carefully to reflect real-world Indian agricultural scenarios and equipment metrics.

---

## 💻 Technology Stack

*   **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, Framer Motion.
*   **Backend (API):** Node.js, Express, TypeScript (For extended workflows outside the prototype scope).
*   **Database:** Supabase (PostgreSQL) populated using raw SQL seed files.

---

## 📁 Repository Structure

```
AgriKart/
├── frontend/             # Next.js 14 Web Application
│   ├── app/              # Core pages (dashboard, demands, supply, quality, logistics, orders, auth)
│   └── components/       # Design system, mock context provider, UI cards
├── backend/              # Node.js + Express API Server (Supplemental)
├── consolidated_schema.sql # Core PostgreSQL schema mapping
├── seed.sql              # Rich authentic test data for the prototype
└── README.md             # This file
```

---

## 🛠️ Local Setup & Running Instructions

### 1. Prerequisites
*   **Node.js:** v18.0.0 or higher
*   **Database:** Supabase project (PostgreSQL)

### 2. Database Setup (Supabase)
Run the following SQL scripts in your Supabase SQL Editor in exact order:
1. `consolidated_schema.sql` — Sets up the pruned core database structure.
2. `seed.sql` — Populates the tables with the prototype data.

### 3. Environment Variables Setup

Create a `.env.local` file inside the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Running the Prototype

Start the Frontend Client:
```bash
cd frontend
npm install
npm run dev
# Starts Next.js app at http://localhost:3000
```

*(Optional)* Start the Backend API (if executing supplemental endpoints):
```bash
cd backend
npm install
npm run dev
# Starts Express server at http://localhost:3001
```

---

## 👤 User Roles & Key Workflows (Available in Prototype via Role Switcher)

1. **Institutional Buyer:**
   * Post demand requirements → View matched FPOs → Confirm order.
2. **Farmer / FPO:**
   * Browse open demands → View supply catalog.
3. **Admin / Operations:**
   * Monitor quality analytics and system-wide logistics flow.
