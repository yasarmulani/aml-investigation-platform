# QLANTERN — AML Investigation Portfolio
## Team 2 — Quantum Pulse | Quantum Dice Trinity Challenge 2026

---

## Project structure

```
qlantern/
├── frontend/          React app (Netlify)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Topbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── CasePanel.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Queue.jsx
│   │   │   └── Analytics.jsx
│   │   └── utils/
│   │       ├── api.js
│   │       └── design.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/           FastAPI (Render)
│   ├── main.py
│   └── requirements.txt
└── netlify.toml
```

---

## Local development

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set artifact paths (backend expects ../artifacts and ../data relative to backend/)
# Run from the aml-network-tracking root:
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Deployment

### Backend → Render

1. Push the project to GitHub
2. Go to render.com → New Web Service
3. Connect repo, set:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. Add environment variable: `PYTHONPATH=/opt/render/project/src`
5. Upload artifacts and data folders as persistent disk at `/opt/render/project/src/artifacts` and `/opt/render/project/src/data`
6. Copy the Render URL (e.g. https://qlantern-api.onrender.com)

### Frontend → Netlify

1. Go to netlify.com → New site from Git
2. Connect repo, settings auto-detected from netlify.toml
3. Add environment variable:
   - `VITE_API_URL` = your Render URL (e.g. https://qlantern-api.onrender.com)
4. Deploy

---

## What each screen does

**Dashboard** — Landing page. Shows candidate pool overview, budget selector (3/5/7/10),
generate button. Portfolio status banner after generation.

**Investigation Queue** — Case cards for each selected region. Each card shows:
- Typology, risk level, flagged transaction count, account count, volume
- "Why selected" from phase2_portfolio_interpretability.csv
- "Show accounts" toggle to preview account IDs
- "Full investigation →" opens the Case Panel overlay

**Case Panel (overlay)** — Slides in from the right. Four tabs:
- Overview: metrics grid, why selected, method comparison, account table
- Transaction Network: Canvas-rendered network (dark background), nodes/edges from backend
- Regulatory Checklist: 6 AML compliance indicators, SAR recommendation
- SAR Pre-Draft: Auto-populated report with copy to clipboard

**Analytics** — Four sections:
- ORBIT Results: precomputed Stage 3 results, 95% CI table
- Pipeline Audit: 23x enrichment story
- Typology Recovery: which typologies each method finds
- K=7 Headline: the Stage 2 core finding

---

## Data files required in backend

```
artifacts/
  candidate_region_rankings.csv
  pattern_accounts.csv
  pattern_risk_growth.csv
  pattern_volatility_summary.csv
  phase2_k_baseline_head_to_head.csv
  phase2_portfolio_interpretability.csv
  phase2_candidate_generator_audit.csv
  phase2_typology_recovery.csv
  phase2_lambda_T_ablation.csv
  stage3_final_results.csv
  stage3_statistical_robustness.csv
  stage3_portfolio_diversity.csv
  stage3_orbit_seed_portfolios.csv
  stage3_run_summary.json
```

---

Team 2 — Quantum Pulse
Vashti Chowla · Yasar Mulani · Rushikesh Ubale
Quantum Dice Trinity Challenge 2026, Stage 3
