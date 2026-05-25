# 🃏 Real-Time Poker Equity & All-In Cash Out Broadcast System

A premium, full-stack real-time poker utility built for table hosts, tournament organizers, and streamers. This system runs high-speed Monte Carlo simulations to calculate winning equity on the fly, executes simulated **All-In Cash Out** requests (applying expected value minus customizable table/house fees), and broadcasts the live hand status to a secondary WSOP/PokerGO style television/spectator display.

---

## ✨ Key Features

- **🎮 Support for Major Variants:**
  - **No-Limit Texas Hold'em (NLH)** (2 hole cards)
  - **4-Card Pot-Limit Omaha (PLO4)** (4 hole cards, must use exactly 2 hole cards + 3 board cards)
  - **5-Card Pot-Limit Omaha (PLO5)** (5 hole cards, must use exactly 2 hole cards + 3 board cards)

- **⚡ Instant Equity Calculations:**
  - Powered by a Monte Carlo simulation engine executing **20,000 hand iterations** in milliseconds.
  - Highly accurate, showing exact win, tie, and lose probabilities for two players given any number of board or burned cards.

- **💰 All-In Cash Out Workflow (Host Monetization):**
  - Displays each player's exact **Money Equity** (their fair expected share of the pot).
  - Deducts a configurable **Service Fee** (e.g. 5%) to replicate commercial casino structures.
  - Allows the dealer to manage, approve, reject, or pending player cash-out requests.
  - Enforces dealer hand logic (all community cards must run out if a cashout is approved).

- **📺 TV Broadcast Mode (Spectator Overlay):**
  - Establish connection instantly between the dealer's tablet/phone/PC and secondary screens/TVs using a short **6-digit dynamic pairing code**.
  - Ultra-fast real-time synchronization over **Server-Sent Events (SSE)**.
  - WSOP-style television aesthetic featuring neon glow effects, felt textures, live win equity bar transitions, and cashout success/denied micro-animations (complete with a celebratory bouncing trophy).

- **📁 Portable & Standalone:**
  - **Zero-Config In-Memory Fallback:** If a PostgreSQL database URL is not supplied, the app runs perfectly on a robust in-memory data store.
  - Fully responsive, mobile-optimized dealer touch interface.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide icons, Framer Motion, Radix UI Primitives, wouter (routing).
- **Backend:** Node.js, Express.js, Server-Sent Events (SSE).
- **Database:** PostgreSQL (with Drizzle ORM) or In-Memory (MemStorage) fallback.
- **Language:** 100% TypeScript.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/poker-cash-out.git
   cd poker-cash-out
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Start the application in development mode:
   ```bash
   npm run dev
   ```

The application is now serving on **`http://localhost:5000`**.

---

## 📋 How to Play / Run a Hand

1. **Open the Dealer Console:** Navigate to `http://localhost:5000` (on your main device).
2. **Open the Spectator Display:** Open `http://localhost:5000/tv` on a secondary TV/monitor.
3. **Pair the Screens:** Copy the 6-letter access code displayed in the purple banner on the Dealer Console and paste it into the TV Display pairing prompt.
4. **Deal Cards:**
   - Tap cards on the interactive selector to populate Player 1 and Player 2 hands.
   - Enter the pot size (e.g., $1,000) and service fee.
   - Watch equities and expected payouts update in real-time on both screens!
5. **Simulate a Cash Out:**
   - When a player goes all-in, click their **Cash Out** button on the dealer console to set the status to "Pending".
   - The TV Display will instantly transition to a "Cashout Pending" overlay.
   - Click "Approve" to lock in their payout. The TV Display will trigger a gold trophy celebration!

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure your environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the application runs on. | `5000` |
| `DATABASE_URL` | Optional PostgreSQL connection string. If omitted, falls back safely to in-memory mode. | `null` |

---

## 📄 License

This project is licensed under the MIT License.
