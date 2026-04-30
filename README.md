<div align="center">

# 🧠 Sendelightgifts   AiBuddy - Learning Assistant

![Typing SVG](https://readme-typing-svg.demolab.com/?font=Fira+Code&weight=600&size=28&duration=3000&pause=1000&color=8B5CF6&center=true&vCenter=true&multiline=true&repeat=true&width=600&height=100&lines=AI-Powered+Learning+Assistant+%F0%9F%8C%9F;Learn+%E2%80%A2+Play+%E2%80%A2+Grow+%E2%80%A2+Explore)

<p align="center">
  <strong>An AI-powered, inclusive learning assistant designed for children with autism and special needs. Features interactive games, social stories, emotional support, AI chat, image generation, and subscription management.</strong>
</p>

<p align="center">
  <a href="#-features"><strong>Features</strong></a> ·
  <a href="#-tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#-security"><strong>Security</strong></a> ·
  <a href="#-getting-started"><strong>Getting Started</strong></a> ·
  <a href="#-deployment"><strong>Deployment</strong></a> ·
  <a href="#-documentation"><strong>Documentation</strong></a>
</p>

<br/>

![GitHub repo size](https://img.shields.io/github/repo-size/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts?style=for-the-badge&color=8B5CF6)
![GitHub stars](https://img.shields.io/github/stars/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts?style=for-the-badge&color=8B5CF6)
![GitHub forks](https://img.shields.io/github/forks/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts?style=for-the-badge&color=F59E0B)
![GitHub issues](https://img.shields.io/github/issues/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts?style=for-the-badge&color=EF4444)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&color=3B82F6)

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="line" width="100%">

</div>

<br/>

## ✨ Features

<div align="center">

|             Feature              | Description                                                              |
| :------------------------------: | :----------------------------------------------------------------------- |
|     🤖 **AI Chat Assistant**      | Gemini-powered conversational AI tailored for children                   |
|     🎨 **AI Image Generation**    | Child-friendly image creation with monthly quotas                        |
|     🎮 **6 Educational Games**    | Colors, Shapes, Memory + 3 Pro-only games (Pattern, Odd-One-Out, Word Builder) |
|     🎨 **Colors & Shapes Game**   | Interactive matching game for learning colors and shapes                 |
|     🧩 **Memory Game**            | Card-matching memory game with adjustable difficulty                     |
|     📖 **Social Stories**          | Visual social stories with AI image generation                           |
|     😊 **Feelings Helper**        | Emotional support companion with voice feedback                          |
|     🖼️ **AI Image Gallery**       | Gallery of AI-generated images saved per user                   |
|     🔐 **User Authentication**    | Email-based signup/signin with school & teacher assignment               |
|     👨‍💼 **Admin Dashboard**        | Secret-key admin access for managing the platform                        |
|     💳 **Stripe Subscriptions**   | Pro plan with monthly/yearly billing via Stripe                          |
|     📱 **Mobile Optimized**        | Responsive design for all device sizes                                   |
|     🎵 **Calm Breathing**          | Guided breathing exercises with ambient sounds                           |
|     🏥 **API Health Monitoring**   | Automated health checks for all APIs every 10 hours                      |
|     🛡️ **Security Hardened**      | Prompt injection prevention, XSS protection, input sanitization          |
|     🚸 **Abuse Detection**        | AI-powered child safety monitoring with alert system                     |

</div>

<br/>

## 🔧 Tech Stack

<div align="center">

### Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)

### Backend & Database

![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Deno](https://img.shields.io/badge/Deno-000000?style=for-the-badge&logo=deno&logoColor=white)

### AI & APIs

![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)

### Libraries

![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![DOMPurify](https://img.shields.io/badge/DOMPurify-FF6B6B?style=for-the-badge&logo=javascript&logoColor=white)

### Deployment

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="line" width="100%">

<br/>

## 🛡️ Security

This project implements comprehensive security measures for protecting children:

| Layer | Protection |
| :--- | :--- |
| **Prompt Injection** | Pattern-based detection blocks 50+ injection patterns (DAN, jailbreak, role manipulation, system prompt extraction) |
| **XSS Prevention** | DOMPurify with strict allowlists, CSP meta tags, pre-sanitization of all markdown content |
| **Input Sanitization** | Server-side validation on ALL edge functions: length limits, type checks, HTML stripping, null byte removal |
| **SQL Injection** | Parameterized queries via Supabase SDK (no raw SQL), input validation before all DB operations |
| **Timing Attacks** | Constant-time string comparison for admin key verification, artificial delays on auth failures |
| **Guardrails** | AI system prompt with mandatory anti-manipulation rules, child-safety-first content filtering |
| **Abuse Detection** | Dual-layer (keyword + AI analysis) safety monitoring with severity-based alerting |
| **Rate Limiting** | Per-endpoint rate limit handling, brute-force delay on admin verification |
| **Content Security** | CSP headers restrict script/style/connect sources, `object-src 'none'`, `base-uri 'self'` |

<br/>

## 📁 Project Structure

```bash
learning-assistant/
├── 📂 public/
│   ├── 📂 audio/                  # Ambient sounds (forest, waterfalls)
│   ├── 📂 images/                 # Social story images
│   ├── favicon.png, logo.png
│   ├── robots.txt, sitemap.xml
├── 📂 src/
│   ├── 📂 components/
│   │   ├── ChatArea.tsx           # Reusable AI chat component (with quota pre-checks)
│   │   ├── TermsModal.tsx         # Terms & conditions modal
│   │   ├── VoiceRecorder.tsx      # Speech-to-text recorder
│   │   └── 📂 ui/                 # shadcn/ui components
│   ├── 📂 contexts/
│   │   ├── AppContext.tsx         # App-wide state management
│   │   └── AuthContext.tsx        # Authentication state
│   ├── 📂 data/
│   │   └── gameData.ts           # Game configurations & data
│   ├── 📂 hooks/
│   │   ├── use-mobile.tsx         # Mobile detection hook
│   │   └── use-toast.ts          # Toast notification hook
│   ├── 📂 lib/
│   │   ├── api.ts                # API helpers (quota checks, chat, contact, etc.)
│   │   ├── externalSupabase.ts   # External Supabase client
│   │   ├── markdown.ts           # Secure markdown processing (DOMPurify)
│   │   └── utils.ts              # Utility functions
│   ├── 📂 pages/
│   │   ├── AdminLoginPage.tsx    # Admin authentication
│   │   ├── EnterprisePage.tsx    # Enterprise contact page
│   │   ├── ForgotPasswordPage.tsx # Password recovery
│   │   ├── LandingPage.tsx       # Public landing page
│   │   ├── MaintenancePage.tsx   # Maintenance mode page
│   │   ├── ResetPasswordPage.tsx # Password reset form
│   │   ├── SignInPage.tsx        # User sign in
│   │   ├── SignUpPage.tsx        # User registration
│   │   └── 📂 app/
│   │       ├── AccountPage.tsx     # Account dashboard & subscriptions
│   │       ├── AppLayout.tsx       # App shell layout
│   │       ├── CalmBreathingPage.tsx
│   │       ├── ChatPage.tsx        # General AI chat
│   │       ├── ColorsShapesPage.tsx
│   │       ├── FeelingsHelperPage.tsx
│   │       ├── GalleryPage.tsx     # AI image gallery
│   │       ├── MemoryGamePage.tsx
│   │       └── SocialStoriesPage.tsx
│   └── 📂 styles/
│       └── global.css            # Global styles
├── 📂 supabase/
│   └── 📂 functions/
│       ├── chat/                 # AI chat (with input sanitizer & abuse detection)
│       │   ├── index.ts
│       │   ├── abuseDetection.ts
│       │   └── inputSanitizer.ts
│       ├── check-email-exists/   # Email verification
│       ├── check-subscription/   # Subscription & usage checker
│       ├── contact/              # Contact form handler
│       ├── create-checkout/      # Stripe checkout creation
│       ├── healthz-monitor/      # API health monitoring
│       ├── speech-to-text/       # Voice transcription
│       ├── toggle-maintenance/   # Maintenance mode toggle
│       ├── verify-admin/         # Admin verification (timing-safe)
│       ├── verify-payment/       # Stripe payment verification
│       └── verify-session/       # Session verification
├── 📄 MIGRATION.md               # Complete migration guide
├── 📄 DB_STRUCTURE.txt           # Database schema reference
└── 📄 README.md
```

<br/>

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **bun**
- **Git**

### Installation

1️⃣ **Clone the repository**

```bash
git clone https://github.com/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts.git
cd Learning_assistant_Sendelightgifts
```

2️⃣ **Install dependencies**

```bash
npm install
```

3️⃣ **Configure `.env` file**

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

4️⃣ **Start the development server**

```bash
npm run dev
```

5️⃣ **Open your browser**

```
http://localhost:8080
```

<br/>

## ☁️ Deployment

### Deploy to Vercel

<a href="https://vercel.com/new/clone?repository-url=https://github.com/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts" target="_blank">
  <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
</a>

### Environment Variables (Vercel)

| Variable                          | Description                   |
| :-------------------------------- | :---------------------------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID`      | Your Supabase project ID      |

### Supabase Edge Function Secrets

| Secret                              | Description                        |
| :---------------------------------- | :--------------------------------- |
| `ADMIN_SECRET_KEY`                 | Admin authentication key           |
| `GEMINI_API_KEY`                   | Google Gemini AI API key           |
| `STRIPE_SECRET_KEY`               | Stripe secret key for payments     |
| `RESEND_API_KEY`                   | Resend email API key               |
| `EXTERNAL_SUPABASE_URL`           | External Supabase project URL      |
| `EXTERNAL_SUPABASE_ANON_KEY`      | External Supabase anon key         |
| `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` | External Supabase service role key |

> 📖 For complete deployment instructions, see **[MIGRATION.md](./MIGRATION.md)**

<br/>

## 📚 Documentation

| Document                                    | Description                                        |
| :------------------------------------------ | :------------------------------------------------- |
| [MIGRATION.md](./MIGRATION.md)              | Complete self-hosting & deployment guide            |
| [DB_STRUCTURE.txt](./DB_STRUCTURE.txt)      | Database schema and structure reference             |

<br/>

## 🎯 Roadmap

- [X] AI Chat Assistant (Gemini-powered)
- [X] AI Image Generation with quotas
- [X] 3 extra Pro-only games (early & quick access for Pro users)
- [X] Colors & Shapes Matching Game
- [X] Memory Card Game
- [X] Social Stories with Image Generation
- [X] Feelings Helper with Voice
- [X] Calm Breathing Exercises
- [X] AI Image Gallery
- [X] User Authentication (Email)
- [X] Admin Dashboard
- [X] School & Teacher Assignment
- [X] Terms & Conditions Flow
- [X] Password Reset Flow
- [X] Mobile-First Design
- [X] Stripe Subscription (Pro Plan)
- [X] Usage Quotas (monthly reset)
- [X] API Health Monitoring
- [X] Security Hardening (XSS, prompt injection, input validation)
- [X] Abuse Detection System
- [X] Enterprise Contact Page
- [ ] Multi-language Support
- [ ] Parent Dashboard
- [ ] Progress Tracking & Reports
- [ ] Offline Mode

<br/>

## 🤝 Contributing

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

<br/>

## 📬 Contact

<div align="center">

**Yugesh S** - Developer & Creator

[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=About.me&logoColor=white)](https://yugesh.me)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yugesh-kerckhoffs)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/yugeshsivakumar)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:contact@yugesh.me)

**Project Link:** [Learning_assistant_Sendelightgifts](https://github.com/yugesh-kerckhoffs/Learning_assistant_Sendelightgifts)

</div>

<br/>

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<br/>

## 💖 Acknowledgments

- [Supabase](https://supabase.com/) - Backend Infrastructure
- [Vercel](https://vercel.com/) - Hosting Platform
- [shadcn/ui](https://ui.shadcn.com/) - UI Components
- [Google Gemini](https://ai.google.dev/) - AI Models
- [Stripe](https://stripe.com/) - Payment Processing
- [Lucide Icons](https://lucide.dev/) - Beautiful Icons
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS Sanitization
- [Lovable](https://lovable.dev/) - Development Platform

<br/>

<div align="center">

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="line" width="100%">

<br/>

### ⭐ Star this repository if you found it helpful!

<br/>

![Wave](https://raw.githubusercontent.com/mayhemantt/mayhemantt/Update/svg/Bottom.svg)

**Made with ❤️ by [Yugesh S](https://yugesh.me)**

</div>
