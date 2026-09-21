<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white" />
</p>

# ✍️ Blogify

**Blogify** is a full-stack blogging platform built with the **MERN stack** (MongoDB, Express.js, React, Node.js). Users create, edit and explore blog posts with a rich text editor, cover images, category filters, comments and reporting. Destination articles lead into paid **Travel Guides**: subscription plans, community-written guides, reports, refunds and **Stripe (test mode)** payments, all managed from an admin dashboard.

---

## ✨ Features

### For Readers
- 📰 **Browse Blogs**: responsive grid of blog cards on the home page
- 🏷️ **Filter by Category**: 8 main categories with subcategories
- 💬 **Comments**: leave comments on any blog post
- 🚩 **Report Content**: flag inappropriate blogs for admin review
- 🧳 **Travel Guides**: a **Travel Guide** button under each destination heading opens a step-by-step plan (routes, hotels, rentals, guides, restaurants, costs, itinerary, rate card) unlocked by a subscription

### For Authors
- ✏️ **Rich Text Editor**: TipTap WYSIWYG editor with inline image uploads
- 🖼️ **Cover Images**: upload a cover image for each post
- 📂 **Categorize Posts**: assign a category and subcategory
- 📝 **Edit & Manage**: edit your published posts from the profile menu
- 🗺️ **Share Travel Guides**: write your own guide for any destination; it is saved under your account and reviewed by an admin before it goes live

### For Admins
- 🛡️ **Admin Dashboard**: view and manage all blogs, users, comments and reports
- 🗑️ **Content Moderation**: delete inappropriate blogs, edit comments, dismiss reports
- 🧳 **Travel & Plans** (`/admin/travel`): plans, destinations, guide content, rate cards, community guides, guide reports, users' plans, subscribers and revenue

---

## 🧳 Travel Guides & Subscriptions

Free destination articles lead into paid **travel guides**. Everything below is managed from **Admin → Travel & Plans** (`/admin/travel`). Nothing is hardcoded in the frontend.

**The flow:** Blog → **Travel Guide** button → sign-in check → subscription check → guide content for the user's plan.

| Concept | How it works |
|---|---|
| **Plans** | Monthly plans (seeded on first run: Basic ₹49, Premium ₹99, Ultimate ₹159). Each has a price, duration, feature list and an **access level (rank)**. A plan unlocks everything at its level *and below*. |
| **Destinations & content** | Each destination has travel content (routes, bus/train/flight, hotels, rentals, guides, restaurants, expenses, itinerary…) and a **rate card**. Every item picks the plan that unlocks it. |
| **Travel Guide button** | Appears automatically under the heading of any destination linked to a post (matched by name, e.g. "1. Warangal Fort – …"), or place it by hand with 🧳 in the post editor. |
| **Locked content** | Stays on the server. Higher-tier items reach the browser only as an upgrade prompt (no title, details or prices). |
| **Community guides** | Any signed-in user can write a guide (`/travel/<slug>/contribute`). It is stored under their account, hidden until an admin approves it, and the admin picks which plan unlocks it. Editing a published guide sends it back for review. |
| **Reports** | Subscribers can report a community guide (incorrect / outdated / misleading / incomplete / other). Admins rule on it under **Guide Reports**: mark guide correct / incorrect, approve / reject the report, edit or remove the guide. |
| **Refunds** | When a guide is found incorrect, the reporter can be refunded **100%** if a paid subscription gave them access to it. The refund goes back through the payment gateway that took the money. |
| **Revenue** | A subscription's money is split equally between the content that subscriber was shown. A community author's share is `GUIDE_CREATOR_SHARE_PERCENT` (server env, default 50). Shown to admins only; users never see it. |
| **Users & Plans** | Admins can see every user's plan and set it to *none / Basic / Premium / Ultimate* for testing or support. This is a marked **admin grant**: no payment, no revenue, not refundable. |

### 💳 Payments

Payments go through a provider-agnostic layer (`server/services/payment.js`), chosen with `PAYMENT_PROVIDER`:

| Provider | Use |
|---|---|
| `stripe` | **Stripe test mode.** Card form (Stripe Payment Element) inside the site's own popup. The server sets the price; the plan is granted only after Stripe confirms the payment (signed webhook, or the server re-reading the payment from Stripe). Admin refunds call Stripe's Refunds API. **Only `sk_test_…` keys are accepted**; live keys are refused. |
| `mock` | No setup, no money. A practice payment button. **Blocked when `NODE_ENV=production`** unless `ALLOW_MOCK_PAYMENTS=true`, because it grants plans for free. |
| `razorpay` | Placeholder: two functions to fill in (`createOrder`, `verify`) plus `refund`. |

**Stripe test cards** (any future expiry, any 3-digit CVC, any postal code):

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Asks for bank (3D Secure) confirmation |

---

## 🏷️ Blog Categories

| Category | Subcategories |
|---|---|
| **Sports** | Cricket · Football · Basketball · Tennis · Other |
| **Travel** | Adventure · Beach & Islands · City Breaks · Road Trips · Other |
| **Technology** | AI & Machine Learning · Web Development · Mobile Apps · Gadgets & Reviews · Other |
| **Food** | Recipes · Restaurant Reviews · Street Food · Healthy Eating · Other |
| **Entertainment** | Movies & TV · Music · Gaming · Books & Literature · Other |
| **Lifestyle** | Fashion & Beauty · Health & Fitness · Home & Decor · Relationships · Other |
| **Education** | Study Tips · Career Guidance · Online Courses · Science & Research · Other |
| **Business** | Startups · Marketing · Finance & Investing · Freelancing · Other |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Vite 8, TipTap (rich text), Stripe.js + React Stripe |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB with Mongoose |
| **Auth** | JWT (httpOnly cookies), salted + hashed passwords |
| **Payments** | Stripe (test mode) with a pluggable provider layer |
| **File Uploads** | Multer (cover images and inline editor images) |
| **Dev Tools** | Nodemon, Concurrently, Oxlint |
| **Hosting** | Backend on Render, frontend on Vercel |

---

## 📁 Project Structure

```
Blogify/
├── package.json                  # Root orchestrator (runs server + client together)
├── render.yaml                   # Render service definition (backend)
├── server/                       # Express backend
│   ├── index.js                  # Entry point (stripe webhook is mounted before the JSON parser)
│   ├── models/
│   │   ├── blog.js  comment.js  report.js  user.js
│   │   ├── plan.js               # Subscription plan (price, duration, access level)
│   │   ├── subscription.js       # One row per purchased / granted period
│   │   ├── payment.js            # Every checkout attempt (the payment history)
│   │   ├── destination.js        # A place with a travel guide
│   │   ├── travelContent.js      # Guide item (hotel, route…) tagged with its plan
│   │   ├── rateCardItem.js       # Rate-card row tagged with its plan
│   │   ├── travelGuide.js        # Community-written guide (author, status, plan)
│   │   ├── guideReport.js        # A report on a community guide
│   │   └── guideUnlock.js        # Which content a subscription was shown (revenue / refunds)
│   ├── routes/
│   │   ├── blog.js  user.js  admin.js
│   │   ├── travel.js             # Public + subscriber guide endpoints, contribute, report
│   │   ├── subscription.js       # Plans, checkout, verify
│   │   ├── stripeWebhook.js      # Signed Stripe webhook
│   │   └── adminTravel.js        # Admin: plans, destinations, content, guides, reports, refunds, users
│   ├── services/
│   │   ├── authentication.js     # JWT creation & validation
│   │   ├── subscription.js       # Access rules, pricing, activation
│   │   ├── payment.js            # Provider layer: stripe / mock / razorpay
│   │   └── guides.js             # Unlock tracking, revenue split, refunds
│   ├── middlewares/              # authentication, requireAuth, requireAdmin
│   ├── utils/                    # Route helpers, guide validation
│   ├── data/                     # Travel content categories
│   ├── scripts/
│   │   ├── seedTravelDemo.js     # Demo data: 5 travel blogs, guides, rate cards, test users
│   │   ├── travelDemoData.js     # The demo content itself
│   │   ├── stripe-listen.cmd     # Forward Stripe webhooks to localhost (Windows)
│   │   ├── importFromProduction.js
│   │   └── resetPassword.js
│   └── public/uploads/           # Uploaded and demo images
└── client/                       # React frontend
    ├── vercel.json               # Rewrites API paths to the Render backend
    └── src/
        ├── App.jsx
        ├── components/           # BlogCard, BlogGrid, CategoryFilter, Footer, Navbar,
        │                         # RichTextEditor, GuideForm, StripeCheckout, ...
        ├── pages/                # Home, BlogDetail, CreatePost, EditPost, SignIn, SignUp,
        │                         # AdminDashboard, AdminTravel, TravelIndex, TravelPlan,
        │                         # TravelContribute, Subscription, ...
        ├── utils/api.js          # Small fetch helper
        └── styles/global.css     # Design system & CSS variables
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or an Atlas connection string)

### Installation

```bash
git clone https://github.com/Multi-meta/Blogify-addBlog-.git
cd Blogify-addBlog-
npm install
npm run install:all
```

### Configuration

Create `server/.env` (it is git-ignored). See `server/.env.example` for every option.

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string (default: local `blogify` database) |
| `JWT_SECRET` | Secret for login tokens (**required in production**) |
| `PORT`, `CLIENT_URL`, `NODE_ENV` | Server port, allowed frontend origin, environment |
| `PAYMENT_PROVIDER` | `stripe`, `mock` (default) or `razorpay` |
| `STRIPE_SECRET_KEY` | `sk_test_…` (server only, never commit) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` (public, sent to the browser) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for the webhook endpoint |
| `GUIDE_CREATOR_SHARE_PERCENT` | Author's share of a community guide's revenue (default 50) |
| `ALLOW_MOCK_PAYMENTS` | `true` to allow the mock provider in production |

### Running the App

```bash
npm run dev          # server (8000) + client (5173) together
```

Or separately: `npm run server` and `npm run client`. Open [http://localhost:5173](http://localhost:5173).

### Demo data (optional)

Load five complete travel blogs with guides for all three plans, rate cards, test users, community guides and a sample report:

```bash
cd server
node scripts/seedTravelDemo.js
```

- It only adds what is missing, so it is safe to run again and never overwrites admin edits.
- It writes to the `MONGO_URI` database and **refuses non-local databases** unless `SEED_ALLOW_REMOTE=true`.
- It prints the demo logins at the end. On a remote database the admin password is **random** (or set `SEED_ADMIN_PASSWORD`).
- Prices, hotels and other details are **illustrative test data**. Verify them before publishing.

### Testing Stripe payments locally

1. Put your **test** keys in `server/.env` (`PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), run `stripe login`, then `stripe listen --print-secret` and put the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`.
3. While testing, keep the forwarder running: `server/scripts/stripe-listen.cmd` (or `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded --forward-to localhost:8000/api/subscription/stripe/webhook`).
4. Sign in, open a Travel Guide, choose a plan and pay with `4242 4242 4242 4242`.

---

## ☁️ Deployment

The backend runs on **Render** (`render.yaml`) and the frontend on **Vercel** (`client/vercel.json` rewrites `/api`, `/user`, `/blog`, `/admin`, `/uploads` and `/images` to the Render URL).

**Render environment variables:** `NODE_ENV=production`, `MONGO_URI` (Atlas), `JWT_SECRET`, `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

**Stripe webhook for the live site:** in the Stripe dashboard (test mode) add an endpoint `https://<your-render-app>.onrender.com/api/subscription/stripe/webhook` for `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.refunded`, and use **that endpoint's** signing secret as `STRIPE_WEBHOOK_SECRET`. The secret printed by the Stripe CLI only works locally.

**Seeding the online database:** `MONGO_URI="<atlas uri>" SEED_ALLOW_REMOTE=true node scripts/seedTravelDemo.js`. Note the printed admin password and change or delete the demo accounts before sharing the site widely.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/user/signup` | Register a new user |
| `POST` | `/user/signin` | Sign in and set auth cookie |
| `GET` | `/user/me` | Current authenticated user |
| `GET` | `/user/logout` | Clear auth cookie |

### Blogs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/blogs` | All blogs (`?category=X&subcategory=Y`) |
| `GET` | `/api/my-blogs` | Blogs by the logged-in user |
| `GET` | `/blog/:id` | One blog with comments and linked destinations |
| `POST` | `/blog` | Create a blog (multipart) |
| `PUT` | `/blog/:id` | Edit a blog (author or admin) |
| `DELETE` | `/blog/:id` | Delete a blog (admin) |
| `POST` | `/blog/comment/:blogId` | Add a comment |
| `POST` | `/blog/report/:blogId` | Report a blog |
| `POST` | `/blog/upload-image` | Upload an inline editor image |

### Travel guides (signed-in users)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/travel` | Public list of destinations |
| `GET` | `/api/travel/:slug/info` | Public destination basics |
| `GET` | `/api/travel/:slug` | The guide, filtered by the user's plan (needs a subscription) |
| `POST` | `/api/travel/:slug/guides` | Submit a community guide |
| `GET` | `/api/travel/guides/mine` | The user's own guides |
| `PUT` / `DELETE` | `/api/travel/guides/:id` | Edit (resubmits for review) / withdraw an unpublished guide |
| `POST` | `/api/travel/guides/:id/report` | Report a community guide |

### Subscriptions & payments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/plans` | Purchasable plans |
| `GET` | `/api/subscription/me` | Current plan, price quotes, payment history |
| `POST` | `/api/subscription/checkout` | Start a purchase (server-side price) |
| `POST` | `/api/subscription/verify` | Confirm a payment with the gateway |
| `POST` | `/api/subscription/stripe/webhook` | Stripe webhook (signature required) |

### Admin (admin only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/reports` · `DELETE /admin/reports/:id` | Blog reports |
| `GET` | `/admin/blogs` · `/admin/users` · `/admin/comments` · `/admin/stats` | Dashboard data |
| `GET/POST/PUT/DELETE` | `/admin/plans` | Manage plans |
| `GET/POST/PUT/DELETE` | `/admin/destinations`, `/admin/travel-content`, `/admin/rate-card` | Destinations, guide content, rate cards |
| `GET/PUT/DELETE` | `/admin/guides` | Review, edit, approve / reject, remove community guides |
| `GET` | `/admin/guide-reports` | Guide reports |
| `PATCH` | `/admin/guide-reports/:id` | `correct` · `incorrect` · `approve` · `reject` |
| `POST` | `/admin/guide-reports/:id/refund` | 100% refund of the reporter's payment |
| `GET/PUT` | `/admin/user-subscriptions` | See and set users' plans (admin grant) |
| `GET` | `/admin/subscriptions` | Subscribers, payments, revenue, refunds |

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Express and Vite together |
| `server` | `npm run server` | Express only (Nodemon) |
| `client` | `npm run client` | Vite dev server only |
| `start` | `npm start` | Express in production mode |
| `build` | `npm run build` | Build the React client |
| `install:all` | `npm run install:all` | Install server and client dependencies |
| seed | `node server/scripts/seedTravelDemo.js` | Load the demo travel data |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ using the MERN Stack
</p>
