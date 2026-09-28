# Quotation AI — Customer Pilot & Demonstration Runbook

**Purpose:** Field Demonstration & Pilot Execution Manual  
**Target Audience:** Machine Shop Owners, Managing Directors, Heads of Operations, Costing Engineers  
**Demonstration Length:** 25–35 Minutes  
**Industry Vertical:** Precision Machining, Sheet Metal Fabrication, Aerospace & Automotive Component Manufacturing

---

## 1. Preparation & Demo Environment Setup

Before starting the customer demonstration:

1. **Start Services:**
   - Backend API: `uvicorn app.main:app --port 8000` (or active staging container)
   - Frontend SPA: `npm run dev` (or active staging URL `http://localhost:5173`)
2. **Prepare Demonstration Assets:**
   - Sample PO: `sample_manufacturing_purchase_order.pdf` (saved on Desktop for easy drag-and-drop).
   - Test Tenant: *Bharat Precision Engineering Pvt. Ltd.* or *Apex Precision Tooling & Aerospace Pvt. Ltd.*
   - Target Customer: *Tata Motors Limited - CVBU Pune* (or customer's actual client).
3. **Open Clean Browser:**
   - Use Google Chrome or Microsoft Edge in full-screen mode at 100% zoom.
   - Clear previous session cache or use a dedicated clean browser profile.

---

## 2. Step-by-Step Customer Demonstration Script

### Act 1: The Executive Overview & The Machine Shop Problem (3 Minutes)
- **Action:** Open `http://localhost:5173/login`, authenticate, and land on the **Executive Dashboard**.
- **Talking Points:**
  - *"In traditional precision machine shops, quoting complex 10-page POs takes 2 to 4 days of manual estimation in Excel. Senior engineers spend hours calculating raw material weights, machine cycle times, and scrap credits."*
  - *"Quotation AI reduces quotation turnaround from 3 days to under 3 minutes, with zero math errors and zero pricing hallucinations."*
- **What to Show:**
  - Active platform throughput (e.g., `₹4.82 Cr Processed`).
  - Real-time conversion rates and turnaround telemetry.

---

### Act 2: Transparency & Zero-AI Pricing — The Rate Card Master (4 Minutes)
- **Action:** Click **Rate Cards** in the primary navigation.
- **Talking Points:**
  - *"The number one concern manufacturers have with AI is: Will it guess or hallucinate my prices?"*
  - *"With Quotation AI, the answer is an absolute NO. AI is used solely to read documents. Every single rupee quoted comes strictly from your plant's authoritative database rate cards."*
- **What to Show:**
  - **Material Rates:** Density ($7.85\text{ g/cm}^3$), base buying rate (e.g., EN8 at `₹88.00/kg`), and scrap credit rate (`₹22.00/kg`).
  - **Machine Hour Rates:** Hourly rates for CNC Turning (`₹550/hr`), VMC 4-Axis Milling (`₹1,250/hr`), and Surface Grinding (`₹450/hr`).
  - Explain that your margins, overheads, and machine rates remain strictly private to your tenant.

---

### Act 3: PO Upload & Dual-Stage Document Intelligence (4 Minutes)
- **Action:** Navigate to **Upload PO** (`/upload`). Drag and drop `sample_manufacturing_purchase_order.pdf`.
- **Talking Points:**
  - *"Customers send POs in various formats: multi-page scanned PDFs, engineering drawings, or Excel sheets."*
  - *"Watch as our dual-stage vision pipeline ingests the document."*
- **What to Show:**
  - Drag-and-drop dropzone with 25MB file validation.
  - The live progress tracker: OCR ingestion $\rightarrow$ Geometric table extraction $\rightarrow$ Metallurgy normalization.

---

### Act 4: Human Review & Process Binding — The Safety Gate (5 Minutes)
- **Action:** Click into the extracted PO on the **PO Review** screen (`/review/:poId`).
- **Talking Points:**
  - *"We believe in Human-in-the-Loop engineering. Quotation AI never blindly sends a quote without your approval."*
  - *"Notice that the customer's raw PO said 'EN8 / Carbon Steel'. The system flags this and allows the costing engineer to bind it to your shop's standard rate master."*
- **What to Show:**
  - Side-by-side document review.
  - Part technical specifications, raw material grade selection, and machine routing assignment.
  - Click **Approve PO**.

---

### Act 5: Deterministic Cost Calculation & Cost Breakdown (5 Minutes)
- **Action:** Advance to **Costing** (`/calculation`).
- **Talking Points:**
  - *"Here is the complete deterministic cost breakdown calculated by our backend engine using Python Decimal arithmetic."*
- **What to Show:**
  - **Raw Material Formula:** Gross stock mass minus scrap recovery credit.
  - **Machining Cost:** Cycle time multiplied by hourly machine rate plus fixed setup amortization.
  - **Overhead & Profit Multipliers:** Adjust overhead (e.g., 10%) or profit margin (e.g., 15%) and show instantaneous, live re-calculation.
  - **Statutory GST:** Accurate Central GST (9%) and State GST (9%) or Interstate IGST (18%).
- **Demonstrating the Blocked State Invariant (Crucial Trust Builder):**
  - Explain: *"If an item calls for an exotic alloy like 'Titanium Grade 5' that isn't in your rate card, Quotation AI refuses to guess a price. It displays a BLOCKED banner and requires you to input the verified rate before proceeding."*

---

### Act 6: Quotation Preview, Terms & Legal Immutability (5 Minutes)
- **Action:** Click **Save Quotation Draft** and view the **Quotation Preview** (`/quotation/:quoteId`).
- **Talking Points:**
  - *"This is your formal commercial quotation dossier, rendered strictly to DIN A4 precision manufacturing standards."*
- **What to Show:**
  - Plant corporate identity, GSTIN, and MSME registration.
  - Buyer's delivery plant details (Tata Motors CVBU).
  - Commercial terms: Payment Terms (Net 45), Delivery Terms (Ex-Works), and Inspection Terms.
  - **Amount in Words:** Displaying standard Indian Rupee wording (e.g., *Indian Rupee One Lakh Forty Thousand Two Hundred and Two Only*).
  - Bank Remittance Details: Bank Name, Account Number, and IFSC code for RTGS/NEFT payments.

---

### Act 7: Sealing, SHA-256 Hashing & Transactional Dispatch (4 Minutes)
- **Action:** Click **Finalize Quotation**.
- **Talking Points:**
  - *"Once approved by the commercial authority, the quotation is frozen."*
  - *"Quotation AI generates a SHA-256 cryptographic integrity hash. Neither your sales team nor the customer can alter the quantities or rates on this quotation after finalization."*
- **What to Show:**
  - Visual **Verified Legal Immutability** badge and 64-character SHA-256 hash.
  - Click **Download Official PDF** and open the clean vector document.
  - Click **Email Quotation to Customer**. Show that the recipient is automatically populated from the verified customer master.
  - Navigate to **Quotation History** (`/quotations`) to show the sealed record with its `SENT` audit status.

---

## 3. Frequently Asked Customer Questions & Answers

**Q1: Can the AI make up numbers or discount my machining rates?**  
*Answer:* No. The system has a strict architectural separation: AI is used purely for optical character recognition and text normalization. All pricing is computed deterministically in backend Python Decimal code using rate cards that you configure and control.

**Q2: How is my company's pricing data protected from competitors?**  
*Answer:* Quotation AI is built on strict multi-tenant isolation. Every rate, process, quotation, customer, and file path is partitioned by your unique company ID. No other plant or user can access your rate cards or customer history.

**Q3: Can we customize the quotation layout to match our brand?**  
*Answer:* Yes. Quotation AI provides 8 enterprise quotation templates (including Industrial Bold, Classic Professional, Executive Slate, and Compact Dense). You can upload your company logo, set brand colors, configure default terms, and add standard compliance notes (e.g., ISO 9001:2015, AS9100D).

**Q4: What happens if a customer sends a handwritten or poor quality PO?**  
*Answer:* The system flags low-confidence extractions with a visual warning tag and holds the purchase order in `NEEDS_REVIEW` status. The engineer can review the original document in the side-by-side viewer and manually correct any ambiguous field.

**Q5: What if we need to revise a quotation after sending it?**  
*Answer:* Because finalized quotations are legally immutable to protect audit integrity, you cannot edit a sealed quote. Instead, Quotation AI lets you create a new quotation revision linked to the same PO, preserving the complete commercial audit trail.
