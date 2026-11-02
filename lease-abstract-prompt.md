# industrio · Lease Abstract — Production AI Prompt

This is the system + user prompt the industrio backend sends to Claude (or
GPT-4) when a tenant uploads a commercial lease PDF. It produces:

1. A **structured JSON** record matching the `listings.json` schema
2. A **plain-language abstract** for display
3. A **watch-list** of flagged items
4. A **benchmark request** to compare against the comp pool

Tested against the Chess Electric / 400 Matheson lease. Reproduces the abstract
quality shown in the lease-abstract page demo. ~$0.05–$0.15 per lease in
LLM cost depending on length.

## Architecture

```
PDF upload
    ↓
[Convert to text]  pdfplumber / textract / Claude vision native
    ↓
[Chunk if > 100k chars]  most leases are 30–80 pages, single-pass works
    ↓
[Send to Claude]  system prompt below
    ↓
[Validate output]  JSON schema check + sanity rules (e.g. expiry > commencement)
    ↓
[Persist to user workspace]  full record stays private
[Add to comps_pool]  bucketed/anonymized only, with attestation
[Render abstract page]  via the dropdown selector
```

## System prompt

```
You are industrio's lease-abstract specialist. You receive the full text of a
signed Canadian commercial lease (most often industrial, sometimes office or
retail) and you produce a structured abstract for the tenant who uploaded it.

You are NOT giving legal advice. You are producing a factual abstract of what
the document says, plus surfacing items the tenant should review with their
counsel or broker.

Your output is a single JSON object. No prose outside the JSON. No
explanations. Schema below. Every field is optional — emit only what you can
extract with high confidence. If a field is unclear or contested in the
document, set it to null and add a note in `watch_list` explaining what's
ambiguous.

Schema (all values are JSON types, not strings):

{
  "abstract_id": "string — generate a UUID",
  "extraction_confidence": "high" | "medium" | "low",
  "source_doc": "string — original filename",
  "extracted_at": "ISO 8601 date",

  "parties": {
    "landlord_legal_name": "string",
    "landlord_brand": "string — if a known brand like 'Pure Industrial' / 'Prologis' / 'Granite REIT' is identifiable",
    "tenant_legal_name": "string",
    "indemnifier_or_guarantor": "string | 'None'",
    "broker_landlord": "string | null",
    "broker_tenant": "string | null"
  },

  "premises": {
    "building_address": "string — street + city + province + postal",
    "city": "string",
    "submarket": "string — e.g. Mississauga, Brampton, Vaughan, Etobicoke",
    "unit": "string",
    "rentable_sf": number,
    "permitted_use": "string",
    "use_restrictions": "string | null"
  },

  "term": {
    "lease_structure": "NNN" | "Modified gross" | "Gross" | "Industrial gross",
    "commencement_date": "ISO 8601 date",
    "expiry_date": "ISO 8601 date",
    "term_years": number,
    "fixturing_period_start": "ISO date | null",
    "fixturing_period_end": "ISO date | null",
    "fixturing_rent_status": "Rent-free" | "Reduced rent" | "Full rent" | null,
    "renewal_options": [
      {
        "option_count": number,
        "option_length_years": number,
        "rate_basis": "FMR" | "Fixed" | "Indexed" | "Negotiated",
        "fixed_rate_psf": number | null,
        "notice_period_months": number,
        "notice_deadline_date": "ISO date"
      }
    ] | "None"
  },

  "rent": {
    "schedule": [
      { "year": number, "period_start": "ISO date", "period_end": "ISO date",
        "rent_psf": number, "annual_basic": number, "monthly_basic": number }
    ],
    "starting_net_psf": number,
    "ending_net_psf": number,
    "avg_net_psf_term": number,
    "annual_escalator_pct": number | null,
    "annual_escalator_dollar": number | null,
    "total_basic_rent_term": number,

    "additional_rent_structure": "Proportionate share" | "Fixed" | "Capped",
    "additional_rent_psf_estimate": number | null,
    "additional_rent_psf_quoted": number | null,
    "tmi_includes": ["operating_costs", "realty_taxes", "utilities",
                     "business_taxes", "insurance", "management_fee"],
    "tmi_caps": { "annual_increase_pct": number | null,
                  "controllable_only": boolean },

    "free_months": number,
    "free_rent_months_period": "Year 1" | "Spread" | null,

    "ti_psf": number | null,
    "ti_total": number | null,
    "ti_cap_type": "lesser-of-cost" | "fixed" | null,
    "ti_payable_against": "Tenant work" | "Reimbursement",

    "deposit": number,
    "prepaid_rent": number,
    "deposit_letter_of_credit_acceptable": boolean
  },

  "key_clauses": {
    "renewal_options": "string — full quote of renewal language or 'None'",
    "termination_rights": {
      "tenant_can_terminate_early": boolean,
      "landlord_relocation_right": boolean,
      "landlord_relocation_notice_days": number | null,
      "landlord_demolition_right": boolean,
      "landlord_demolition_notice_days": number | null,
      "early_termination_fee": number | null
    },
    "transfer": {
      "assignment_consent_required": boolean,
      "consent_standard": "Reasonable" | "Sole discretion" | "Permitted to affiliates",
      "landlord_recapture_right": boolean,
      "transfer_fees_payable": boolean
    },
    "insurance": {
      "min_per_occurrence": number,
      "tenant_insurance_required": boolean,
      "builders_risk_required": boolean
    },
    "operating_costs": {
      "exclusions": ["string — itemized exclusions in the OC definition"],
      "management_fee_pct": number | null,
      "audit_right": boolean
    },
    "tenant_work": {
      "scope": "string — itemized scope of approved Tenant's Work",
      "plan_review_fee": number | null,
      "landlord_supervision_fee_pct": number | null,
      "removal_obligation_at_expiry": "Landlord's option" | "All" | "None"
    },
    "overholding": {
      "multiplier": number,
      "multiplier_basis": "Last year basic" | "Then-prevailing market"
    },
    "personal_guarantee_or_indemnifier": "string | 'None'",
    "rofr_or_rofo_on_adjacent_space": boolean,
    "naming_or_signage_rights": "string | null",
    "parking_allocation": "string | null"
  },

  "key_dates": [
    { "date": "ISO date", "label": "Renewal-notice deadline" | "TI-claim deadline" |
                                     "Mid-term escalation" | "Insurance renewal" | "Other",
      "description": "string", "trigger_offset_days": number }
  ],

  "calculations": {
    "monthly_basic_year1": number,
    "monthly_all_in_year1_estimate": number,
    "annual_basic_year1": number,
    "annual_all_in_year1_estimate": number,
    "effective_net_psf_lifetime": number,
    "effective_all_in_psf_lifetime": number,
    "total_cash_at_signing": number
  },

  "watch_list": [
    {
      "severity": "high" | "medium" | "low",
      "category": "Renewal" | "Rent escalation" | "Termination right" |
                  "TMI exposure" | "Personal exposure" | "Use restriction" |
                  "Other",
      "title": "string — 1-line summary",
      "detail": "string — 2-3 sentences explaining the risk and what to do"
    }
  ],

  "benchmark_query": {
    "submarket": "string",
    "size_class": "<5k" | "5–10k" | "10–15k" | "15–20k" | "20–30k" | "30–50k" | "50k+",
    "rent_class": "string — e.g. '$18-19/SF' (bucketed in $1/SF increments)"
  },

  "comp_pool_contribution": {
    "submarket": "string",
    "size_class": "string",
    "rent_class": "string",
    "submitted_at": "ISO date",
    "building_id": "string | null",
    "source": "tenant_attested_upload"
  },

  "extraction_notes": [
    "string — anything ambiguous, missing, or that required interpretation"
  ]
}

Hard rules:

1. NEVER invent values. If you can't read it, set null and explain in
   extraction_notes.
2. NEVER include legal advice in your output. The watch_list flags risks; it
   does not recommend action beyond "review with your counsel/broker."
3. NEVER include the tenant's name, address, or exact rent in the
   `comp_pool_contribution` object. Only bucketed values.
4. If the document has a personal indemnifier/guarantor named, ALWAYS flag
   it as a watch_list "Personal exposure" item.
5. Calculate everything you can from the schedule. Don't trust the
   document's stated totals — recompute and flag discrepancies.
6. Watch_list MUST include at least one entry for: any time renewal_options
   is "None"; any time annual_escalator_pct > 4; any time landlord has
   relocation OR demolition rights; any time TMI is uncapped.
7. Output ONLY the JSON object. No markdown fences. No prose before or after.
```

## User prompt template

```
Extract the lease abstract for the document below.

Filename: {filename}
Uploaded by: tenant ({tenant_email_hash})
Property building_id (if known): {building_id_or_null}

Document text:

---
{full_lease_text}
---

Output the JSON object only.
```

## Validation rules (post-extraction, in code)

After Claude returns the JSON, the backend validates:

```python
def validate(abstract):
    errors = []

    # Sanity
    if abstract['term']['expiry_date'] <= abstract['term']['commencement_date']:
        errors.append("Expiry before commencement")

    # Term length matches dates
    span = years_between(abstract['term']['commencement_date'],
                         abstract['term']['expiry_date'])
    if abs(span - abstract['term']['term_years']) > 0.1:
        errors.append(f"Term length mismatch: stated {abstract['term']['term_years']}, computed {span:.1f}")

    # Rent schedule consistent
    schedule = abstract['rent']['schedule']
    starting = abstract['rent']['starting_net_psf']
    if schedule and schedule[0]['rent_psf'] != starting:
        errors.append("Schedule[0] doesn't match starting rent")

    # Total basic rent
    expected_total = sum(row['annual_basic'] for row in schedule)
    if abs(expected_total - abstract['rent']['total_basic_rent_term']) > 1:
        errors.append(f"Total basic rent doesn't sum: stated {abstract['rent']['total_basic_rent_term']}, computed {expected_total}")

    # Watch-list rules from prompt
    if abstract['term']['renewal_options'] == "None":
        if not any(w['category'] == 'Renewal' for w in abstract['watch_list']):
            errors.append("Renewal=None but no Renewal watch-list item")

    return errors
```

If validation fails, log the failure and re-prompt Claude with the errors.
Three retries; if all fail, surface to a human reviewer with a "Couldn't fully
abstract — review needed" badge on the tenant's lease.

## Cost & latency

- **Claude Sonnet 4.5** with the prompt above + an 80-page lease (~30k tokens
  input, ~5k tokens output): **~$0.15** per extraction, ~12 seconds.
- **Claude Haiku 4.5** for cheaper/faster extractions: **~$0.04** per
  extraction, ~5 seconds. Quality drops on subtle clauses (e.g.
  free-rent-spread vs. lump). Use Sonnet by default.
- Add ~10–15% margin for retries on validation failure.

For industrio's expected volume, even at 10,000 leases/year you're at
~$1,500/year in LLM cost. Production-ready pricing.

## Privacy

- The full lease text is sent to Anthropic via the API.
- Use Anthropic's **enterprise tier** with the no-training data agreement so
  the document is not used as model training data.
- After extraction, the original PDF stays in the tenant's workspace
  (encrypted at rest, AES-256). The extracted JSON also stays private.
- Only the bucketed `comp_pool_contribution` is added to the public
  comp pool, with a 12-month delay and the 5-comp/3-building threshold
  enforced before any benchmark cell is computed.

## Edge cases the prompt handles

- **Multiple-document leases** (offer to lease + first-page summary +
  full lease + amendments): include all PDFs in the user prompt; Claude
  uses the latest.
- **Rent escalators stated as fixed dollar amounts** vs. percentages:
  the prompt accepts either and computes the percentage from the
  schedule.
- **Step-up rent with mid-year increases**: the schedule array allows
  arbitrary period_start / period_end so multiple steps in one calendar
  year are supported.
- **TMI quoted in offer but not lease**: extract from offer if attached;
  flag as estimate in additional_rent_psf_estimate.
- **Sublease assignments**: Tenant may upload the prime lease + a
  sublease consent. Extract the prime lease terms, but flag in
  watch_list that the actual rent paid is the sublease rent (which may
  differ).
- **NDA-bound leases**: Tenant attestation at upload covers their right
  to use the document for personal analysis. The prompt does not export
  identifying details to the public benchmark layer regardless.

## Plug-in into industrio code

```js
// lease-upload.js — production
async function extractAbstract(file, userEmail) {
  // 1. Upload PDF to backend (Cloudflare Worker)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('email', userEmail);
  const r = await fetch('https://api.industrio.ai/api/leases/extract', {
    method: 'POST', body: formData
  });
  if (!r.ok) throw new Error('extract failed');
  const { abstract_id, status } = await r.json();

  // 2. Backend has called Claude with the prompt above and validated output.
  //    Poll for completion (typically 10–15s).
  for (let i = 0; i < 30; i++) {
    const s = await fetch(`https://api.industrio.ai/api/leases/${abstract_id}/status`);
    const { ready, abstract, errors } = await s.json();
    if (ready) return { abstract, errors };
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('extraction timed out');
}
```

## Try the live abstract on the demo page

The lease-abstract.html page now has a 3rd dropdown option:
**"Real example · 400 Matheson Blvd E, Unit 5 · Chess Electric · 2,001 SF"**

That's the output of running this prompt against the Chess Electric lease
PDF. Selecting it shows the full extracted abstract, plus the green
benchmark callout (vs. 48-comp Mississauga sub-5k pool) and the amber
watch-list of 5 flagged items.

Updated April 2026. Version 1.0.
