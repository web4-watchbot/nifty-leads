"""Test the LinkedIn source across many professions via the search API.

Confirms the site:linkedin.com/in "Profession" pipeline works for every
profession template, exercising the free-combo backend (z.ai + Brave if key set).
"""
import json
import urllib.request

API = "http://localhost:3000/api/search"

PROFESSIONS = [
    '"Marketing Manager"',
    '"Software Engineer"',
    '"CTO"',
    '"UX Designer"',
    '"Product Manager"',
    '"Data Scientist"',
    '"Sales Director"',
    '"Recruiter"',
    '"Frontend Developer"',
    '"CEO"',
    '"Accountant"',
    '"Lawyer"',
]

print(f"{'Profession':<28} | {'Leads':>6} | {'Sample name':<28} | {'Position':<24} | LinkedIn URL")
print("-" * 130)

total_leads = 0
for prof in PROFESSIONS:
    body = json.dumps({
        "query": prof,
        "sources": ["linkedin"],
        "maxResults": 10,
        "enrichWebsites": False,
    }).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            d = json.loads(resp.read().decode())
    except Exception as e:
        print(f"{prof:<28} | ERROR: {e}")
        continue

    leads = d.get("leads", [])
    raw = d.get("stats", {}).get("rawCounts", {}).get("linkedin", 0)
    err = d.get("stats", {}).get("errors", {}).get("linkedin", "")
    total_leads += len(leads)

    if leads:
        l = leads[0]
        name = (l.get("contactPerson") or l.get("businessName") or "—")[:28]
        pos = (l.get("position") or "—")[:24]
        url = (l.get("linkedinUrl") or l.get("sourceUrl") or "—")[:55]
        print(f"{prof:<28} | {len(leads):>2}/{raw:<3} | {name:<28} | {pos:<24} | {url}")
    else:
        print(f"{prof:<28} |  0/{raw:<3} | — | — | {err[:55]}")

print("-" * 130)
print(f"TOTAL: {total_leads} LinkedIn leads across {len(PROFESSIONS)} professions")
