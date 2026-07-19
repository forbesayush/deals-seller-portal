# 🛒 Project 5 — deals.seller Deal Portal Clone

A full-featured **cashback deal management portal** clone of [deal.deals.seller.com](https://deal.deals.seller.com/), built as a static HTML/CSS/JavaScript single-page application with a secure authentication system and a full admin panel.

> **Live Demo** → [GitHub Pages Link](https://forbesayush.github.io/deals-seller-portal/)

---

## 🚀 Features

### 🔐 Secure Authentication
- **SHA-256 password hashing** via Web Crypto API
- **Session-based auth** using `sessionStorage` (auto-expires in 8 hours)
- **Role-based routing** — Admin vs Buyer access separation
- Buyer registration with email/mobile duplicate detection

### 🛍️ Buyer Portal (`/customer/dashboard.html`)
| Page | Features |
|------|----------|
| **Dashboard** | Stats, hot deals carousel, recent order history |
| **Active Deals** | Filter by brand, platform; request deal |
| **Rewards Wallet** | Coin balance, INR value, withdrawal tracker |
| **Order History** | Full history with status, amounts, actions |
| **What's New** | Feature announcements |
| **Help & Support** | Ticket submission system |
| **My Appeals** | Track appeal status |
| **Profile / Settings** | Payment details (UPI/Bank), security, unlock dashboard |

### 👑 Admin / Owner Panel (`/admin/panel.html`)
| Section | Features |
|---------|----------|
| **Dashboard** | Live stats: users, orders, revenue, pending payouts, platform breakdown |
| **Users** | All buyers with per-user order count, total paid, pending amount, suspend/activate |
| **All Orders** | Full table: Order No, Product Code, Platform, Deal Type, User, Mediator, Dates, Amount, Deduction, Final Payout, Status, Screenshot |
| **Refunds** | 5-stage visual timeline (0–6hr → 6–24hr → 24–36hr → 36–48hr → Resolved), advance/resolve controls |
| **Pending Review** | Bulk checkbox select + **Mark All Paid** in one click |
| **Deals** | Add/toggle active/delete deals |
| **Reports** | Export **Orders CSV**, **Users CSV**, **Refunds CSV** |
| **Settings** | Admin password change, portal toggles |

---

## 🗂️ File Structure

```
project 5/deal-portal/
├── index.html              # Landing page
├── login.html              # Unified secure login (Buyer + Admin)
├── orderform.html          # Order submission form
├── refundform.html         # Refund request form
├── mediator.html           # Mediator portal
├── track_order.html        # Order tracking
├── css/
│   └── styles.css          # Global design system
├── js/
│   ├── auth.js             # Auth module (SHA-256, sessions, CSV export)
│   └── main.js             # Shared logic
├── customer/
│   └── dashboard.html      # Buyer dashboard SPA
└── admin/
    └── panel.html          # Admin panel SPA
```

---

## 🔑 Demo Credentials

| Role | Identifier | Password |
|------|-----------|----------|
| **Demo Buyer** | `9123337436` | `ekta@123` |

---

## ⚙️ Tech Stack

- **HTML5** + **CSS3** (Vanilla, no frameworks)
- **JavaScript** (ES6+, no libraries)
- **Web Crypto API** for SHA-256 hashing
- **localStorage** for data persistence
- **sessionStorage** for secure session management
- **Phosphor Icons** + **Google Fonts (Quicksand)**

---

## 🎯 Pages Overview

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/index.html` | Hero, features, live deal cards |
| Login | `/login.html` | Secure login with role switcher |
| Order Form | `/orderform.html` | Submit new cashback order |
| Refund Form | `/refundform.html` | Request a refund |
| Track Order | `/track_order.html` | Track order status |
| Mediator Portal | `/mediator.html` | Mediator-specific view |
| Buyer Dashboard | `/customer/dashboard.html` | Full buyer account SPA |
| Admin Panel | `/admin/panel.html` | Full owner/admin SPA |

---

## 📦 How to Run

1. Clone the repo:
   ```bash
   git clone https://github.com/forbesayush/DecodeLabs-Internship.git
   ```
2. Navigate to the project:
   ```bash
   cd "project 5/deal-portal"
   ```
3. Open `index.html` in any browser — **no server needed!**

> Or use VS Code Live Server for the best experience.

---

## 📸 Screenshots

| Landing Page | Login Page | Admin Panel |
|-------------|-----------|-------------|
| Animated gradient hero, deal cards | Role switcher, SHA-256 auth | Full order tracking, CSV export |

---

*Built as part of DecodeLabs Internship — Project 5*
