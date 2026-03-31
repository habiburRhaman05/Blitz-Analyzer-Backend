
# Blitz Analyzer Backend

### Description

Blitz Analyzer Backend is a production-style API server designed to power a full SaaS resume analysis platform. It handles authentication, resume processing, payments, and admin operations with a modular and scalable architecture.

---

### What Problem It Solves

* Helps users understand resume quality with structured analysis
* Provides a centralized system for resume history and reports
* Enables monetization through subscription/payment system
* Gives admins full control over users, pricing, and platform activity

---

### Challenges Solved

* Implemented secure OTP-based authentication flow
* Designed Stripe webhook handling for reliable payment tracking
* Structured modular backend for scalability and maintainability
* Managed relational data using Prisma with clean schema design
* Ensured secure token handling (access + refresh tokens)

---

### What this project demonstrates

* Secure API design
* Authentication + session management
* Payment system integration
* Scalable modular backend architecture

---

## Key Features (Impact-Oriented)

* 🔐 JWT authentication + session handling
* 📧 OTP email verification system
* 📊 Resume analysis processing + history storage + download resume
* 🧩 Template & pricing CRUD APIs
* 💳 Stripe payment + webhook handling
* 🧾 Invoice email system
* 👨‍💼 Admin panel APIs (users, payments, KPI)

---

## What makes it strong (HR view)

* Covers **complete SaaS backend flow**
* Includes **real payment integration (Stripe)**
* Implements **role-based access control (RBAC)**
* Uses **clean modular architecture (services, routes, modules)**

---

## Tech Stack

* Node.js + Express
* TypeScript
* PostgreSQL + Prisma
* JWT Authentication
* Stripe API
* SMTP Email Service

---

## Database ERD

---

## Core Modules

* Auth (JWT + OTP)
* User & Profile
* Resume Analysis
* Templates
* Pricing Plans
* Payments
* Admin
* Wallet Management

---

## Project Structure

```bash
backend/
├── modules/
├── routes/
├── services/
├── middlewares/
└── prisma/
```

---

## Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

---

## Environment

```env
DATABASE_URL=
JWT_ACCESS_SECRET=
STRIPE_SECRET_KEY=
SMTP_USER=
```

---

## API Highlights

* Auth → signup, login, OTP verify
* Analysis → create + history
* Templates → CRUD
* Payments → checkout + webhook
* Admin → users, status, soft delete

---

## System Flow

1. User registers
2. OTP verification
3. JWT issued
4. Resume analyzed
5. Data stored in DB
6. Payment handled via Stripe

---

## Security

* JWT protected routes
* Role-based access control
* OTP expiration
* Stripe webhook verification
* Soft delete for data safety

---


## Demo

Backend: ADD_LINK

---

## ⭐ Recruiter Quick View (High Impact)

### What to look at first

* End-to-end flow: **Auth → OTP → Dashboard → Analysis → Payment**
* Real SaaS features: **Stripe, Admin panel, RBAC, History tracking**
* Clean architecture: **modular backend + scalable frontend structure**


---

## 🎯 Highlights (Why this project stands out)

* Built a **complete SaaS product**, not just CRUD app
* Integrated **real payment system (Stripe)**
* Implemented **OTP-based authentication flow**
* Designed **admin system with control over users & pricing**
* Maintained **clean, scalable folder structure**
* Covered both **user experience + backend logic**

---

## 🧠 Technical Strength Signals

* Full-stack ownership (Frontend + Backend)
* API design with proper separation (routes, services, modules)
* Form validation using **Zod + React Hook Form**
* Secure auth using **JWT + session strategy**
* Database design with **Prisma + relational modeling**

---

## Final Notes (For Reviewers / HR)

This project represents a **production-style SaaS application** including:

* Authentication system
* Resume analysis workflow
* Payment integration
* Admin dashboard

It demonstrates ability to build **real-world scalable applications** with proper architecture and user flow.

## Github Repo : https://github.com/habiburRhaman05/Blitz-Analyzer-Backend
