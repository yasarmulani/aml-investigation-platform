"""
QLANTERN Backend — FastAPI
Quantum Dice Trinity Challenge 2026, Stage 3
Team 2: Quantum Pulse
"""
from __future__ import annotations
import json, time, random, math, numbers
from pathlib import Path
from typing import Optional
from itertools import combinations

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).parent.parent

app = FastAPI(title="QLANTERN API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load artifacts at startup ─────────────────────────────────────────────────
ARTIFACTS = ROOT / "artifacts"
DATA = ROOT / "data"

def load():
    cands = pd.read_csv(ARTIFACTS / "candidate_region_rankings.csv")
    pa    = pd.read_csv(ARTIFACTS / "pattern_accounts.csv")
    pi    = pd.read_csv(ARTIFACTS / "phase2_portfolio_interpretability.csv")
    rg    = pd.read_csv(ARTIFACTS / "pattern_risk_growth.csv")
    vol   = pd.read_csv(ARTIFACTS / "pattern_volatility_summary.csv")
    kh    = pd.read_csv(ARTIFACTS / "phase2_k_baseline_head_to_head.csv")
    s3r   = pd.read_csv(ARTIFACTS / "stage3_final_results.csv")
    s3rb  = pd.read_csv(ARTIFACTS / "stage3_statistical_robustness.csv")
    s3div = pd.read_csv(ARTIFACTS / "stage3_portfolio_diversity.csv")
    s3sp  = pd.read_csv(ARTIFACTS / "stage3_orbit_seed_portfolios.csv")
    audit = pd.read_csv(ARTIFACTS / "phase2_candidate_generator_audit.csv")
    typrec= pd.read_csv(ARTIFACTS / "phase2_typology_recovery.csv")
    with open(ARTIFACTS / "stage3_run_summary.json") as f:
        rs = json.load(f)

    # Build account sets per pattern
    pac = {}
    for pid, grp in pa.groupby("pattern_id"):
        pac[int(pid)] = grp["account"].tolist()

    # Build pattern risk/growth/volatility lookup
    rg_map  = {int(r.pattern_id): {"growth": r.growth, "peak_risk": r.peak_risk}
                for r in rg.itertuples()}
    vol_map = {int(r.pattern_id): {"min": r.min, "mean": r.mean, "max": r.max, "std": r.std}
                for r in vol.itertuples()}

    # Enrich candidates
    cands["candidate_id"] = range(len(cands))
    candidates = []
    for i, row in cands.iterrows():
        pid = int(row["pattern_id"])
        accts = pac.get(pid, [])
        interp_rows = pi[pi["Pattern_ID"] == pid]
        why = ""
        selected_by = ""
        if len(interp_rows) > 0:
            v = interp_rows.iloc[0].get("Why_QUBO_Selected", "")
            why = str(v) if str(v) != "nan" else ""
            selected_by = str(interp_rows.iloc[0].get("Selected_By", ""))

        candidates.append({
            "candidate_id": i,
            "pattern_id": pid,
            "pattern_type": str(row["pattern_type"]),
            "snapshot_time": str(row["snapshot_time"]),
            "risk_score": float(row["risk_score"]),
            "region_nodes": int(row["region_nodes"]),
            "region_edges": int(row["region_edges"]),
            "laundering_edges": int(row["laundering_edges"]),
            "laundering_ratio": float(row["laundering_ratio"]),
            "transaction_volume": float(row["transaction_volume"]),
            "avg_transaction_amount": float(row["avg_transaction_amount"]),
            "unique_banks": int(row["unique_banks"]),
            "complexity_score": float(row["complexity_score"]),
            "accounts": accts[:25],
            "n_accounts": len(accts),
            "growth": rg_map.get(pid, {}).get("growth", 0),
            "peak_risk": rg_map.get(pid, {}).get("peak_risk", float(row["risk_score"])),
            "volatility": vol_map.get(pid, {}),
            "why_qubo_selected": why,
            "selected_by_methods": selected_by,
            "is_laundering_region": int(row["laundering_edges"]) > 0,
        })

    return {
        "candidates": candidates,
        "k_baseline": kh.to_dict("records"),
        "stage3_results": s3r.to_dict("records"),
        "stage3_robustness": s3rb.to_dict("records"),
        "stage3_diversity": s3div.to_dict("records"),
        "stage3_seed_portfolios": s3sp.to_dict("records"),
        "audit": audit.to_dict("records"),
        "typology_recovery": typrec.to_dict("records"),
        "run_summary": rs,
        "pattern_accounts": pac,
    }

DB = load()

# ── QUBO greedy solver ────────────────────────────────────────────────────────
def build_qubo(candidates, overlap_matrix, K,
               lr=1.0, lg=0.5, ls=0.25, lo=2.0, lb=4.0):
    n = len(candidates)
    scores = np.array([c["risk_score"] for c in candidates])
    growths = np.array([c.get("growth", 0) for c in candidates])
    nodes  = np.array([c["region_nodes"] for c in candidates])

    def mm(v):
        mn, mx = v.min(), v.max()
        return (v - mn) / (mx - mn) if mx > mn else np.zeros_like(v)

    reward = lr * mm(scores) + lg * mm(growths) + ls * mm(nodes)
    Q = np.zeros((n, n))
    for i in range(n):
        Q[i, i] += -reward[i] + lb * (1 - 2 * K)
        for j in range(i + 1, n):
            Q[i, j] += 2 * lb + lo * overlap_matrix[i, j]
    return Q

def build_overlap(candidates):
    n = len(candidates)
    O = np.zeros((n, n))
    pac = DB["pattern_accounts"]
    acct_sets = []
    for c in candidates:
        pid = c["pattern_id"]
        acct_sets.append(set(pac.get(pid, [])))
    for i in range(n):
        for j in range(i + 1, n):
            u = acct_sets[i] | acct_sets[j]
            s = len(acct_sets[i] & acct_sets[j]) / len(u) if u else 0
            O[i, j] = O[j, i] = s
    return O, acct_sets

def exact_qubo_solver(Q, K):
    n = Q.shape[0]
    best_e, best_x = float("inf"), None
    for combo in combinations(range(n), K):
        x = np.zeros(n, dtype=int)
        x[list(combo)] = 1
        e = float(x @ Q @ x)
        if e < best_e:
            best_e, best_x = e, x.copy()
    return best_x, best_e

def risk_greedy(candidates, K):
    scores = [(c["risk_score"], i) for i, c in enumerate(candidates)]
    scores.sort(reverse=True)
    x = np.zeros(len(candidates), dtype=int)
    for _, i in scores[:K]:
        x[i] = 1
    return x

def evaluate(x, candidates, Q, acct_sets):
    sel = np.where(x == 1)[0].tolist()
    true_pos = sum(1 for i in sel if candidates[i]["is_laundering_region"])
    total_rel = sum(1 for c in candidates if c["is_laundering_region"])
    precision = true_pos / len(sel) if sel else 0
    recall    = true_pos / total_rel if total_rel else 0
    f1 = 2*precision*recall/(precision+recall) if precision+recall else 0

    sel_accts = set()
    rel_accts = set()
    for i, c in enumerate(candidates):
        if c["is_laundering_region"]: rel_accts |= acct_sets[i]
        if x[i]: sel_accts |= acct_sets[i]
    acct_cov = len(sel_accts & rel_accts) / len(rel_accts) if rel_accts else 0

    overlap = 0
    for a, b in combinations(sel, 2):
        if acct_sets[a] & acct_sets[b]: overlap += 1

    sel_laund = sum(candidates[i]["laundering_edges"] for i in sel)
    dup_pids  = [candidates[i]["pattern_id"] for i in sel]
    dups = len(dup_pids) - len(set(dup_pids))
    typols = list(set(candidates[i]["pattern_type"] for i in sel))

    return {
        "selected": sel,
        "energy": float(x @ Q @ x),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "account_coverage": acct_cov,
        "overlap": overlap,
        "duplicate_patterns": dups,
        "total_laundering_edges": sel_laund,
        "typologies": typols,
        "pattern_ids": [candidates[i]["pattern_id"] for i in sel],
    }

# ── Transaction network generator ─────────────────────────────────────────────
def build_tx_network(candidate: dict, seed: int = 0):
    """Build transaction network graph data for a candidate region."""
    rng = random.Random(seed + candidate["pattern_id"])
    accounts = candidate["accounts"]
    ptype    = candidate["pattern_type"]
    n_laund  = candidate["laundering_edges"]
    n_total  = candidate["region_edges"]
    n_nodes  = min(len(accounts), 16)

    nodes = []
    edges = []

    if n_nodes < 2:
        n_nodes = 6
        accounts = [f"ACC_{i:04d}" for i in range(n_nodes)]

    acct_subset = accounts[:n_nodes]
    node_ids = {a: i for i, a in enumerate(acct_subset)}

    for i, acc in enumerate(acct_subset):
        bank = acc.split("::")[0] if "::" in acc else "UNK"
        nodes.append({
            "id": i,
            "label": acc[:12],
            "bank": bank,
            "is_flagged": i < max(1, int(n_laund * n_nodes / max(n_total, 1))),
            "account_id": acc,
        })

    if ptype == "GATHER-SCATTER":
        collector = 0
        for i in range(1, n_nodes):
            amount = rng.uniform(1000, 500000)
            is_laund = nodes[i]["is_flagged"] or nodes[0]["is_flagged"]
            edges.append({"source": i, "target": collector,
                          "amount": round(amount, 2), "is_laundering": is_laund,
                          "currency": rng.choice(["USD","EUR","GBP"])})
        mid = n_nodes // 2
        for i in range(1, mid):
            if i + mid < n_nodes:
                amount = rng.uniform(500, 200000)
                edges.append({"source": collector, "target": i + mid,
                              "amount": round(amount, 2), "is_laundering": nodes[0]["is_flagged"],
                              "currency": rng.choice(["USD","EUR","GBP"])})

    elif ptype == "STACK":
        for i in range(n_nodes - 1):
            amount = rng.uniform(5000, 1000000)
            is_laund = nodes[i]["is_flagged"] or nodes[i+1]["is_flagged"]
            edges.append({"source": i, "target": i + 1,
                          "amount": round(amount, 2), "is_laundering": is_laund,
                          "currency": rng.choice(["USD","EUR","GBP"])})

    else:  # SCATTER-GATHER
        src = 0
        mid = n_nodes // 2
        for i in range(1, mid):
            amount = rng.uniform(2000, 300000)
            edges.append({"source": src, "target": i,
                          "amount": round(amount, 2), "is_laundering": nodes[src]["is_flagged"],
                          "currency": rng.choice(["USD","EUR","GBP"])})
        if mid < n_nodes:
            collector2 = n_nodes - 1
            for i in range(1, mid):
                amount = rng.uniform(1000, 200000)
                edges.append({"source": i, "target": collector2,
                              "amount": round(amount, 2), "is_laundering": nodes[i]["is_flagged"],
                              "currency": rng.choice(["USD","EUR","GBP"])})

    return {"nodes": nodes, "edges": edges}

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "candidates": len(DB["candidates"])}

@app.get("/api/candidates")
def get_candidates():
    return {"candidates": DB["candidates"], "total": len(DB["candidates"])}

class PortfolioRequest(BaseModel):
    K: int = 5
    lambda_risk: float = 1.0
    lambda_overlap: float = 2.0
    lambda_budget: float = 4.0

@app.post("/api/portfolio")
def generate_portfolio(req: PortfolioRequest):
    if req.K < 1 or req.K > 15:
        raise HTTPException(400, "K must be between 1 and 15")

    candidates = DB["candidates"]
    t0 = time.perf_counter()

    O, acct_sets = build_overlap(candidates)
    Q = build_qubo(candidates, O, req.K,
                   lr=req.lambda_risk, lo=req.lambda_overlap, lb=req.lambda_budget)

    # Exact solver for N<=30
    x_qubo, e_qubo = exact_qubo_solver(Q, req.K)
    x_naive = risk_greedy(candidates, req.K)

    rt = time.perf_counter() - t0

    qubo_eval  = evaluate(x_qubo,  candidates, Q, acct_sets)
    naive_eval = evaluate(x_naive, candidates, Q, acct_sets)

    # Build selected case details
    selected_cases = []
    for i in qubo_eval["selected"]:
        c = candidates[i]
        network = build_tx_network(c, seed=i)
        selected_cases.append({**c, "network": network, "portfolio_rank": len(selected_cases)+1})

    return {
        "portfolio": selected_cases,
        "metrics": qubo_eval,
        "naive_metrics": naive_eval,
        "naive_selected": [candidates[i] for i in naive_eval["selected"]],
        "runtime_ms": round(rt * 1000, 1),
        "K": req.K,
        "solver": "exact_qubo_k" + str(req.K),
    }

@app.get("/api/case/{pattern_id}")
def get_case_detail(pattern_id: int):
    candidates = DB["candidates"]
    cand = next((c for c in candidates if c["pattern_id"] == pattern_id), None)
    if not cand:
        raise HTTPException(404, f"Pattern {pattern_id} not found")

    network = build_tx_network(cand)
    vol = DB["candidates"]

    # Build regulatory checklist
    checklist = [
        {
            "item": "Transaction velocity above threshold",
            "status": cand["region_edges"] > 30,
            "detail": f"{cand['region_edges']} transactions detected in 12-hour window",
        },
        {
            "item": "Cross-border transfers detected",
            "status": cand["unique_banks"] > 5,
            "detail": f"{cand['unique_banks']} distinct banks involved",
        },
        {
            "item": "Laundering pattern identified",
            "status": cand["laundering_edges"] > 0,
            "detail": f"{cand['laundering_edges']} flagged transactions confirmed",
        },
        {
            "item": "High transaction amounts",
            "status": cand["avg_transaction_amount"] > 10000,
            "detail": f"Average: ${cand['avg_transaction_amount']:,.0f} per transaction",
        },
        {
            "item": "High-risk typology",
            "status": cand["pattern_type"] in ["GATHER-SCATTER", "STACK"],
            "detail": f"Pattern type: {cand['pattern_type']}",
        },
        {
            "item": "Complexity threshold exceeded",
            "status": cand["complexity_score"] > 100,
            "detail": f"Complexity score: {cand['complexity_score']:.0f}",
        },
    ]

    checks_passed = sum(1 for c in checklist if c["status"])
    sar_recommended = checks_passed >= 3 and cand["laundering_edges"] > 0

    return {
        "candidate": cand,
        "network": network,
        "checklist": checklist,
        "checks_passed": checks_passed,
        "sar_recommended": sar_recommended,
        "sar_template": {
            "subject_account_ids": cand["accounts"][:5],
            "typology": cand["pattern_type"],
            "detection_date": cand["snapshot_time"],
            "transaction_count": cand["region_edges"],
            "flagged_count": cand["laundering_edges"],
            "total_volume": cand["transaction_volume"],
            "banks_involved": cand["unique_banks"],
            "risk_score": cand["risk_score"],
            "narrative": f"Suspicious {cand['pattern_type']} pattern identified in {cand['region_nodes']}-account network. "
                         f"{cand['laundering_edges']} of {cand['region_edges']} transactions flagged as potential laundering. "
                         f"Activity detected {cand['snapshot_time']} across {cand['unique_banks']} financial institutions. "
                         f"Total transaction volume: ${cand['transaction_volume']:,.2f}. "
                         f"Risk score: {cand['risk_score']:.1f}/100.",
        },
    }

def sanitize_floats(obj):
    """Recursively replace NaN/Inf floats with JSON-safe values."""
    if isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj):
            return None
        if math.isinf(obj):
            return None
        return obj
    # Handle numpy scalar types
    if isinstance(obj, numbers.Integral):
        return int(obj)
    if isinstance(obj, numbers.Real):
        v = float(obj)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    return obj


@app.get("/api/analytics")
def get_analytics():
    payload = {
        "candidates": DB["candidates"],
        "k_baseline": DB["k_baseline"],
        "stage3_results": DB["stage3_results"],
        "stage3_robustness": DB["stage3_robustness"],
        "stage3_diversity": DB["stage3_diversity"],
        "stage3_seed_portfolios": DB["stage3_seed_portfolios"],
        "audit": DB["audit"],
        "typology_recovery": DB["typology_recovery"],
        "run_summary": DB["run_summary"],
    }
    return sanitize_floats(payload)
