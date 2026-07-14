// ═══════════════════════════════════════════════════════════════
//  MY LEARNING — COURSE CONTENT + VIEWER ENGINE
//  All 6 courses: AR, AP, MIS, P2P, O2C, R2R
// ═══════════════════════════════════════════════════════════════

// ─── Lesson HTML helpers ────────────────────────────────────────
function mlcSection(title, body) {
  return `<div class="mlc-section"><h3>${title}</h3>${body}</div>`;
}
function mlcUl(items) {
  return '<ul>' + items.map(i=>`<li>${i}</li>`).join('') + '</ul>';
}
function mlcOl(items) {
  return '<ol>' + items.map(i=>`<li>${i}</li>`).join('') + '</ol>';
}
function mlcExample(label, text) {
  return `<div class="mlc-example"><div class="mlc-example-label">${label}</div><p>${text}</p></div>`;
}
function mlcTakeaway(text) {
  return `<div class="mlc-takeaway"><strong>Key Takeaway:</strong> ${text}</div>`;
}
function mlcFlow(steps) {
  return '<div class="mlc-flow">'+steps.map(function(s,i){return '<div class="mlc-flow-step"><div class="mlc-flow-num">'+(i+1)+'</div><div class="mlc-flow-text">'+s+'</div></div>'+(i<steps.length-1?'<div class="mlc-flow-arrow">→</div>':'');}).join('')+'</div>';
}
function mlcStatGrid(stats) {
  return '<div class="mlc-stat-grid">'+stats.map(function(s){return '<div class="mlc-stat-item"><div class="mlc-stat-n">'+s.n+'</div><div class="mlc-stat-l">'+s.l+'</div>'+(s.note?'<div class="mlc-stat-note">'+s.note+'</div>':'')+'</div>';}).join('')+'</div>';
}
function mlcCompare(lt, lr, rt, rr) {
  function col(h,rows){return '<div class="mlc-compare-col"><div class="mlc-compare-head">'+h+'</div>'+rows.map(function(r){return '<div class="mlc-compare-row">'+r+'</div>';}).join('')+'</div>';}
  return '<div class="mlc-compare">'+col(lt,lr)+col(rt,rr)+'</div>';
}
function mlcDiagram(title, body) {
  return '<div class="mlc-diagram"><div class="mlc-diagram-title">'+title+'</div><div class="mlc-diagram-body">'+body+'</div></div>';
}

// ─── Course Content ─────────────────────────────────────────────
const MLC = {

  // ════════════════════════════════════════════════════
  //  COURSE 1 — ACCOUNT RECEIVABLE
  // ════════════════════════════════════════════════════
  ar: {
    modules: [
      {
        title: 'Introduction to Accounts Receivable',
        lessons: [
          {
            title: 'What is Accounts Receivable?',
            dur: '8 min',
            html: `<h2>What is Accounts Receivable?</h2>
<p class="mlc-lead">Accounts Receivable (AR) is money owed to your organisation by customers for goods or services delivered but not yet paid for. It is a <strong>current asset</strong> on the balance sheet and forms the collection leg of the Order-to-Cash (O2C) cycle.</p>
${mlcSection('Core Concepts', mlcUl([
  '<strong>AR as a Current Asset</strong> — Recorded on the balance sheet; expected to be collected within 12 months',
  '<strong>Accrual Accounting</strong> — AR is created when revenue is earned, not when cash is received',
  '<strong>O2C Connection</strong> — AR is the final financial step after Order → Fulfillment → Invoice',
  '<strong>Gross vs Net AR</strong> — Gross AR minus Allowance for Doubtful Accounts = Net Realizable Value'
]))}
${mlcSection('Journal Entry for AR Creation', mlcOl([
  'Customer invoice raised: <strong>Dr Accounts Receivable ₹5,00,000</strong>',
  'Revenue recognised: <strong>Cr Revenue ₹5,00,000</strong>',
  'On payment receipt: Dr Cash ₹5,00,000 | Cr AR ₹5,00,000'
]))}
${mlcExample('Real-World Example', 'Bluecopa delivers a SaaS implementation to Giva on 1 June. A ₹5,00,000 invoice is raised with 30-day terms. From 1–30 June this appears as AR. When Giva pays on 30 June, AR is cleared and Cash increases.')}
${mlcTakeaway('AR is the bridge between revenue earned and cash received. Efficient AR management directly impacts working capital and cash flow.')}
${mlcFlow(['Customer places order', 'Goods/services delivered', 'Invoice raised & sent to customer', 'AR entry recorded in books', 'Customer pays (bank receipt)', 'Cash applied to invoice', 'AR cleared — Cash confirmed'])}
${mlcStatGrid([{n:'30–45',l:'Avg. DSO in days',note:'Best-in-class target: <30 days'},{n:'60–90',l:'Days before bad debt risk',note:'Provision threshold varies by co.'},{n:'2%',l:'Typical bad debt rate',note:'As % of total credit sales'},{n:'5×',l:'Cost to collect vs prevent',note:'Prevention is always cheaper'}])}`
          },
          {
            title: 'Customer Master Data & Credit Management',
            dur: '10 min',
            html: `<h2>Customer Master Data & Credit Management</h2>
<p class="mlc-lead">Before any transaction occurs, a customer must be set up in your ERP with accurate master data. Credit management then controls the financial risk you accept from each customer.</p>
${mlcSection('Customer Master Data — Three Layers', mlcUl([
  '<strong>General Data</strong> — Name, address, tax ID (GSTIN/PAN), bank details, contact persons',
  '<strong>Company Code Data</strong> — Payment terms, reconciliation account, dunning procedure, correspondence language',
  '<strong>Sales Area Data</strong> — Pricing procedure, delivery terms, shipping conditions, sales organisation assignment'
]))}
${mlcSection('Credit Limit Lifecycle', mlcOl([
  'Credit analyst assesses customer financials and assigns a credit limit',
  'System performs real-time credit check at sales order creation',
  'Orders exceeding the limit are automatically blocked for credit manager review',
  'Credit manager releases or rejects the blocked order',
  'Limits are reviewed periodically (monthly or quarterly)'
]))}
${mlcExample('SAP S/4HANA Context', 'Customer master is created in SAP via XD01 (central) or FD01 (finance-only). Credit limits are managed in SAP Credit Management (transaction UKM_BP). When a credit block is triggered, the sales order sits in the credit release worklist until actioned.')}
${mlcTakeaway('Accurate customer master data and disciplined credit limits prevent bad debt before it starts. Every pound/rupee of bad debt avoided is more valuable than the same amount collected from a new customer.')}`
          }
        ]
      },
      {
        title: 'Invoice Processing & Open Receivables',
        lessons: [
          {
            title: 'Customer Invoice Creation & Correction Documents',
            dur: '9 min',
            html: `<h2>Customer Invoice Creation & Correction Documents</h2>
<p class="mlc-lead">A customer invoice is the formal demand for payment. It triggers the AR entry, starts the payment terms clock, and is the primary document in every collection activity.</p>
${mlcSection('Key Invoice Fields', mlcUl([
  '<strong>Invoice Date</strong> — Date of issue; determines when payment terms begin',
  '<strong>Due Date</strong> — Invoice Date + Payment Terms (e.g., NET 30 = 30 days after invoice date)',
  '<strong>Tax (GST/VAT)</strong> — Applied based on supply type, customer location, and applicable tax rate',
  '<strong>Line Items</strong> — Description, HSN/SAC code, quantity, unit price, line total'
]))}
${mlcSection('Correction Documents — When Mistakes Happen', mlcUl([
  '<strong>Credit Memo</strong> — Reduces the invoice amount (overcharge, return of goods, pricing error)',
  '<strong>Debit Memo</strong> — Increases the invoice amount (undercharge, additional service)',
  'Both must reference the original invoice — never delete or alter a posted invoice'
]))}
${mlcExample('Real-World Example', 'Bluecopa invoices Darwinbox ₹2,00,000 for consulting. A pricing error is discovered — actual rate was ₹1,80,000. A credit memo of ₹20,000 is raised and sent to Darwinbox. AR drops from ₹2,00,000 to ₹1,80,000 in the books.')}
${mlcTakeaway('Accurate invoicing eliminates disputes. When errors occur, credit/debit memos are the correct tools. The original invoice must remain on record for audit trail and tax compliance purposes.')}`
          },
          {
            title: 'AR Aging Report & Open Items Management',
            dur: '11 min',
            html: `<h2>AR Aging Report & Open Items Management</h2>
<p class="mlc-lead">Open items are invoices not yet fully settled. The AR Aging Report is your primary tool for monitoring outstanding balances and prioritising collection action.</p>
${mlcSection('Standard Aging Buckets & Action Protocol', mlcUl([
  '<strong>Current (0–30 days)</strong> — Within payment terms; no action needed',
  '<strong>31–60 days</strong> — Overdue; send first polite reminder / statement of account',
  '<strong>61–90 days</strong> — Seriously overdue; escalate to collections team with phone follow-up',
  '<strong>91–120 days</strong> — High risk; credit hold on future orders; formal demand letter',
  '<strong>120+ days</strong> — Very high risk; consider provision for bad debt; legal escalation'
]))}
${mlcSection('Open Items Review — Weekly Routine', mlcOl([
  'Generate AR aging report every Monday morning',
  'Prioritise 60+ day items for immediate collection calls',
  'Log all customer communication in ERP or CRM',
  'Review disputed invoices with the business team for resolution',
  'Present weekly AR flash to Finance Manager'
]))}
${mlcExample('SAP Context', 'In SAP S/4HANA, open AR items are reviewed using transaction FBL5N (Customer Line Items). The standard AR Aging Analysis is generated via S_ALR_87012178. Both reports can be exported to Excel for collection team workflow management.')}
${mlcTakeaway('Review your aging report weekly without exception. The 60–90 day bucket is where most recoverable bad debt is created — early intervention here prevents write-offs.')}
${mlcDiagram('AR Aging Buckets — Action by Bucket', '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center;"><div style="padding:12px 6px;border-radius:8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3)"><div style="font-size:15px;font-weight:800;color:#22c55e">Current</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">0–30 days</div><div style="font-size:11px;color:#22c55e;margin-top:8px">✓ On track</div></div><div style="padding:12px 6px;border-radius:8px;background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.3)"><div style="font-size:15px;font-weight:800;color:#eab308">Overdue</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">31–60 days</div><div style="font-size:11px;color:#eab308;margin-top:8px">⚠ Send reminder</div></div><div style="padding:12px 6px;border-radius:8px;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.3)"><div style="font-size:15px;font-weight:800;color:#f97316">Late</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">61–90 days</div><div style="font-size:11px;color:#f97316;margin-top:8px">📞 Call now</div></div><div style="padding:12px 6px;border-radius:8px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3)"><div style="font-size:15px;font-weight:800;color:#ef4444">At Risk</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">91–120 days</div><div style="font-size:11px;color:#ef4444;margin-top:8px">🚫 Credit hold</div></div><div style="padding:12px 6px;border-radius:8px;background:rgba(239,68,68,.22);border:1px solid rgba(239,68,68,.5)"><div style="font-size:15px;font-weight:800;color:#ef4444">Critical</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">120+ days</div><div style="font-size:11px;color:#ef4444;margin-top:8px">📋 Provision</div></div></div>')}`
          }
        ]
      },
      {
        title: 'Cash Application & Incoming Payments',
        lessons: [
          {
            title: 'Cash Application Process',
            dur: '10 min',
            html: `<h2>Cash Application Process</h2>
<p class="mlc-lead">Cash application is the matching of incoming payments to open invoices. Done accurately and promptly, it clears AR and provides a true picture of outstanding balances. Errors or delays here inflate DSO artificially.</p>
${mlcSection('Step-by-Step Cash Application', mlcOl([
  '<strong>Receive Payment Advice</strong> — Bank statement, NEFT/RTGS confirmation, or customer remittance',
  '<strong>Identify the Customer</strong> — Match bank reference, UTR number, or virtual account to customer',
  '<strong>Identify the Invoice(s)</strong> — Customer remittance or payment reference specifies which invoices',
  '<strong>Apply to Open Items</strong> — Clear invoices in ERP against the payment',
  '<strong>Handle Partial Payments</strong> — Partial clearing with a reason code (dispute, credit on account)',
  '<strong>Handle Deductions</strong> — Short payment applied to invoice with deduction code for follow-up'
]))}
${mlcSection('Common Payment Methods', mlcUl([
  '<strong>NEFT/RTGS</strong> — Electronic bank transfer (most common in Indian B2B); same-day for RTGS',
  '<strong>Cheque</strong> — Physical instrument; requires deposit + 2-3 day clearing time',
  '<strong>Virtual Accounts</strong> — Unique account per customer; enables straight-through processing (STP)',
  '<strong>Wire Transfer</strong> — International payments; higher bank charges; typically T+2 settlement'
]))}
${mlcExample('Automation Example', 'Companies with high invoice volumes use Lockbox processing (SAP F_01) or Virtual Account Numbers. When a customer pays using their unique virtual account, the system automatically identifies the customer, matches the payment to open invoices, and clears them — zero human touch.')}
${mlcTakeaway('Cash application accuracy directly determines AR balance accuracy. Any unallocated payment sitting in a suspense account inflates your apparent DSO and misleads management about true collections performance.')}`
          }
        ]
      },
      {
        title: 'Collections, Dunning & Bad Debt',
        lessons: [
          {
            title: 'Dunning Process & Collections Strategy',
            dur: '9 min',
            html: `<h2>Dunning Process & Collections Strategy</h2>
<p class="mlc-lead">Dunning is the systematic escalation of payment reminders to customers with overdue invoices. A well-structured dunning programme reduces bad debt, shortens DSO, and preserves customer relationships.</p>
${mlcSection('Four-Level Dunning Programme', mlcOl([
  '<strong>Level 1 (15 days overdue)</strong> — Automated email reminder; friendly tone; no charges',
  '<strong>Level 2 (30 days overdue)</strong> — Statement of account attached; mild urgency language',
  '<strong>Level 3 (45 days overdue)</strong> — Formal notice; credit hold applied to prevent new orders; account manager informed',
  '<strong>Level 4 (60+ days overdue)</strong> — Final warning before legal/debt collection agency referral'
]))}
${mlcSection('Allowance for Doubtful Accounts (AFDA)', mlcUl([
  'AFDA is a <strong>contra asset account</strong> — it appears as a deduction from gross AR on the balance sheet',
  'It carries a <strong>credit balance</strong> and reduces AR to its Net Realizable Value',
  '<strong>Bad Debt Expense</strong> (income statement) is a separate account from AFDA (balance sheet)',
  'Methods: percentage of AR balance, aging schedule, or percentage of credit sales'
]))}
${mlcExample('Journal Entries', 'Creating the provision: Dr Bad Debt Expense ₹50,000 | Cr AFDA ₹50,000. Writing off a confirmed bad debt: Dr AFDA ₹50,000 | Cr AR ₹50,000. If later recovered: Dr AR ₹50,000 | Cr AFDA ₹50,000; then Dr Cash | Cr AR.')}
${mlcTakeaway('AFDA is a contra asset (balance sheet), not an expense. The provision approach maintains the invoice on record until formal write-off is authorised — critical for audit trail and potential future recovery.')}`
          }
        ]
      },
      {
        title: 'Period-End Close & AR KPIs',
        lessons: [
          {
            title: 'Month-End AR Close & Key Performance Indicators',
            dur: '12 min',
            html: `<h2>Month-End AR Close & Key Performance Indicators</h2>
<p class="mlc-lead">Month-end AR close ensures that the balance sheet accurately reflects outstanding receivables and that all revenue has been properly recognised. The primary KPI — Days Sales Outstanding (DSO) — measures the effectiveness of the entire AR process.</p>
${mlcSection('Month-End AR Close Checklist', mlcOl([
  'Post all customer invoices and credit/debit memos for the period',
  'Complete cash application — zero unallocated receipts in suspense',
  'Run dunning programme for all overdue customer accounts',
  'Review and post AFDA adjustment (bad debt provision)',
  'Reconcile AR subledger to the AR control account in the GL',
  'Send balance confirmation letters to key customers (sample basis)',
  'Prepare AR aging report for Finance Controller sign-off',
  'Investigate and clear any disputed items before period close'
]))}
${mlcSection('Key AR KPIs', mlcUl([
  '<strong>DSO</strong> = (Closing AR ÷ Credit Sales) × Days in Period — target: ≤ payment terms + 7 days',
  '<strong>Collection Effectiveness Index (CEI)</strong> — % of collectible AR actually collected in the period',
  '<strong>Bad Debt % of Revenue</strong> = Write-offs ÷ Credit Sales — industry benchmark: < 0.5%',
  '<strong>% AR Overdue</strong> = Overdue AR ÷ Total AR — monitor weekly; flag if > 20%',
  '<strong>Cash Collected vs Target</strong> — weekly collections vs. cash forecast'
]))}
${mlcTakeaway('A DSO above your standard payment terms signals collection inefficiency. DSO exceeding 2× your payment terms indicates serious risk. Report DSO weekly to leadership — it is the single most important AR health indicator.')}
${mlcStatGrid([{n:'DSO',l:'Days Sales Outstanding',note:'(AR ÷ Revenue) × Days in period'},{n:'CEI',l:'Collections Effectiveness Index',note:'Higher = better collections team'},{n:'<2%',l:'Bad debt as % of revenue',note:'Industry benchmark'},{n:'95%+',l:'Cash auto-application rate',note:'% invoices matched without manual work'}])}
${mlcCompare('AR Best Practices', ['Weekly aging review — every Monday', 'Automated dunning by bucket', 'Credit limits reviewed quarterly', 'Dispute log maintained daily', 'DSO tracked vs prior month & target'], 'AR Red Flags', ['Aging buckets growing month-on-month', 'Same customers perpetually late', 'High unapplied cash sitting in suspense', 'Credit holds blocking new revenue orders', 'Cash application manual rate above 20%'])}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'What type of account is the Allowance for Doubtful Accounts (AFDA)?', opts: ['Current liability', 'Contra asset account', 'Operating expense', 'Long-term asset'], a: 1, exp: 'AFDA is a contra asset account — it carries a credit balance and is deducted from gross AR on the balance sheet to show net realizable value.' },
      { q: 'Days Sales Outstanding (DSO) is correctly calculated as:', opts: ['(Revenue ÷ AR) × 365', '(AR ÷ Credit Sales) × Days in Period', '(Cash ÷ AR) × 30', '(AR ÷ Total Assets) × 365'], a: 1, exp: 'DSO = (Closing AR ÷ Credit Sales) × Days. A lower DSO means faster collection.' },
      { q: 'Which document is raised to correct an overcharge on a customer invoice?', opts: ['Debit memo', 'Purchase order amendment', 'Credit memo', 'Goods Return Note'], a: 2, exp: 'A credit memo reduces the amount owed by the customer. A debit memo would increase it.' },
      { q: 'The AR aging report groups invoices by:', opts: ['Invoice value descending', 'Customer credit rating', 'Number of days outstanding', 'Payment method used'], a: 2, exp: 'The aging report categorises open invoices by how long they have been outstanding (0–30, 31–60, 61–90, 90+ days).' },
      { q: 'Dunning is best described as:', opts: ['Paying vendors early to capture discounts', 'Posting period-end accruals', 'Sending escalating payment reminders to overdue customers', 'Reconciling bank statements'], a: 2, exp: 'Dunning is a structured, multi-level process of sending payment reminders to customers with overdue invoices.' },
      { q: 'The correct journal entry when a customer invoice is raised for revenue earned is:', opts: ['Dr Cash, Cr Revenue', 'Dr AR, Cr Revenue', 'Dr Revenue, Cr AR', 'Dr AR, Cr Cash'], a: 1, exp: 'When revenue is earned: Dr AR (asset increases) | Cr Revenue (income recognised). Cash entry comes when payment is received.' },
      { q: 'Net Realizable Value of Accounts Receivable equals:', opts: ['Gross AR + AFDA', 'Gross AR − AFDA', 'Total revenue − bad debt expense', 'Cash collected + outstanding AR'], a: 1, exp: 'Net Realizable Value = Gross AR minus the Allowance for Doubtful Accounts. This is how AR appears on the balance sheet.' },
      { q: 'In SAP S/4HANA, open customer line items (unpaid invoices) are reviewed using transaction:', opts: ['MIRO', 'FBL5N', 'XD01', 'F110'], a: 1, exp: 'FBL5N is the Customer Line Items report in SAP, used to view open, cleared, and parked AR items per customer.' },
      { q: 'A customer pays ₹90,000 against an invoice of ₹1,00,000 and deducts ₹10,000 citing a pricing dispute. This is known as a:', opts: ['Bad debt write-off', 'Customer deduction', 'Credit limit breach', 'Cash discount'], a: 1, exp: 'A customer deduction (short payment with a reason) requires investigation and resolution — not immediate write-off.' },
      { q: 'If DSO is 60 days and your standard payment terms are NET 30, this indicates:', opts: ['Collections are ahead of schedule', 'Collections are exactly on target', 'Customers are paying 30 days late on average', 'No significant issue'], a: 2, exp: 'DSO of 60 vs. terms of 30 means customers are paying, on average, 30 days late. This signals a collections performance issue.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 2 — ACCOUNT PAYABLE
  // ════════════════════════════════════════════════════
  ap: {
    modules: [
      {
        title: 'AP Fundamentals & Vendor Management',
        lessons: [
          {
            title: 'What is Accounts Payable?',
            dur: '8 min',
            html: `<h2>What is Accounts Payable?</h2>
<p class="mlc-lead">Accounts Payable (AP) represents money your organisation owes to vendors and suppliers for goods and services received but not yet paid for. It is a <strong>current liability</strong> on the balance sheet and forms the payment leg of the Procure-to-Pay (P2P) cycle.</p>
${mlcSection('Core AP Concepts', mlcUl([
  '<strong>AP as a Current Liability</strong> — Obligation to pay vendors, typically within 30–90 days',
  '<strong>Accrual Accounting</strong> — AP is created when a liability arises, not when cash is paid',
  '<strong>P2P Connection</strong> — AP sits at the end of: Purchase Requisition → PO → Goods Receipt → Invoice → Payment',
  '<strong>Working Capital Impact</strong> — Extending DPO (Days Payable Outstanding) improves cash flow'
]))}
${mlcSection('AP vs AR — The Mirror Image', mlcUl([
  'AR is an asset (customer owes you); AP is a liability (you owe the vendor)',
  'Both use subledger accounting — AP subledger reconciles to AP control account in GL',
  'AR uses credit memos; AP uses vendor credit notes',
  'AR aims for fast collection; AP aims to optimise payment timing'
]))}
${mlcExample('Journal Entry', 'On receipt of vendor invoice for ₹3,00,000 of services: Dr Expense/Cost Account ₹3,00,000 | Cr Accounts Payable ₹3,00,000. On payment: Dr AP ₹3,00,000 | Cr Bank ₹3,00,000.')}
${mlcTakeaway('AP is not just about paying bills — it is about paying the right amount, to the right vendor, at the right time, with proper authorisation. Each element of that sentence represents a control that prevents fraud and error.')}
${mlcFlow(['Business need identified', 'Purchase Requisition raised', 'PR approved by budget owner', 'Purchase Order created & sent to vendor', 'Vendor delivers goods/services', 'Goods Receipt Note (GRN) raised', 'Vendor invoice received', 'Three-way match: PO + GRN + Invoice', 'Invoice approved & posted as AP', 'Payment run executed', 'Vendor paid & AP cleared'])}`
          },
          {
            title: 'Vendor Master Data & Payment Terms',
            dur: '10 min',
            html: `<h2>Vendor Master Data & Payment Terms</h2>
<p class="mlc-lead">Every AP transaction flows through the vendor master. Accurate master data ensures payments reach the right supplier, on time, to the correct bank account.</p>
${mlcSection('Vendor Master Data — Key Fields', mlcUl([
  '<strong>General Data</strong> — Legal name, registered address, tax ID (GSTIN/PAN), contact details',
  '<strong>Company Code Data</strong> — Payment terms, payment method, reconciliation account, withholding tax',
  '<strong>Banking Details</strong> — Bank account number, IFSC/SWIFT, account name — change controls are critical here',
  '<strong>Purchasing Data</strong> — Currency, incoterms, delivery terms, purchasing group assignment'
]))}
${mlcSection('Payment Terms & Early Payment Discounts', mlcUl([
  '<strong>NET 30</strong> — Full payment due 30 days after invoice date',
  '<strong>2/10 NET 30</strong> — 2% discount if paid within 10 days; full amount due by day 30',
  '<strong>Annualised cost of NOT taking 2/10 n/30</strong> = (2÷98) × (360÷20) = <strong>~36% per annum</strong>',
  'This 36% annualised rate almost always exceeds borrowing costs — take the early discount when cash allows'
]))}
${mlcExample('Fraud Control', 'Vendor bank account changes are a top AP fraud vector. Best practice: any change to vendor banking details requires dual authorisation, a callback to a pre-registered vendor number (not the requester), and a confirmation email to the vendor before the change is live.')}
${mlcTakeaway('Vendor master data is the foundation of AP controls. Compromised banking details are the number-one cause of Business Email Compromise (BEC) fraud in AP. Treat vendor master changes with the same rigor as IT system access changes.')}`
          }
        ]
      },
      {
        title: 'Invoice Processing & Three-Way Matching',
        lessons: [
          {
            title: 'Three-Way Matching — The Core AP Control',
            dur: '12 min',
            html: `<h2>Three-Way Matching — The Core AP Control</h2>
<p class="mlc-lead">Three-way matching is the fundamental AP internal control that ensures you only pay for goods and services that were actually ordered and properly received. It is a verified industry standard across SAP, Oracle, and Microsoft Dynamics ERP platforms.</p>
${mlcSection('The Three Documents', mlcUl([
  '<strong>1. Purchase Order (PO)</strong> — Approved commitment to buy; sets expected price, quantity, and terms',
  '<strong>2. Goods Receipt Note (GRN / Delivery Note)</strong> — Confirms goods were physically received and inspected',
  '<strong>3. Vendor Invoice</strong> — Vendor\'s request for payment; must match PO and GRN'
]))}
${mlcSection('Three-Way Match Tolerance Checks', mlcOl([
  'Invoice quantity ≤ PO quantity (over-receipt exception if exceeded)',
  'Invoice unit price within tolerance of PO price (e.g., ±2% or ±₹500)',
  'Invoice total ≤ PO value (prevents payment exceeding what was authorised)',
  'Tax amount correct per applicable rate',
  'Invoice not previously paid (duplicate check)'
]))}
${mlcSection('What Happens on Mismatch — Blocked Invoice', mlcUl([
  'Invoice is automatically <strong>blocked</strong> in the ERP system',
  'AP team investigates: was there a price change? Quantity discrepancy? GRN not posted?',
  'Resolution options: adjust invoice, raise credit note with vendor, get new PO raised',
  'Only a properly authorised person can release the block'
]))}
${mlcExample('SAP Context', 'In SAP, invoice receipt and three-way matching is performed via transaction MIRO (Logistics Invoice Verification). The system automatically compares the invoice against the PO and GRN. If a match fails, the invoice is blocked (MRBR is used to review and release blocked invoices).')}
${mlcTakeaway('Three-way matching prevents overpayment, duplicate payment, and fraud. It is non-negotiable — any process that allows invoice payment without a matching PO and GRN is a significant financial control weakness.')}
${mlcDiagram('Three-Way Match — How It Works', '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><div style="flex:1;min-width:120px;padding:14px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);border-radius:10px;text-align:center"><div style="font-size:22px;margin-bottom:8px">📋</div><div style="font-weight:700;color:#60a5fa;font-size:12px">Purchase Order</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:6px">Qty · Price · Vendor · Terms</div></div><div style="font-size:20px;color:rgba(201,162,39,.5);font-weight:300;flex-shrink:0">+</div><div style="flex:1;min-width:120px;padding:14px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.4);border-radius:10px;text-align:center"><div style="font-size:22px;margin-bottom:8px">📦</div><div style="font-weight:700;color:#22c55e;font-size:12px">Goods Receipt</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:6px">Qty received · Condition · Date</div></div><div style="font-size:20px;color:rgba(201,162,39,.5);font-weight:300;flex-shrink:0">+</div><div style="flex:1;min-width:120px;padding:14px;background:rgba(201,162,39,.15);border:1px solid rgba(201,162,39,.4);border-radius:10px;text-align:center"><div style="font-size:22px;margin-bottom:8px">🧾</div><div style="font-weight:700;color:#c9a227;font-size:12px">Vendor Invoice</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:6px">Amount · Ref · Payment terms</div></div><div style="font-size:20px;color:rgba(201,162,39,.5);flex-shrink:0">→</div><div style="flex:1;min-width:120px;padding:14px;background:rgba(34,197,94,.12);border:2px solid #22c55e;border-radius:10px;text-align:center"><div style="font-size:22px;margin-bottom:8px">✅</div><div style="font-weight:700;color:#22c55e;font-size:12px">Match = Approve</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:6px">All 3 agree → post for payment</div></div></div>')}`
          }
        ]
      },
      {
        title: 'Payment Processing & GR/IR Reconciliation',
        lessons: [
          {
            title: 'AP Payment Run & GR/IR Account',
            dur: '11 min',
            html: `<h2>AP Payment Run & GR/IR Account</h2>
<p class="mlc-lead">Once invoices are approved and matched, the payment run processes them in bulk. The GR/IR account is the clearing mechanism that bridges the goods receipt and invoice receipt in your ERP — a core concept verified across SAP and Oracle training curricula.</p>
${mlcSection('Payment Run Process (SAP F110)', mlcOl([
  'AP Accountant defines payment run parameters: company code, payment date, vendor selection',
  'System generates a payment proposal showing which invoices will be paid and amounts',
  'AP Manager reviews and releases the proposal (4-eyes principle)',
  'Bank file (NEFT/RTGS instructions) is generated and submitted to the bank',
  'Bank confirms execution; payment document is posted; vendor invoice is cleared'
]))}
${mlcSection('The GR/IR Clearing Account — Explained', mlcUl([
  '<strong>GR/IR</strong> = Goods Receipt / Invoice Receipt — a temporary clearing account in SAP',
  'On Goods Receipt: Dr Inventory | Cr GR/IR Account (liability created for amount owed)',
  'On Invoice Receipt: Dr GR/IR Account | Cr Vendor AP (clears when matched to GRN)',
  'A zero GR/IR balance means all receipts have matching invoices and vice versa',
  'Open GR/IR items represent timing differences — goods received but not yet invoiced (or vice versa)'
]))}
${mlcExample('Practical Example', 'Bluecopa receives server hardware from Navi Tech (GRN posted): Dr Inventory ₹10,00,000 | Cr GR/IR ₹10,00,000. When the invoice arrives and is matched: Dr GR/IR ₹10,00,000 | Cr AP ₹10,00,000. GR/IR nets to zero. On payment: Dr AP ₹10,00,000 | Cr Bank ₹10,00,000.')}
${mlcTakeaway('The GR/IR account is a bridge, not a parking lot. Any item sitting in GR/IR for more than 30 days needs investigation — it means either a goods receipt was posted without an invoice, or an invoice was received for goods that have not arrived.')}`
          }
        ]
      },
      {
        title: 'AP Controls & Vendor Reconciliation',
        lessons: [
          {
            title: 'AP Internal Controls & Vendor Statement Reconciliation',
            dur: '10 min',
            html: `<h2>AP Internal Controls & Vendor Statement Reconciliation</h2>
<p class="mlc-lead">Strong AP controls prevent fraud, duplicate payments, and regulatory exposure. Vendor statement reconciliation is the periodic check that your AP records match what the vendor believes you owe them.</p>
${mlcSection('Key AP Internal Controls', mlcUl([
  '<strong>Segregation of Duties</strong> — Invoice entry, invoice approval, and payment authorisation must be performed by different individuals',
  '<strong>PO Mandate Policy</strong> — All purchases above a threshold require a pre-approved PO',
  '<strong>Duplicate Invoice Check</strong> — ERP blocks invoices with same vendor, amount, and date',
  '<strong>Vendor Master Change Controls</strong> — Bank detail changes require dual authorisation + vendor callback',
  '<strong>Payment Authority Matrix</strong> — Payment above defined limits requires senior approval',
  '<strong>Periodic AP Aging Review</strong> — Aged liabilities reviewed monthly to identify disputes and long-outstanding items'
]))}
${mlcSection('Vendor Statement Reconciliation Process', mlcOl([
  'Request vendor statement (or use portal) showing their view of your account',
  'Compare against ERP AP subledger for the same vendor',
  'Identify and categorise differences: timing, disputes, missing invoices, duplicates',
  'Agree resolution for each difference with business and vendor',
  'Update ERP and request credit notes/adjusted statements',
  'Document and sign off the reconciliation'
]))}
${mlcTakeaway('AP reconciliation with vendor statements is not just an accounting exercise — it catches duplicate payments, missing credit notes, and disputed items that would otherwise be paid or go unresolved. Aim to reconcile your top 20 vendors (by value) every month.')}`
          }
        ]
      },
      {
        title: 'Period-End AP Close & AP KPIs',
        lessons: [
          {
            title: 'Month-End AP Close & Key Metrics',
            dur: '11 min',
            html: `<h2>Month-End AP Close & Key Metrics</h2>
<p class="mlc-lead">Month-end AP close ensures all liabilities are accurately recorded, payments are properly posted, and the AP subledger ties to the general ledger. DPO is the headline KPI that measures how efficiently your organisation manages vendor payment timing.</p>
${mlcSection('Month-End AP Close Checklist', mlcOl([
  'Post all vendor invoices received and approved during the period',
  'Complete all approved payment runs; confirm bank execution',
  'Process accruals for goods received but not invoiced (GRNBI accrual)',
  'Review and clear GR/IR account — investigate items > 30 days',
  'Reconcile AP subledger to AP control account in GL',
  'Review AP aging report for items requiring escalation or write-back',
  'Confirm all debit balances on vendor accounts (potential overpayment)',
  'Prepare AP flash report for Finance Controller'
]))}
${mlcSection('Key AP KPIs', mlcUl([
  '<strong>DPO</strong> = (Closing AP ÷ COGS) × Days — higher DPO improves cash flow; balance against vendor relationships',
  '<strong>Invoice Processing Time</strong> — Average days from invoice receipt to posting; target < 3 days',
  '<strong>% Invoices 3-Way Matched</strong> — Target > 95%; exceptions indicate PO or GRN process weakness',
  '<strong>Duplicate Payment Rate</strong> — Should be zero; any duplicate is a control failure',
  '<strong>On-Time Payment %</strong> — % of invoices paid within agreed terms; impacts vendor relationships'
]))}
${mlcTakeaway('DPO optimisation is a legitimate working capital strategy, but never compromise vendor relationships or miss terms that have early-payment discounts. A 2% discount on 30-day payment is worth 36% annualised — almost always worth taking.')}
${mlcStatGrid([{n:'DPO',l:'Days Payable Outstanding',note:'(AP ÷ COGS) × Days in period'},{n:'98%+',l:'Three-way match auto rate',note:'Best-in-class benchmark'},{n:'<1%',l:'Duplicate payment rate',note:'Critical fraud/error control'},{n:'2/10',l:'Early payment discount terms',note:'~36% annualised return on capital'}])}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Three-way matching in AP involves which three documents?', opts: ['PO, Sales Order, Invoice', 'PO, Goods Receipt, Vendor Invoice', 'Requisition, PO, Payment', 'GRN, Delivery Note, Payment Advice'], a: 1, exp: 'Three-way matching reconciles: (1) Purchase Order, (2) Goods Receipt Note/GRN, and (3) Vendor Invoice. This is verified across SAP, Oracle, and Microsoft Dynamics curricula.' },
      { q: 'Under 2/10 NET 30 payment terms, the annualised cost of NOT taking the early payment discount is approximately:', opts: ['5%', '20%', '36%', '50%'], a: 2, exp: 'Formula: (2÷98) × (360÷20) = 36.7%. This high annualised rate means early payment is almost always financially advantageous.' },
      { q: 'Accounts Payable appears on the balance sheet as a:', opts: ['Current asset', 'Non-current asset', 'Current liability', 'Long-term liability'], a: 2, exp: 'AP is a current liability — an obligation to pay vendors, typically due within 12 months.' },
      { q: 'The GR/IR account in SAP should theoretically balance to:', opts: ['The total of all POs raised', 'Zero, when all receipts have matching invoices', 'The total of all payments made', 'The AP subledger balance'], a: 1, exp: 'GR/IR is a clearing account. When a GR is matched to an invoice, both entries cancel out. Persistent non-zero balances indicate unmatched items needing investigation.' },
      { q: 'An invoice that fails three-way matching in SAP is:', opts: ['Automatically paid after 30 days', 'Blocked and requires investigation/release', 'Cancelled and must be resubmitted', 'Sent back to the vendor automatically'], a: 1, exp: 'A matching failure blocks the invoice in SAP (MIRO). The AP team must investigate the discrepancy and either obtain a corrected invoice or release the block with proper authorisation.' },
      { q: 'Which principle ensures that invoice entry, approval, and payment are handled by different individuals?', opts: ['Dual control', 'Segregation of Duties', 'Least privilege', 'Four-eyes principle'], a: 1, exp: 'Segregation of Duties (SoD) is a key internal control that prevents a single individual from initiating and completing a fraudulent transaction.' },
      { q: 'What does it mean if a vendor account shows a "debit balance" in your AP subledger?', opts: ['The vendor owes you money (potential overpayment or credit note)', 'You have not paid the vendor yet', 'The vendor has exceeded their credit limit', 'The invoice has been blocked'], a: 0, exp: 'A debit balance on a vendor account (which should normally be credit) suggests either an overpayment or an unclaimed credit note. Requires immediate investigation.' },
      { q: 'DPO (Days Payable Outstanding) is calculated as:', opts: ['(Revenue ÷ AP) × Days', '(AP ÷ COGS) × Days', '(AP ÷ Revenue) × 365', '(COGS ÷ AP) × Days'], a: 1, exp: 'DPO = (Closing AP ÷ Cost of Goods Sold) × Days in Period. A higher DPO means the company takes longer to pay suppliers, preserving cash.' },
      { q: 'Which of these is a key AP fraud prevention control for vendor bank account changes?', opts: ['Accepting changes via email from the vendor', 'Processing the change immediately to avoid payment delays', 'Dual authorisation + callback to a pre-registered vendor number', 'Asking the requestor to confirm the new details'], a: 2, exp: 'Vendor bank detail changes are a top Business Email Compromise (BEC) fraud vector. Dual authorisation and an independent callback to a known vendor contact number are essential.' },
      { q: 'An accrual in AP at month-end is typically posted for:', opts: ['Invoices already paid this month', 'Goods/services received but for which no invoice has yet been received', 'Disputed invoices that are blocked', 'Advance payments to vendors'], a: 1, exp: 'A GRNBI (Goods Received Not Billed) accrual ensures that the liability for received goods is recorded in the correct period, even if the invoice arrives in the next period.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 3 — MIS REPORTS
  // ════════════════════════════════════════════════════
  mis: {
    modules: [
      {
        title: 'Introduction to MIS',
        lessons: [
          {
            title: 'What is a Management Information System?',
            dur: '8 min',
            html: `<h2>What is a Management Information System?</h2>
<p class="mlc-lead">A Management Information System (MIS) is a structured set of reports, dashboards, and analyses that provide managers with the information they need to make timely, data-driven decisions. In enterprise finance, MIS bridges raw transaction data in the ERP with actionable insight for leadership.</p>
${mlcSection('Three Tiers of MIS', mlcUl([
  '<strong>Operational MIS</strong> — Day-to-day transaction reports; used by accountants and operations teams (e.g., AR aging, open POs, GR/IR report)',
  '<strong>Tactical MIS</strong> — Weekly/monthly performance reports; used by managers (e.g., P&L variance analysis, DSO trend, budget vs. actual)',
  '<strong>Strategic MIS</strong> — Board-level dashboards; used by leadership (e.g., revenue forecast, working capital trend, EBITDA bridge)'
]))}
${mlcSection('MIS Data Sources in Enterprise Finance', mlcUl([
  '<strong>ERP System</strong> — SAP, Oracle, Dynamics: source of record for all financial transactions',
  '<strong>CRM</strong> — Pipeline data, sales orders, customer interactions',
  '<strong>Banking Platforms</strong> — Real-time cash positions, payment confirmations',
  '<strong>Spreadsheets / BI Tools</strong> — Excel, Power BI, Tableau: layer on top of ERP data for visualisation'
]))}
${mlcTakeaway('An MIS report is only as valuable as the quality of the underlying data and the timeliness of its delivery. Stale data or data the user does not trust will result in decisions being made on gut feel rather than facts.')}
${mlcFlow(['Raw data in ERP, banks, ops systems', 'Data extracted & validated', 'Aggregated into MIS tables/views', 'Reports & dashboards generated', 'Distributed to management (email/portal)', 'Decisions made based on insights', 'Actions tracked against outcomes'])}
${mlcCompare('MIS Report Characteristics', ['Structured, repeatable format', 'Covers a defined reporting period', 'Comparable to prior periods and targets', 'Exception-driven — shows variances', 'Actionable — drives a specific decision'], 'NOT an MIS Report', ['One-off ad-hoc data extraction', 'Unformatted raw ERP export dump', 'No comparison to target or prior period', 'Shows all data without prioritisation', 'Informational only — no decision trigger'])}`
          }
        ]
      },
      {
        title: 'Financial Statements in MIS',
        lessons: [
          {
            title: 'Reading the P&L, Balance Sheet & Cash Flow',
            dur: '12 min',
            html: `<h2>Reading the P&L, Balance Sheet & Cash Flow</h2>
<p class="mlc-lead">The three core financial statements are the foundation of every MIS pack. Understanding how they connect enables finance teams to identify risks and opportunities that no single statement reveals on its own.</p>
${mlcSection('Profit & Loss (Income Statement)', mlcUl([
  '<strong>Revenue</strong> — Total sales billed to customers in the period',
  '<strong>Cost of Goods Sold (COGS)</strong> — Direct costs of delivering the revenue',
  '<strong>Gross Profit</strong> = Revenue − COGS; Gross Margin % = Gross Profit ÷ Revenue',
  '<strong>Operating Expenses</strong> — Salaries, rent, depreciation, admin costs',
  '<strong>EBITDA</strong> = Earnings Before Interest, Tax, Depreciation, Amortisation — key operating performance metric',
  '<strong>Net Profit</strong> = Profit after all expenses, interest, and tax'
]))}
${mlcSection('Balance Sheet (Accounting Equation)', mlcUl([
  '<strong>Assets = Liabilities + Equity</strong> — the equation must always balance',
  '<strong>Current Assets</strong> — Cash, AR, Inventory (expected to convert within 12 months)',
  '<strong>Current Liabilities</strong> — AP, accruals, short-term debt (due within 12 months)',
  '<strong>Working Capital</strong> = Current Assets − Current Liabilities — key liquidity measure'
]))}
${mlcSection('Cash Flow Statement — Three Sections', mlcUl([
  '<strong>Operating Activities</strong> — Cash generated from core business operations (collections from customers, payments to vendors)',
  '<strong>Investing Activities</strong> — Capital expenditure, asset purchases/sales',
  '<strong>Financing Activities</strong> — Loan drawdowns/repayments, equity issuance, dividends'
]))}
${mlcTakeaway('A company can show profit on its P&L but still run out of cash. The cash flow statement reveals whether the business is generating or consuming cash from its operations — the most critical test of financial health.')}`
          }
        ]
      },
      {
        title: 'AR, AP & Working Capital Reports',
        lessons: [
          {
            title: 'DSO, DPO, DIO & the Cash Conversion Cycle',
            dur: '11 min',
            html: `<h2>DSO, DPO, DIO & the Cash Conversion Cycle</h2>
<p class="mlc-lead">Working capital reports translate the balance sheet into actionable operational metrics. The Cash Conversion Cycle (CCC) tells you how many days your cash is tied up in operations — a shorter cycle means more cash available to the business.</p>
${mlcSection('The Three Working Capital KPIs', mlcUl([
  '<strong>DSO (Days Sales Outstanding)</strong> = (AR ÷ Revenue) × Days — how fast you collect from customers',
  '<strong>DPO (Days Payable Outstanding)</strong> = (AP ÷ COGS) × Days — how long you take to pay vendors',
  '<strong>DIO (Days Inventory Outstanding)</strong> = (Inventory ÷ COGS) × Days — how long stock sits before sale'
]))}
${mlcSection('Cash Conversion Cycle', mlcUl([
  '<strong>CCC = DSO + DIO − DPO</strong>',
  'A positive CCC means cash is tied up in operations (common for most businesses)',
  'A negative CCC (e.g., Amazon, supermarkets) means the business collects cash before paying suppliers',
  'Target: reduce DSO and DIO while responsibly increasing DPO'
]))}
${mlcExample('Worked Example', 'Company A: DSO = 45 days, DIO = 30 days, DPO = 40 days. CCC = 45 + 30 − 40 = 35 days. This means for every ₹1 of cost, the business needs 35 days of funding before that ₹1 returns as cash. If annual revenue is ₹100 cr, this represents ~₹9.6 cr of working capital requirement.')}
${mlcTakeaway('The CCC is one of the most powerful cross-functional finance metrics. Reducing it by even 5 days can free up millions in cash for a mid-sized company. Finance, sales, and supply chain teams must own their part of the cycle.')}
${mlcDiagram('Cash Conversion Cycle Formula', '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><div style="flex:1;min-width:100px;padding:12px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.35);border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:800;color:#60a5fa">DSO</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">Days Sales Outstanding</div><div style="font-size:10px;color:#60a5fa;margin-top:6px">AR ÷ Revenue × Days</div></div><div style="font-size:16px;color:rgba(201,162,39,.7);font-weight:700;flex-shrink:0">+</div><div style="flex:1;min-width:100px;padding:12px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:800;color:#22c55e">DIO</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">Days Inventory Outstanding</div><div style="font-size:10px;color:#22c55e;margin-top:6px">Inventory ÷ COGS × Days</div></div><div style="font-size:16px;color:rgba(201,162,39,.7);font-weight:700;flex-shrink:0">−</div><div style="flex:1;min-width:100px;padding:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:800;color:#ef4444">DPO</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">Days Payable Outstanding</div><div style="font-size:10px;color:#ef4444;margin-top:6px">AP ÷ COGS × Days</div></div><div style="font-size:16px;color:rgba(201,162,39,.7);font-weight:700;flex-shrink:0">=</div><div style="flex:1;min-width:100px;padding:12px;background:rgba(201,162,39,.12);border:2px solid rgba(201,162,39,.5);border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:800;color:#c9a227">CCC</div><div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px">Cash Conversion Cycle</div><div style="font-size:10px;color:#c9a227;margin-top:6px">Lower = better cash flow</div></div></div>')}
${mlcStatGrid([{n:'30–45d',l:'Good DSO for B2B',note:'Collect faster = better working capital'},{n:'45–60d',l:'Good DPO target',note:'Pay slower (within terms) = better'},{n:'<30d',l:'World-class CCC',note:'Amazon achieves negative CCC'},{n:'1%',l:'CCC improvement = cash',note:'Every day saved = free cash'}])}`
          }
        ]
      },
      {
        title: 'Operational Reports & Exception Management',
        lessons: [
          {
            title: 'Key Operational Finance Reports',
            dur: '10 min',
            html: `<h2>Key Operational Finance Reports</h2>
<p class="mlc-lead">Operational finance reports are the daily and weekly pulse checks of financial health. They surface exceptions, risks, and opportunities before they become problems — and give management the confidence to act.</p>
${mlcSection('Essential Operational Reports', mlcUl([
  '<strong>AR Aging Analysis</strong> — Open invoices by age bucket; drives collections prioritisation',
  '<strong>AP Aging Analysis</strong> — Open vendor invoices due; drives payment prioritisation',
  '<strong>GR/IR Open Items</strong> — Unmatched goods receipts and invoices; operational control report',
  '<strong>Open Purchase Order Report</strong> — POs raised but goods/services not yet received',
  '<strong>Cash Position Report</strong> — Daily bank balances across all accounts; critical for treasury',
  '<strong>Budget vs. Actual (BvA)</strong> — Variance between approved budget and actual spend by cost centre',
  '<strong>Intercompany Reconciliation</strong> — Ensures transactions between group companies are balanced'
]))}
${mlcSection('Exception-Based Reporting', mlcUl([
  'Reports should highlight <strong>exceptions</strong>, not just data — flag items breaching thresholds',
  'Use conditional formatting, RAG (Red/Amber/Green) status, and trend arrows',
  'Define clear escalation rules: what goes to the team vs. the manager vs. the CFO',
  'Automate exception alerts where possible (email triggers, Power BI alerts)'
]))}
${mlcTakeaway('A good operational report is not a data dump — it is a pre-digested set of decisions waiting to be made. Design reports with the end action in mind: what will the reader do differently after seeing this data?')}`
          }
        ]
      },
      {
        title: 'Dashboards, KPIs & Automation',
        lessons: [
          {
            title: 'Building Effective Finance Dashboards',
            dur: '12 min',
            html: `<h2>Building Effective Finance Dashboards</h2>
<p class="mlc-lead">A finance dashboard consolidates key metrics onto a single screen, enabling leadership to assess financial health at a glance. The best dashboards are designed around decisions, not data.</p>
${mlcSection('Dashboard Design Principles', mlcUl([
  '<strong>Audience-first design</strong> — CFO dashboard ≠ AP manager dashboard; tailor to the decisions each audience makes',
  '<strong>No more than 7 KPIs</strong> — cognitive load prevents more than 5–7 metrics from being processed in a single view',
  '<strong>RAG (Red / Amber / Green) status</strong> — visual cues that require no table reading',
  '<strong>Trend context</strong> — always show current period vs. prior period and vs. budget',
  '<strong>Drill-down capability</strong> — summary metrics should link to underlying detail'
]))}
${mlcSection('MIS Automation Best Practices', mlcUl([
  'Direct ERP data extraction via API or scheduled exports — eliminate manual data entry',
  'Use Power BI / Tableau connected live to the data warehouse or ERP',
  'Schedule automated distribution of key reports every Monday morning',
  'Build variance commentary templates to speed up management pack preparation',
  'Version control your reports — never overwrite the prior period without archiving'
]))}
${mlcSection('Trial Balance — The Starting Point of All MIS', mlcUl([
  'The trial balance lists all GL account balances after all journal entries for the period',
  'It is the numerical proof that debits = credits (a fundamental double-entry check)',
  'All financial statements (P&L, Balance Sheet, Cash Flow) are derived from the trial balance',
  'Unexplained variances in the trial balance must be investigated before closing the period'
]))}
${mlcTakeaway('The best MIS report is the one that gets used. Focus on relevance, accuracy, and timeliness over comprehensiveness. One trusted, timely metric outperforms ten comprehensive reports that arrive late or are not believed.')}
${mlcCompare('Effective Dashboard', ['Max 8–10 KPIs on one screen', 'RAG status (Red/Amber/Green) per metric', 'Current vs target vs prior period shown', 'Exceptions highlighted at the top', 'Auto-refreshed from live data', 'Mobile-friendly, readable in 30 seconds'], 'Ineffective Dashboard', ['40+ metrics across multiple tabs', 'Numbers only — no visual indicators', 'No targets to compare against', 'All metrics look equally important', 'Manually updated in Excel weekly', 'Requires training to interpret'])}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'What does MIS stand for in a finance context?', opts: ['Management Invoice System', 'Management Information System', 'Monthly Income Statement', 'Master Inventory Summary'], a: 1, exp: 'MIS = Management Information System. It provides structured reports and dashboards for decision-making at operational, tactical, and strategic levels.' },
      { q: 'Which financial statement shows revenue, costs, and profit for a given period?', opts: ['Balance Sheet', 'Cash Flow Statement', 'Profit & Loss (Income Statement)', 'Trial Balance'], a: 2, exp: 'The Profit & Loss (P&L) / Income Statement shows revenue, expenses, and profit/loss for a specific time period.' },
      { q: 'The Cash Conversion Cycle (CCC) formula is:', opts: ['DSO − DPO + DIO', 'DSO + DIO − DPO', 'DPO + DIO − DSO', 'DIO − DSO − DPO'], a: 1, exp: 'CCC = DSO + DIO − DPO. A shorter (lower) CCC means less cash is tied up in operations.' },
      { q: 'DPO (Days Payable Outstanding) is calculated as:', opts: ['(Revenue ÷ AP) × Days', '(AP ÷ COGS) × Days', '(AR ÷ Revenue) × Days', '(COGS ÷ AP) × 365'], a: 1, exp: 'DPO = (AP ÷ COGS) × Days. It measures how many days a company takes to pay its suppliers.' },
      { q: 'The accounting equation (Balance Sheet identity) is:', opts: ['Revenue = Expenses + Profit', 'Assets = Liabilities + Equity', 'Cash = AR + Inventory', 'Equity = Assets + Liabilities'], a: 1, exp: 'Assets = Liabilities + Equity is the fundamental balance sheet equation that must always hold.' },
      { q: 'A company reports strong net profit but negative operating cash flow. The most likely cause is:', opts: ['Revenue was understated', 'Customers are not paying on time (high DSO / high AR)', 'Tax rates are too high', 'Depreciation was recorded incorrectly'], a: 1, exp: 'Strong profit but weak cash flow often indicates that revenue is recognised (P&L) but customers have not paid (no cash). High DSO is the classic cause.' },
      { q: 'What does a trial balance verify?', opts: ['That all invoices have been paid', 'That total debits equal total credits in the general ledger', 'That bank balances are reconciled', 'That AR matches AP'], a: 1, exp: 'A trial balance is a listing of all GL account balances. It verifies that total debits = total credits, a fundamental double-entry bookkeeping check.' },
      { q: 'RAG status in management reporting refers to:', opts: ['Revenue, Assets, Gross margin', 'Red, Amber, Green — a traffic light performance indicator', 'Reconciliation, Accruals, GL accounts', 'Reporting, Automation, Generation'], a: 1, exp: 'RAG = Red (bad/breach), Amber (warning/watch), Green (on target). It enables rapid visual assessment of performance against targets.' },
      { q: 'An effective finance dashboard should ideally contain:', opts: ['All available data to maximise information', 'No more than 5–7 key metrics tailored to the audience', 'At least 20 KPIs to cover all areas', 'Only historical data, no targets'], a: 1, exp: 'Cognitive load research shows that humans can effectively process no more than 5–7 data points at once. Dashboards should focus on the decisions the audience needs to make.' },
      { q: 'Which report shows the daily balances across all company bank accounts?', opts: ['AR Aging Report', 'Budget vs. Actual Report', 'Cash Position Report', 'GR/IR Open Items Report'], a: 2, exp: 'The Cash Position Report (or Treasury Dashboard) shows daily bank balances across all company accounts — critical for cash management and liquidity planning.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 4 — PROCURE-TO-PAY (P2P)
  // ════════════════════════════════════════════════════
  p2p: {
    modules: [
      {
        title: 'P2P Overview & Process Governance',
        lessons: [
          {
            title: 'End-to-End Procure-to-Pay Process',
            dur: '10 min',
            html: `<h2>End-to-End Procure-to-Pay Process</h2>
<p class="mlc-lead">Procure-to-Pay (P2P) is the end-to-end business process that begins when an employee identifies a business need and ends when the vendor is paid. It spans procurement, supply chain, and finance — making it one of the most cross-functional processes in enterprise operations.</p>
${mlcSection('The P2P Process Flow', mlcOl([
  '<strong>Need Identification</strong> — Business user identifies requirement (goods/services)',
  '<strong>Purchase Requisition (PR)</strong> — Formal internal request, approved per authority matrix',
  '<strong>Vendor Sourcing / RFQ</strong> — Request for Quotation sent to approved vendors (for new/high-value purchases)',
  '<strong>Purchase Order (PO)</strong> — Legal commitment to buy; authorised by procurement manager',
  '<strong>Goods/Services Receipt (GRN)</strong> — Warehouse/user confirms receipt and quality',
  '<strong>Invoice Verification</strong> — AP verifies invoice against PO and GRN (three-way match)',
  '<strong>Payment Processing</strong> — Approved invoices processed in payment run; bank transfer executed'
]))}
${mlcSection('P2P Stakeholders & Governance', mlcUl([
  '<strong>Requisitioner</strong> — Business user who identifies the need',
  '<strong>Budget Holder</strong> — Manager who approves the requisition against budget',
  '<strong>Procurement Team</strong> — Manages vendor selection, PO creation, and supplier relationships',
  '<strong>Warehouse / Receiving</strong> — Verifies and documents goods receipt',
  '<strong>Accounts Payable</strong> — Processes invoices, manages vendor payments',
  '<strong>Finance Controller</strong> — Sets policy, approves exceptions, manages audit requirements'
]))}
${mlcTakeaway('P2P maturity determines how much of your spend is controlled, visible, and optimised. Organisations with immature P2P processes experience rogue spending, inflated costs, and AP backlogs. Structured P2P enables cost savings, compliance, and vendor relationship management.')}
${mlcFlow(['Business need identified', 'Purchase Requisition (PR) created', 'PR approved by budget owner', 'RFQ sent to vendors (if required)', 'Vendor selected, PO raised & sent', 'Vendor confirms & delivers', 'GRN raised in system', 'Vendor invoice received & logged', 'Three-way match (PO + GRN + Invoice)', 'Invoice approved & posted to AP', 'Payment run executed', 'Vendor paid & AP cleared'])}`
          }
        ]
      },
      {
        title: 'Purchase Requisition & Vendor Selection',
        lessons: [
          {
            title: 'PR Process & PO Types',
            dur: '9 min',
            html: `<h2>Purchase Requisition & PO Types</h2>
<p class="mlc-lead">The purchase requisition (PR) is the internal trigger for all procurement activity. A properly approved PR is the evidence that spending was planned, budgeted, and authorised before any commitment was made to a vendor.</p>
${mlcSection('Purchase Requisition Workflow', mlcOl([
  'Business user creates PR in ERP specifying: item, quantity, required date, cost centre, GL account',
  'System checks budget availability — blocks if over budget (unless exception approved)',
  'PR routes to line manager and budget holder for approval (based on value thresholds)',
  'Approved PR is sent to procurement team for vendor selection and PO creation',
  'Rejected PRs are returned to the requestor with reason — they cannot be paid without a valid PR'
]))}
${mlcSection('Purchase Order Types', mlcUl([
  '<strong>Standard PO</strong> — One-time purchase of specified goods/services at a fixed price',
  '<strong>Blanket/Framework PO</strong> — Pre-agreed pricing and terms with a vendor for multiple deliveries over a period (e.g., annual IT support contract)',
  '<strong>Contract PO</strong> — References a pre-negotiated contract; individual call-offs made against it',
  '<strong>Service PO</strong> — For intangible services; confirmed by service entry sheet rather than physical GRN'
]))}
${mlcExample('SAP Context', 'In SAP, a Purchase Requisition is created using ME51N, approved in ME54N, and converted to a PO via ME59N (automatic) or ME21N (manual). Blanket POs are created as Outline Agreements (ME31K for contracts, ME31L for scheduling agreements).')}
${mlcTakeaway('The PR is not administrative overhead — it is your primary budgetary control. No PR = no PO = no legitimate invoice = no payment. This chain is what makes P2P a genuine control framework rather than just a purchasing process.')}`
          }
        ]
      },
      {
        title: 'Goods Receipt & GR/IR Account',
        lessons: [
          {
            title: 'GRN Process & the GR/IR Clearing Account',
            dur: '11 min',
            html: `<h2>GRN Process & the GR/IR Clearing Account</h2>
<p class="mlc-lead">The Goods Receipt Note (GRN) is the documentary evidence that ordered goods were physically received in acceptable condition. It is the second leg of the three-way match and triggers the accounting entry that creates the liability to the vendor.</p>
${mlcSection('GRN Process Steps', mlcOl([
  'Vendor delivers goods with delivery challan/packing slip',
  'Receiving team checks: quantity correct? goods in good condition? matches PO description?',
  'GRN is posted in ERP referencing the PO',
  'Inventory/asset account is debited; GR/IR clearing account is credited',
  'Any shortages or damaged goods are noted — partial GRN posted for accepted quantity only',
  'Returns to vendor processed via Return PO or reversal of GRN'
]))}
${mlcSection('GR/IR Account — How It Works', mlcUl([
  'GR/IR is a <strong>temporary clearing account</strong> in SAP that bridges goods receipt and invoice receipt',
  '<strong>On GRN posting</strong>: Dr Inventory/Expense ₹X | Cr GR/IR ₹X (liability created)',
  '<strong>On Invoice Verification (MIRO)</strong>: Dr GR/IR ₹X | Cr Vendor AP ₹X (GR/IR cleared)',
  'GR/IR should net to <strong>zero</strong> when all receipts have matching invoices',
  'Open GR/IR items represent timing differences — investigate and clear monthly (SAP: MR11)'
]))}
${mlcExample('Practical Scenario', 'Porter orders 100 laptops at ₹50,000 each (PO = ₹50,00,000). 80 arrive on 28th: GRN posted for 80 units. Dr Inventory ₹40,00,000 | Cr GR/IR ₹40,00,000. Invoice arrives for 80 units: Dr GR/IR ₹40,00,000 | Cr AP ₹40,00,000. GR/IR = zero. 20 units arrive next month and the cycle repeats.')}
${mlcTakeaway('Never post a GRN unless you have physically verified the goods. A GRN creates an accounting liability. An incorrect GRN means you are booking a cost and creating a payment obligation for goods you may not have received — a serious financial misstatement.')}
${mlcDiagram('GR/IR Account — How Entries Flow', '<div style="display:flex;gap:10px;flex-wrap:wrap;"><div style="flex:1;min-width:160px;padding:14px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:8px"><div style="font-size:11px;font-weight:700;color:#60a5fa;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Step 1 — Goods Receipt (GRN)</div><div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.9">Dr Inventory / Expense ↑<br><span style="color:rgba(255,255,255,.3)">Asset increases</span><br>Cr GR/IR Account ↑<br><span style="color:rgba(255,255,255,.3)">Pending invoice liability</span></div></div><div style="flex:1;min-width:160px;padding:14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px"><div style="font-size:11px;font-weight:700;color:#22c55e;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Step 2 — Invoice Posting</div><div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.9">Dr GR/IR Account ↓<br><span style="color:rgba(255,255,255,.3)">Clearing the pending</span><br>Cr Accounts Payable ↑<br><span style="color:rgba(255,255,255,.3)">Real vendor liability created</span></div></div><div style="flex:1;min-width:160px;padding:14px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.3);border-radius:8px"><div style="font-size:11px;font-weight:700;color:#c9a227;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Result</div><div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.9">GR/IR nets to zero ✓<br><span style="color:rgba(255,255,255,.3)">Both entries cancel out</span><br>Residual = missing invoice<br><span style="color:rgba(255,255,255,.3)">Needs investigation</span></div></div></div>')}`
          }
        ]
      },
      {
        title: 'Invoice Processing & Three-Way Match',
        lessons: [
          {
            title: 'Invoice Verification & Exception Handling',
            dur: '10 min',
            html: `<h2>Invoice Verification & Exception Handling</h2>
<p class="mlc-lead">Invoice verification is where the P2P process converts from a supply chain event to a financial liability. It is where three-way matching is performed and where most P2P exceptions surface.</p>
${mlcSection('Invoice Verification Steps (SAP MIRO)', mlcOl([
  'Vendor invoice received (physical, email, or e-invoice portal)',
  'AP team enters invoice in ERP referencing the PO number',
  'System automatically performs three-way match: PO price × GRN quantity = Invoice amount',
  'Tax check: GST/VAT amounts validated against applicable rates',
  'Duplicate check: same vendor + same amount + same date is flagged',
  'If all checks pass: invoice is posted, vendor AP account credited',
  'If any check fails: invoice is <strong>blocked</strong>'
]))}
${mlcSection('Common Invoice Exceptions & Resolutions', mlcUl([
  '<strong>Price Variance</strong> — Invoice price ≠ PO price. Resolution: vendor credit note, price change PO amendment, or management approval for variance',
  '<strong>Quantity Variance</strong> — Invoice quantity > GRN quantity. Resolution: await remaining GRN, return goods, or reject excess on invoice',
  '<strong>Duplicate Invoice</strong> — Same invoice already posted. Resolution: reject the duplicate; never post twice',
  '<strong>Missing PO Reference</strong> — Invoice received without a PO number. Resolution: request vendor to provide PO; if no PO exists, raise retrospective PO with proper approval',
  '<strong>Tax Mismatch</strong> — Incorrect GST rate applied. Resolution: request revised invoice from vendor'
]))}
${mlcTakeaway('Every exception in invoice verification represents either a procurement failure (PO not raised correctly), a receiving failure (GRN not posted), or a vendor failure (invoice in error). Root cause analysis of exceptions drives process improvement and reduces AP workload.')}`
          }
        ]
      },
      {
        title: 'Payments, Compliance & P2P KPIs',
        lessons: [
          {
            title: 'Payment Processing & P2P Performance Metrics',
            dur: '12 min',
            html: `<h2>Payment Processing & P2P Performance Metrics</h2>
<p class="mlc-lead">The payment run is the final step in P2P. Properly executed, it ensures vendors are paid correctly, on time, and with full audit trail. P2P KPIs measure how effectively the entire procure-to-pay cycle is functioning.</p>
${mlcSection('Payment Run Best Practices', mlcOl([
  'Payment proposal generated by AP: lists all invoices due within the payment date range',
  'AP Manager reviews proposal — checks for unusual amounts, new vendors, high values',
  'Payment authorised per authority matrix (dual signature for payments above threshold)',
  'Bank file transmitted; payment confirmations received and matched to ERP postings',
  'Vendor remittance advice sent automatically via email where possible',
  'Payment journal archived with all supporting documents for audit'
]))}
${mlcSection('ACARP/IFOL CP2P Framework — P2P Compliance Areas', mlcUl([
  '<strong>Spend Under Management</strong> — % of total spend flowing through the P2P process with a PO',
  '<strong>Preferred Vendor Compliance</strong> — % of spend with approved/contracted vendors',
  '<strong>Early Payment Discount Capture</strong> — % of available early payment discounts actually taken',
  '<strong>Maverick Spend</strong> — Spend outside P2P process; target zero'
]))}
${mlcSection('Key P2P KPIs', mlcUl([
  '<strong>PO Coverage Rate</strong> — % of invoices with a matching PO; target > 95%',
  '<strong>Invoice Processing Time</strong> — Days from invoice receipt to posting; target < 3 days',
  '<strong>First-Time Match Rate</strong> — % of invoices that pass three-way match first time; target > 90%',
  '<strong>DPO</strong> — Days Payable Outstanding; optimise without damaging vendor relationships',
  '<strong>Duplicate Payment Rate</strong> — Should be zero; any duplicate is a control failure'
]))}
${mlcTakeaway('P2P process maturity is measured by how much spend flows through a controlled, visible, and optimised channel. Move from reactive exception management to proactive process design — the best P2P teams prevent exceptions from occurring in the first place.')}
${mlcStatGrid([{n:'DPO',l:'Days Payable Outstanding',note:'(AP ÷ COGS) × Days'},{n:'98%+',l:'3-way match auto rate',note:'Best-in-class automation'},{n:'<1%',l:'Duplicate payment rate',note:'Key fraud & error control metric'},{n:'2/10 n/30',l:'Early payment discount',note:'~36% annualised return on capital'}])}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'The first step in the Procure-to-Pay process is:', opts: ['Raising a Purchase Order', 'Creating a Purchase Requisition', 'Posting a Goods Receipt', 'Processing a vendor invoice'], a: 1, exp: 'P2P begins with the identification of a business need, formalised as a Purchase Requisition (PR) which requires internal budget approval.' },
      { q: 'Three-way matching in P2P involves:', opts: ['PR, PO, and Payment', 'PO, GRN, and Vendor Invoice', 'Budget, PO, and Bank Statement', 'Invoice, Credit Note, and Debit Note'], a: 1, exp: 'Three-way matching checks: (1) Purchase Order, (2) Goods Receipt Note (GRN), and (3) Vendor Invoice. This is the core AP/P2P internal control.' },
      { q: 'What does GR/IR stand for in SAP?', opts: ['General Register / Internal Reporting', 'Goods Receipt / Invoice Receipt', 'Gross Revenue / Invoice Rate', 'General Reconciliation / Invoice Review'], a: 1, exp: 'GR/IR = Goods Receipt / Invoice Receipt. It is a clearing account that reconciles what has been received against what has been invoiced, and should net to zero.' },
      { q: 'A Purchase Requisition (PR) is blocked when:', opts: ['The vendor raises the invoice', 'There is insufficient budget in the cost centre', 'The GRN is posted', 'The payment run is executed'], a: 1, exp: 'PRs are blocked by the system when the requested spend would breach the available budget for the cost centre, ensuring budgetary control.' },
      { q: 'An invoice in SAP is "blocked" (MRBR) when:', opts: ['The payment run has been submitted', 'It fails three-way matching (price or quantity variance)', 'The vendor account has a credit balance', 'The GRN has not been posted within 24 hours'], a: 1, exp: 'A blocked invoice cannot proceed to payment until the matching discrepancy is investigated and resolved by an authorised approver.' },
      { q: 'Maverick spend in P2P refers to:', opts: ['Spend approved by the CFO directly', 'High-value capital expenditure', 'Spend outside the approved P2P process (no PO, unauthorised vendor)', 'Spend on raw materials only'], a: 2, exp: 'Maverick spend is any procurement that bypasses the P2P process — typically involving unapproved vendors, no PO, or retrospective approvals. It represents a compliance and financial risk.' },
      { q: 'Which PO type is used for recurring purchases from a single vendor over a defined period (e.g., annual IT support)?', opts: ['Standard PO', 'Emergency PO', 'Blanket/Framework PO', 'Spot PO'], a: 2, exp: 'A Blanket/Framework PO (SAP: Outline Agreement) establishes pre-agreed pricing and terms for multiple deliveries over a period, reducing the need to raise individual POs each time.' },
      { q: 'On posting a Goods Receipt (GRN) in SAP for ₹10,00,000 of inventory, the accounting entry is:', opts: ['Dr Vendor AP | Cr Inventory', 'Dr Inventory | Cr GR/IR Account', 'Dr GR/IR | Cr Inventory', 'Dr Expense | Cr Cash'], a: 1, exp: 'GRN posting: Dr Inventory/Expense ₹X | Cr GR/IR ₹X. The GR/IR account is a temporary liability. When the matching invoice is received, GR/IR is debited and Vendor AP is credited.' },
      { q: 'First-Time Match Rate (FTMR) in P2P measures:', opts: ['% of POs raised with a valid budget code', '% of invoices that pass three-way match without any exception handling', '% of vendors paid within payment terms', '% of GRNs posted on the day of delivery'], a: 1, exp: 'FTMR measures the % of invoices that pass three-way match the first time, without manual intervention. A high FTMR indicates strong PO and GRN data quality.' },
      { q: 'Under 2/10 NET 30 payment terms, when must payment be made to claim the 2% discount?', opts: ['Within 30 days of invoice date', 'Within 10 days of invoice date', 'Within 2 days of invoice date', 'Within 20 days of invoice date'], a: 1, exp: '2/10 NET 30 means: pay within 10 days to get a 2% discount; full payment due within 30 days otherwise. The annualised cost of not taking the discount is ~36%.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 5 — ORDER-TO-CASH (O2C)
  // ════════════════════════════════════════════════════
  o2c: {
    modules: [
      {
        title: 'O2C Process Overview',
        lessons: [
          {
            title: 'End-to-End Order-to-Cash Process',
            dur: '10 min',
            html: `<h2>End-to-End Order-to-Cash Process</h2>
<p class="mlc-lead">Order-to-Cash (O2C) is the complete business cycle from the moment a customer places an order to the moment cash is collected and applied in your books. It is a cross-functional process spanning Sales, Operations/Fulfilment, Finance, and Customer Service.</p>
${mlcSection('The O2C Process Flow', mlcOl([
  '<strong>Customer Order Received</strong> — Sales order created in ERP (SAP SD, Oracle Order Management)',
  '<strong>Credit Check</strong> — Automatic check against customer credit limit before order processing',
  '<strong>Order Confirmation</strong> — Customer receives order acknowledgement with delivery date',
  '<strong>Fulfilment / Picking</strong> — Warehouse picks, packs, and ships the order',
  '<strong>Delivery & POD</strong> — Goods delivered; Proof of Delivery (POD) obtained from customer',
  '<strong>Billing / Invoicing</strong> — Invoice created based on delivery; sent to customer',
  '<strong>Cash Collection</strong> — AR team manages payment follow-up per payment terms',
  '<strong>Cash Application</strong> — Incoming payment matched to invoice; AR cleared'
]))}
${mlcSection('O2C Stakeholders', mlcUl([
  '<strong>Sales Team</strong> — Manages customer relationships, order entry, pricing',
  '<strong>Order Management / Customer Service</strong> — Order processing, exception handling, escalations',
  '<strong>Warehouse / Operations</strong> — Picking, packing, shipping, GRN for returns',
  '<strong>Accounts Receivable (Finance)</strong> — Invoicing, collections, cash application, dispute resolution',
  '<strong>Credit & Risk</strong> — Customer credit assessment, credit limit management'
]))}
${mlcTakeaway('O2C is where your company\'s revenue promise to a customer becomes actual cash in the bank. Every step between order and cash represents time, cost, and risk. Optimising O2C is directly equivalent to improving revenue quality and working capital.')}
${mlcFlow(['Customer sends purchase order', 'Sales order created in ERP', 'Credit check performed & passed', 'Order confirmed to customer', 'Goods picked, packed & shipped', 'Customer invoice raised', 'Invoice delivered to customer', 'Payment received in bank', 'Remittance matched to invoice', 'Cash applied — AR reduced', 'AR cleared, revenue recognised'])}`
          }
        ]
      },
      {
        title: 'Order Management & Credit Check',
        lessons: [
          {
            title: 'Sales Order Processing & Credit Management',
            dur: '10 min',
            html: `<h2>Sales Order Processing & Credit Management</h2>
<p class="mlc-lead">The sales order is the contract between your organisation and the customer. Credit management at the point of order creation prevents bad debt by catching over-credit exposure before goods leave the warehouse.</p>
${mlcSection('Sales Order Key Fields', mlcUl([
  '<strong>Customer</strong> — Sold-to party; linked to customer master with payment terms and credit limit',
  '<strong>Pricing</strong> — Product/service price per agreed price list or negotiated contract',
  '<strong>Payment Terms</strong> — Inherited from customer master (e.g., NET 30, 2/10 NET 30)',
  '<strong>Delivery Date</strong> — Requested by customer; confirmed by warehouse availability',
  '<strong>Incoterms</strong> — Who bears risk and cost of delivery (FOB, CIF, DDP, etc.)'
]))}
${mlcSection('Automatic Credit Check at Order', mlcOl([
  'System checks: Total open AR + This order value vs. Customer credit limit',
  'If within limit: order proceeds automatically',
  'If limit would be breached: order is <strong>blocked</strong> for credit review',
  'Credit Manager reviews: recent payment history, current overdue amounts, business context',
  'Decision: Release (with or without revised terms), reduce order, or reject',
  'Credit limit changes require Finance Controller approval above defined thresholds'
]))}
${mlcExample('SAP Context', 'In SAP SD, sales order credit blocks are released via transaction VKM3 (credit management worklist). The credit exposure view (FD32) shows total open orders, open deliveries, open billing, and open AR for each customer — enabling real-time credit risk assessment.')}
${mlcTakeaway('Credit management at order creation is your first and cheapest line of defence against bad debt. It costs nothing to block an order — and prevents the far greater cost of delivering goods to a customer who cannot or will not pay.')}`
          }
        ]
      },
      {
        title: 'Fulfilment, Delivery & Billing',
        lessons: [
          {
            title: 'Delivery Process & Invoice Creation',
            dur: '10 min',
            html: `<h2>Delivery Process & Invoice Creation</h2>
<p class="mlc-lead">Delivery execution converts the sales order into a physical movement of goods. The billing document (customer invoice) can only be created after delivery is confirmed — this is the revenue recognition event in most businesses.</p>
${mlcSection('Delivery & Shipping Steps', mlcOl([
  '<strong>Delivery Creation</strong> — System creates delivery document based on confirmed sales order',
  '<strong>Pick, Pack & Ship</strong> — Warehouse team picks items, packs, and hands to carrier',
  '<strong>Goods Issue (GI)</strong> — ERP posting that reduces inventory and moves the risk to the customer',
  '<strong>Proof of Delivery (POD)</strong> — Customer or driver confirms receipt; triggers billing eligibility',
  '<strong>Returns Processing</strong> — Customer return creates a Return Order; goods receipt in reverse; credit memo may follow'
]))}
${mlcSection('Billing Document & Invoice Types', mlcUl([
  '<strong>Commercial Invoice</strong> — Standard customer invoice for goods/services delivered',
  '<strong>Pro-Forma Invoice</strong> — Preliminary invoice for customs/customs bond purposes; not a payment demand',
  '<strong>Credit Memo</strong> — Issued to reduce a prior invoice (return, pricing error, discount)',
  '<strong>Debit Memo</strong> — Issued to increase a prior invoice (undercharge, additional service)',
  '<strong>Subscription/Recurring Invoice</strong> — Automatically generated at each billing cycle for ongoing services'
]))}
${mlcSection('Revenue Recognition (IFRS 15 / IND AS 115)', mlcUl([
  'Revenue is recognised when (or as) the performance obligation is satisfied',
  'For goods: when control transfers to the customer — typically on delivery / POD',
  'For services: over the service period (if continuous) or on completion (if milestone-based)',
  'Deferred revenue: cash received before service delivered — sits as a liability until performance obligation is met'
]))}
${mlcTakeaway('Never invoice before delivery — it is a misstatement of revenue recognition. The billing document in O2C should always be triggered by confirmation that the customer has received and accepted the goods or services.')}`
          }
        ]
      },
      {
        title: 'Cash Collection & Dispute Management',
        lessons: [
          {
            title: 'Collections Process & Customer Deductions',
            dur: '11 min',
            html: `<h2>Collections Process & Customer Deductions</h2>
<p class="mlc-lead">Collections is the active management of overdue customer invoices. Customer deductions — where customers short-pay with a stated reason — are one of the most complex challenges in O2C, requiring cross-functional collaboration to resolve.</p>
${mlcSection('Collections Best Practices', mlcOl([
  'Segment customers by value and risk — apply different collection intensity based on segment',
  'Begin collections at Day 1 overdue — a call on Day 2 prevents a problem at Day 60',
  'Document every contact in CRM or ERP — date, who, what was said, agreed action',
  'Escalate systematically: AR Analyst → AR Manager → Account Manager → CFO (for large accounts)',
  'Offer payment plans where appropriate — partial collection beats write-off',
  'Disconnect new order fulfilment from outstanding overdue balances (credit hold)'
]))}
${mlcSection('Customer Deductions — Types & Resolution', mlcUl([
  '<strong>Valid Deductions</strong> — Credit notes already issued, early payment discounts taken correctly, contractual rebates',
  '<strong>Disputable Deductions</strong> — Pricing disputes, quality claims, delivery shortages; require investigation',
  '<strong>Invalid Deductions</strong> — Customer error; must be recovered',
  '<strong>Deduction Resolution</strong> — Finance + Sales + Operations must collaborate; unresolved deductions convert to bad debt'
]))}
${mlcExample('Key O2C Metric', 'Days Deductions Outstanding (DDO) measures the average number of days it takes to resolve a customer deduction from when it is raised. Best-in-class DDO is < 30 days. A DDO of 90+ days indicates a broken deductions management process and almost certainly means write-offs are being recognised that should be recovered.')}
${mlcTakeaway('Collections is a team sport. AR cannot resolve deductions alone — they need pricing from Sales, quality confirmation from Operations, and credit note authority from Finance. Cross-functional ownership of deduction resolution is the only thing that reduces write-off rates.')}`
          }
        ]
      },
      {
        title: 'Cash Application & O2C KPIs',
        lessons: [
          {
            title: 'Cash Application & O2C Performance Metrics',
            dur: '12 min',
            html: `<h2>Cash Application & O2C Performance Metrics</h2>
<p class="mlc-lead">Cash application is the final step of O2C — matching received cash to open invoices. Errors here create "phantom AR" and mislead every downstream report. O2C KPIs measure the end-to-end efficiency of the cycle.</p>
${mlcSection('Cash Application Challenges & Solutions', mlcUl([
  '<strong>Unapplied Cash</strong> — Payment received but not matched to an invoice; inflates apparent AR',
  '<strong>Over-application</strong> — More cash applied than invoice value; creates debit balance on customer account',
  '<strong>Remittance Gaps</strong> — Customer pays without specifying which invoice; requires manual matching',
  '<strong>Virtual Account Solution</strong> — Assign unique virtual account per customer; enables straight-through processing (STP)',
  '<strong>AI-Powered Matching</strong> — Machine learning matches payments to invoices using historical patterns'
]))}
${mlcSection('Key O2C KPIs', mlcUl([
  '<strong>DSO</strong> — Days Sales Outstanding; the headline O2C metric',
  '<strong>CEI</strong> — Collection Effectiveness Index: (Beginning AR + Credit Sales − Ending AR) ÷ (Beginning AR + Credit Sales − Ending Current AR) × 100',
  '<strong>% AR Current</strong> — Proportion of total AR within payment terms; higher is better',
  '<strong>Bad Debt %</strong> — Write-offs as % of credit sales; benchmark: < 0.5% for B2B',
  '<strong>Order-to-Invoice Cycle Time</strong> — Days from order to invoice creation; reduction directly reduces DSO',
  '<strong>Cash Application Rate</strong> — % of cash automatically applied vs. manual; best-in-class > 85%'
]))}
${mlcTakeaway('The fastest way to reduce DSO is to invoice sooner. Every day between delivery and invoicing is a day added to your DSO before the clock even starts on payment terms. Automate invoice creation to trigger immediately upon confirmed delivery.')}
${mlcFlow(['Bank statement downloaded', 'Remittance advice matched to payment', 'Payment identified to customer account', 'Open invoices identified for this payment', 'Cash applied — AR balance reduced', 'Unapplied cash investigated separately', 'Deductions and short-pays resolved'])}
${mlcStatGrid([{n:'DSO',l:'Days Sales Outstanding',note:'Collect faster = better'},{n:'95%+',l:'Auto cash application rate',note:'% matched without manual work'},{n:'<2%',l:'Unapplied cash as % of AR',note:'Lower = cleaner books'},{n:'<5%',l:'Disputed invoice rate',note:'Disputes delay cash collection'}])}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'The Order-to-Cash process begins with:', opts: ['Posting the customer invoice', 'Customer placing a sales order', 'Bank payment received', 'Credit limit approval'], a: 1, exp: 'O2C starts when a customer places an order. The cycle ends when cash is collected and applied to clear the AR.' },
      { q: 'A credit check in O2C is performed:', opts: ['After the invoice is raised', 'At the time of sales order creation, before processing', 'Only for new customers', 'During the cash application step'], a: 1, exp: 'Credit checks are performed at order creation. If the order would breach the customer\'s credit limit, it is blocked for credit manager review before any commitment is made.' },
      { q: 'Under IFRS 15 / IND AS 115, revenue from goods is recognised when:', opts: ['Cash is received from the customer', 'The sales order is created', 'Control of the goods transfers to the customer (typically on delivery)', 'The invoice is raised'], a: 2, exp: 'IFRS 15 requires revenue to be recognised when the performance obligation is satisfied — for goods, this is when control transfers (delivery/POD).' },
      { q: 'Proof of Delivery (POD) in O2C is significant because:', opts: ['It triggers the credit check', 'It confirms receipt by the customer and enables billing', 'It replaces the purchase order', 'It is required for all internal transfers'], a: 1, exp: 'POD confirms the customer has received the goods, satisfying the revenue recognition criterion and enabling the billing document/invoice to be raised.' },
      { q: 'DSO (Days Sales Outstanding) is best described as:', opts: ['The number of days to process an invoice', 'The average number of days to collect payment after a sale is made', 'The number of days inventory is held before sale', 'The average payment terms offered to customers'], a: 1, exp: 'DSO = (AR ÷ Credit Revenue) × Days. It measures how long it takes to collect cash after revenue is recognised. Lower DSO = faster collection.' },
      { q: 'A customer deduction in O2C occurs when:', opts: ['A customer returns all goods', 'A customer pays less than the invoiced amount and provides a reason code', 'A customer requests a credit limit increase', 'A customer places an order exceeding their credit limit'], a: 1, exp: 'A deduction (short payment) requires investigation to determine if it is valid (e.g., agreed credit note) or invalid (customer error requiring recovery).' },
      { q: 'Unapplied cash in accounts receivable refers to:', opts: ['Invoices that have not been paid', 'Cash received from customers that has not been matched to a specific invoice', 'Disputed invoices pending resolution', 'Advance payments to vendors'], a: 1, exp: 'Unapplied cash is a payment in your bank that has not been allocated to an invoice. It overstates AR and understates actual cash collected.' },
      { q: 'The Collection Effectiveness Index (CEI) measures:', opts: ['The number of collection calls made per week', 'How effectively the AR team collected receivables that were collectible in the period', 'The total value of AR written off', 'The number of customers contacted for payment'], a: 1, exp: 'CEI measures the % of collectible AR actually collected in a period. Unlike DSO, CEI adjusts for the mix of current vs. overdue AR, giving a purer collections performance view.' },
      { q: 'What is the impact of a 10-day reduction in Order-to-Invoice cycle time on DSO?', opts: ['No impact — DSO only measures collection time', 'DSO reduces by up to 10 days because the billing clock starts sooner', 'DSO increases by 10 days', 'It affects DPO but not DSO'], a: 1, exp: 'DSO includes all time from sale to cash — including the time between delivery and invoice. Raising invoices 10 days sooner directly reduces the pre-collection portion of DSO.' },
      { q: 'Deferred Revenue on the balance sheet represents:', opts: ['Revenue that has been earned but not yet invoiced', 'Cash received from customers for services not yet delivered', 'AR that is more than 90 days overdue', 'Revenue recognised under the percentage-of-completion method'], a: 1, exp: 'Deferred (unearned) revenue is a current liability — cash has been received but the performance obligation has not yet been satisfied. It is recognised as revenue when the service is delivered.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 6 — RECORD-TO-REPORT (R2R)
  // ════════════════════════════════════════════════════
  r2r: {
    modules: [
      {
        title: 'R2R Overview & Financial Close',
        lessons: [
          {
            title: 'End-to-End Record-to-Report Process',
            dur: '10 min',
            html: `<h2>End-to-End Record-to-Report Process</h2>
<p class="mlc-lead">Record-to-Report (R2R) is the end-to-end financial accounting process: from recording every business transaction as a journal entry to producing the financial reports that management and external stakeholders rely on. It is the backbone of financial integrity in any organisation.</p>
${mlcSection('The R2R Process Flow', mlcOl([
  '<strong>Record</strong> — All business transactions entered as journal entries in the ERP',
  '<strong>Process</strong> — Subledger postings (AP, AR, Inventory, Assets) flow to the General Ledger',
  '<strong>Reconcile</strong> — Bank reconciliation, subledger-to-GL, intercompany balancing',
  '<strong>Adjust</strong> — Period-end adjustments: accruals, deferrals, depreciation, provisions',
  '<strong>Close</strong> — Period is locked; no further postings permitted without approval',
  '<strong>Report</strong> — Trial balance, P&L, Balance Sheet, Cash Flow Statement produced and reviewed',
  '<strong>Consolidate</strong> — Group entities\' financials combined for consolidated reporting'
]))}
${mlcSection('Financial Close Types', mlcUl([
  '<strong>Soft Close</strong> — Preliminary close with estimates; figures may be adjusted; used for early management reporting',
  '<strong>Hard Close</strong> — Final, audited close; period is fully locked; used for statutory and external reporting',
  '<strong>Fast Close</strong> — Target to deliver financial statements in 3–5 working days after month-end (best practice)',
  '<strong>Virtual Close</strong> — Real-time reporting enabled by continuous accounting and automation'
]))}
${mlcTakeaway('R2R is the financial nervous system of an organisation. Every operational process (P2P, O2C, HR payroll) eventually feeds into R2R. The quality of your financial statements is entirely determined by the quality of your R2R process.')}
${mlcFlow(['Record all business transactions as JEs', 'Post accruals and prepayments', 'Reconcile subledgers to GL control accounts', 'Perform bank reconciliation', 'Clear intercompany balances', 'Post period-end adjustments (depreciation, provisions)', 'Lock the period in ERP', 'Generate trial balance', 'Produce P&L, Balance Sheet, Cash Flow', 'Management sign-off and publish'])}`
          }
        ]
      },
      {
        title: 'Journal Entries & Subledger Accounting',
        lessons: [
          {
            title: 'Journal Entries, Subledgers & GL Reconciliation',
            dur: '11 min',
            html: `<h2>Journal Entries, Subledgers & GL Reconciliation</h2>
<p class="mlc-lead">Every financial event in a business is captured as a journal entry — a debit and credit pair that records the economic substance of the transaction. Subledgers provide the detail behind each control account in the general ledger.</p>
${mlcSection('Journal Entry Types', mlcUl([
  '<strong>System-Generated (Automatic)</strong> — Posted automatically by ERP on business events: invoice posting, payment, GRN, depreciation run',
  '<strong>Manual Journal Entries (MJE)</strong> — Posted by accountants for adjustments, accruals, corrections, and allocations',
  '<strong>Recurring Journals</strong> — Automatically posted on a schedule (monthly rent, insurance)',
  '<strong>Reversing Journals</strong> — Automatically reversed in the next period (accruals that become actual invoices)'
]))}
${mlcSection('Subledger-to-GL Reconciliation', mlcUl([
  '<strong>AR Subledger</strong> → AR Control Account in GL — must match to the cent',
  '<strong>AP Subledger</strong> → AP Control Account in GL — must match to the cent',
  '<strong>Inventory Subledger</strong> → Inventory Control Account in GL',
  '<strong>Fixed Asset Register</strong> → Asset accounts in GL',
  'Differences between subledger and GL = posting errors or missing transactions — investigate immediately'
]))}
${mlcSection('MJE Controls', mlcUl([
  'Every manual journal must have supporting documentation attached',
  'All MJEs above a threshold require a second person to review and approve (4-eyes principle)',
  'Post-closing MJEs into a locked period require Controller-level approval',
  'All MJEs are logged with preparer, approver, date, and business justification'
]))}
${mlcTakeaway('Subledger-to-GL reconciliation is the most critical monthly check in R2R. A penny difference means either a posting error or a missing transaction. Do not close the period until every subledger ties to its control account.')}`
          }
        ]
      },
      {
        title: 'Bank Reconciliation & Account Reconciliation',
        lessons: [
          {
            title: 'Bank Reconciliation Process',
            dur: '10 min',
            html: `<h2>Bank Reconciliation Process</h2>
<p class="mlc-lead">Bank reconciliation is the comparison of the company\'s cash book (ERP bank account) with the bank statement, to identify and explain differences. It is one of the most fundamental controls in financial accounting and should be performed daily for high-volume accounts.</p>
${mlcSection('Why Differences Occur', mlcUl([
  '<strong>Timing Differences</strong> — Cheques issued but not yet cleared at the bank (outstanding cheques)',
  '<strong>Deposits in Transit</strong> — Cash posted in the ERP but not yet credited by the bank',
  '<strong>Bank Charges</strong> — Charged by the bank but not yet recorded in the ERP',
  '<strong>Interest Income</strong> — Credited by the bank but not yet posted in the ERP',
  '<strong>Errors</strong> — Bank error (transposition of amount) or ERP entry error — both require correction'
]))}
${mlcSection('Bank Reconciliation Steps', mlcOl([
  'Obtain bank statement for the reconciliation period',
  'Compare opening balances — should match prior reconciliation closing balance',
  'Tick off items that appear in both the bank statement and the cash book',
  'List all unticked items in both — these are the reconciling items',
  'Prepare the reconciliation: Book Balance ± Adjustments = Bank Balance',
  'Identify any unexplained differences — investigate before closing',
  'Post any ERP adjustments (bank charges, interest) as journal entries',
  'File the completed reconciliation with evidence for audit'
]))}
${mlcExample('SAP Context', 'In SAP, bank reconciliation is performed using the Electronic Bank Statement (EBS) process. The system automatically matches bank statement line items to ERP postings. Unmatched items are presented for manual review. The FF67 transaction is used for manual bank statement entry.')}
${mlcTakeaway('Bank reconciliation is a detective control — it detects errors, fraud, and timing differences after they occur. It should be performed at least monthly, and daily for main operating accounts. An unexplained reconciling item of any size must be investigated.')}
${mlcDiagram('Bank Reconciliation — Two Sides', '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;"><div style="flex:1;min-width:155px;padding:14px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:10px">ERP Cash Ledger</div><div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.8">• All payments posted in ERP<br>• All receipts recorded<br>• Bank charges not yet in ERP<br>• Outstanding cheques issued<br>• Balance as per books</div></div><div style="display:flex;align-items:center;font-size:20px;color:rgba(201,162,39,.6)">⇄</div><div style="flex:1;min-width:155px;padding:14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#22c55e;margin-bottom:10px">Bank Statement</div><div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.8">• Payments that have cleared<br>• Receipts actually credited<br>• Bank charges debited<br>• Cheques not yet presented<br>• Balance as per bank</div></div></div><div style="padding:10px 14px;background:rgba(201,162,39,.07);border:1px solid rgba(201,162,39,.2);border-radius:8px;font-size:11px;color:rgba(255,255,255,.6)"><strong style="color:#c9a227">Reconciling items:</strong> Timing differences, bank charges not yet posted, interest credited by bank but not recorded in ERP. Every item must be explained — an unexplained difference means an error.</div>')}`
          }
        ]
      },
      {
        title: 'Period-End Close Activities',
        lessons: [
          {
            title: 'Month-End Close Checklist & Intercompany Accounting',
            dur: '12 min',
            html: `<h2>Month-End Close Checklist & Intercompany Accounting</h2>
<p class="mlc-lead">The month-end close is a structured sequence of tasks that must be completed in the right order to produce accurate financial statements. Intercompany accounting — transactions between entities in the same group — must be eliminated on consolidation to avoid double-counting.</p>
${mlcSection('Standard Month-End Close Sequence', mlcOl([
  '<strong>Day 1–3</strong> — Process all operational transactions (invoices, payments, GRNs)',
  '<strong>Day 2–3</strong> — Complete bank reconciliations for all accounts',
  '<strong>Day 3–4</strong> — Post all accruals (expenses incurred but not invoiced)',
  '<strong>Day 3–4</strong> — Post all deferrals (cash received/paid for future periods)',
  '<strong>Day 4</strong> — Run depreciation and amortisation for fixed assets',
  '<strong>Day 4–5</strong> — Reconcile all subledgers to GL control accounts',
  '<strong>Day 5</strong> — Post intercompany confirmations and eliminations',
  '<strong>Day 5</strong> — Controller review of trial balance; investigate variances',
  '<strong>Day 5</strong> — Close the period in ERP; produce financial statements'
]))}
${mlcSection('Accruals & Deferrals — Key Concepts', mlcUl([
  '<strong>Accrual</strong> — Expense incurred in the period but no invoice yet received. Post: Dr Expense | Cr Accruals Liability. Reverse next period when invoice arrives.',
  '<strong>Deferred Expense / Prepayment</strong> — Cash paid this period for future benefit. Post: Dr Prepayment | Cr Cash. Release to expense over the period of benefit.',
  '<strong>Deferred Revenue</strong> — Cash received for services not yet delivered. Post: Dr Cash | Cr Deferred Revenue. Recognise as revenue when service is performed.'
]))}
${mlcSection('Intercompany Accounting', mlcUl([
  'When two entities in the same group transact, both entities record the transaction',
  'Entity A records revenue; Entity B records expense — same economic event recorded twice',
  'At consolidation, these intercompany transactions must be eliminated',
  'Intercompany balances must agree between entities at period-end — differences are reconciliation items'
]))}
${mlcTakeaway('The quality of the financial close is determined by preparation, not speed. The best finance teams complete 80% of close activities before month-end (processing invoices daily, reconciling accounts weekly) — making the final 20% a confirmation exercise rather than a scramble.')}
${mlcDiagram('Typical Month-End Close Sequence', '<div style="display:flex;flex-direction:column;gap:6px;">' + [
  ['Day 0','Cutoff — period ends, no more transaction postings accepted','#22c55e'],
  ['Day 1','Post all accruals, prepayments, and recurring journals','#22c55e'],
  ['Day 1–2','Reconcile AR subledger, AP subledger, and bank statements','#22c55e'],
  ['Day 2–3','Clear all intercompany balances; post elimination entries','#eab308'],
  ['Day 3','Post adjustments: depreciation, provisions, write-offs','#eab308'],
  ['Day 3–4','Lock subledgers; run trial balance; check for unposted items','#eab308'],
  ['Day 4–5','Review P&L and Balance Sheet; investigate key variances','#60a5fa'],
  ['Day 5','Controller sign-off; lock period in ERP system','#60a5fa'],
  ['Day 5–7','Produce and distribute management reporting pack','#60a5fa']
].map(function(s){return '<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;background:rgba(255,255,255,.03);border-radius:7px;border-left:3px solid '+s[2]+'"><div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.3);min-width:40px;flex-shrink:0">'+s[0]+'</div><div style="font-size:11px;color:rgba(255,255,255,.62)">'+s[1]+'</div></div>';}).join('') + '</div>')}`
          }
        ]
      },
      {
        title: 'Financial Reporting & IFRS vs GAAP',
        lessons: [
          {
            title: 'From Trial Balance to Financial Statements',
            dur: '12 min',
            html: `<h2>From Trial Balance to Financial Statements</h2>
<p class="mlc-lead">The trial balance is the numerical spine of financial reporting. Once the period is closed and all journal entries are posted, the trial balance is the source from which all financial statements are prepared. Understanding the key IFRS vs GAAP differences ensures reports are prepared under the correct accounting standard.</p>
${mlcSection('Trial Balance to Financial Statements', mlcOl([
  'All journal entries are posted; period is closed',
  'Trial balance is generated: a listing of all GL account balances (Dr and Cr totals must equal)',
  'Income accounts (Revenue, Expenses) flow to the <strong>P&L Statement</strong>',
  'Balance sheet accounts (Assets, Liabilities, Equity) flow to the <strong>Balance Sheet</strong>',
  'Cash account movements + non-cash adjustments produce the <strong>Cash Flow Statement</strong>',
  'The three statements are cross-referenced and reconciled before release'
]))}
${mlcSection('Key IFRS vs GAAP Differences (Enterprise Relevance)', mlcUl([
  '<strong>LIFO Inventory</strong> — Permitted under US GAAP; <strong>prohibited under IFRS</strong> (used in India, UK, EU)',
  '<strong>Provision for Bad Debt</strong> — GAAP: incurred loss model; IFRS 9: <strong>expected credit loss (ECL) model</strong> — more forward-looking',
  '<strong>Development Costs</strong> — GAAP: expense as incurred; IFRS: may be capitalised if criteria met',
  '<strong>Lease Accounting</strong> — IFRS 16: virtually all leases on balance sheet; US GAAP ASC 842: similar but some operating lease treatment differs',
  '<strong>Revenue Recognition</strong> — Both converged on IFRS 15 / ASC 606: 5-step revenue recognition model'
]))}
${mlcSection('R2R KPIs & Continuous Improvement', mlcUl([
  '<strong>Days to Close</strong> — Working days from period-end to financial statement release; best-in-class: 3–5 days',
  '<strong>% Accounts Reconciled on Time</strong> — Target: 100% by close Day 5',
  '<strong>Audit Adjustments</strong> — Number and value of adjustments required by auditors; target: zero material adjustments',
  '<strong>Journal Entry Error Rate</strong> — % of MJEs reversed or corrected post-posting; measures control quality'
]))}
${mlcTakeaway('The trial balance is the single source of truth for all financial reporting. Any unexplained balance in the trial balance — no matter how small — represents a risk to the integrity of your financial statements. Investigate every anomaly before releasing reports to leadership or external parties.')}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Record-to-Report (R2R) begins with:', opts: ['Producing the P&L Statement', 'Recording all business transactions as journal entries', 'Performing bank reconciliation', 'Submitting the external audit report'], a: 1, exp: 'R2R starts with recording — every business event is captured as a debit/credit journal entry. This flows through processing, reconciling, adjusting, closing, and ultimately reporting.' },
      { q: 'A "soft close" in R2R refers to:', opts: ['Closing only the subledgers, not the GL', 'A preliminary close with estimates, before the final hard close', 'Closing a period without performing bank reconciliation', 'A period close that does not require Controller approval'], a: 1, exp: 'A soft close produces preliminary figures (often with estimates) for early management reporting. The hard close follows with final, audited figures and full period lock.' },
      { q: 'The purpose of subledger-to-GL reconciliation is to:', opts: ['Verify that total debits = total credits in the GL', 'Ensure the AR/AP/Inventory subledger totals match the corresponding GL control accounts', 'Reconcile the ERP to the external bank statement', 'Confirm that all vendor invoices have been posted'], a: 1, exp: 'Subledger-to-GL reconciliation confirms that the detailed records (e.g., individual customer balances in AR) add up exactly to the control account in the GL. Any difference indicates a posting error.' },
      { q: 'An accrual journal entry for a ₹1,00,000 electricity bill received in the next period (but relating to this period) would be:', opts: ['Dr Cash | Cr Electricity Expense ₹1,00,000', 'Dr Electricity Expense | Cr Accruals Liability ₹1,00,000', 'Dr Accruals | Cr Revenue ₹1,00,000', 'No entry until the invoice arrives'], a: 1, exp: 'Accrual accounting requires expenses to be matched to the period they relate to. Dr Expense | Cr Accrued Liability records the obligation before the invoice arrives.' },
      { q: 'Bank reconciliation identifies differences between:', opts: ['AR subledger and the GL AR control account', 'The company\'s ERP cash account and the bank statement balance', 'The trial balance and the P&L statement', 'The AP subledger and the vendor statement'], a: 1, exp: 'Bank reconciliation compares the company\'s internal cash records (ERP cash account) with the external bank statement to identify timing differences, errors, and unrecorded items.' },
      { q: 'Under IFRS, LIFO (Last-In, First-Out) inventory valuation is:', opts: ['The preferred method', 'Required for raw materials only', 'Prohibited — not permitted under IFRS', 'Permitted only for listed companies'], a: 2, exp: 'LIFO is not permitted under IFRS (IAS 2). Under US GAAP, LIFO is allowed. In India, accounting follows IND AS which aligns with IFRS — LIFO is therefore prohibited.' },
      { q: 'Intercompany transactions must be eliminated at consolidation because:', opts: ['They are fraudulent transactions', 'They represent the same economic event recorded in two entities — consolidating them double-counts', 'They are always in foreign currencies', 'They are off-balance sheet items'], a: 1, exp: 'When Company A sells to Company B (same group), A records revenue and B records expense. Consolidated financials must eliminate both to avoid overstating revenue and expense.' },
      { q: 'Under IFRS 9, provision for bad debt (Expected Credit Loss model) differs from US GAAP in that it:', opts: ['Requires write-off of all overdue AR over 90 days', 'Is more forward-looking — providing for expected future losses, not just incurred losses', 'Only applies to trade receivables, not loans', 'Must be reviewed only once per year'], a: 1, exp: 'IFRS 9 ECL model requires entities to estimate expected losses over the life of the asset, even before a default occurs — more conservative than the US GAAP incurred loss model.' },
      { q: 'Closing entries in accounting are used to:', opts: ['Post accruals before month-end', 'Transfer balances from temporary accounts (Revenue, Expenses) to Retained Earnings', 'Reverse prior period journals', 'Lock the period in the ERP system'], a: 1, exp: 'Closing entries zero out temporary P&L accounts (Revenue, Expenses) and transfer the net profit/loss to Retained Earnings — resetting the income statement for the next period.' },
      { q: '"Days to Close" is a key R2R KPI that measures:', opts: ['Days taken to post all vendor invoices', 'Working days from period-end to release of financial statements', 'Days from audit start to audit completion', 'Days outstanding on the trial balance before reconciliation'], a: 1, exp: 'Days to Close (or Financial Close Cycle Time) measures how quickly the finance team can lock the period and produce accurate financial statements. Best-in-class is 3–5 working days after month-end.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 8 — DATA INGESTION
  // ════════════════════════════════════════════════════
  di: {
    modules: [
      // ─── MODULE 1: Foundations ───────────────────────
      {
        title: 'Data Ingestion Foundations',
        lessons: [
          {
            title: 'What is Data Ingestion in Bluecopa?',
            dur: '10 min',
            html: `<h2>What is Data Ingestion in Bluecopa?</h2>
<p class="mlc-lead">Data Ingestion is the process of collecting raw data from external sources — cloud storage, portals, SFTP servers, forms — and bringing it into Bluecopa where it can be validated, processed, and made available for reporting and automation. It is the <strong>first and most critical step</strong> in any Bluecopa implementation.</p>
${mlcSection('Why Ingestion Matters', mlcUl([
  '<strong>No data in = no output</strong> — Every report, reconciliation, and workflow depends on clean ingested data',
  '<strong>Timeliness</strong> — Late or missed ingestion cascades into delayed reconciliations and missed SLAs',
  '<strong>Auditability</strong> — Every file that enters Bluecopa must be traceable — who sent it, when, and what happened to it',
  '<strong>Scalability</strong> — The right ingestion pattern handles 10 files or 10,000 files without manual effort'
]))}
${mlcSection('The Three Questions of Ingestion', mlcOl([
  '<strong>Where is the data coming from?</strong> — Cloud storage (GCS, S3, Azure), SFTP, manual portal upload, or a form submission',
  '<strong>What format is it in?</strong> — CSV, Excel, JSON, PDF, or a compressed .zip archive',
  '<strong>How often does it arrive?</strong> — Real-time event-driven, scheduled (daily/weekly), or ad hoc manual'
]))}
${mlcDiagram('Data Ingestion — Big Picture', `
<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:center;padding:8px 0">
  <div style="background:#1e3a5f;border-radius:10px;padding:14px 20px;color:#7dd3fc;font-weight:700;font-size:13px;text-align:center">☁️<br>Cloud Storage<br><span style="font-size:11px;font-weight:400;color:#93c5fd">GCS · S3 · Azure · SFTP</span></div>
  <div style="font-size:22px;color:#475569">→</div>
  <div style="background:#1e3a5f;border-radius:10px;padding:14px 20px;color:#7dd3fc;font-weight:700;font-size:13px;text-align:center">🔗<br>Blob Connection<br><span style="font-size:11px;font-weight:400;color:#93c5fd">Secure bridge</span></div>
  <div style="font-size:22px;color:#475569">→</div>
  <div style="background:#1e3a5f;border-radius:10px;padding:14px 20px;color:#7dd3fc;font-weight:700;font-size:13px;text-align:center">⚙️<br>Workflow / Connector<br><span style="font-size:11px;font-weight:400;color:#93c5fd">Fetch · Unzip · Route</span></div>
  <div style="font-size:22px;color:#475569">→</div>
  <div style="background:#14532d;border-radius:10px;padding:14px 20px;color:#86efac;font-weight:700;font-size:13px;text-align:center">📦<br>Databox / Filebox<br><span style="font-size:11px;font-weight:400;color:#4ade80">Ready for processing</span></div>
</div>`)}
${mlcSection('Ingestion Patterns at a Glance', mlcCompare(
  '🤖 Automated', [
    'Connectors (GCS, S3, Azure, SFTP)',
    'Scheduled workflow triggers',
    'Event-driven blob arrival detection',
    'Best for recurring, structured data'
  ],
  '👤 Manual', [
    'Portal + Form + Filebox uploads',
    'Ad hoc or controlled submissions',
    'Operations team review before processing',
    'Best for exceptions and one-off files'
  ]
))}
${mlcTakeaway('Data Ingestion is not just file transfer — it is the controlled, traceable, auditable entry point for all data in Bluecopa. Choosing the right pattern up front saves weeks of rework during implementation.')}`
          },
          {
            title: 'Databox & Blob Storage — Where Data Lives',
            dur: '12 min',
            html: `<h2>Databox & Blob Storage — Where Data Lives</h2>
<p class="mlc-lead">Before you can ingest anything, you need to understand where Bluecopa stores it. Bluecopa uses two core storage concepts: <strong>Blob Storage</strong> for raw files and <strong>Databox</strong> for structured, validated datasets ready for processing.</p>
${mlcSection('What is Blob Storage?', mlcUl([
  'A Blob (Binary Large Object) is data stored as a single entity — the standard way cloud providers store unstructured data',
  'Blob storage holds raw files as-is: CSVs, ZIPs, Excel files, PDFs, logs',
  'Files in blob storage have not yet been validated or transformed — they are exactly as received',
  '<strong>Internal blob storage</strong> is Bluecopa\'s own cloud bucket used as a staging area before files reach processing components',
  'Blob connections link external client cloud buckets to Bluecopa\'s internal environment'
]))}
${mlcSection('What is the Databox?', mlcUl([
  'The Databox is Bluecopa\'s intelligent data management system — it goes beyond simple storage',
  'It <strong>validates, structures, and understands</strong> your data as it lands',
  'Raw files (CSV, Excel) are transformed into analytics-ready Datasets after passing the ingestion framework',
  'The Databox powers dashboards, reports, financial insights, and reconciliation engines',
  'Think of blob storage as the loading dock and the Databox as the warehouse shelves'
]))}
${mlcDiagram('Blob Storage vs Databox', `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
  <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155">
    <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">📦 Blob Storage</div>
    <div style="font-size:13px;color:#cbd5e1;line-height:1.7">Raw, unvalidated files<br>ZIP, CSV, Excel, PDF<br>Staging / transit area<br>File path addressable<br><span style="color:#f87171">Not yet queryable</span></div>
  </div>
  <div style="background:#0f2818;border-radius:10px;padding:16px;border:1px solid #166534">
    <div style="font-size:13px;font-weight:700;color:#86efac;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">🗄️ Databox (Dataset)</div>
    <div style="font-size:13px;color:#cbd5e1;line-height:1.7">Validated, structured data<br>Schema-enforced rows<br>Deduplicated & enriched<br>Dataset ID addressable<br><span style="color:#4ade80">Powers all analytics</span></div>
  </div>
</div>`)}
${mlcSection('What is a Dataset?', mlcUl([
  'A Dataset is the structured output created after a file passes through Bluecopa\'s ingestion framework',
  'Each Dataset has a <strong>Dataset ID</strong>, a defined schema (column names + types), and row-level records',
  'Datasets are versioned — new file uploads append or replace records depending on configuration',
  'Once in a Dataset, data can be used in: Reconciliation engines, MIS reports, dashboards, email automations'
]))}
${mlcSection('How Files Become Datasets — The Journey', mlcFlow([
  'File arrives in Blob Storage (raw)',
  'Connector or Workflow triggers ingestion',
  'File validated against Dataset schema',
  'Rows parsed, deduplicated, enriched',
  'Dataset updated — records available',
  'Downstream: Reports, Recon, Emails fire'
]))}
${mlcStatGrid([
  {n:'4 GB', l:'Max gzip file size', note:'For connector-based ingestion'},
  {n:'∞', l:'ZIP files via workflow', note:'No size limit when using workflow unzip pattern'},
  {n:'<60s', l:'Typical ingestion time', note:'For standard CSV files up to 100MB'},
  {n:'1', l:'Dataset per source', note:'One connector = one dataset target'}
])}
${mlcTakeaway('Always design your ingestion architecture with the end in mind: what Dataset will this file populate, and what downstream process depends on it? This prevents schema mismatches and pipeline failures mid-implementation.')}`
          }
        ]
      },

      // ─── MODULE 2: Cloud Storage Ingestion ───────────────────
      {
        title: 'Cloud Storage Ingestion',
        lessons: [
          {
            title: 'Normal File Connectors — GCS, S3, Azure & SFTP',
            dur: '14 min',
            html: `<h2>Normal File Connectors — GCS, S3, Azure & SFTP</h2>
<p class="mlc-lead">Bluecopa's Normal Files Connectors are the primary automated ingestion path. They monitor configured cloud storage locations and continuously sync files into Bluecopa Datasets — no manual intervention required once configured.</p>
${mlcSection('Supported Connector Types', mlcUl([
  '<strong>Google Cloud Storage (GCS)</strong> — Ideal for clients on Google Cloud; uses service account authentication',
  '<strong>Amazon S3</strong> — For AWS-based clients; uses IAM access key + secret or role-based auth',
  '<strong>Azure Blob Storage</strong> — For Microsoft Azure clients; uses connection string or SAS token',
  '<strong>Azure Blob → BigQuery</strong> — Direct pipeline: Azure Blob in, BigQuery dataset out',
  '<strong>Azure Blob → Snowflake</strong> — Direct pipeline: Azure Blob in, Snowflake table out',
  '<strong>SFTP</strong> — Legacy-compatible; for clients who deliver files via secure FTP servers',
  '<strong>OneDrive / Google Drive / Dropbox</strong> — For file-sharing platform delivery'
]))}
${mlcSection('How Connectors Work — Under the Hood', mlcOl([
  '<strong>Connection setup</strong> — You configure a Blob Connection with the client\'s cloud credentials',
  '<strong>File path configuration</strong> — You specify the folder path, file name pattern (e.g., <code>invoices/*.csv</code>), and target Dataset',
  '<strong>Schedule or trigger</strong> — Connector runs on a defined schedule (hourly, daily) or on-demand',
  '<strong>File detection</strong> — Connector scans the configured path for new or changed files',
  '<strong>Ingestion</strong> — New files are pulled, parsed, validated against the Dataset schema, and loaded',
  '<strong>Acknowledgement</strong> — Ingested files can be archived or deleted from source depending on config'
]))}
${mlcDiagram('Connector Architecture', `
<div style="display:flex;gap:0;align-items:stretch;margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid #334155">
  <div style="background:#1e293b;padding:16px;flex:1;border-right:1px solid #334155">
    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Client Cloud</div>
    ${mlcUl(['GCS Bucket', 'S3 Bucket', 'Azure Container', 'SFTP Server'])}
  </div>
  <div style="background:#1e3a5f;padding:16px;flex:0 0 160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
    <div style="font-size:20px">🔗</div>
    <div style="font-size:12px;font-weight:700;color:#7dd3fc;text-align:center">Blob Connection<br><span style="font-size:10px;font-weight:400;color:#93c5fd">Encrypted · Authenticated</span></div>
    <div style="font-size:20px">↓</div>
    <div style="font-size:12px;font-weight:700;color:#7dd3fc;text-align:center">Normal Files<br>Connector<br><span style="font-size:10px;font-weight:400;color:#93c5fd">Scheduled · Triggered</span></div>
  </div>
  <div style="background:#0f2818;padding:16px;flex:1;border-left:1px solid #166534">
    <div style="font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Bluecopa</div>
    ${mlcUl(['Dataset (validated rows)', 'Databox (analytics-ready)', 'Downstream: Reports & Recon', 'Audit log of every sync'])}
  </div>
</div>`)}
${mlcSection('Critical Connector Limitations — Know Before You Configure', mlcUl([
  '⚠️ <strong>ZIP files are NOT supported</strong> — Connectors cannot ingest .zip archives. Use the Workflow-based unzip pattern instead (covered in Module 3)',
  '⚠️ <strong>GZIP files max 4 GB uncompressed</strong> — Files larger than this require chunked delivery or a different ingestion strategy',
  '⚠️ <strong>One connector = one dataset</strong> — You cannot route different files from the same bucket to different datasets in a single connector; configure separate connectors per dataset',
  '✅ <strong>Wildcard path support</strong> — Use <code>folder/*.csv</code> to match all CSV files in a folder',
  '✅ <strong>Delta detection</strong> — Connectors track which files have already been processed and skip them on subsequent runs'
]))}
${mlcExample('Real-World Config', 'Client: Darwinbox. Source: GCS bucket <code>darwinbox-prod-exports/ar-aging/</code>. File pattern: <code>ar_aging_*.csv</code>. Schedule: daily at 6:00 AM IST. Target Dataset: <code>AR_AGING_DARWINBOX</code>. Once set up, every morning\'s file is automatically pulled and the dataset refreshed before the finance team starts work.')}
${mlcTakeaway('Normal Files Connectors are the backbone of automated ingestion. Configure them once, monitor them daily. The most common failure modes are credential expiry, file path changes, and schema mismatches — build alerting for all three.')}`
          },
          {
            title: 'Moving Large Files from Cloud Storage — The 3-Phase Pattern',
            dur: '13 min',
            html: `<h2>Moving Large Files from Cloud Storage — The 3-Phase Pattern</h2>
<p class="mlc-lead">When client files are too large, too irregular, or too complex for a direct connector, use the <strong>3-Phase Pattern</strong>: Connect → Fetch → Load. This gives you full control over how files are retrieved, staged, and ingested.</p>
${mlcSection('Phase 1 — Connect: Setting Up the Blob Connection', mlcOl([
  'Navigate to <strong>Settings → Blob Connections</strong> in Bluecopa',
  'Select the cloud provider: GCS, S3, or Azure Blob',
  'Enter credentials: service account JSON (GCS), access key + secret (S3), or connection string (Azure)',
  'Specify the bucket/container name',
  'Test the connection — Bluecopa will verify it can list and read files',
  'Save and name the connection (e.g., <code>client-gcs-prod</code>)'
]))}
${mlcSection('Phase 2 — Fetch: Using a Workflow to Copy the File', mlcOl([
  'Create a new Workflow in Bluecopa',
  'Add a <strong>Manual Trigger</strong> or <strong>Schedule Trigger</strong> as the start node',
  'Add a <strong>Copy to Blob Store</strong> action node',
  'Configure: Source = client blob connection + file path; Destination = Bluecopa internal blob path',
  'Run the workflow — the file is copied from client cloud to Bluecopa\'s internal blob storage',
  'The file is now staged internally, ready for the next phase'
]))}
${mlcSection('Phase 3 — Load: Using a Connector to Ingest to Dataset', mlcOl([
  'Create a Normal Files Connector pointing to the <strong>internal blob path</strong> (not the client\'s cloud)',
  'Configure the target Dataset with the correct schema',
  'Trigger the connector after the workflow copy completes (chain them with a workflow step)',
  'The connector reads the staged file, validates each row, and loads into the Dataset',
  'Verify row count and schema in the Dataset viewer'
]))}
${mlcDiagram('3-Phase Flow', `
<div style="display:flex;flex-direction:column;gap:0;border-radius:10px;overflow:hidden;border:1px solid #334155">
  <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:#1e293b;border-bottom:1px solid #334155">
    <div style="background:#1d4ed8;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0">1</div>
    <div><div style="font-size:13px;font-weight:700;color:#93c5fd">CONNECT</div><div style="font-size:12px;color:#94a3b8">Create Blob Connection → link client GCS/S3/Azure to Bluecopa</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:#1a2035;border-bottom:1px solid #334155">
    <div style="background:#7c3aed;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0">2</div>
    <div><div style="font-size:13px;font-weight:700;color:#c4b5fd">FETCH</div><div style="font-size:12px;color:#94a3b8">Workflow with Copy-to-Blob node → moves file to internal staging blob</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:#0f2818">
    <div style="background:#059669;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0">3</div>
    <div><div style="font-size:13px;font-weight:700;color:#6ee7b7">LOAD</div><div style="font-size:12px;color:#94a3b8">Normal Files Connector reads from internal blob → validates → loads Dataset</div></div>
  </div>
</div>`)}
${mlcSection('When to Use the 3-Phase Pattern vs Direct Connector', mlcCompare(
  '✅ Use 3-Phase Pattern when…', [
    'File is very large (>1 GB)',
    'File needs pre-processing before ingestion',
    'Need to archive or rename files during transit',
    'Ingestion is ad hoc or event-driven',
    'File is a ZIP that must be unpacked first'
  ],
  '✅ Use Direct Connector when…', [
    'File is standard CSV/Excel, regular format',
    'Ingestion is fully scheduled and predictable',
    'No transformation needed before loading',
    'Source path and filename are stable',
    'Volume is moderate and consistent'
  ]
))}
${mlcTakeaway('The 3-Phase Pattern trades simplicity for control. Use it whenever the direct connector path cannot handle the file format, size, or delivery pattern. Once mastered, it becomes the go-to solution for complex client onboarding scenarios.')}`
          },
          {
            title: 'Scheduled Pulls vs. Event-Driven Workflows',
            dur: '11 min',
            html: `<h2>Scheduled Pulls vs. Event-Driven Workflows</h2>
<p class="mlc-lead">Once your blob connection is established, you need to decide <strong>when</strong> to pull the data. Bluecopa gives you two strategies: pull on a timer (scheduled) or react when a file arrives (event-driven). Choosing correctly prevents both missed ingestion and unnecessary processing.</p>
${mlcSection('Strategy 1 — Scheduled Pull (Pull on a Timer)', mlcUl([
  'A <strong>Schedule Trigger</strong> fires a workflow at fixed intervals — hourly, daily at 6 AM, every Monday morning, etc.',
  'The workflow runs regardless of whether a new file exists; it checks, finds the file, and processes it',
  'Predictable, easy to monitor, simple to troubleshoot',
  '<strong>Best for</strong>: clients who deliver files on a known, reliable cadence (e.g., "every night at 11 PM")',
  '<strong>Risk</strong>: If the client delays delivery, the workflow runs and finds nothing — you need a no-file alert'
]))}
${mlcSection('Strategy 2 — Event-Driven (React to File Arrival)', mlcUl([
  'Bluecopa monitors a blob path for new file arrivals using a <strong>Blob Trigger</strong> or file-arrival detection node',
  'The workflow fires automatically the moment a new file appears — no polling delay',
  'More responsive, no wasted workflow runs when no file is present',
  '<strong>Best for</strong>: high-frequency or unpredictable deliveries (e.g., "files arrive throughout the day")',
  '<strong>Risk</strong>: If two files arrive simultaneously, ensure your workflow handles concurrency correctly'
]))}
${mlcDiagram('Scheduled vs Event-Driven — Decision Flow', `
<div style="display:flex;gap:16px;margin-top:8px">
  <div style="flex:1;background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155">
    <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:10px">⏰ Scheduled Pull</div>
    <div style="font-size:12px;color:#cbd5e1;line-height:1.8">
      Client delivers daily at 11 PM<br>
      → Schedule trigger at 11:30 PM<br>
      → Workflow checks path<br>
      → File found → ingest<br>
      → Alert if no file found<br>
      <br><span style="color:#86efac">✓ Simple · Predictable · Easy to monitor</span>
    </div>
  </div>
  <div style="flex:1;background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155">
    <div style="font-size:13px;font-weight:700;color:#818cf8;margin-bottom:10px">⚡ Event-Driven</div>
    <div style="font-size:12px;color:#cbd5e1;line-height:1.8">
      Client uploads files ad hoc<br>
      → Blob arrival listener active<br>
      → New file detected instantly<br>
      → Workflow triggers immediately<br>
      → Ingest + notify team<br>
      <br><span style="color:#86efac">✓ Real-time · No wasted runs · Responsive</span>
    </div>
  </div>
</div>`)}
${mlcSection('Prerequisite: Blob Connection Must Be Set Up First', mlcUl([
  'Both strategies require a working Blob Connection to the client\'s cloud storage',
  'Without the Blob Connection, neither trigger type can access the client\'s files',
  'Always set up and test the Blob Connection before building any ingestion workflow',
  'Verify the connection can list files in the target folder — this is the most common setup failure point'
]))}
${mlcSection('Handling the "No File" Scenario', mlcOl([
  'Add a conditional node after the file-check step',
  'If file found → proceed to ingestion',
  'If no file → send an alert to the implementation team or client',
  'Log the run as "skipped — no file" for audit trail',
  'Set a maximum wait time for event-driven triggers to prevent zombie workflow runs'
]))}
${mlcTakeaway('Default to Scheduled Pull for predictable clients. Use Event-Driven when the client\'s delivery time is unknown or varies. Always build a no-file alert — silent failure is the hardest type of failure to detect in production.')}`
          }
        ]
      },

      // ─── MODULE 3: ZIP Files & Special Patterns ───────────────────
      {
        title: 'ZIP Files & Special Ingestion Patterns',
        lessons: [
          {
            title: 'Why Connectors Cannot Handle ZIP Files',
            dur: '9 min',
            html: `<h2>Why Connectors Cannot Handle ZIP Files</h2>
<p class="mlc-lead">ZIP files are one of the most common client delivery formats — and one of the most common ingestion pitfalls. Bluecopa's native connectors <strong>cannot ingest .zip archives directly</strong>. Understanding why and knowing the correct pattern will save you hours of troubleshooting on live projects.</p>
${mlcSection('What Connectors Cannot Do with ZIP Files', mlcUl([
  '✗ <strong>Ingest a .zip archive directly</strong> — The connector will error or skip the file entirely',
  '✗ <strong>Auto-extract files inside a zip</strong> — No built-in unzip capability in any connector type',
  '✗ <strong>Discover or iterate over files inside a zip</strong> — The connector sees the zip as a single opaque blob',
  '✗ <strong>Handle gzip files larger than 4 GB uncompressed</strong> — This is a hard platform limit',
  '✗ <strong>Route different files from a zip to different datasets</strong> — Even if extraction were possible, routing is not automatic'
]))}
${mlcSection('What Connectors CAN Handle', mlcUl([
  '✅ <strong>Plain CSV files</strong> — The primary supported format; any encoding, any delimiter',
  '✅ <strong>Excel (.xlsx)</strong> — Sheet-level configuration supported',
  '✅ <strong>GZIP-compressed files</strong> — Single-file gzip (not ZIP); max 4 GB uncompressed',
  '✅ <strong>JSON lines files</strong> — One JSON object per line',
  '✅ <strong>Parquet files</strong> — For BigQuery and Snowflake targets'
]))}
${mlcExample('Common Mistake', 'A client delivers <code>monthly_data.zip</code> containing three CSVs to their GCS bucket. You configure a Normal Files Connector pointed at the bucket. The connector runs, sees the .zip file, and skips it with no error — zero rows ingested, no alert. The finance team sees no data refresh and escalates. Root cause: ZIP file, wrong pattern used.')}
${mlcSection('The Required Pattern for ZIP Files', mlcFlow([
  'Client uploads .zip to cloud storage',
  'Workflow detects arrival (schedule or blob trigger)',
  'Copy-to-Blob node: moves .zip to internal blob storage',
  'Unzip node: extracts contents to a target internal folder',
  'For each extracted file: connector or further workflow step ingests to correct Dataset',
  'Alert on success or failure'
]))}
${mlcSection('GZIP vs ZIP — Important Distinction', mlcCompare(
  '📁 ZIP Archive (.zip)', [
    'Container holding multiple files',
    'NOT supported by connectors',
    'Must use Workflow unzip pattern',
    'No size restriction with workflow approach',
    'Contents can be any file type'
  ],
  '🗜️ GZIP Compressed (.gz)', [
    'Compression of a single file',
    'Supported natively by connectors',
    'Max 4 GB uncompressed size',
    'Connector decompresses automatically',
    'Typically wraps a single CSV or JSON'
  ]
))}
${mlcTakeaway('When a client says "we will send a ZIP file" — immediately design the Workflow-based unzip pattern. Never attempt to point a connector at a ZIP file. Document this constraint during discovery so clients understand why the delivery format matters.')}`
          },
          {
            title: 'ZIP File Ingestion — The Workflow Pattern Step by Step',
            dur: '15 min',
            html: `<h2>ZIP File Ingestion — The Workflow Pattern Step by Step</h2>
<p class="mlc-lead">The Workflow-based ZIP ingestion pattern is Bluecopa's answer to compressed file delivery. This lesson walks through the complete workflow — from trigger to dataset load — using a real-world example of invoice PDFs delivered in a ZIP from a GCS bucket.</p>
${mlcSection('Real-World Scenario', mlcUl([
  '<strong>Client</strong>: Finance team delivers monthly invoice data as <code>invoice_pdfs.zip</code>',
  '<strong>Source</strong>: GCS bucket → <code>InvoicePDFs/self-serve/2025/04/invoice_pdfs.zip</code>',
  '<strong>Goal</strong>: Extract files, move to internal filebox, and trigger downstream processing',
  '<strong>Trigger</strong>: Manual (can be converted to scheduled or event-driven once stable)'
]))}
${mlcSection('Workflow Node Breakdown', mlcOl([
  '<strong>Node 0 — Manual Trigger</strong>: Starts the workflow. Use manual trigger during testing; switch to Schedule or Blob trigger in production',
  '<strong>Node 1 — Copy to Blob Store</strong>: Fetches the raw .zip from GCS using the configured blob connection. Instruction Type: <em>Copy file instruction</em>. Source path: <code>InvoicePDFs/self-serve/2025/04/invoice_pdfs.zip</code>. Destination: internal blob path <code>InvoicePDFs/staging/</code>',
  '<strong>Node 2 — Transfer to Filebox</strong>: Moves the .zip from internal blob to the designated Filebox. The Filebox handles extraction and downstream routing automatically',
  '<strong>Node 3 — Unzip & Route</strong>: Bluecopa\'s Filebox unzips the archive and routes each contained file to its configured destination Dataset or processing step',
  '<strong>Node 4 (Optional) — Notify</strong>: Send a success/failure notification email to the implementation team or client stakeholder'
]))}
${mlcDiagram('ZIP Ingestion Workflow — Node Map', `
<div style="display:flex;flex-direction:column;gap:0;border-radius:10px;overflow:hidden;border:1px solid #334155">
  ${['⚡ Manual Trigger → Kicks off the workflow','📋 Copy to Blob Store → ZIP from GCS to internal staging blob','📦 Transfer to Filebox → Blob ZIP lands in designated Filebox','🗂️ Unzip & Route → Files extracted, routed to Datasets','✉️ Notify → Email confirmation to team'].map((s,i) => `<div style="display:flex;align-items:center;gap:14px;padding:12px 18px;background:${['#1e293b','#1a2035','#1e293b','#1a2035','#0f2818'][i]};${i<4?'border-bottom:1px solid #334155':''}"><div style="background:${['#475569','#1d4ed8','#7c3aed','#059669','#d97706'][i]};border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:12px;flex-shrink:0">${i}</div><div style="font-size:13px;color:#cbd5e1">${s}</div></div>`).join('')}
</div>`)}
${mlcSection('Configuration Details — Copy to Blob Store Node', mlcUl([
  '<strong>Instruction Type</strong>: Copy file instruction (copies the whole ZIP without extracting)',
  '<strong>From File ID</strong>: The full path to the ZIP in the source cloud, e.g., <code>InvoicePDFs/self-serve/2025/04/invoice_pdfs.zip</code>',
  '<strong>File ID Path Type</strong>: FILE PATH (not a blob ID)',
  '<strong>Source Connection ID</strong>: Select the Blob Connection you created for this client\'s GCS bucket',
  '<strong>To Path</strong>: Internal destination blob path, e.g., <code>InvoicePDFs/staging/invoice_pdfs.zip</code>'
]))}
${mlcSection('Production Checklist for ZIP Ingestion', mlcUl([
  '☐ Blob Connection created and tested',
  '☐ Internal staging blob path defined and writable',
  '☐ Filebox configured with correct extraction settings',
  '☐ Each file type inside the ZIP mapped to a target Dataset',
  '☐ Workflow tested with a sample ZIP on staging',
  '☐ Error handling node added for copy failure',
  '☐ Notification node configured for both success and failure',
  '☐ Schedule or blob trigger configured for production go-live'
]))}
${mlcTakeaway('The ZIP ingestion workflow has more nodes than a simple connector — but each node is explicit and auditable. When something fails in production, you can see exactly which node failed and why. This transparency is worth the extra setup time.')}`
          }
        ]
      },

      // ─── MODULE 4: Manual Ingestion & Advanced Patterns ───────────────────
      {
        title: 'Manual Ingestion & Advanced Patterns',
        lessons: [
          {
            title: 'Portal & Form-Based File Upload',
            dur: '12 min',
            html: `<h2>Portal & Form-Based File Upload</h2>
<p class="mlc-lead">Not all data arrives via automated pipelines. When source systems cannot automate delivery, or when operations teams need to review files before they enter the system, Bluecopa's <strong>Portal + Form + Filebox</strong> pattern provides controlled, traceable manual ingestion.</p>
${mlcSection('Three Capabilities That Power Manual Ingestion', mlcUl([
  '🖥️ <strong>Portal</strong> — The user-facing screen where end users interact. Think of it as a custom-built web form embedded in Bluecopa. Operations teams see a clean upload interface without needing access to back-end systems',
  '📋 <strong>Form / Workflow</strong> — The interaction and validation layer. The Form defines what data the user must provide (file + metadata). The Workflow defines what happens after submission — validations, routing, approvals, notifications',
  '📂 <strong>Filebox</strong> — The secure storage destination. Every uploaded file lands in a configured Filebox, which maintains a complete audit trail: who uploaded, when, file hash, and processing status'
]))}
${mlcSection('When to Use Manual (Portal) Ingestion', mlcUl([
  '✅ Source system cannot generate automated file exports',
  '✅ Data requires human review or approval before processing',
  '✅ File format or content varies and needs a human to verify before submission',
  '✅ Client operations team needs to attach metadata (period, entity, department) to each file',
  '✅ Audit and compliance requirements demand a named responsible uploader',
  '❌ Do NOT use for high-frequency, recurring, structured data — use connectors instead'
]))}
${mlcFlow([
  'User opens Portal screen in Bluecopa',
  'Selects file + fills metadata fields (period, entity, file type)',
  'Submits form → Workflow triggers',
  'File validated: format, size, required columns',
  'File lands in Filebox with full audit record',
  'Downstream: Connector/Dataset picks up for processing',
  'Email notification sent to team confirming receipt'
])}
${mlcSection('Setting Up the Pattern — Key Steps', mlcOl([
  '<strong>Create a Filebox</strong> — Define the destination filebox with the correct file type expectations',
  '<strong>Build the Portal screen</strong> — Add a file upload component + metadata fields (dropdowns for period, entity, etc.)',
  '<strong>Link Portal to Workflow</strong> — On form submit, the workflow triggers and receives the file reference and metadata',
  '<strong>Add validation nodes</strong> — Check file type (must be CSV/Excel), size limits, required metadata fields',
  '<strong>Route to Filebox</strong> — Workflow deposits the file into the target Filebox on validation pass',
  '<strong>Configure failure handling</strong> — If validation fails, show user an error and do NOT deposit the file',
  '<strong>Add downstream trigger</strong> — After deposit, trigger the connector or dataset refresh automatically'
]))}
${mlcSection('Audit Trail — What Gets Recorded', mlcUl([
  '<strong>Uploader name & email</strong> — Who submitted the file',
  '<strong>Timestamp</strong> — Exact date and time of submission',
  '<strong>File name & hash</strong> — Unique fingerprint of the file; detects duplicates and tampering',
  '<strong>Metadata fields</strong> — Period, entity, department as submitted by the user',
  '<strong>Processing status</strong> — Pending, validated, failed, ingested — updated at each stage'
]))}
${mlcExample('Real-World Use Case', 'Client: NBFC operations team needs to upload daily bank statements. Automated email delivery is not possible. Solution: A Portal screen with three fields — Bank Name (dropdown), Statement Date, and File Upload. On submit, the workflow validates that the file is a CSV, deposits it into the "Bank Statements" Filebox, and sends a confirmation email. The finance team can see every upload in the audit trail and trace any data issue back to the exact file and uploader.')}
${mlcTakeaway('Portal-based ingestion trades automation speed for control and accountability. In regulated industries and audit-heavy environments, this traceability is not optional — it is a compliance requirement. Always pair it with a downstream automation so the manual step is just the entry point, not the entire process.')}`
          },
          {
            title: 'Invoice Discounting — A Complete End-to-End Ingestion Story',
            dur: '16 min',
            html: `<h2>Invoice Discounting — A Complete End-to-End Ingestion Story</h2>
<p class="mlc-lead">This lesson walks through a full, real-world Bluecopa implementation: automating the invoice discounting lifecycle for an NBFC client. It combines dataset upload, bank allocation, utilization tracking, and automated email delivery into one end-to-end pipeline — a showcase of what Bluecopa ingestion looks like in production.</p>
${mlcSection('What is Invoice Discounting?', mlcUl([
  'A financial process where a company receives funds against unpaid invoices <strong>before</strong> customer payment is received',
  'Normally, businesses wait 30–60 days for customers to pay. With invoice discounting, they submit eligible invoices to banks and receive advance funds immediately',
  '<strong>Example</strong>: A company has ₹20 Cr in unpaid invoices with a 45-day payment cycle. They submit eligible invoices to HDFC and IDFC banks and receive advance funds today — improving working capital without taking a traditional loan',
  'The bank charges a small fee (discount rate). When the customer eventually pays, the company repays the bank advance'
]))}
${mlcSection('Why Automation Was Needed', mlcUl([
  'The existing manual process involved exporting data from multiple systems, merging in Excel, and manually emailing banks',
  'Errors were frequent: wrong allocation amounts, missing invoices, late submissions',
  'No real-time visibility into utilization across multiple banking lines',
  'Reconciling repayments against advances was a full-day manual exercise each week'
]))}
${mlcSection('The Automated Pipeline — 5 Stages', mlcOl([
  '<strong>Stage 1 — Dataset Upload</strong>: Operations team uploads the invoice dataset via Portal (Form + Filebox pattern). File: CSV of all eligible invoices with debtor name, amount, due date, and eligibility flag',
  '<strong>Stage 2 — Eligibility Filtering</strong>: Workflow applies business rules — filter invoices by debtor whitelist, minimum amount threshold, and days-to-due-date window. Output: Eligible Invoice Dataset',
  '<strong>Stage 3 — Bank Allocation</strong>: Allocation logic distributes eligible invoice amounts across configured banking lines (HDFC: 40%, IDFC: 35%, Kotak: 25%). Workflow writes allocation records to the Bank Allocation Dataset',
  '<strong>Stage 4 — Utilization Tracking</strong>: A reconciliation sub-workflow matches drawn amounts against sanctioned limits per bank. Utilization % is calculated and written to the Utilization Dashboard Dataset in real time',
  '<strong>Stage 5 — Automated Email Delivery</strong>: Workflow generates a formatted email report with allocation summary, utilization percentages, and eligible invoice list. Sent automatically to bank relationship managers and internal finance team'
]))}
${mlcDiagram('End-to-End Pipeline', `
<div style="display:flex;flex-direction:column;gap:0;border-radius:10px;overflow:hidden;border:1px solid #334155">
  ${[
    ['📋','Invoice Dataset Upload','Portal (Form + Filebox) — Manual trigger by ops team','#1e293b','#475569'],
    ['🔍','Eligibility Filtering','Workflow: apply business rules → Eligible Invoice Dataset','#1a2035','#1d4ed8'],
    ['🏦','Bank Allocation','Allocation logic → distribute across HDFC, IDFC, Kotak lines','#1e293b','#7c3aed'],
    ['📊','Utilization Tracking','Recon workflow → Utilization % → Dashboard Dataset (real-time)','#1a2035','#0891b2'],
    ['✉️','Automated Email','Formatted report → Bank RMs + Finance team → auto-sent on completion','#0f2818','#059669']
  ].map(([icon,title,desc,bg,col],i) => `<div style="display:flex;align-items:center;gap:14px;padding:13px 18px;background:${bg};${i<4?'border-bottom:1px solid #334155':''}"><div style="background:${col};border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${icon}</div><div><div style="font-size:13px;font-weight:700;color:#e2e8f0">${title}</div><div style="font-size:12px;color:#94a3b8;margin-top:2px">${desc}</div></div></div>`).join('')}
</div>`)}
${mlcSection('Datasets Used in This Implementation', mlcUl([
  '<strong>RAW_INVOICES</strong> — All uploaded invoices (unfiltered)',
  '<strong>ELIGIBLE_INVOICES</strong> — Invoices passing all eligibility rules',
  '<strong>BANK_ALLOCATION</strong> — Per-bank allocation records with amounts and utilization',
  '<strong>UTILIZATION_SUMMARY</strong> — Current draw vs sanctioned limit per bank, updated every run',
  '<strong>REPAYMENT_RECON</strong> — Matches customer payments received against bank advances drawn'
]))}
${mlcStatGrid([
  {n:'5', l:'Pipeline stages', note:'From upload to email delivery'},
  {n:'3', l:'Banking lines', note:'HDFC · IDFC · Kotak'},
  {n:'100%', l:'Manual effort eliminated', note:'From multi-hour Excel process to 0 human steps'},
  {n:'<2 min', l:'End-to-end run time', note:'Once triggered, pipeline completes in under 2 minutes'}
])}
${mlcTakeaway('This implementation demonstrates Bluecopa at its best: replacing a fragile, error-prone manual workflow with an auditable, real-time automated pipeline. Every ingestion pattern covered in this course — portal upload, blob connections, connectors, workflow routing, and dataset management — comes together here. When you design your own implementations, think in pipelines, not just files.')}`
          },
          {
            title: 'Ingestion Best Practices & Troubleshooting',
            dur: '10 min',
            html: `<h2>Ingestion Best Practices & Troubleshooting</h2>
<p class="mlc-lead">A well-designed ingestion pipeline runs invisibly. A poorly designed one generates midnight alerts and frantic client calls. This lesson consolidates the key best practices from all ingestion patterns and gives you a structured approach to diagnosing failures when they happen.</p>
${mlcSection('Design Best Practices', mlcUl([
  '📐 <strong>Always set a target Dataset before designing the ingestion path</strong> — Work backwards from what you need in the Dataset to choose the right source format and connector type',
  '🔔 <strong>Build alerts into every pipeline</strong> — No-file alerts, schema error alerts, row-count anomaly alerts. Silent failure is the hardest type to detect',
  '📋 <strong>Use meaningful names</strong> — Blob connections, workflows, and Fileboxes named <code>client-gcs-prod-ar-aging</code> are infinitely easier to maintain than <code>connection_1</code>',
  '🔒 <strong>Never store credentials in workflow node fields</strong> — Always use the Blob Connection abstraction layer; it handles rotation and auditing',
  '📄 <strong>Document the file spec with the client</strong> — Column names, data types, encoding, delimiter, date format, and expected row count range. Agree in writing before going live',
  '🔄 <strong>Test with a full production-size file</strong> — Staging tests often use small samples; the connector must handle peak volume before go-live'
]))}
${mlcSection('Troubleshooting — The 5 Most Common Ingestion Failures', mlcOl([
  '<strong>Zero rows ingested, no error</strong> — Cause: ZIP file passed to a connector. Fix: Switch to the Workflow-based unzip pattern',
  '<strong>Schema validation errors on every run</strong> — Cause: Client changed column names or data types. Fix: Re-map schema; add a client notification workflow so you are alerted when source changes',
  '<strong>Connector fails with authentication error</strong> — Cause: Service account key expired or IAM permissions changed. Fix: Refresh credentials in Blob Connection settings; set a calendar reminder 30 days before key expiry',
  '<strong>Duplicate rows appearing in Dataset</strong> — Cause: Connector running multiple times or delta detection misconfigured. Fix: Enable deduplication on the Dataset; check connector run history for duplicate triggers',
  '<strong>Workflow stuck at Copy-to-Blob node</strong> — Cause: File does not exist at the configured path (client delivered to wrong folder). Fix: Add a file-exists check node before Copy; send alert if file not found at expected path'
]))}
${mlcSection('Pre-Go-Live Ingestion Checklist', mlcUl([
  '☐ Blob Connection tested with real client credentials',
  '☐ File spec agreed and documented with client',
  '☐ Schema configured in target Dataset with correct types',
  '☐ Ingestion tested with full-size production file',
  '☐ No-file alert configured and tested',
  '☐ Schema error alert configured',
  '☐ Connector/workflow run history reviewed for any anomalies',
  '☐ Row count validation step added (compare ingested rows vs file rows)',
  '☐ Downstream processes (reports, recon) verified with ingested data',
  '☐ Runbook documented: who to call if ingestion fails in production'
]))}
${mlcExample('Troubleshooting Example', 'Client reports: "Dashboard hasn\'t refreshed since Monday." You check the connector run history — it shows successful runs but zero rows processed. You inspect the source path — the client changed their folder structure from <code>exports/daily/</code> to <code>exports/2025/07/</code>. The connector was configured for the old path. Fix: update the connector file path, add a file-exists validation node, and agree with the client that any path change must be communicated 5 business days in advance.')}
${mlcTakeaway('The best ingestion pipelines are the ones that fail loudly, fail early, and provide clear diagnostics. Invest the extra time in alerts, validation nodes, and documentation during setup. In a 200-person organisation using the same platform, one well-documented pipeline pattern benefits everyone.')}`
          }
        ]
      }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 7 — APPROVAL WORKFLOWS
  // ════════════════════════════════════════════════════
  aw: {
    modules: [

      // ─── MODULE 1: Fundamentals ──────────────────────
      {
        title: 'Approval Workflow Fundamentals',
        lessons: [
          {
            title: 'What Is an Approval Workflow in Bluecopa?',
            dur: '10 min',
            html: `<h2>What Is an Approval Workflow in Bluecopa?</h2>
<p class="mlc-lead">An Approval Workflow is a structured automation that routes a request through one or more human reviewers before a final outcome is reached. In Bluecopa, approval workflows are built on the workflow engine and combine forms, human tasks, notifications, and conditional logic into a single auditable process.</p>
${mlcSection('Why Approval Workflows Exist', mlcUl([
  '<strong>Control</strong> — Certain decisions — payments, configurations, document classification — are too consequential to automate without a human sign-off',
  '<strong>Auditability</strong> — Every approval action is timestamped, attributed to a named person, and stored for compliance review',
  '<strong>Speed</strong> — Structured automation removes the bottleneck of chasing approvers via email or Slack — the platform does it automatically',
  '<strong>Consistency</strong> — The same rules apply to every request; no ad-hoc approvals or skipped steps'
]))}
${mlcSection('The Four Building Blocks', mlcOl([
  '<strong>Form</strong> — The requester submits structured data (name, product, amount, document) through a configured form',
  '<strong>Human Task node</strong> — The workflow pauses and assigns a task to a named approver or role; the approver acts inside the platform',
  '<strong>Condition node</strong> — The workflow branches based on the approver\'s decision: Approved → one path, Rejected → another path',
  '<strong>Notification / Email</strong> — Automated alerts keep all parties informed at every stage transition'
]))}
${mlcDiagram('Approval Workflow — Core Pattern', `
<div style="display:flex;gap:0;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px 0">
  <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#fbbf24;text-align:center;min-width:90px">📋<br>Form<br>Submission</div>
  <div style="color:#6b7280;font-size:18px;margin:0 6px">→</div>
  <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#fbbf24;text-align:center;min-width:90px">👤<br>Human<br>Task</div>
  <div style="color:#6b7280;font-size:18px;margin:0 6px">→</div>
  <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#fbbf24;text-align:center;min-width:90px">🔀<br>Condition<br>Branch</div>
  <div style="color:#6b7280;font-size:18px;margin:0 6px">→</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;color:#4ade80;text-align:center">✅ Approved</div>
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;color:#f87171;text-align:center">❌ Rejected</div>
  </div>
</div>`)}
${mlcSection('Types of Approval Workflows in Bluecopa', mlcUl([
  '<strong>Single-Level Approval</strong> — One approver, one decision; simplest pattern. Used for deals, product requests, and routine business decisions',
  '<strong>Approval via Email</strong> — Approver receives an email with a unique action link; logs in via OTP; acts without needing a pre-existing account',
  '<strong>Conditional Routing</strong> — Different paths based on the approver\'s choice (e.g. Invoice → Filebox A, PO → Filebox B, Reject → notify requester)',
  '<strong>Maker-Checker</strong> — Two roles: Maker submits data, Checker independently validates; used for high-risk financial configurations',
  '<strong>Multi-Level with SLA</strong> — Approval chains with defined deadlines, automated reminders, and escalation if a deadline is missed'
]))}
${mlcTakeaway('Every approval workflow in Bluecopa — no matter how complex — is built from the same four blocks: a Form, a Human Task, a Condition, and Notifications. Mastering these blocks lets you build any approval pattern.')}`
          },
          {
            title: 'Single-Level Approval — Form, Task & Repeat-Until Loop',
            dur: '12 min',
            html: `<h2>Single-Level Approval — Form, Task & Repeat-Until Loop</h2>
<p class="mlc-lead">The single-level approval workflow is the foundation pattern. One requester submits a form, one approver reviews it, and the outcome is either approval (workflow completes) or rejection (requester revises and resubmits). The Repeat-Until loop is what makes resubmission automatic.</p>
${mlcSection('The Five Workflow Components', mlcOl([
  '<strong>Approval Form</strong> — Collects the requester\'s input: Name, Role, Product Name, Requirements',
  '<strong>Hidden Field Element</strong> — Controls which sections of the form are visible. Requester sees only input fields; approver sees the APPROVED / REJECTED decision panel',
  '<strong>Alert / Email node</strong> — Sends a notification to the approver when a task is assigned; sends a result notification to the requester after the decision',
  '<strong>Human Task node</strong> — Pauses the workflow and assigns a review task to the Deal Approver with a due date',
  '<strong>Repeat-Until loop</strong> — Wraps the entire approval cycle; keeps looping until the consent field equals APPROVED'
]))}
${mlcFlow(['Form Submitted by Requester', 'Alert sent to Approver', 'Human Task assigned', 'Approver decides: APPROVED or REJECTED', 'Condition checked', 'If APPROVED → workflow ends; If REJECTED → revise task sent to Requester → loop back'])}
${mlcSection('The Repeat-Until Loop — Why It Matters', mlcUl([
  'Without a loop: a rejected request has nowhere to go — the workflow simply ends and the requester must resubmit from scratch',
  'With a loop: rejection triggers a "Revise and Resubmit" task back to the requester; once they update, the loop restarts and the approver reviews again',
  'The loop condition is always checked <strong>after</strong> the approver acts — it continues until <code>consent_field === "APPROVED"</code>',
  'There is no limit to how many loops can occur — the cycle repeats until the requester gets approval or the workflow is manually terminated'
]))}
${mlcCompare(
  '✅ Approved Path',
  ['Condition evaluates consent = APPROVED', 'Confirmation alert sent to requester', 'Workflow completes successfully', 'Loop exits — no further action needed'],
  '❌ Rejected Path',
  ['Condition evaluates consent = REJECTED', 'Rejection notification sent with remarks', 'Requester receives a "Revise and Resubmit" task', 'Loop restarts — approver reviews updated submission']
)}
${mlcSection('Key Configuration Points', mlcUl([
  '<strong>Hidden field element</strong> — Set visibility rules so the Deal Approver panel is hidden from requesters and revealed only when the task is assigned',
  '<strong>APPROVED / REJECTED radio buttons</strong> — These write to the consent field that the Repeat-Until condition evaluates',
  '<strong>Remarks field</strong> — Approver adds comments on rejection; requester sees this when the revise task is assigned',
  '<strong>Due date on Human Task</strong> — Set SLA window on the task node to track whether the approver acts in time (covered in Module 3)'
]))}
${mlcTakeaway('The Repeat-Until loop is the engine of every approval workflow. Without it, rejection is a dead end. With it, rejection becomes a revision cycle — the request keeps moving until it reaches approval or is explicitly cancelled.')}`
          },
          {
            title: 'Form Design — Requester View vs Approver View',
            dur: '8 min',
            html: `<h2>Form Design — Requester View vs Approver View</h2>
<p class="mlc-lead">A single form serves two different users in an approval workflow: the requester who submits the request, and the approver who reviews and decides. The <strong>hidden form element</strong> is the mechanism that shows the right fields to the right person at the right time.</p>
${mlcSection('How the Hidden Form Element Works', mlcUl([
  'The form contains all fields — requester inputs AND approver decision panel — in a single form definition',
  'The <code>hidden_form_element</code> is a visibility controller: it hides specified sections from specific users or workflow stages',
  'When the workflow reaches the Human Task node, a Form Update Activity toggles the hidden element to reveal the Deal Approver section',
  'The requester never sees the APPROVED/REJECTED radio buttons; the approver sees everything'
]))}
${mlcCompare(
  '👤 Requester View',
  ['Name field — requester\'s full name', 'Designation / Role field', 'Product Name field', 'Requirements field (text area)', 'Submit button — triggers workflow', 'Deal Approver section: HIDDEN'],
  '✅ Approver View',
  ['All requester fields (read-only for context)', 'APPROVED / REJECTED radio buttons', 'Remarks field for rejection notes', 'Decision submission button', 'Full task context visible', 'Hidden element toggled by Form Update Activity']
)}
${mlcSection('The Form Update Activity', mlcUl([
  'Sits between the form trigger and the Human Task node in the workflow',
  'Its job is to update the hidden field value — switching the visibility state from "requester mode" to "approver mode"',
  'Without the Form Update Activity, the approver would see the same blank form the requester saw — no decision panel',
  'After the Form Update Activity runs, the Human Task node assigns the task with the updated form state'
]))}
${mlcDiagram('Form Visibility Flow', `
<div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;color:#fbbf24;min-width:160px;text-align:center">Requester submits form</div>
    <div style="font-size:12px;color:#94a3b8">Hidden element = ON (approver panel hidden)</div>
  </div>
  <div style="display:flex;align-items:center;gap:12px">
    <div style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;color:#a5b4fc;min-width:160px;text-align:center">Form Update Activity</div>
    <div style="font-size:12px;color:#94a3b8">Flips hidden element → OFF (approver panel revealed)</div>
  </div>
  <div style="display:flex;align-items:center;gap:12px">
    <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;color:#4ade80;min-width:160px;text-align:center">Human Task assigned</div>
    <div style="font-size:12px;color:#94a3b8">Approver sees full form including decision panel</div>
  </div>
</div>`)}
${mlcSection('Design Best Practices', mlcUl([
  '<strong>Label fields clearly</strong> — Approvers need to understand requester intent at a glance; vague field names cause delays',
  '<strong>Make requester fields read-only for approver</strong> — Approvers should review, not edit the original submission',
  '<strong>Always include a Remarks field</strong> — Rejection without explanation leaves requesters unable to correct their submission',
  '<strong>Test both views before deployment</strong> — Submit as a requester, then act as an approver to confirm the visibility toggle works correctly'
]))}
${mlcTakeaway('One form, two experiences. The hidden form element is the key — it keeps the approval interface clean for requesters while revealing the full decision panel to approvers only when the task is ready for review.')}`
          }
        ]
      },

      // ─── MODULE 2: Approval via Email ─────────────────
      {
        title: 'Approval via Email — OTP-Based Access',
        lessons: [
          {
            title: 'Approval via Email — How OTP-Based Login Works',
            dur: '10 min',
            html: `<h2>Approval via Email — How OTP-Based Login Works</h2>
<p class="mlc-lead">Approval via Email is a human-in-the-loop capability that lets approvers act on pending tasks directly from their inbox — without a Bluecopa account, without a password. Their email address is their credential. A One-Time Password sent to the same inbox is the authentication mechanism.</p>
${mlcSection('Why This Matters', mlcUl([
  '<strong>External approvers</strong> — Senior managers, client contacts, or legal reviewers who are not regular Bluecopa users can still participate in approval workflows',
  '<strong>No account setup overhead</strong> — No IT onboarding, no password management, no training required for occasional approvers',
  '<strong>Secure</strong> — Each OTP is unique, time-limited, and single-use; the action link is personal to this approver for this task only',
  '<strong>Mobile-friendly</strong> — Approvers can act from any device that receives email'
]))}
${mlcFlow(['Workflow reaches approval checkpoint', 'Bluecopa sends notification email with unique action link', 'Approver clicks the link', 'Bluecopa generates OTP and sends to same inbox', 'Approver enters OTP on login screen', 'Approver lands directly on the task inside Bluecopa', 'Approver submits decision → workflow continues'])}
${mlcSection('The Six Stages in Detail', mlcUl([
  '<strong>Stage 1 — Workflow Reaches Approval:</strong> A record requiring human review is identified in the automated pipeline',
  '<strong>Stage 2 — Notification Email Sent:</strong> Bluecopa sends a notification email containing task context, record details, and a prominent action button',
  '<strong>Stage 3 — OTP Generated on Click:</strong> The moment the approver clicks the action button, Bluecopa validates the link, identifies the approver\'s email, generates a fresh OTP, and sends it to their inbox',
  '<strong>Stage 4 — Approver Logs In with OTP:</strong> Approver copies the OTP from the second email and enters it on the Bluecopa login screen',
  '<strong>Stage 5 — Approver Acts Inside Platform:</strong> Approver is authenticated and lands directly on the relevant task — no navigation needed',
  '<strong>Stage 6 — Workflow Continues:</strong> Submission triggers the next automated step; the task is closed and the action link is permanently invalidated'
]))}
${mlcSection('OTP Properties', mlcUl([
  '<strong>Delivery:</strong> Sent to the same email that received the action link — no separate OTP channel',
  '<strong>Validity window:</strong> Configurable — typically 15 to 30 days from generation',
  '<strong>Single-use:</strong> Once submitted, the OTP cannot be reused',
  '<strong>Link invalidation:</strong> After the approver acts, the original action link is permanently disabled — it cannot be shared or reused by anyone else',
  '<strong>Personal:</strong> The action link is tied to a specific approver email and a specific task — it cannot be acted on by a different person'
]))}
${mlcTakeaway('Approval via Email removes the biggest friction point in human-in-the-loop workflows: account access. Any person with an email address can be an approver. The OTP ensures the right person is acting on the right task.')}`
          },
          {
            title: 'The Approver Journey — Step by Step',
            dur: '8 min',
            html: `<h2>The Approver Journey — Step by Step</h2>
<p class="mlc-lead">Understanding the approver's experience is essential for configuring email approvals correctly. A poorly written notification email or an unclear action button creates confusion and delays. This lesson walks through every touchpoint from the approver's perspective.</p>
${mlcSection('Step 1 — Receive the Notification Email', mlcUl([
  'The approver receives a notification email in their inbox',
  'The email contains: a personalised greeting, a description of what needs action, a summary of the pending record or task details, and a prominent action button (e.g. "Review & Submit" or "Take Action")',
  '<strong>Important:</strong> The action link is personal to this approver and this task — it cannot be shared, reused, or acted on by anyone else',
  'The email should be configured to include enough context for the approver to understand the request without opening any other system'
]))}
${mlcSection('Step 2 — Click the Action Link', mlcUl([
  'When the approver clicks the action button, Bluecopa immediately validates the link is still active and within its expiry window',
  'Identifies the approver\'s registered email address from the task record',
  'Generates a fresh One-Time Password and sends it to the approver\'s inbox',
  'Redirects the approver\'s browser to the Bluecopa OTP entry screen',
  '<strong>Tip:</strong> The OTP is sent to the same inbox that received the notification — the approver only needs access to their email'
]))}
${mlcSection('Step 3 — Enter OTP and Log In', mlcUl([
  'Approver opens the OTP email, copies the code, and enters it on the Bluecopa login screen',
  'Bluecopa validates the OTP against the task record',
  'On success: approver is authenticated and redirected directly to the task',
  'On failure: OTP expired or already used — approver must request a new action email'
]))}
${mlcSection('Step 4 — Review and Act', mlcUl([
  'Approver lands directly on the assigned task — no dashboard navigation required',
  'The task displays all relevant record details: requester information, submitted data, attachments',
  'Approver performs required operations: reviews details, selects decision (Approve/Reject), adds remarks',
  'Approver submits — this triggers the next automated step in the workflow'
]))}
${mlcCompare(
  '✅ What Makes a Good Email Approval',
  ['Clear subject line identifying the task', 'Requester name and request summary in the body', 'Single prominent action button — no clutter', 'Deadline stated in the email body', 'Reply-to address configured for questions'],
  '❌ Common Configuration Mistakes',
  ['Generic subject line ("Task assigned") with no context', 'No record details — approver must log in to understand', 'Multiple competing buttons confusing the approver', 'No expiry information — approver doesn\'t know urgency', 'No reply-to — approver has no way to ask questions']
)}
${mlcTakeaway('The notification email is the approver\'s first and most important interaction. Treat it like a briefing document: enough context to decide, a single clear action, and a visible deadline. Everything else is friction.')}`
          }
        ]
      },

      // ─── MODULE 3: SLA & Escalation ──────────────────
      {
        title: 'SLA & Escalation Handling',
        lessons: [
          {
            title: 'SLA Concepts — Soft Deadlines & Hard Escalation',
            dur: '10 min',
            html: `<h2>SLA Concepts — Soft Deadlines & Hard Escalation</h2>
<p class="mlc-lead">Every approval workflow has one fundamental risk: someone does not act in time. SLA Handling and Escalation are the mechanisms in Bluecopa that prevent this. Together they ensure that every task has a defined deadline, approvers are reminded automatically, and managers are notified if the deadline is missed.</p>
${mlcSection('What Is an SLA in Bluecopa?', mlcUl([
  'SLA stands for Service Level Agreement — the maximum acceptable time between when a task is assigned and when it must be completed',
  'In Bluecopa, every Human Task node can have its own SLA — the clock starts the moment the task is assigned',
  'If the approver acts in time, the workflow continues normally',
  'If they do not act in time, the platform responds automatically — no manual chase required'
]))}
${mlcCompare(
  '🟡 Soft Deadline',
  ['Configured via: Due (In Hours)', 'Effect: Sends in-app reminder alerts to the approver\'s Alerts tab', 'Approver CAN still submit after soft deadline fires', 'Purpose: Remind before the hard deadline hits', 'Example: Due = 48 hours → alert fires at hour 44 (if offset = 4)'],
  '🔴 Hard Deadline',
  ['Configured via: Timeout (Seconds)', 'Effect: Routes workflow to the escalation branch; task is timed out', 'Approver CANNOT submit after timeout fires', 'Purpose: Escalate to manager when deadline is missed', 'Example: Timeout = 86400 (24 hours) → escalation fires at hour 24']
)}
${mlcSection('The Two-Layer Model', mlcUl([
  'Soft Deadline (Due) and Hard Deadline (Timeout) are <strong>independent</strong> — they run in parallel, not in sequence',
  'You can set Due = 48 hours and Timeout = 86400 seconds (24 hours): alerts start at hour 44 but escalation fires at hour 24',
  '<strong>Continue on Timeout</strong> must be UNCHECKED — if it is checked, the timeout branch never fires and escalation never happens',
  'Both layers are configured on the same Human Task node — there is no separate "escalation node"'
]))}
${mlcStatGrid([
  { n: '48h', l: 'Typical soft deadline for standard approvals', note: 'Alert fires before this' },
  { n: '86400s', l: '24 hours in seconds — common timeout value', note: '= 24 × 60 × 60' },
  { n: '172800s', l: '48 hours in seconds', note: '= 48 × 60 × 60' },
  { n: '60 min', l: 'Typical alert repeat interval after first reminder', note: 'Configurable' }
])}
${mlcSection('What Happens When Escalation Fires', mlcUl([
  'The Human Task is marked as timed out — the approver loses the ability to submit',
  'The workflow routes to the escalation branch (configured in the timeout path)',
  'An escalation email is automatically sent to the manager or designated escalation recipient',
  'The escalation branch can: notify a manager, reassign the task, or trigger a different approval path',
  'The original requester may also receive a notification that their request is under escalation'
]))}
${mlcTakeaway('SLA without escalation is just a deadline that nobody enforces. Bluecopa\'s two-layer model — soft alerts for reminders, hard timeout for escalation — makes every deadline enforceable without any manual intervention.')}`
          },
          {
            title: 'The Five SLA Configuration Fields',
            dur: '10 min',
            html: `<h2>The Five SLA Configuration Fields</h2>
<p class="mlc-lead">Every Human Task node in Bluecopa exposes five SLA fields. Understanding what each one controls — and how they interact — is essential for building approval workflows that escalate correctly.</p>
${mlcSection('Field Reference', mlcUl([
  '<strong>Due (In Hours)</strong> — The SLA window: how long the approver has from task assignment. Example: 48 means 48 hours from assignment. This is the soft deadline.',
  '<strong>Due Alert Offset (In Hours)</strong> — How many hours before the Due time the first reminder fires. Example: Due = 48, Offset = 4 means first alert fires at hour 44.',
  '<strong>Due Alert Interval (In Minutes)</strong> — How often the reminder repeats after the first alert. Example: 60 means a new in-app alert every hour until the approver acts.',
  '<strong>Timeout (Seconds)</strong> — The hard deadline. When this timer reaches zero, the escalation branch fires. Example: 172800 = 48 hours, 86400 = 24 hours.',
  '<strong>Continue on Timeout</strong> — Must be UNCHECKED. If checked, the timeout path is bypassed and escalation never fires even if the timer runs out.'
]))}
${mlcDiagram('SLA Timeline — Example Configuration', `
<div style="padding:12px 0">
  <div style="position:relative;height:60px;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;margin-bottom:12px">
    <div style="position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;padding:0 12px;gap:4px">
      <div style="flex:1;height:6px;background:rgba(34,197,94,0.3);border-radius:3px;position:relative">
        <div style="position:absolute;right:0;top:-18px;font-size:10px;color:#4ade80">Hour 44 — First Alert</div>
      </div>
      <div style="width:2px;height:30px;background:#fbbf24"></div>
      <div style="width:80px;height:6px;background:rgba(245,158,11,0.4);border-radius:3px;position:relative">
        <div style="position:absolute;right:0;top:-18px;font-size:10px;color:#fbbf24;white-space:nowrap">Hour 48 — Due</div>
      </div>
      <div style="width:2px;height:30px;background:#f87171"></div>
      <div style="width:40px;font-size:10px;color:#f87171;white-space:nowrap">Timeout → Escalation</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:6px;padding:8px 10px;color:#86efac"><strong>Soft Zone (Hours 0–48)</strong><br>Approver can still submit. Reminder alerts fire from hour 44 onward, every 60 min.</div>
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:8px 10px;color:#fca5a5"><strong>Escalation Zone (After Timeout)</strong><br>Task times out. Escalation email fires. Approver can no longer submit.</div>
  </div>
</div>`)}
${mlcSection('Common Configuration Patterns', mlcUl([
  '<strong>Standard business approval (48h SLA):</strong> Due = 48h, Offset = 4h, Interval = 60 min, Timeout = 172800s (48h)',
  '<strong>Urgent approval (24h SLA):</strong> Due = 24h, Offset = 2h, Interval = 30 min, Timeout = 86400s (24h)',
  '<strong>Soft reminder only (no hard escalation):</strong> Due = 48h, Offset = 4h, Interval = 60 min, Timeout = very large value (e.g. 30 days in seconds)',
  '<strong>Escalation-first (hard deadline before soft):</strong> Possible but unusual — Timeout fires before Due alerts; used when hard deadlines are contractual'
]))}
${mlcSection('Critical Mistakes to Avoid', mlcUl([
  '❌ <strong>Leaving "Continue on Timeout" checked</strong> — The escalation branch will never fire; the workflow waits indefinitely',
  '❌ <strong>Setting Due and Timeout to the same value</strong> — Due is in hours, Timeout is in seconds; 48 hours ≠ 48 seconds',
  '❌ <strong>No escalation path configured</strong> — If the timeout fires but there is no action on the escalation branch, the workflow silently stalls',
  '❌ <strong>Forgetting to test with accelerated timers</strong> — Always test escalation with a very short timeout (e.g. 60 seconds) before deploying to production'
]))}
${mlcTakeaway('The five fields work together: Due sets the soft window, Offset and Interval control the reminders within that window, Timeout sets the hard cut-off, and Continue on Timeout must be OFF. Get these five right and the workflow enforces itself.')}`
          },
          {
            title: 'Escalation Branches & Timeout in Practice',
            dur: '8 min',
            html: `<h2>Escalation Branches & Timeout in Practice</h2>
<p class="mlc-lead">Configuring the five SLA fields is only half the job. The escalation branch — what happens after the timeout fires — is where most implementations either succeed or silently fail. This lesson covers how to build an effective escalation path.</p>
${mlcSection('What the Escalation Branch Contains', mlcUl([
  'The escalation branch is the "timeout path" out of the Human Task node — it fires when Timeout reaches zero and Continue on Timeout is OFF',
  'Minimum viable escalation: an <strong>Email node</strong> that notifies the manager or team lead with task details and the original request summary',
  'Better escalation: Email to manager + in-app alert to requester explaining the delay + optional reassignment of the task to a backup approver',
  'Full escalation: Email chain + Slack notification + task reassignment + audit log entry recording the breach'
]))}
${mlcFlow(['Timeout fires (Timeout seconds elapsed)', 'Human Task marked as TIMED OUT', 'Workflow exits Human Task via timeout path', 'Escalation Email node fires → manager notified', 'Optional: Reassign task to backup approver', 'Optional: Alert requester of the delay', 'Workflow continues from escalation point'])}
${mlcSection('Designing the Escalation Email', mlcUl([
  '<strong>Recipient:</strong> Manager or designated escalation contact — not the original approver (they already received reminders)',
  '<strong>Subject:</strong> Clear and urgent — e.g. "ACTION REQUIRED: [Request Name] approval overdue by [X] hours"',
  '<strong>Body:</strong> Include requester name, request summary, original due time, and how long it has been overdue',
  '<strong>Link:</strong> Deep link to the task in Bluecopa so the manager can act immediately without navigating',
  '<strong>Tone:</strong> Informational, not accusatory — escalation is a process failure, not necessarily a personal failure'
]))}
${mlcCompare(
  '✅ Effective Escalation Branch',
  ['Manager email with full request context', 'Requester notified the approval is delayed', 'Task reassigned to backup approver', 'Audit log records the timeout event', 'SLA breach metric captured for reporting'],
  '❌ Weak Escalation Branch',
  ['Generic email with no request details', 'Requester left in the dark', 'Task remains with original approver (who is unresponsive)', 'No record of the breach', 'No reporting — escalations are invisible']
)}
${mlcSection('Testing Escalation Before Go-Live', mlcUl([
  'Set Timeout to 60 seconds on the task node for testing purposes',
  'Submit a test request and do NOT act on the approval task',
  'After 60 seconds, confirm the escalation email arrives at the configured manager address',
  'Confirm the task is marked as timed out and the requester receives the delay notification if configured',
  'Reset Timeout to the production value before deploying'
]))}
${mlcTakeaway('An escalation branch that sends a vague email to no one is worse than no escalation at all — it creates a false sense of safety. Design every escalation branch as if you are the manager receiving the alert: context, urgency, and a direct link to act.')}`
          }
        ]
      },

      // ─── MODULE 4: Advanced Patterns ─────────────────
      {
        title: 'Advanced Approval Patterns',
        lessons: [
          {
            title: 'Conditional Routing — Document Classification & Routing',
            dur: '12 min',
            html: `<h2>Conditional Routing — Document Classification & Routing</h2>
<p class="mlc-lead">Conditional routing takes the basic approve/reject pattern and extends it: instead of a binary decision, the approver selects a classification, and the workflow routes the document to different destinations based on that choice. This pattern eliminates manual file sorting entirely.</p>
${mlcSection('The Business Problem', mlcUl([
  'Organisations receive multiple document types — Invoices, Purchase Orders, Delivery Challans — through a single intake channel',
  'Manually reviewing and sorting these into the correct repositories is time-consuming and error-prone',
  'The conditional routing workflow lets the approver classify the document and the system automatically routes it — no manual file movement required'
]))}
${mlcSection('The Six Key Components', mlcOl([
  '<strong>Form Trigger</strong> — Initiates the workflow when a user uploads a document via the File Drop control',
  '<strong>Form Update Activity</strong> — Updates the hidden field to reveal the Selection Panel to the approver',
  '<strong>Approver Task</strong> — Approver previews the uploaded document and selects its type',
  '<strong>Selection Panel</strong> — Provides four classification options: Invoice, PO, DC, or Reject',
  '<strong>Conditional Routing node</strong> — Evaluates the selected document type and determines the routing path (one branch per document type)',
  '<strong>Drop To Filebox</strong> — Moves the file to the designated Filebox repository for the selected type'
]))}
${mlcFlow(['User uploads document via form', 'Form Update Activity reveals Selection Panel to approver', 'Human Task assigned to approver', 'Approver previews document and selects type', 'Condition evaluates selection', 'Invoice → Filebox A | PO → Filebox B | DC → Filebox C | Reject → notify user'])}
${mlcSection('How the Condition Node Works', mlcUl([
  'The Condition node reads the value of the Selection Panel field from the form',
  'It evaluates the value against configured rules: if value = "Invoice" → take branch 1; if value = "PO" → take branch 2; etc.',
  'Each branch leads to a Drop To Filebox node configured for the appropriate repository',
  'The Reject branch leads to a notification back to the original user — no file is moved',
  'All branches eventually merge or terminate — no branch should be left dangling'
]))}
${mlcCompare(
  '✅ What This Achieves',
  ['Automated sorting — no manual file movement', 'Consistent routing — same logic every time', 'Faster processing — routing is instant after submission', 'Scalable — add new document types by adding branches', 'Auditable — every routing decision is recorded'],
  '❌ Without This Pattern',
  ['Someone must manually review every uploaded document', 'Files get misrouted when the reviewer is tired or distracted', 'Processing time depends on when someone checks the queue', 'Adding a new document type requires process redesign', 'No automatic record of where each document went']
)}
${mlcSection('Extending the Pattern', mlcUl([
  '<strong>Sub-classifications:</strong> Add a second condition layer — e.g. Invoice can branch into Domestic vs International based on a secondary field',
  '<strong>Validation before routing:</strong> Add a validation step before the condition — reject documents that fail format or completeness checks before asking the approver to classify',
  '<strong>Parallel routing:</strong> Some documents may need to go to multiple Fileboxes — use parallel branches after the condition',
  '<strong>Notification per path:</strong> Add an email notification on each branch to inform downstream teams that a document has arrived in their Filebox'
]))}
${mlcTakeaway('Conditional routing transforms the approver from a manual sorter into a classifier. They make one decision; the platform handles all the logistics. Every branch is automatic, consistent, and auditable.')}`
          },
          {
            title: 'Maker-Checker — Multi-Level Authorization, Rejection Loops & Audit Trail',
            dur: '15 min',
            html: `<h2>Maker-Checker — Multi-Level Authorization, Rejection Loops & Audit Trail</h2>
<p class="mlc-lead">The Maker-Checker pattern is the most rigorous approval structure in Bluecopa. Two distinct roles — the Maker who prepares and submits, and the Checker who independently validates — ensure that no single person can unilaterally complete a high-risk transaction. Iteration loops and audit trails make the cycle both repeatable and fully accountable.</p>
${mlcSection('Why Maker-Checker Exists', mlcUl([
  '<strong>Risk mitigation:</strong> Critical transactions — payment rate cards, volume discounts, configuration changes — carry financial risk that single-operator execution cannot safely absorb',
  '<strong>Separation of duties:</strong> The Maker cannot approve their own submission; the Checker cannot initiate a submission they will review',
  '<strong>Compliance:</strong> Many financial and regulatory frameworks mandate an independent verification step before high-value configurations are committed',
  '<strong>Error interception:</strong> Errors caught at the Checker gate are correctable; errors that reach downstream systems often require costly remediation'
]))}
${mlcSection('The Two Roles', mlcUl([
  '<strong>The Maker (Uploader):</strong> Initiates the task, configures data, uploads the primary data sheet via the workflow form. Owns the data entry phase entirely. Once submitted, editing privileges on core fields are locked until a rejection event restores them.',
  '<strong>The Checker (Approver):</strong> The independent second-level user — typically an L0/L1 manager or Bizfin controller — who receives the submitted form for review. Validates data against source documents and business rules. Cannot edit Maker-owned fields. Either signs off (advancing to next stage) or formally rejects with documented commentary.'
]))}
${mlcFlow(['Maker prepares and submits data', 'Checker receives task in review queue', 'Checker validates against source documents', 'Decision: Approve → advance to next stage', 'Decision: Reject → rejection with commentary sent to Maker', 'Maker receives revision task with Checker\'s notes', 'Maker corrects and resubmits', 'Loop repeats until Checker approves or escalation fires'])}
${mlcSection('The Iteration Loop', mlcUl([
  'The Repeat-Until loop wraps the Maker-Checker cycle — it continues until the Checker approves or an escalation condition is met',
  'On rejection: the Maker\'s editing privileges are restored; they receive a task with the Checker\'s specific rejection comments',
  'The Maker corrects the identified issues and resubmits — the Checker reviews the updated version',
  'Each iteration is a full cycle: Maker submits → Checker reviews → decision → if rejected, loop again',
  'The loop has no inherent limit — it runs until approval or manual termination'
]))}
${mlcSection('Audit Trail & Traceability', mlcUl([
  '<strong>Every submission is timestamped</strong> — when the Maker submitted, when the Checker received the task, when the decision was made',
  '<strong>Every rejection is documented</strong> — the Checker\'s commentary is stored with the rejection event; it cannot be edited after submission',
  '<strong>Role attribution</strong> — each action is attributed to the specific named user (Maker name, Checker name) — not just a role or team',
  '<strong>Iteration count</strong> — the audit trail records how many loops occurred before final approval; high loop counts flag process quality issues',
  '<strong>Final approval record</strong> — the Checker\'s sign-off is permanently recorded; this is the compliance artefact'
]))}
${mlcCompare(
  '✅ Maker-Checker Best Practices',
  ['Maker and Checker must be different named individuals', 'Checker commentary is mandatory on rejection', 'All Maker-owned fields are locked during Checker review', 'Audit trail is immutable after each action', 'Escalation configured if Checker does not act within SLA'],
  '❌ Common Implementation Gaps',
  ['Same person assigned as both Maker and Checker (defeats the purpose)', 'Rejection allowed without mandatory commentary field', 'Checker can edit Maker fields (breaks separation of duties)', 'Audit log is optional or can be cleared', 'No SLA on the Checker task — approval can be delayed indefinitely']
)}
${mlcTakeaway('The Maker-Checker pattern is not just an approval — it is a control framework. The loop, the locked fields, the mandatory commentary, and the immutable audit trail together create a process where every high-risk transaction is independently verified, every rejection is documented, and every approval is fully accountable.')}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Which component controls what fields are visible to the requester versus the approver in a single form?', opts: ['Human Task node', 'Condition node', 'Hidden form element', 'Form Update Activity'], a: 2, exp: 'The hidden_form_element controls field visibility. The Form Update Activity then toggles it — but the element itself is the visibility controller. The Form Update Activity changes its state; the hidden element determines what is shown.' },
      { q: 'In a Repeat-Until approval loop, when does the loop exit?', opts: ['After the first rejection', 'When the requester submits for the third time', 'When the consent field equals APPROVED', 'When the workflow timer expires'], a: 2, exp: 'The Repeat-Until loop exits when its condition is satisfied — consent_field === "APPROVED". It continues looping through rejection and resubmission cycles until the approver approves the request.' },
      { q: 'A workflow has Due = 48h and Timeout = 86400 seconds. In what order do events fire?', opts: ['Timeout fires at hour 24, alerts start at hour 44, Due fires at hour 48', 'Alerts start at hour 44, Due fires at hour 48, Timeout fires at hour 48', 'Due fires at hour 48, then Timeout fires after another 24 hours', 'Timeout and Due fire simultaneously at hour 24'], a: 0, exp: '86400 seconds = 24 hours. So Timeout fires at hour 24 (hard escalation). Due = 48 hours with typical offset means alerts start at hour 44. Due and Timeout are independent — Timeout can fire before Due.' },
      { q: 'What must be the state of "Continue on Timeout" for escalation to fire correctly?', opts: ['Checked (enabled)', 'Unchecked (disabled)', 'Does not matter — timeout fires regardless', 'Only relevant when SLA > 24 hours'], a: 1, exp: 'Continue on Timeout must be UNCHECKED. If it is checked, the timeout branch is bypassed and escalation never fires — the workflow behaves as if no timeout was set.' },
      { q: 'In Approval via Email, when is the OTP generated?', opts: ['When the workflow reaches the approval checkpoint', 'When the notification email is sent', 'When the approver clicks the action link', 'When the approver enters their email address on the login screen'], a: 2, exp: 'The OTP is generated on demand — the moment the approver clicks the action link. Bluecopa validates the link, identifies the approver\'s email, generates a fresh OTP, and immediately sends it to that inbox.' },
      { q: 'What happens to the action link after the approver completes their task in Approval via Email?', opts: ['It expires after 24 hours automatically', 'It is permanently invalidated and cannot be reused', 'It can be shared with a colleague for backup approval', 'It remains active for the configured OTP validity window'], a: 1, exp: 'Once the approver submits their decision, the action link is permanently invalidated. It cannot be shared, reused, or acted on by anyone else — not even the original approver.' },
      { q: 'In a Conditional Routing workflow, what node evaluates the approver\'s document classification selection?', opts: ['Human Task node', 'Form Update Activity', 'Drop To Filebox node', 'Condition node'], a: 3, exp: 'The Condition node reads the Selection Panel field value and evaluates it against configured rules (Invoice → branch 1, PO → branch 2, etc.). It then routes the workflow to the appropriate Filebox branch.' },
      { q: 'Which statement correctly describes the Maker\'s editing privileges in a Maker-Checker workflow?', opts: ['The Maker can edit fields at any time including during Checker review', 'The Maker\'s editing privileges are locked after submission until a rejection event restores them', 'Only the Checker can edit fields once the workflow starts', 'Editing privileges depend on which role is assigned in the workflow settings'], a: 1, exp: 'Once the Maker submits, their editing privileges on core data fields are locked. The Checker reviews a frozen version of the data. If the Checker rejects, the rejection event restores the Maker\'s editing privileges so they can correct the identified issues.' },
      { q: 'What is the primary purpose of the Due Alert Offset field in Human Task SLA configuration?', opts: ['Sets how long the approver has before the task is timed out', 'Defines how many hours before the Due deadline the first reminder fires', 'Controls how often reminder alerts repeat', 'Determines when the escalation email is sent to the manager'], a: 1, exp: 'Due Alert Offset sets how many hours before the Due deadline the first reminder fires. For example, Due = 48h and Offset = 4h means the first alert fires at hour 44 — giving the approver advance warning before the soft deadline.' },
      { q: 'In the Maker-Checker pattern, what is mandatory when a Checker rejects a submission?', opts: ['The Checker must immediately reassign the task to another Checker', 'The Checker must provide documented rejection commentary', 'The Maker receives an automatic SLA extension', 'A third-party auditor must be notified'], a: 1, exp: 'Rejection must include documented commentary from the Checker. This commentary is stored with the rejection event, is immutable, and is what the Maker receives to understand what needs to be corrected. Rejection without commentary leaves the Maker unable to fix the right issues.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 8 — RECONCILIATION
  // ════════════════════════════════════════════════════
  rc: {
    modules: [

      // ─── MODULE 1: Fundamentals ──────────────────────
      {
        title: 'Reconciliation Fundamentals',
        lessons: [
          {
            title: 'What Is Reconciliation in Bluecopa?',
            dur: '10 min',
            html: `<h2>What Is Reconciliation in Bluecopa?</h2>
<p class="mlc-lead">Reconciliation is the process of comparing two datasets — from different systems — and verifying they agree based on predefined business rules. In Bluecopa, an automated reconciliation engine processes large datasets, applies sophisticated matching logic, identifies exceptions, and provides detailed analysis — replacing the manual spreadsheet process entirely.</p>
${mlcSection('Why Reconciliation Is Necessary', mlcUl([
  '<strong>Multiple systems, one truth</strong> — Organisations maintain financial data across ERPs, banks, payment gateways, accounting platforms, and operational apps. Each records transactions independently.',
  '<strong>Discrepancies are inevitable</strong> — Timing differences, missing records, data entry errors, and integration issues create gaps between systems.',
  '<strong>Manual reconciliation is unsustainable</strong> — Spreadsheet-based comparison is time-consuming, error-prone, and impossible to scale across thousands of daily transactions.',
  '<strong>Regulatory requirement</strong> — Accurate financial records are a compliance obligation; reconciliation is the verification mechanism that ensures no transaction is lost or duplicated.'
]))}
${mlcSection('Common Reconciliation Scenarios', mlcUl([
  '<strong>Bank Statement vs ERP Transactions</strong> — Verify every bank debit/credit against the corresponding ERP journal entry',
  '<strong>Payment Gateway Settlements vs Sales Orders</strong> — Match Stripe, Razorpay, or other gateway settlements to their originating orders',
  '<strong>Customer Payments vs Invoices</strong> — Confirm every inbound payment is applied to the correct invoice',
  '<strong>General Ledger vs Sub-Ledger Balances</strong> — Ensure sub-ledger totals roll up correctly to the GL',
  '<strong>Intercompany Transactions</strong> — Match transactions between entities in a group to eliminate intercompany balances'
]))}
${mlcDiagram('The Reconciliation Problem', `
<div style="display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px 0">
  <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:12px 18px;text-align:center;min-width:110px">
    <div style="font-size:20px;margin-bottom:4px">🏦</div>
    <div style="font-size:11px;font-weight:600;color:#c4b5fd">System A</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:2px">ERP / Ledger</div>
  </div>
  <div style="text-align:center">
    <div style="font-size:24px;color:#6b7280">⟷</div>
    <div style="font-size:10px;color:#f59e0b;font-weight:600;margin-top:2px">Compare &amp; Match</div>
  </div>
  <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:12px 18px;text-align:center;min-width:110px">
    <div style="font-size:20px;margin-bottom:4px">💳</div>
    <div style="font-size:11px;font-weight:600;color:#c4b5fd">System B</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:2px">Bank / Gateway</div>
  </div>
  <div style="color:#6b7280;font-size:20px">→</div>
  <div style="display:flex;flex-direction:column;gap:6px">
    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:6px;padding:6px 12px;font-size:11px;color:#4ade80;font-weight:600">✅ Matched</div>
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:6px 12px;font-size:11px;color:#f87171;font-weight:600">❌ Exceptions</div>
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:6px 12px;font-size:11px;color:#fbbf24;font-weight:600">⚠️ Missing</div>
  </div>
</div>`)}
${mlcSection('What Bluecopa Automates', mlcUl([
  '<strong>Data ingestion</strong> — Pulls both datasets from configured sources (cloud storage, connectors, manual upload)',
  '<strong>Rule-based matching</strong> — Applies your configured match rules across thousands of records in seconds',
  '<strong>Exception classification</strong> — Every unmatched record is automatically classified: Left Missing, Right Missing, or Unmatched',
  '<strong>Audit trail</strong> — Every match, manual match, and exception is recorded with a timestamp and source',
  '<strong>Notifications</strong> — Sends alerts to accountants, controllers, or finance managers when a run completes'
]))}
${mlcTakeaway('Reconciliation is not just a month-end task — it is a continuous data integrity check. Bluecopa turns what used to take hours of manual spreadsheet work into an automated, auditable process that runs on demand or on schedule.')}`
          },
          {
            title: 'Reconciliation Types — Match vs Balance',
            dur: '8 min',
            html: `<h2>Reconciliation Types — Match vs Balance</h2>
<p class="mlc-lead">Bluecopa supports two fundamentally different reconciliation methodologies. Choosing the right type for your use case determines whether you are comparing individual transactions or verifying that totals agree — and the configuration differs significantly between them.</p>
${mlcCompare(
  '🔍 Match Reconciliation (Line-by-Line)',
  ['Compares individual transactions row by row', 'Asks: does a corresponding transaction exist in BOTH systems?', 'Result: each record is Matched, Left Missing, or Right Missing', 'Best for: high-volume transactional data', 'Examples: Invoice vs Customer Payment · Sales Order vs Payment Gateway · ERP Entry vs Bank Transaction'],
  '⚖️ Balance Reconciliation',
  ['Compares summarized totals rather than individual rows', 'Asks: do the closing balances agree between systems?', 'Result: balances match or a difference amount is identified', 'Best for: period-end closing and summary verification', 'Examples: GL vs Sub-Ledger · Trial Balance Validation · Bank Closing Balance Verification']
)}
${mlcSection('How to Choose the Right Type', mlcUl([
  '<strong>Use Match Reconciliation when</strong> you need to identify which specific transactions are missing or unmatched — the output tells you the exact record that needs investigation',
  '<strong>Use Balance Reconciliation when</strong> you only need to verify that totals agree — the output tells you whether the difference is zero or how large the gap is',
  '<strong>A common combination</strong> — Run Match Reconciliation daily for transaction-level verification, and Balance Reconciliation at month-end to confirm closing positions',
  '<strong>Balance Reconciliation cannot replace Match</strong> — Balanced totals can hide individual errors that cancel each other out; Match Reconciliation catches these'
]))}
${mlcStatGrid([
  { n: 'Match', l: 'Row-by-row transaction comparison', note: 'Most common type' },
  { n: 'Balance', l: 'Summarized total verification', note: 'Period-end focus' },
  { n: '3', l: 'Match results: Matched / Left Missing / Right Missing', note: 'Per record' },
  { n: '1', l: 'Balance result: difference amount', note: 'Single aggregate' }
])}
${mlcSection('Selecting the Type During Setup', mlcUl([
  'The reconciliation type is selected in Step 1 (Basic Details) when creating a new reconciliation',
  'Once a reconciliation is saved and run, the type cannot be changed — you must create a new configuration',
  'The type determines which matching rule options are available in subsequent configuration steps',
  'Match Reconciliation requires Rule Groups; Balance Reconciliation requires column mappings for the totals being compared'
]))}
${mlcTakeaway('Match Reconciliation gives you precision — which specific record is missing. Balance Reconciliation gives you speed — whether the totals agree. Most enterprise finance teams use both: Match for daily operations, Balance for period-end close.')}`
          },
          {
            title: 'Dataset Prerequisites — Four Requirements',
            dur: '8 min',
            html: `<h2>Dataset Prerequisites — Four Requirements</h2>
<p class="mlc-lead">Before configuring a reconciliation, your datasets must meet four requirements. Failing any one of them causes the reconciliation to produce incorrect results or fail entirely — often silently, which makes them hard to debug after the fact.</p>
${mlcSection('The Four Requirements', mlcOl([
  '<strong>Transaction-Level Data</strong> — Both datasets must contain individual transaction records, not aggregated or summarized data. Using summaries produces incorrect results because the matching engine compares rows, not totals.',
  '<strong>Consistent Column Names</strong> — Column names must be standardized across both datasets. "Amount" and "amount" are treated as different columns — inconsistent casing causes validation errors during rule configuration.',
  '<strong>Matching Data Types</strong> — Columns used in match rules must have identical data types. Valid: Amount (Number) ↔ Amount (Number). Invalid: Amount (Number) ↔ Amount (Text). Type mismatches cause silent failures.',
  '<strong>Unique Key Values</strong> — Columns selected as keys (identifiers) must contain unique values. Duplicate IDs cause duplicate reconciliation records and incorrect matches that are difficult to unravel after the run.'
]))}
${mlcCompare(
  '✅ Dataset Ready for Reconciliation',
  ['Individual transaction rows — one row per payment/invoice', 'Column named "TransactionID" in both left and right datasets', 'Amount column is Number type in both datasets', 'TransactionID values are unique — no duplicates'],
  '❌ Dataset Will Cause Problems',
  ['Monthly summary totals — "January total: ₹4,50,000"', 'Left dataset: "Amount" | Right dataset: "amount" (casing mismatch)', 'Left: Amount (Number) | Right: Amount (Text from CSV)', 'TransactionID contains duplicates — same ID for two records']
)}
${mlcSection('How to Verify Your Datasets', mlcUl([
  '<strong>Check for aggregates:</strong> If your dataset has one row per day/month/category, it is summarized — you need the underlying transaction file',
  '<strong>Check column names:</strong> Open both datasets side by side and compare column headers exactly — case, spacing, and spelling must match',
  '<strong>Check data types:</strong> In the Bluecopa Dataset viewer, inspect the column type icons — Number (123), Text (Abc), Date (📅) must match on both sides for join columns',
  '<strong>Check for duplicates:</strong> Run a simple count-distinct on your key column — if distinct count < total rows, you have duplicates to resolve'
]))}
${mlcSection('Fixing Common Issues Before Running', mlcUl([
  '<strong>Naming mismatch:</strong> Rename columns in the source file before ingestion, or use a transformation step to standardize names',
  '<strong>Type mismatch:</strong> Ensure the ingestion pipeline parses amounts as numbers — CSV files often import numeric columns as text if not configured correctly',
  '<strong>Duplicate keys:</strong> Investigate and resolve duplicate IDs in the source — deduplication logic should live upstream in the ingestion pipeline, not in the reconciliation config',
  '<strong>Summary data:</strong> Contact the source system team for transaction-level exports — reconciliation cannot be decomposed from summary data'
]))}
${mlcTakeaway('Garbage in, garbage out. Every reconciliation failure that looks like a configuration problem is usually a data quality problem. Verify these four requirements before you touch the reconciliation config and you will eliminate the most common class of failures.')}`
          }
        ]
      },

      // ─── MODULE 2: Building a Reconciliation ─────────
      {
        title: 'Building a Reconciliation',
        lessons: [
          {
            title: 'Creating a New Reconciliation — Five Configuration Steps',
            dur: '10 min',
            html: `<h2>Creating a New Reconciliation — Five Configuration Steps</h2>
<p class="mlc-lead">Every reconciliation in Bluecopa is configured through five sequential steps. Each step builds on the previous — get the foundation right in Steps 1 and 2 before investing time in matching rules. The configuration is saved and reusable; you run it repeatedly against new data.</p>
${mlcFlow(['Step 1: Basic Details', 'Step 2: Dataset Selection', 'Step 3: Define Matching Rules', 'Step 4: Configure Notifications', 'Step 5: Save and Execute'])}
${mlcSection('Step 1 — Basic Details', mlcUl([
  '<strong>Name:</strong> Give the reconciliation a meaningful, specific name — e.g. "Monthly Bank Reconciliation — HDFC Current Account" or "Stripe Settlement vs Sales Orders — Daily"',
  '<strong>Type:</strong> Select Match (line-by-line) or Balance (totals) — this cannot be changed after saving',
  '<strong>Best practice:</strong> Include the source systems and frequency in the name so any team member can identify the reconciliation without opening it'
]))}
${mlcSection('Step 2 — Dataset Selection', mlcUl([
  '<strong>Primary Dataset (Left):</strong> Your source of truth — typically ERP records, internal ledger, or the system you control',
  '<strong>Secondary Dataset (Right):</strong> The source being verified — bank statements, payment gateway exports, or external partner data',
  '<strong>Important:</strong> The "left" and "right" designation matters — Copa Match Group results label missing records as "Left Missing" or "Right Missing" based on which dataset the record is absent from',
  '<strong>Both datasets must already be ingested</strong> into Bluecopa before this step — configure your data pipelines first'
]))}
${mlcSection('Step 3 — Define Matching Rules', mlcUl([
  'Configure Rule Groups that define how transactions are matched across the two datasets',
  'Each Rule Group contains one or more conditions — all conditions in a group must be satisfied simultaneously for a match',
  'Multiple Rule Groups provide fallback logic — if Rule Group 1 fails to match, Rule Group 2 tries with looser criteria',
  'This step is the most critical — covered in depth in the next lesson'
]))}
${mlcSection('Step 4 — Configure Notifications', mlcUl([
  'Select recipients who should receive alerts when a reconciliation run completes — accountants, finance managers, controllers',
  'Notifications are sent for both Succeeded and Failed run statuses',
  'Include the reconciliation owner and at least one backup — never configure notifications to a single person',
  'Failed run notifications should go to the implementation team as well — data type mismatches and missing columns need engineering attention'
]))}
${mlcSection('Step 5 — Save and Execute', mlcUl([
  '<strong>Save:</strong> Persists the configuration — the reconciliation appears on the dashboard and can be run repeatedly',
  '<strong>Run All (Full Refresh):</strong> All records from both datasets participate; previous results are recalculated from scratch',
  '<strong>Run (Incremental):</strong> Only newly ingested data participates; previously reconciled records are preserved',
  '<strong>First run:</strong> Always use Run All on the first execution to establish the baseline; switch to incremental Run for daily operations'
]))}
${mlcTakeaway('The five steps follow a logical dependency: you need a name and type before selecting datasets, datasets before writing rules, and rules before running. Rushing steps 1 and 2 is the most common cause of rule configuration rework.')}`
          },
          {
            title: 'Configuring Match Rules & Rule Groups',
            dur: '12 min',
            html: `<h2>Configuring Match Rules & Rule Groups</h2>
<p class="mlc-lead">Match Rules are the heart of reconciliation. They define the conditions under which a left-dataset record is considered to match a right-dataset record. Rule Groups let you configure multiple matching strategies — from exact matching down to fallback approximate matching — in a single reconciliation.</p>
${mlcSection('What Is a Rule Group?', mlcUl([
  'A Rule Group is a set of conditions that must ALL be satisfied simultaneously for two records to be considered a match',
  'You can have multiple Rule Groups in a single reconciliation — each group defines a different matching strategy',
  'Rule Groups are evaluated in priority order — the first group to match a record claims it; that record is removed from the pool and never re-evaluated by later groups',
  'Think of Rule Groups as a hierarchy: Rule Group 1 is your strictest, most reliable match; later groups are fallbacks for records that don\'t meet the stricter criteria'
]))}
${mlcSection('Example Rule Groups', mlcUl([
  '<strong>Rule Group 1 — Exact match:</strong> Transaction ID (Left) = Transaction ID (Right) AND Amount (Left) = Amount (Right) → strict two-field exact match',
  '<strong>Rule Group 2 — Reference-based:</strong> Reference Number (Left) = Reference Number (Right) AND Amount (Left) = Amount (Right) → for records where Transaction ID differs but reference aligns',
  '<strong>Rule Group 3 — Date + Amount fallback:</strong> Date (Left) = Date (Right) AND Amount (Left) = Amount (Right) → last-resort match for records missing a reference'
]))}
${mlcDiagram('Rule Group Priority Flow', `
<div style="display:flex;flex-direction:column;gap:0;padding:8px 0">
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:8px 8px 0 0">
    <div style="background:#7c3aed;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">1</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Rule Group 1</strong> — All records evaluated. Matches removed from pool.</div>
  </div>
  <div style="display:flex;justify-content:center;padding:4px 0;color:#6b7280;font-size:16px">↓ Remaining unmatched records only</div>
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.2)">
    <div style="background:#6d28d9;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">2</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Rule Group 2</strong> — Only unmatched records from Step 1. Further matches removed.</div>
  </div>
  <div style="display:flex;justify-content:center;padding:4px 0;color:#6b7280;font-size:16px">↓ Remaining unmatched records only</div>
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.15);border-radius:0 0 8px 8px">
    <div style="background:#5b21b6;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">3</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Rule Group 3</strong> — Final fallback. Remaining records become Left/Right Missing.</div>
  </div>
</div>`)}
${mlcSection('Why Rule Priority Matters', mlcUl([
  '<strong>No duplicate matching</strong> — A record matched by Group 1 cannot also be matched by Group 2; this prevents the same transaction appearing as matched twice',
  '<strong>Faster processing</strong> — Each subsequent group processes a smaller pool (only unmatched records), reducing computation time',
  '<strong>Clear rule ownership</strong> — You can see in Copa Match Group exactly which rule matched each record, making debugging straightforward',
  '<strong>Better accuracy</strong> — Stricter rules run first; looser fallback rules only apply to records that genuinely couldn\'t be matched strictly'
]))}
${mlcSection('Conditions Within a Rule Group', mlcUl([
  'Each condition specifies: Left Column, Operator, Right Column',
  '<strong>Exact match:</strong> Left.TransactionID = Right.TransactionID',
  '<strong>Amount within tolerance:</strong> Left.Amount ≈ Right.Amount (within ±0.01 for rounding differences)',
  '<strong>Date range:</strong> Left.Date within ±1 day of Right.Date (for timing differences)',
  'All conditions in a group are AND — all must be true simultaneously for the group to declare a match'
]))}
${mlcTakeaway('Start strict, get looser. Rule Group 1 should use your most reliable identifiers — a Transaction ID or Invoice Number. Only add looser fallback groups if you know there are legitimate cases where those identifiers differ between systems.')}`
          }
        ]
      },

      // ─── MODULE 3: Running & Results ─────────────────
      {
        title: 'Running Reconciliations & Understanding Results',
        lessons: [
          {
            title: 'Running a Reconciliation — Full vs Incremental',
            dur: '8 min',
            html: `<h2>Running a Reconciliation — Full vs Incremental</h2>
<p class="mlc-lead">Once a reconciliation is configured, you have two execution modes. Choosing the right mode for the right situation is critical — using Full Refresh when Incremental would do wastes significant compute; using Incremental when Full Refresh is needed produces stale results.</p>
${mlcCompare(
  '🔄 Run All (Full Refresh)',
  ['All records from BOTH datasets participate', 'Previous results are discarded and recalculated from scratch', 'Every transaction is re-evaluated against all rules', 'Computationally expensive — takes longer on large datasets', 'Use when: rules have changed · historical data corrected · first-time run · need a clean baseline'],
  '⚡ Run (Incremental)',
  ['Only NEWLY ingested data participates', 'Previously reconciled records are preserved as-is', 'Historical results remain unchanged', 'Much faster — processes only the delta since the last run', 'Use when: new transactions arrive daily · daily/weekly operations · no rule changes since last run']
)}
${mlcSection('Run Statuses', mlcUl([
  '<strong>Running</strong> — Engine is actively processing data; do not modify the configuration or trigger another run',
  '<strong>Succeeded</strong> — Run completed; results are ready to review in the Results tab',
  '<strong>Failed</strong> — An error was encountered; check the logs for details. Common causes: data type mismatch between rule columns, missing columns that rules reference, invalid column mappings'
]))}
${mlcSection('When to Use Each Mode', mlcUl([
  '<strong>Always use Run All for:</strong> first execution of a new reconciliation, after any rule change, after correcting historical source data, when you suspect the previous run produced incorrect results',
  '<strong>Always use Run (Incremental) for:</strong> daily operations when only new transactions are being added, weekly batch processing, high-volume datasets where full refresh would be too slow',
  '<strong>Rule of thumb:</strong> If anything changed in the data or configuration since the last run, use Run All. If only new data was added, use Run.'
]))}
${mlcStatGrid([
  { n: 'Run All', l: 'Complete recalculation — all historical + new data', note: 'Use for config changes' },
  { n: 'Run', l: 'Delta only — new records since last run', note: 'Use for daily ops' },
  { n: '3', l: 'Possible run statuses: Running, Succeeded, Failed', note: '' },
  { n: '~10×', l: 'Typical speed advantage of Incremental over Full Refresh', note: 'On large datasets' }
])}
${mlcSection('Debugging Failed Runs', mlcUl([
  '<strong>Data type mismatch:</strong> A column used in a match rule has different types on left vs right — fix the dataset ingestion pipeline and re-run',
  '<strong>Missing column:</strong> A column referenced in a rule no longer exists in the dataset — check if the source schema changed',
  '<strong>Invalid mapping:</strong> A dataset mapping points to a column that has been renamed — update the reconciliation configuration',
  '<strong>Memory/timeout:</strong> Very large datasets may time out on Run All — consider splitting by date range or increasing the dataset partition size'
]))}
${mlcTakeaway('Incremental runs are the workhorse of day-to-day reconciliation. Full Refresh is the reset button. Use Full Refresh deliberately — it is the right tool when something fundamentally changed, not the default for every execution.')}`
          },
          {
            title: 'System Columns & Copa Match Groups Explained',
            dur: '10 min',
            html: `<h2>System Columns & Copa Match Groups Explained</h2>
<p class="mlc-lead">After a successful run, Bluecopa automatically adds four system columns to every record in the results. These columns are your primary tool for understanding what happened to each transaction — which rule matched it, whether it matched at all, and whether the match was automatic or manual.</p>
${mlcSection('The Four System Columns', mlcUl([
  '<strong>Copa Match Group</strong> — Which rule group matched this record, or which side is missing. Values: Rule Group 1 / Rule Group 2 / Rule Group 3 / Left Missing / Right Missing',
  '<strong>Copa Match Status</strong> — Quick pass/fail for each record. Values: Matched / Unmatched',
  '<strong>Copa Match Type</strong> — How the match was made. Values: Auto Matched (by a rule group) / Manual Matched (by a human) / Unmatched (no match found)',
  '<strong>Copa Match Count</strong> — Numeric flag: 1 = record has a match, 0 = no match. Designed for use in reporting dashboards and aggregation formulas'
]))}
${mlcSection('Understanding Copa Match Group Values', mlcUl([
  '<strong>Rule Group 1 / 2 / 3:</strong> The record was matched by the specified rule group. Use this to understand which rules are doing the most work — high counts on Group 1 means your primary matching logic is strong',
  '<strong>Left Missing:</strong> A transaction exists in the right (secondary) dataset but NOT in the left (primary) dataset. The right dataset columns contain data; left columns are blank',
  '<strong>Right Missing:</strong> A transaction exists in the left (primary) dataset but NOT in the right (secondary) dataset. The left columns contain data; right columns are blank',
  '<strong>Practical example:</strong> A "Left Missing" bank transaction means the bank recorded a debit that has no corresponding ERP entry — a potential fraud risk or missed booking'
]))}
${mlcDiagram('Copa Match Group — What Each Value Means', `
<div style="display:flex;flex-direction:column;gap:8px;padding:8px 0">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:600;color:#4ade80;min-width:110px;text-align:center">Rule Group 1</div>
    <div style="font-size:11px;color:#94a3b8">Matched by strictest rule — highest confidence</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:600;color:#86efac;min-width:110px;text-align:center">Rule Group 2/3</div>
    <div style="font-size:11px;color:#94a3b8">Matched by fallback rule — review for accuracy</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:600;color:#fbbf24;min-width:110px;text-align:center">Left Missing</div>
    <div style="font-size:11px;color:#94a3b8">In right dataset only — not in left (primary). Date taken from right dataset.</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:600;color:#fbbf24;min-width:110px;text-align:center">Right Missing</div>
    <div style="font-size:11px;color:#94a3b8">In left dataset only — not in right (secondary)</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:600;color:#f87171;min-width:110px;text-align:center">Manual Matched</div>
    <div style="font-size:11px;color:#94a3b8">Matched manually by a user — investigate rule quality if count is high</div>
  </div>
</div>`)}
${mlcSection('Using System Columns for Analysis', mlcUl([
  '<strong>Filter by Copa Match Status = Unmatched</strong> to get your exception queue — these are the records requiring investigation',
  '<strong>Group by Copa Match Group</strong> to see which rule group is responsible for the most matches — if Group 3 (fallback) dominates, your primary rules need strengthening',
  '<strong>Track Copa Match Count over time</strong> — a declining match rate is an early warning of data quality degradation upstream',
  '<strong>Copa Match Type = Manual Matched rising over time</strong> is a signal that automatic rules are not covering a growing class of transactions'
]))}
${mlcTakeaway('The four Copa system columns convert a raw results table into an actionable exception report. Learn to read them fluently — Copa Match Group tells you where each record ended up; Copa Match Type tells you whether it got there automatically or needed human intervention.')}`
          }
        ]
      },

      // ─── MODULE 4: Resolving Exceptions ──────────────
      {
        title: 'Resolving Unmatched Items',
        lessons: [
          {
            title: 'Manual Match from the Results Tab',
            dur: '10 min',
            html: `<h2>Manual Match from the Results Tab</h2>
<p class="mlc-lead">After a reconciliation run, not every record will be automatically matched. Some mismatches are not data errors — they are legitimate matches that look different due to typos, formatting, or timing. The Results tab lets you manually force a match between two records without reconfiguring any rules.</p>
${mlcSection('When to Use Manual Matching', mlcUl([
  '<strong>Typographical differences:</strong> INV001 vs INVO01 — a transposed character that prevents automatic matching',
  '<strong>Formatting inconsistencies:</strong> "2026-07-14" vs "14/07/2026" — same date, different format',
  '<strong>Minor amount differences:</strong> ₹10,000.00 vs ₹10,000.01 — a rounding difference within tolerance',
  '<strong>Known exceptions:</strong> Records you can positively identify as matching based on business context, even if the system cannot'
]))}
${mlcSection('Step-by-Step: Manual Match from Results Tab', mlcOl([
  '<strong>Go to the Results Tab</strong> — Navigate to the reconciliation and open the Results tab after a successful run',
  '<strong>View Unmatched Items</strong> — Filter the results to show only unmatched records (Copa Match Status = Unmatched)',
  '<strong>Use Align Vertically view</strong> — Switch to the Align Vertically view to display left and right records side by side for easier visual comparison',
  '<strong>Select records on both sides</strong> — Check the box for the unmatched record on the left dataset AND its counterpart on the right dataset',
  '<strong>Click Match</strong> — Bluecopa creates a manual match; Copa Match Type updates to "Manual Matched" for both records',
  '<strong>Add a note</strong> — Go to Match Config → Manual Matches section; find the paired record by Primary Key and enter a short comment explaining the reason for the match',
  '<strong>Verify the result</strong> — Click Test to re-run; confirm the Manual Match Count in the summary updates correctly'
]))}
${mlcSection('The Note-Adding Step — Why It Matters', mlcUl([
  'A manual match without a note is an unexplained override — future auditors cannot understand why the records were paired',
  'The note becomes part of the audit trail — it is stored permanently with the match record',
  'Useful note format: "[Reviewer Name] — [Date] — [Reason]: INV001 matched to INVO01; confirmed same invoice, reference typo in bank feed"',
  'High volumes of manual matches with no notes is a significant audit risk — enforce the note discipline from day one'
]))}
${mlcCompare(
  '✅ Good Manual Match Practice',
  ['Both records visually confirmed before clicking Match', 'Note added explaining the reason', 'Test run completed to verify count updates', 'Manual match volume tracked weekly', 'High-frequency manual matches escalated for rule refinement'],
  '❌ Poor Manual Match Practice',
  ['Records matched based on amount alone without verifying identity', 'No note added — unexplained override', 'No test run — count not verified', 'Manual matches accumulate with no review', 'No feedback loop to improve automatic rules']
)}
${mlcTakeaway('Manual matching is a safety valve, not a workflow. Every manual match should come with a note explaining why automatic rules failed, and every batch of manual matches should feed back into a rule-refinement conversation with the implementation team.')}`
          },
          {
            title: 'Automated Resolution via Form Trigger Workflow',
            dur: '12 min',
            html: `<h2>Automated Resolution via Form Trigger Workflow</h2>
<p class="mlc-lead">Manual selection from the Results tab works well for a handful of records. When you have hundreds or thousands of unmatched items, it becomes impractical. The workflow-based approach lets users download the full unmatched list, map matches in a spreadsheet, and upload them back — the system processes the entire batch automatically.</p>
${mlcSection('When to Use the Workflow Approach', mlcUl([
  '<strong>High-volume exceptions:</strong> More than 20–30 unmatched items per run — checkbox selection becomes too slow',
  '<strong>Distributed teams:</strong> The person reviewing unmatched items is not the same as the person with Bluecopa access — the form can be shared via Portal',
  '<strong>Audit-grade documentation:</strong> The workflow creates a formal submission record — who uploaded the matches, when, and what file they used',
  '<strong>Recurring large batches:</strong> Month-end or quarter-end reconciliations that consistently produce large exception queues'
]))}
${mlcSection('Phase 1 — Setting Up the Workflow', mlcOl([
  '<strong>Create the Workflow:</strong> Start a new workflow in Bluecopa and select Form Trigger as the starting point',
  '<strong>Design the Form:</strong> Open the form builder and drag the Reconciliation Widget onto the form canvas',
  '<strong>Link your Reconciliation:</strong> In the widget properties panel, select the specific reconciliation workflow ID you want to target',
  '<strong>Add Update Recon Config Action:</strong> This action reads the manual match mappings from the uploaded file and applies them to the reconciliation configuration',
  '<strong>Add Update and Run Recon Action:</strong> This tells the system to automatically re-run the reconciliation once the config is updated — no manual trigger needed'
]))}
${mlcDiagram('Workflow Architecture', `
<div style="display:flex;flex-direction:column;gap:0;padding:8px 0">
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:8px 8px 0 0">
    <div style="font-size:16px">📋</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Form Trigger</strong> — User opens the form and uploads the mapped match file</div>
  </div>
  <div style="display:flex;justify-content:center;padding:4px 0;color:#6b7280;font-size:14px">↓</div>
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.2)">
    <div style="font-size:16px">⚙️</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Update Recon Config Action</strong> — Reads match mappings from uploaded file and applies to config</div>
  </div>
  <div style="display:flex;justify-content:center;padding:4px 0;color:#6b7280;font-size:14px">↓</div>
  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.15);border-radius:0 0 8px 8px">
    <div style="font-size:16px">▶️</div>
    <div style="font-size:12px;color:#c4b5fd"><strong>Update and Run Recon Action</strong> — Automatically re-runs the reconciliation; summary updates instantly</div>
  </div>
</div>`)}
${mlcSection('Phase 2 — The User Journey', mlcOl([
  '<strong>Open the Form:</strong> User opens the form via Instances or from the Portal',
  '<strong>Download Unmatched Items:</strong> Click "Match Manually / Archive" → navigate to Unmatched Items → download the full list as a spreadsheet',
  '<strong>Review and Map:</strong> Open the downloaded file; in Sheet 3, map left-record IDs to their corresponding right-record IDs',
  '<strong>Upload and Submit:</strong> Upload the completed mapping file back into the form and click Submit',
  '<strong>Automatic processing:</strong> The workflow runs the Update Recon Config and Update and Run Recon actions in sequence — the reconciliation re-runs automatically',
  '<strong>Verify:</strong> The Manual Match Count on the summary dashboard updates instantly — no manual re-run required'
]))}
${mlcSection('Sheet 3 — The Mapping Format', mlcUl([
  'Sheet 3 in the downloaded file is where the match mapping is entered — Sheets 1 and 2 contain the left and right unmatched records for reference',
  'Each row in Sheet 3 pairs a left-record primary key with a right-record primary key',
  'Leave the reason column blank to apply default notes, or fill it in for audit documentation',
  'Do not modify Sheets 1 and 2 — only Sheet 3 is read by the Update Recon Config action'
]))}
${mlcTakeaway('The form-trigger workflow scales manual reconciliation to any volume. Ten records or ten thousand — the user downloads, maps in a spreadsheet, uploads, and the system handles the rest. Build this workflow once and it becomes a permanent, reusable resolution channel for every reconciliation run.')}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'What is the primary purpose of reconciliation in Bluecopa?', opts: ['To generate financial reports automatically', 'To compare two datasets from different systems and verify they agree based on match rules', 'To ingest data from external cloud storage sources', 'To create approval workflows for financial transactions'], a: 1, exp: 'Reconciliation compares data from two different systems — such as an ERP and a bank — and identifies matches, mismatches, and missing records based on configured business rules. It is a data integrity verification process, not a reporting or ingestion tool.' },
      { q: 'Which reconciliation type compares individual transactions row by row?', opts: ['Balance Reconciliation', 'Summary Reconciliation', 'Match Reconciliation', 'Aggregate Reconciliation'], a: 2, exp: 'Match Reconciliation (line-by-line) compares individual transaction records to determine whether a corresponding record exists in both datasets. Balance Reconciliation compares summarized totals and does not identify which specific transactions are missing.' },
      { q: 'A dataset has Amount column as Number type on the left but Text type on the right. What will happen when a match rule uses Amount?', opts: ['The rule will work but produce slower results', 'The rule will automatically convert Text to Number', 'The rule will produce silent failures or incorrect results', 'An error will appear immediately when saving the rule'], a: 2, exp: 'Data type mismatches cause silent failures that are hard to debug. The matching engine cannot compare a Number to a Text value — records that should match will not. Always verify that columns used in match rules have identical data types on both sides.' },
      { q: 'Rule Group 1 matches 800 of 1,000 records. Rule Group 2 then evaluates how many records?', opts: ['1,000 — all records are evaluated by every group', '800 — only the matched records', '200 — only the unmatched records remaining after Group 1', '400 — half of the original pool'], a: 2, exp: 'Rule Groups process in sequence. Records matched by Group 1 are removed from the pool. Group 2 only evaluates the 200 records that Group 1 did not match. This prevents duplicate matching and makes subsequent groups faster.' },
      { q: 'A record has Copa Match Group = "Left Missing". What does this mean?', opts: ['The record exists in the left dataset but not the right', 'The record exists in the right dataset but not the left', 'The record was matched by the last rule group', 'The record was manually matched by a user'], a: 1, exp: '"Left Missing" means the transaction was found in the right (secondary) dataset — such as a bank statement — but has no corresponding record in the left (primary) dataset — such as the ERP. The right dataset columns contain data; the left columns are blank.' },
      { q: 'When should you use "Run All" (Full Refresh) instead of "Run" (Incremental)?', opts: ['Every time new transactions are added', 'Only on the first execution, never after', 'When match rules have changed, historical data was corrected, or a clean baseline is needed', 'When the dataset has more than 10,000 records'], a: 2, exp: 'Run All recalculates everything from scratch — it is the right choice when something fundamental changed: rules were updated, historical data was corrected, or you need a reliable baseline. For daily operations where only new data is added, use Incremental Run — it is much faster.' },
      { q: 'What does Copa Match Count = 0 indicate for a record?', opts: ['The record was matched by Rule Group 1', 'The record has no match — it is unmatched or missing', 'The record was manually matched', 'The record was excluded from the run'], a: 1, exp: 'Copa Match Count is a numeric flag: 1 = the record has a match, 0 = no match was found. A value of 0 means the record is either Left Missing, Right Missing, or Unmatched — it requires investigation.' },
      { q: 'What is the correct way to add context to a manual match in Bluecopa?', opts: ['Add a comment in the source dataset before re-ingesting', 'Enter a note in Match Config → Manual Matches section after clicking Match', 'Send an email to the reconciliation owner explaining the match', 'The Copa Match Type column automatically records the reason'], a: 1, exp: 'After clicking Match in the Results tab, go to Match Config → Manual Matches to find the paired record by Primary Key and enter a short note explaining the reason. This note becomes part of the permanent audit trail and is required for audit-grade documentation.' },
      { q: 'In the form-trigger workflow for automated resolution, what does the "Update and Run Recon Action" do?', opts: ['Downloads the unmatched items list for the user', 'Sends a notification to the reconciliation owner', 'Automatically re-runs the reconciliation after the config is updated', 'Creates a new reconciliation configuration from the uploaded file'], a: 2, exp: 'The "Update and Run Recon Action" triggers an automatic re-run of the reconciliation immediately after the "Update Recon Config Action" applies the uploaded match mappings. This means the user just uploads the file and submits — no manual re-run is needed.' },
      { q: 'A rising Manual Match count across successive reconciliation runs is a signal of what?', opts: ['Improving data quality — more records are being captured', 'A system error in the automatic matching engine', 'A rule-quality problem — automatic rules are not covering a growing class of transactions', 'Normal variation — manual match volume always fluctuates'], a: 2, exp: 'A rising Manual Match trend means the automatic rules are falling behind the data. Either new transaction patterns have emerged that rules don\'t cover, or data quality in the source systems has degraded. The correct response is to analyse the manual match patterns and add or refine rule groups.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 9 — WORKFLOWS
  // ════════════════════════════════════════════════════
  wf: {
    modules: [

      // ─── MODULE 1: Fundamentals ──────────────────────
      {
        title: 'Workflow Fundamentals',
        lessons: [
          {
            title: 'What Is a Workflow? Triggers & Core Concepts',
            dur: '10 min',
            html: `<h2>What Is a Workflow?</h2>
<p class="mlc-lead">A workflow is an automated sequence of actions that runs in response to a starting condition called a trigger. In Bluecopa, workflows connect data ingestion, transformation, human tasks, API calls, and notifications into a single auditable automation — replacing manual, multi-step processes with a reliable, repeatable pipeline.</p>
${mlcSection('Why Workflows Exist', mlcUl([
  '<strong>Replace manual processes</strong> — Invoice validation, approval routing, data sync, and report delivery that used to require human coordination are now automated end-to-end',
  '<strong>React in real time</strong> — Event-based triggers ensure the workflow fires the moment something happens — a form submitted, a file uploaded, a dataset updated — without polling or delay',
  '<strong>Enforce consistency</strong> — The same logic runs every time: no skipped steps, no forgotten notifications, no process variation across team members',
  '<strong>Provide auditability</strong> — Every workflow execution is logged with timestamps, step statuses, and outputs — a complete audit trail without any extra effort'
]))}
${mlcSection('The Four Building Blocks', mlcOl([
  '<strong>Trigger</strong> — The starting condition: what causes the workflow to run (form submission, schedule, API call, data change)',
  '<strong>Nodes / Steps</strong> — The actions the workflow performs: run a pipeline, call an API, assign a human task, send an email, transform data',
  '<strong>Conditions</strong> — Branching logic: if a step succeeds, go this way; if it fails or the approver rejects, go another way',
  '<strong>Outputs</strong> — The result of the workflow: a dataset updated, a file moved, an email sent, a task closed'
]))}
${mlcDiagram('Workflow — Core Anatomy', `
<div style="display:flex;gap:0;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px 0">
  <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#34d399;text-align:center;min-width:80px">⚡<br>Trigger</div>
  <div style="color:#6b7280;font-size:18px;margin:0 8px">→</div>
  <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#34d399;text-align:center;min-width:80px">⚙️<br>Steps</div>
  <div style="color:#6b7280;font-size:18px;margin:0 8px">→</div>
  <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#34d399;text-align:center;min-width:80px">🔀<br>Conditions</div>
  <div style="color:#6b7280;font-size:18px;margin:0 8px">→</div>
  <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:8px;padding:10px 16px;font-size:12px;font-weight:600;color:#34d399;text-align:center;min-width:80px">📤<br>Outputs</div>
</div>`)}
${mlcSection('Trigger Families', mlcUl([
  '<strong>Scheduled (Time-based)</strong> — The workflow fires at a pre-defined time or repeating schedule. No external dependency. Examples: nightly reports, daily data sync, weekly reminders.',
  '<strong>Event-based (Condition-based)</strong> — The workflow fires immediately when something specific happens — a data change, a form submission, a file upload, an API call. Examples: real-time validation, on-demand processing, third-party webhooks.'
]))}
${mlcTakeaway('Every workflow — whether it runs a 3-step report or a 20-step invoice discounting pipeline — is built from the same four blocks: Trigger, Nodes, Conditions, and Outputs. Master these four and you can build any automation.')}`
          },
          {
            title: 'The Nine Trigger Types — When to Use Each',
            dur: '12 min',
            html: `<h2>The Nine Trigger Types — When to Use Each</h2>
<p class="mlc-lead">Choosing the right trigger is the first and most consequential decision when building a workflow. The trigger determines when your automation starts, how it reacts to the outside world, and how reliably it delivers results. Bluecopa provides nine trigger types covering every common automation pattern.</p>
${mlcSection('Trigger Quick Reference', mlcUl([
  '<strong>Dataset Update</strong> — Fires when a record in a linked dataset is created or updated. Use for: data validation pipelines, change notifications, downstream sync. Tip: filter by field conditions to avoid unnecessary runs.',
  '<strong>Form Submission</strong> — Fires when a user submits a linked form. All form field values are available as trigger data. Use for: intake forms, service requests, approval workflows, lead capture.',
  '<strong>Filebox</strong> — Fires when a file is uploaded to a designated filebox. Provides file name, size, and path as metadata. Use for: document processing, OCR, file routing, ZIP extraction.',
  '<strong>Schedule</strong> — Fires at a configured time or cron expression. No external dependency. Use for: nightly reports, daily data sync, periodic reminders. Most reliable trigger for batch operations.',
  '<strong>HTTP Trigger</strong> — Fires on an incoming HTTP request to a Bluecopa-exposed endpoint. Use for: third-party webhooks, API integrations, event-driven triggers from external systems.',
  '<strong>Manual Trigger</strong> — Fires when a user clicks "Run" in the UI. Use for: ad-hoc tasks, testing, on-demand operations. Not suitable for production automation — requires a human to initiate.',
  '<strong>Process Task Reassignment</strong> — Fires when a task\'s ownership changes. Use for: escalations, out-of-office routing, load balancing across team members.',
  '<strong>External Event</strong> — Fires when an event arrives from an external system (IoT, event streaming platforms). Use for: sensor-driven automation, real-time event processing.',
  '<strong>Workflow Event</strong> — Fires when another workflow emits a named event. Use for: chaining workflows, sub-workflow patterns, orchestrating a sequence of dependent automations.'
]))}
${mlcCompare(
  '⏰ Scheduled Triggers — Best For',
  ['Predictable, time-based batch operations', 'Nightly reconciliation runs', 'Weekly report delivery', 'Daily dataset sync windows', 'No dependency on external events'],
  '⚡ Event-Based Triggers — Best For',
  ['Real-time reactions to data changes', 'Processing form submissions immediately', 'File-driven automation (upload → process)', 'Webhook-driven integrations', 'Chaining workflows in an orchestration sequence']
)}
${mlcSection('Configuration Tips by Trigger Type', mlcUl([
  '<strong>Dataset Update:</strong> Always filter by specific field conditions — triggering on every record update can cause thousands of unnecessary runs per day',
  '<strong>Form Submission:</strong> Map form fields to clearly named variables at the trigger level; add a confirmation step immediately after so submitters know their form was received',
  '<strong>Filebox:</strong> The filebox must be configured before the trigger is set — ensure the correct filebox ID is linked',
  '<strong>Schedule:</strong> Use cron expressions for advanced patterns (e.g. "every weekday at 8 AM"). Simple time-based schedules have a UI picker',
  '<strong>HTTP Trigger:</strong> The endpoint must be explicitly exposed — note the generated URL and secure it with authentication if the data is sensitive',
  '<strong>Workflow Event:</strong> Ensure the emitting workflow uses the exact same event name as the listening workflow\'s trigger — a name mismatch causes silent failures'
]))}
${mlcStatGrid([
  { n: '9', l: 'Total trigger types available in Bluecopa', note: 'Covers all automation patterns' },
  { n: '2', l: 'Trigger families: Scheduled and Event-based', note: '' },
  { n: 'Schedule', l: 'Most reliable for batch/periodic operations', note: 'No external dependency' },
  { n: 'HTTP', l: 'Most flexible for external integrations', note: 'Requires endpoint exposure' }
])}
${mlcTakeaway('Use Scheduled triggers when you control the timing and Event-based triggers when the timing is determined by something external. Mixing both patterns in a single workflow (e.g. a scheduled run that also listens for on-demand HTTP triggers) requires two separate workflow configurations pointing to the same core logic.')}`
          },
          {
            title: 'Data Transformation Nodes — The Complete Reference',
            dur: '12 min',
            html: `<h2>Data Transformation Nodes — The Complete Reference</h2>
<p class="mlc-lead">Bluecopa's Allocation Studio provides 16 transformation node types that shape, enrich, and restructure data as it flows through a pipeline. Each node has a specific purpose. Understanding what each one does — and when to use it — is fundamental to building efficient, accurate data pipelines.</p>
${mlcSection('Selection & Ordering Nodes', mlcUl([
  '<strong>Select</strong> — Column picker. Choose which columns pass downstream; unused columns from the source are excluded. Each column can be assigned an alias. Column order can be adjusted.',
  '<strong>Sort</strong> — Row ordering. Define multiple sort rules applied sequentially (Rule 1, then Rule 2). Each rule specifies a column and direction (Ascending / Descending).',
  '<strong>Filter</strong> — Row conditions. Include only rows satisfying specified criteria. Supports Match All (AND) or Match Any (OR). Operators include: Equal, Contains, In, Is Null, Starts With, and more.'
]))}
${mlcSection('Combining Nodes', mlcUl([
  '<strong>Merge</strong> — Union two datasets by appending rows. Both datasets must share identical schemas (same column names and data types). Enable "Union Distinct" to remove duplicate rows.',
  '<strong>Lookup</strong> — Key-based enrichment. Enrich a dataset with columns from a second dataset using a key match — similar to a spreadsheet VLOOKUP.',
  '<strong>Join</strong> — Multi-join types. Combine two datasets on a key with configurable join types: Inner, Left, Right, Full Outer.'
]))}
${mlcSection('Calculation & Aggregation Nodes', mlcUl([
  '<strong>Aggregate</strong> — Summary calculations. Group rows and compute aggregates: SUM, COUNT, AVG, MIN, MAX per group.',
  '<strong>Calculate</strong> — Custom formulas. Apply expression-based computed columns using functions, arithmetic, and conditional logic.',
  '<strong>SQL</strong> — Direct SQL. Write raw SQL against the dataset for complex transformations not covered by visual nodes.',
  '<strong>Window Aggregate</strong> — Partition calculations. Compute running totals, rankings, and moving averages partitioned by a grouping key — without collapsing rows.'
]))}
${mlcSection('Quality & Classification Nodes', mlcUl([
  '<strong>Classify</strong> — Rule-based bucketing. Assign records to categories based on conditions — e.g. "if Amount > 100000, classify as Large".',
  '<strong>Deduplicate</strong> — Remove duplicate rows based on specified key columns. Keeps the first or last occurrence based on configuration.',
  '<strong>Replace</strong> — Value mapping. Replace specific values in a column with alternatives — e.g. map "Y" → "Yes", "N" → "No".',
  '<strong>Reconciliation</strong> — Match/balance. Apply reconciliation logic within a pipeline step — connects to a configured reconciliation run.'
]))}
${mlcSection('Reshaping Nodes', mlcUl([
  '<strong>Pivot</strong> — Long to wide. Convert row values into columns — e.g. turn monthly rows into monthly columns across a single record.',
  '<strong>Unpivot</strong> — Wide to long. Reverse of Pivot: convert column headers into row values — useful for normalizing wide datasets.'
]))}
${mlcDiagram('Transformation Node Categories', `
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px 0">
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7"><strong>Selection</strong><br>Select · Sort · Filter</div>
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7"><strong>Combining</strong><br>Merge · Lookup · Join</div>
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7"><strong>Calculation</strong><br>Aggregate · Calculate · SQL · Window</div>
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7"><strong>Quality</strong><br>Classify · Deduplicate · Replace · Reconciliation</div>
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7"><strong>Reshaping</strong><br>Pivot · Unpivot</div>
  <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#94a3b8"><strong>Total: 16 nodes</strong><br>across 5 categories</div>
</div>`)}
${mlcTakeaway('You rarely need all 16 nodes in a single pipeline. Most pipelines use 4–6: Select to scope columns, Filter to scope rows, Join or Lookup to enrich, Aggregate for summary, and Calculate for custom metrics. Add Deduplicate and Replace when data quality is a concern.')}`
          }
        ]
      },

      // ─── MODULE 2: Integration & Reliability ─────────
      {
        title: 'Integration & Reliability',
        lessons: [
          {
            title: 'API Integration Nodes — Connecting External Systems',
            dur: '10 min',
            html: `<h2>API Integration Nodes — Connecting External Systems</h2>
<p class="mlc-lead">An API Integration Node is a specialized workflow step that connects Bluecopa to external systems — ERPs, CRMs, payment gateways, or custom databases. It acts as The Orchestrator: it handles business logic, variable mapping, and state tracking, then delegates the actual HTTP communication to a separate transport connector layer.</p>
${mlcSection('Core Responsibilities', mlcUl([
  '<strong>Business Logic Awareness</strong> — Processes domain logic, handles conditional sequence logic, reads active canvas parameters, and mutates workflow instance states based on data outcomes (e.g. transitioning an invoice state from PENDING to PROCESSED_SUCCESSFULLY)',
  '<strong>Data Transformation & Contracting</strong> — Handles data filters, validates mandatory field payloads, maps complex application entities to strict external flat schemas, and prepares outbound data structures',
  '<strong>State Machine & Exception Handling</strong> — Tracks execution logs, evaluates response status codes, and determines whether to trigger conditional execution branches, retry loops, or failure paths',
  '<strong>Protocol Abstraction</strong> — The node is completely agnostic to raw network sockets, connection pooling, or stream parsing — it relies entirely on a separate REST API Connector layer to handle transmission'
]))}
${mlcDiagram('API Integration Node — Data Path', `
<div style="display:flex;flex-direction:column;gap:0;padding:8px 0">
  <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px 8px 0 0">
    <div style="font-size:14px">⚙️</div>
    <div style="font-size:12px;color:#6ee7b7"><strong>Internal Workflow Engine</strong> — Triggers the integration process step</div>
  </div>
  <div style="display:flex;justify-content:center;padding:3px 0;color:#6b7280;font-size:13px">↓</div>
  <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15)">
    <div style="font-size:14px">🧠</div>
    <div style="font-size:12px;color:#6ee7b7"><strong>API Integration Node (Orchestrator)</strong> — Business logic, variable mapping, state machine, conditional routing</div>
  </div>
  <div style="display:flex;justify-content:center;padding:3px 0;color:#6b7280;font-size:13px">↓</div>
  <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.1)">
    <div style="font-size:14px">🚀</div>
    <div style="font-size:12px;color:#6ee7b7"><strong>REST API Connector (Transport)</strong> — Auth headers, network pooling, timeouts, JSON serialization</div>
  </div>
  <div style="display:flex;justify-content:center;padding:3px 0;color:#6b7280;font-size:13px">↓</div>
  <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(16,185,129,0.02);border:1px solid rgba(16,185,129,0.08);border-radius:0 0 8px 8px">
    <div style="font-size:14px">🌐</div>
    <div style="font-size:12px;color:#6ee7b7"><strong>External API Endpoint</strong> — ERP, CRM, custom database, third-party service</div>
  </div>
</div>`)}
${mlcSection('Runtime Execution — Four Steps', mlcOl([
  '<strong>Map Dynamic Data Tokens</strong> — The node captures live data variables from preceding workflow steps and maps them into the template parameter placeholders configured for the target API action',
  '<strong>Handle Context & Credential Verification</strong> — The node fetches active workspace tokens and identity metrics (such as the mandatory x-bluecopa-workspace-id header) from the platform\'s secure secret state',
  '<strong>Execute Request Asynchronously</strong> — The node packages the final payload and dispatches the execution request; it hands off control to the connector and records an in-progress state',
  '<strong>Evaluate Response & Route</strong> — On response, the node evaluates the status code: success triggers the next step; error triggers the configured retry or failure branch'
]))}
${mlcSection('Key Design Principles', mlcUl([
  '<strong>Separation of concerns:</strong> The integration node owns business logic; the connector owns transport — never mix these responsibilities',
  '<strong>Idempotency:</strong> Design API calls so retrying them produces the same result — avoid double-posting by using idempotency keys where the external API supports them',
  '<strong>Response validation:</strong> Always configure response code evaluation — a 200 response does not always mean success; check the response body for application-level error codes',
  '<strong>Secrets management:</strong> Never hardcode credentials in the integration node — use the platform\'s secure secret state for all API keys and tokens'
]))}
${mlcTakeaway('The API Integration Node is Bluecopa\'s boundary with the outside world. Everything upstream of it is internal workflow logic; everything downstream of the connector is the external network. Keeping this boundary clean — business logic in the node, transport in the connector — makes integrations testable, maintainable, and replaceable.')}`
          },
          {
            title: 'Error Handling & Retry Policy — Building Reliable Workflows',
            dur: '10 min',
            html: `<h2>Error Handling & Retry Policy — Building Reliable Workflows</h2>
<p class="mlc-lead">A workflow that works under perfect conditions is not a reliable workflow. Error handling and retry policy define how each step behaves when things go wrong — network timeouts, transient failures, downstream API outages. Configuring these correctly is the difference between a workflow that recovers automatically and one that silently fails.</p>
${mlcSection('Timeout Configuration', mlcUl([
  '<strong>Timeout (Seconds)</strong> — Maximum allowed execution time for a step. If the step does not complete within this window, it is marked as a timeout error',
  '<strong>Continue on Timeout: Enabled</strong> — The workflow continues to execute the next step even if this step timed out. Use when the step is non-critical (e.g. a logging step) and downstream steps must run regardless',
  '<strong>Continue on Timeout: Disabled</strong> — The workflow fails immediately if this step times out. Use for critical steps where downstream logic depends on successful completion'
]))}
${mlcSection('Retry Policy — Four Settings', mlcUl([
  '<strong>Interval (Seconds)</strong> — The delay before the first retry attempt after a failure. Gives the failing system time to recover before being hit again.',
  '<strong>Max Attempts</strong> — How many times the system will retry after failure. Once exhausted, the step is marked as failed. Example: Max Attempts = 4 means the step is tried 5 times total (1 original + 4 retries).',
  '<strong>Backoff Coefficient</strong> — Controls how the retry delay increases after each failed attempt. A multiplier applied to the previous delay. Coefficient = 2 doubles the delay each time; Coefficient = 5 increases it fivefold. Example: Interval = 5s, Coefficient = 2 → delays of 5s, 10s, 20s, 40s.',
  '<strong>Continue on Failure</strong> — When enabled, the workflow proceeds to the next step even after all retries are exhausted and the step is marked failed. The failed step is still recorded — it does not block downstream steps.'
]))}
${mlcDiagram('Retry Timeline — Example Configuration', `
<div style="padding:8px 0">
  <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">Timeout: 5s · Interval: 5s · Max Attempts: 4 · Backoff: 2.0</div>
  <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:4px 8px;font-size:11px;color:#f87171">Attempt 1<br>Fails</div>
    <div style="font-size:10px;color:#94a3b8">5s →</div>
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:4px 8px;font-size:11px;color:#f87171">Retry 1<br>Fails</div>
    <div style="font-size:10px;color:#94a3b8">10s →</div>
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:4px 8px;font-size:11px;color:#f87171">Retry 2<br>Fails</div>
    <div style="font-size:10px;color:#94a3b8">20s →</div>
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:4px 8px;font-size:11px;color:#f87171">Retry 3<br>Fails</div>
    <div style="font-size:10px;color:#94a3b8">40s →</div>
    <div style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);border-radius:4px;padding:4px 8px;font-size:11px;color:#f87171;font-weight:700">Retry 4<br>FAILED</div>
  </div>
  <div style="margin-top:8px;font-size:11px;color:#94a3b8">Total wait before final failure: 5 + 10 + 20 + 40 = 75 seconds</div>
</div>`)}
${mlcSection('Continue on Failure — Real-World Scenario', mlcUl([
  '<strong>Trigger</strong> → executes successfully',
  '<strong>Run Pipeline</strong> → fails (red status); all 4 retries exhausted',
  '<strong>Continue on Failure = Enabled</strong> → workflow does NOT stop',
  '<strong>Updating Input Table with Status</strong> → executes successfully (green status)',
  'Result: even though the pipeline step failed, the status update and downstream cleanup steps still run — ensuring the system remains in a known state'
]))}
${mlcCompare(
  '✅ When to Enable Continue on Failure',
  ['Logging / audit steps that must run regardless', 'Cleanup steps that release locks or update status', 'Notification steps that inform users of failure', 'Non-critical enrichment that is nice-to-have'],
  '❌ When to DISABLE Continue on Failure',
  ['Any step whose output is required by downstream steps', 'Financial write steps where partial completion causes inconsistency', 'Steps that create records — a failed creation should not trigger downstream processing', 'Any step where failure means the data is incorrect']
)}
${mlcTakeaway('Backoff coefficient is your most important reliability tool. Without it, all retries hit the failing system at the same interval — if the system is overloaded, rapid retries make it worse. With exponential backoff, each retry gives the system progressively more time to recover.')}`
          }
        ]
      },

      // ─── MODULE 3: Architecture & Troubleshooting ────
      {
        title: 'Architecture & Troubleshooting',
        lessons: [
          {
            title: 'Monitoring & Alerting — Diagnosing Slow, Stuck & Broken Pipelines',
            dur: '12 min',
            html: `<h2>Monitoring & Alerting — Diagnosing Slow, Stuck & Broken Pipelines</h2>
<p class="mlc-lead">Understanding whether a pipeline is slow, stuck, or broken is the first step to resolving it. Each state has distinct indicators, root causes, and resolution strategies. Confusing them leads to wasted debugging time — applying a slow-pipeline fix to a stuck pipeline changes nothing.</p>
${mlcSection('The Three States — Quick Identification', mlcUl([
  '<strong>Slow</strong> — Pipeline eventually completes but execution time is significantly longer than the historical baseline (e.g. 10 minutes vs. the usual 1 minute). Typical duration: minutes to hours.',
  '<strong>Stuck</strong> — Status remains "Running", "Scheduled", or "Preview" indefinitely with no progress. No explicit error message appears. Typical duration: hours to days.',
  '<strong>Broken</strong> — Explicit error messages appear immediately: TimeoutError, Failed to fetch data, PusherBadRequest. Immediate failure — the pipeline does not complete at all.'
]))}
${mlcSection('Slow Pipelines — Root Causes & Resolutions', mlcUl([
  '<strong>Large datasets without materialization:</strong> Nodes process millions of rows without intermediate caching; each downstream node re-executes the full query chain, compounding query complexity exponentially. Resolution: Enable "Materialize" on heavy nodes to store intermediate results as physical datasets.',
  '<strong>Complex transformations:</strong> Multiple joins, window functions, or recursive CTEs increase query execution time — especially when BigQuery needs to shuffle data across slots. Resolution: Simplify join logic; push filters upstream before joins to reduce row counts.',
  '<strong>Resource contention:</strong> Multiple pipelines running simultaneously in environments with limited worker pods compete for CPU and memory. Resolution: Stagger pipeline schedules; request additional pod allocation from DevOps.'
]))}
${mlcSection('Stuck Pipelines — Root Causes & Resolutions', mlcUl([
  '<strong>Calculation node misconfiguration:</strong> An oversized function or improperly formatted logic in a Calculation node causes the pipeline to hang during evaluation without throwing an explicit error. Resolution: Review the Calculation node — ensure functions are properly scoped with no recursive loops or malformed syntax.',
  '<strong>V1 pipeline deprecation:</strong> Pipelines created in V1 architecture may appear scheduled but never execute because V1 execution infrastructure is deprecated. Resolution: Migrate to Pipeline V2.',
  '<strong>NATS messaging layer failure:</strong> Temporal workflows rely on NATS for job coordination. Stale connections or stream initialisation failures cause pipelines to hang in scheduled state without feedback. Resolution: DevOps restart of NATS cluster — this is an environment-level issue affecting all pipelines simultaneously.',
  '<strong>Single-pod environments:</strong> Environments with only one worker pod experience downtime during pod restarts. During restart windows, pipelines remain scheduled but cannot execute. Resolution: Wait for the pod to come back online or request additional pod allocation.'
]))}
${mlcSection('Broken Pipelines — Root Causes & Resolutions', mlcUl([
  '<strong>TimeoutError:</strong> A step exceeded its configured timeout. Resolution: Increase the step timeout, optimize the underlying query, or enable materialization to reduce compute time.',
  '<strong>Failed to fetch data:</strong> A connector or data source is unreachable — network issue, credential expiry, or endpoint change. Resolution: Verify connector configuration and credentials; check external service status.',
  '<strong>PusherBadRequest:</strong> A real-time messaging error — typically caused by payload size exceeding limits or malformed event data. Resolution: Reduce payload size; review the data being pushed.'
]))}
${mlcCompare(
  '🔍 Diagnostic Checklist',
  ['Check run status: Running / Scheduled / Error?', 'Check for explicit error messages in logs', 'Compare execution time to historical baseline', 'Check if multiple pipelines are running simultaneously', 'Check Calculation node configurations'],
  '🛠️ Resolution Priority Order',
  ['Broken → fix error first (credentials, config, timeout)', 'Stuck → check Calculation nodes, NATS, V1 migration', 'Slow → enable materialization on heaviest nodes', 'Slow due to contention → stagger schedules', 'Persistent issues → escalate to DevOps (NATS, pods)']
)}
${mlcTakeaway('The single most impactful fix for slow pipelines is materialization. The single most impactful fix for stuck pipelines is checking Calculation nodes. Broken pipelines always have an error message — read it before doing anything else.')}`
          },
          {
            title: 'Reusable Orchestration — Parent-Child Workflow Architecture',
            dur: '12 min',
            html: `<h2>Reusable Orchestration — Parent-Child Workflow Architecture</h2>
<p class="mlc-lead">As the number of pipelines in a Bluecopa implementation grows, running them independently creates redundant configurations and no centralized visibility. The Parent-Child orchestration pattern solves this: one Parent Workflow acts as the central controller, sequentially triggering a reusable Child Workflow template for each pipeline — with a full audit trail and zero code duplication.</p>
${mlcSection('Why This Pattern Exists', mlcUl([
  '<strong>Eliminates redundancy:</strong> Without orchestration, each pipeline requires its own separate workflow — 20 pipelines means 20 separate trigger + run + notify configurations',
  '<strong>Enforces sequential execution:</strong> The "Wait for Completion" option ensures each child instance finishes before the next one starts — preventing race conditions and data dependency failures',
  '<strong>Centralized audit trail:</strong> All pipeline executions are visible from a single Parent Workflow run log — one place to see what ran, when, and whether it succeeded',
  '<strong>Reusability:</strong> The Child Workflow is a generic template — it runs any pipeline by receiving its pipeline_id and pipeline_name dynamically from the Parent'
]))}
${mlcDiagram('Parent-Child Architecture', `
<div style="display:flex;flex-direction:column;gap:0;padding:8px 0">
  <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px 14px;text-align:center;margin-bottom:8px">
    <div style="font-size:11px;font-weight:700;color:#34d399;letter-spacing:.05em">PARENT WORKFLOW — Central Orchestrator</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:2px">Manages sequence · Maintains audit trail</div>
  </div>
  <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:6px">
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7;text-align:center;min-width:80px">trigger_process<br><span style="color:#94a3b8">Pipeline A</span></div>
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7;text-align:center;min-width:80px">trigger_process<br><span style="color:#94a3b8">Pipeline B</span></div>
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7;text-align:center;min-width:80px">trigger_process<br><span style="color:#94a3b8">Pipeline C</span></div>
    <div style="background:rgba(16,185,129,0.04);border:1px dashed rgba(16,185,129,0.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#64748b;text-align:center;min-width:80px">+ unlimited<br>more...</div>
  </div>
  <div style="display:flex;justify-content:center;margin:8px 0;color:#6b7280;font-size:13px">↓ Each triggers ↓</div>
  <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px 14px;text-align:center">
    <div style="font-size:11px;font-weight:700;color:#34d399;letter-spacing:.05em">CHILD WORKFLOW — Reusable Template</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:2px">Receives pipeline_id + pipeline_name · Executes any pipeline dynamically</div>
  </div>
</div>`)}
${mlcSection('Parent Workflow Setup', mlcOl([
  'Add a <strong>trigger_process_action</strong> node for every unique pipeline or robot intended for execution',
  'Specify the Child Workflow identifier in each node\'s configuration',
  'Define Trigger Data variables for each node: <code>pipeline_id</code> (unique system identifier) and <code>pipeline_name</code> (human-readable label for auditing)',
  '<strong>Enable "Wait for Completion"</strong> — critical: ensures each child instance finishes before the next one begins, preventing parallel execution conflicts and race conditions'
]))}
${mlcSection('Child Workflow Setup', mlcUl([
  '<strong>Trigger Node:</strong> Receives TRIGGER_DATA (containing pipeline_id and pipeline_name) from the Parent Workflow',
  '<strong>Run Pipeline node:</strong> Executes the process using dynamic values: <code>{{Trigger_id.TRIGGER_DATA.pipeline_id}}</code>',
  '<strong>On Success:</strong> The process_completion_action node notifies the Parent Workflow, which then proceeds to the next sequential node',
  '<strong>On Failure:</strong> An error-handling node logs the failure in the audit trail and dispatches an automated email alert to stakeholders'
]))}
${mlcTakeaway('"Wait for Completion" is the most critical setting in the Parent-Child pattern. Without it, all child workflows run simultaneously — data from Pipeline A may not be available when Pipeline B needs it, causing silent data quality failures that are extremely hard to debug.')}`
          }
        ]
      },

      // ─── MODULE 4: Real-World Implementations ────────
      {
        title: 'Real-World Workflow Implementations',
        lessons: [
          {
            title: 'Invoice Discounting Automation — End-to-End Pipeline',
            dur: '12 min',
            html: `<h2>Invoice Discounting Automation — End-to-End Pipeline</h2>
<p class="mlc-lead">Invoice discounting is a financial process where a company receives advance funds against unpaid invoices before the customer completes payment. The original process was entirely manual — spreadsheets, email coordination, and operational validations — leading to duplicate submissions, allocation errors, and no centralized visibility. This implementation replaced the entire lifecycle with a single automated pipeline.</p>
${mlcSection('The Business Problem', mlcUl([
  '<strong>What is invoice discounting?</strong> A company submits eligible invoices to banks and receives advance funds immediately instead of waiting 30–60 days for customer payment',
  '<strong>Why automation was needed:</strong> The existing manual process used spreadsheets and email coordination, creating: duplicate invoice submissions, incorrect funding allocations, high operational effort, no centralized visibility across banks, and slow decision-making',
  '<strong>Scale of the problem:</strong> Without automation, every submitted invoice required manual validation, manual allocation to a bank, and manual report preparation — unsustainable at volume'
]))}
${mlcSection('Platform Capabilities Built', mlcUl([
  '<strong>Dataset Upload</strong> — Accepts and processes multiple dataset types required for invoice discounting in a single automated pipeline',
  '<strong>Validation & Eligibility</strong> — Automatically validates invoices and evaluates eligibility against predefined funding rules before allocation',
  '<strong>Allocation Processing</strong> — Distributes invoices to banks based on priority order and available limits — fully automated',
  '<strong>Utilization Tracking</strong> — Continuously monitors total limits, utilized amount, and remaining capacity across all banks in real time',
  '<strong>Report Generation</strong> — Automatically generates bank-wise reports, allocation summaries, and exception reports post-processing',
  '<strong>Email Delivery</strong> — Sends automated reports and repayment alerts to stakeholders without any manual intervention'
]))}
${mlcFlow(['Upload Datasets', 'Validation & Eligibility Check', 'Allocation Processing (bank priority order)', 'Utilization Tracking Update', 'Export Generation (bank-wise reports)', 'Email & File Delivery to stakeholders'])}
${mlcSection('Workflow Engine Capabilities Demonstrated', mlcUl([
  '<strong>Sequential stage execution</strong> — Each stage feeds the next automatically; no manual handoffs between steps',
  '<strong>Dependency resolution</strong> — Allocation cannot run before validation; reports cannot generate before allocation completes',
  '<strong>Retry logic</strong> — Transient failures in any stage are retried automatically before the workflow flags an error',
  '<strong>Audit tracking</strong> — Every stage execution is logged with input, output, and status — a complete trail from upload to delivery'
]))}
${mlcCompare(
  '✅ After Automation',
  ['Zero duplicate invoice submissions — validation catches them', 'Correct allocation based on configured bank priority rules', 'Real-time utilization dashboard — no manual tracking', 'Reports generated and emailed automatically post-run', 'Finance users operate independently — no ops team dependency'],
  '❌ Before Automation',
  ['Duplicate submissions caused incorrect funding', 'Manual allocation — error-prone and slow', 'Spreadsheet tracking — outdated within hours', 'Manual report preparation delayed decisions', 'Every step required ops team involvement']
)}
${mlcTakeaway('The Invoice Discounting implementation demonstrates the full power of workflow orchestration: data flows from upload through validation, allocation, utilization tracking, report generation, and email delivery — without a single human step in between. The business impact is not just speed but accuracy: rules enforce eligibility and allocation priorities that humans consistently got wrong.')}`
          },
          {
            title: 'Dynamic Email Rendering — Jinja Templates & Smart Email Controls',
            dur: '10 min',
            html: `<h2>Dynamic Email Rendering — Jinja Templates & Smart Email Controls</h2>
<p class="mlc-lead">A financial operations team needed automated repayment reminder emails with properly formatted HTML tables. The workflow existed — but the email body showed raw JSON instead of a readable table. The fix: a Jinja transformation layer inserted between the data query and the email send step. This lesson covers the pattern that transforms any raw query output into a business-ready email.</p>
${mlcSection('The Problem — Raw JSON in Email Body', mlcUl([
  'A workflow exported dataset records, looped through them, and persisted fields to an input table',
  'The final step — TABLE_QUERY → SEND_EMAIL — passed raw query output directly to the email node',
  'Recipients received a raw JSON array: no headers, no structure, unreadable for non-technical stakeholders',
  '<strong>Root cause:</strong> No transformation layer between the query output and the email. Email clients expected HTML; the workflow was delivering JSON.'
]))}
${mlcSection('The Five Requirements the Solution Had to Meet', mlcOl([
  '<strong>HTML Table Rendering</strong> — Display repayment data as a properly formatted HTML table visible in all email clients',
  '<strong>Due Date Filtering</strong> — Scope results to payments due within the next 5 days only — not the entire dataset',
  '<strong>Duplicate Removal</strong> — Eliminate duplicate entries arising from multiple dataset inserts on the same record',
  '<strong>INR Currency Formatting</strong> — Format monetary values in Indian numbering style: 5000000 → INR 50,00,000',
  '<strong>Smart Email Controls</strong> — Suppress the email entirely when no records exist; dynamically assemble the subject line from companies in the result set'
]))}
${mlcDiagram('Before vs After — Pipeline Architecture', `
<div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
  <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px 14px">
    <div style="font-size:11px;font-weight:700;color:#f87171;margin-bottom:6px">❌ BEFORE (Broken Pipeline)</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.05);border-radius:4px;padding:4px 8px">TABLE_QUERY</div>
      <div style="color:#6b7280">→</div>
      <div style="font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.05);border-radius:4px;padding:4px 8px">SEND_EMAIL</div>
    </div>
    <div style="font-size:10px;color:#f87171;margin-top:6px">Raw JSON in body · Unreadable · Static subject line</div>
  </div>
  <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 14px">
    <div style="font-size:11px;font-weight:700;color:#4ade80;margin-bottom:6px">✅ AFTER (Fixed Pipeline)</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.05);border-radius:4px;padding:4px 8px">TABLE_QUERY</div>
      <div style="color:#6b7280">→</div>
      <div style="font-size:11px;color:#4ade80;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:4px;padding:4px 8px;font-weight:600">JINJA_ACTION ✨</div>
      <div style="color:#6b7280">→</div>
      <div style="font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.05);border-radius:4px;padding:4px 8px">SEND_EMAIL</div>
    </div>
    <div style="font-size:10px;color:#4ade80;margin-top:6px">Formatted HTML table · Dynamic subject · Smart suppression</div>
  </div>
</div>`)}
${mlcSection('The Jinja Action — What It Does', mlcUl([
  'Receives the raw JSON array from TABLE_QUERY as input',
  'Applies a Jinja template that: iterates over each row, formats amounts as INR, filters records outside the 5-day window, and renders the result as an HTML <code>&lt;table&gt;</code>',
  'Simultaneously builds a dynamic subject line by extracting company names from the result set',
  'If no records pass the filter, the template outputs an empty result — the Conditional Guard upstream detects this and exits the workflow without sending the email'
]))}
${mlcSection('The Complete Redesigned Pipeline', mlcOl([
  '<strong>Dataset Export</strong> — Exports dataset records into record format for loop processing',
  '<strong>ForEach Processing</strong> — Iterates over each record, passing it individually to the insertion step',
  '<strong>Insert into Input Table</strong> — Persists each record\'s fields via RUN_INPUT_TABLE_ACTION INSERT',
  '<strong>Conditional Guard</strong> — Exits cleanly if record count < 1, preventing empty emails',
  '<strong>TABLE_QUERY + SQL</strong> — Fetches deduplicated, date-scoped, INR-formatted records',
  '<strong>JINJA_ACTION</strong> — Converts JSON to HTML table; builds dynamic subject line',
  '<strong>SEND_EMAIL</strong> — Dispatches the rendered email to stakeholders'
]))}
${mlcTakeaway('The Jinja pattern — TABLE_QUERY → JINJA → SEND_EMAIL — is reusable for any workflow that needs to email structured data. The key insight is simple: queries return data; Jinja renders presentation. Never pass raw query output directly to an email node.')}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Which trigger type fires when a user submits a form linked to the workflow?', opts: ['Dataset Update', 'HTTP Trigger', 'Form Submission', 'Workflow Event'], a: 2, exp: 'Form Submission fires when a user submits a linked form, making all form field values available as trigger data inside the workflow steps. It is the standard trigger for intake forms, approval workflows, and service requests.' },
      { q: 'A pipeline is still in "Running" status after 6 hours with no error messages. Which state is this?', opts: ['Slow — it will eventually complete', 'Stuck — it needs investigation', 'Broken — there is an explicit error', 'Scheduled — it has not started yet'], a: 1, exp: 'A pipeline that stays in "Running" state for hours without progress and without showing any error messages is in the Stuck state. The most common causes are Calculation node misconfiguration, NATS messaging layer failure, or V1 pipeline deprecation.' },
      { q: 'In the Retry Policy, what does a Backoff Coefficient of 2 with Interval = 10 seconds produce?', opts: ['Retries at: 10s, 10s, 10s, 10s', 'Retries at: 10s, 20s, 40s, 80s', 'Retries at: 2s, 4s, 8s, 16s', 'Retries at: 20s, 40s, 80s, 160s'], a: 1, exp: 'Backoff Coefficient is a multiplier applied to the previous delay. Starting with Interval = 10s and Coefficient = 2: first retry at 10s, second at 20s (10×2), third at 40s (20×2), fourth at 80s (40×2). This exponential spacing reduces pressure on failing systems.' },
      { q: 'In the Parent-Child orchestration pattern, what is the critical setting that prevents parallel execution conflicts?', opts: ['Sequential Mode enabled on the Child Workflow', '"Wait for Completion" enabled on each trigger_process_action', 'Setting Max Attempts = 1 on the Parent Workflow', 'Configuring a Schedule trigger on the Parent instead of Manual'], a: 1, exp: '"Wait for Completion" must be enabled on each trigger_process_action node in the Parent Workflow. Without it, all child workflows launch simultaneously — Pipeline B may attempt to use data from Pipeline A before Pipeline A has finished producing it.' },
      { q: 'What does the Select node do in Allocation Studio?', opts: ['Filters rows based on conditions', 'Combines two datasets by appending rows', 'Chooses specific columns to pass downstream, excluding unused columns', 'Sorts rows in a specified order'], a: 2, exp: 'The Select node is a column picker — it allows you to choose which columns pass to the next node in the pipeline. Unused columns from the source are excluded from the output. Each selected column can be given an alias.' },
      { q: 'A pipeline is slow because downstream nodes are re-executing the full query chain on millions of rows. What is the correct fix?', opts: ['Increase the step timeout value', 'Enable "Materialize" on heavy intermediate nodes', 'Restart the NATS cluster', 'Migrate from V1 to Pipeline V2'], a: 1, exp: 'When nodes process large datasets without intermediate caching, each downstream node re-executes the entire upstream query chain — compounding complexity exponentially. Enabling "Materialize" on heavy nodes stores intermediate results as physical datasets, allowing downstream nodes to query precomputed data.' },
      { q: 'In the API Integration Node architecture, which layer handles raw network sockets, connection pooling, and JSON serialization?', opts: ['The API Integration Node (Orchestrator)', 'The Internal Workflow Engine', 'The REST API Connector (Transport Layer)', 'The External API Endpoint'], a: 2, exp: 'The REST API Connector is the transport layer. The API Integration Node (Orchestrator) handles business logic, variable mapping, and state tracking — it is completely agnostic to network-level concerns. This separation of concerns makes integrations maintainable and replaceable.' },
      { q: 'What does "Continue on Failure" do when enabled on a workflow step?', opts: ['The step retries indefinitely until it succeeds', 'The workflow proceeds to the next step even though this step failed, while still recording the failure', 'The step is skipped and marked as successful', 'An alert is sent to the workflow owner and execution pauses'], a: 1, exp: '"Continue on Failure" allows the workflow to proceed past a failed step — the failed step is still marked as failed and recorded in the logs, but it does not block downstream steps. This is useful for cleanup, logging, or notification steps that must run regardless of upstream failures.' },
      { q: 'In the Dynamic Email Rendering pattern, what is the role of the Jinja Action between TABLE_QUERY and SEND_EMAIL?', opts: ['It filters the query results to the correct date range', 'It converts raw JSON query output into a rendered HTML table and builds the dynamic subject line', 'It inserts records into the input table before the email is sent', 'It validates the email addresses of recipients before dispatch'], a: 1, exp: 'The Jinja Action is the transformation layer that bridges data and presentation. It receives the raw JSON array from TABLE_QUERY, applies a template to render it as an HTML table, formats amounts (INR), and assembles a dynamic subject line from the result set. Without it, recipients see unreadable raw JSON.' },
      { q: 'The Merge node in Allocation Studio requires that both source datasets share what property?', opts: ['The same number of rows', 'The same primary key column', 'Identical schema — same column names and data types', 'The same trigger source'], a: 2, exp: 'The Merge node combines two datasets by appending rows (union). For this to work correctly, both datasets must share identical schemas — the same column names in the same order with the same data types. Mismatched schemas cause column misalignment in the merged output.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 12 — EXPORTS & REPORTS
  // ════════════════════════════════════════════════════
  er: {
    modules: [
      {
        title: 'Export Fundamentals',
        lessons: [
          {
            title: 'Export Types & Output Formats in Bluecopa',
            dur: '10 min',
            html: `<h2>Export Types & Output Formats in Bluecopa</h2>
<p class="mlc-lead">Before configuring any export workflow, it is essential to understand what export types Bluecopa supports, what output formats are available, and which use case each combination is designed for.</p>
${mlcSection('The Four Export Types', mlcUl([
  '<strong>Single Worksheet</strong> — exports one sheet as a CSV (.csv) or Excel (.xlsx) file. Standard single-sheet report for a specific dataset or metric group.',
  '<strong>Multiple Worksheets</strong> — exports multiple sheets combined into a single Excel workbook with multiple tabs. Ideal for consolidated reports combining multiple data views in one file.',
  '<strong>Multiple Files (ZIP)</strong> — exports each worksheet as a separate file, bundled into a single ZIP archive (.zip). Used when stakeholders need separate deliverables per dataset.',
  '<strong>With Statements & Metrics</strong> — exports an Excel workbook with additional summary tabs containing KPI snapshots alongside raw data. Suited for executive reports.'
]))}
${mlcSection('Supported Output Formats', mlcCompare(
  'Format', ['CSV (.csv)', 'Excel (.xlsx)', 'ZIP Archive (.zip)', 'Excel with Statements'],
  'Best For', ['Simple single-sheet reports, flat data feeds', 'Multi-tab consolidated workbooks', 'Multiple separate files in one delivery', 'Executive reports with KPI summaries alongside raw data']
))}
${mlcSection('Additional Export Capabilities', mlcUl([
  '<strong>Currency Type selection</strong> — specify output currency for multi-region reports',
  '<strong>Row-level filters</strong> — scope exported rows to an authorised data subset',
  '<strong>Date range filters</strong> — limit data to a specific period before export',
  '<strong>Statements and Metrics</strong> — include KPI snapshots alongside worksheet data',
  '<strong>Filebox Sync</strong> — automatically upload generated files to the Bluecopa Filebox for centralised access'
]))}
${mlcSection('Choosing the Right Export Type', mlcUl([
  'Single report for one team → <strong>Single Worksheet (CSV or XLSX)</strong>',
  'Consolidated monthly pack for finance → <strong>Multiple Worksheets (single XLSX with tabs)</strong>',
  'Separate files per business unit → <strong>Multiple Files (ZIP)</strong>',
  'Executive dashboard with KPI summary → <strong>With Statements & Metrics (XLSX)</strong>'
]))}
${mlcExample('Implementation Scenario', 'A finance team needs a month-end pack with three tabs: P&L, Balance Sheet, and Cash Flow. The correct choice is Multiple Worksheets — one XLSX workbook with three tabs, delivered as a single email attachment. If each business unit needed their own separate file, Multiple Files (ZIP) would be used instead.')}
${mlcTakeaway('The export type and output format are determined by the Export configuration — not by the workflow. Get this decision right before building the workflow, as changing it later requires re-creating the export configuration.')}
`
          },
          {
            title: 'Prerequisites — Datasets, Workbooks & Export Config',
            dur: '8 min',
            html: `<h2>Prerequisites — Datasets, Workbooks & Export Config</h2>
<p class="mlc-lead">Every export workflow in Bluecopa depends on three components being correctly set up in advance. Skipping any one of these causes the workflow to fail at runtime — not at setup time, making errors hard to debug.</p>
${mlcSection('The Three Required Prerequisites', mlcOl([
  '<strong>Dataset</strong> — a dataset containing the data to be exported must exist and be up to date, including all required fields, dimensions, and measures for the intended report output.',
  '<strong>Workbook</strong> — the dataset must be imported into a Workbook. The workbook is the data source for the export action. Each worksheet within the workbook maps to a sheet or file in the final export.',
  '<strong>Export Configuration</strong> — an Export must be created from the workbook before configuring the workflow. The export defines output format, sheet selection, filters, and currency settings applied during file generation.'
]))}
${mlcSection('Dependency Chain', mlcFlow([
  'Raw data source (DB, GCS, API)',
  'Dataset (ingested into Bluecopa)',
  'Workbook (dataset imported as worksheets)',
  'Export Configuration (defines format, filters, currency)',
  'Workflow (orchestrates trigger → export → delivery)'
]))}
${mlcSection('Common Prerequisite Mistakes', mlcUl([
  '<strong>Dataset not refreshed</strong> — the export uses stale data from the last ingestion run. Always verify the dataset was ingested before the scheduled export fires.',
  '<strong>Workbook not published</strong> — an unpublished workbook cannot be used as an export source. Publish the workbook after every schema change.',
  '<strong>Export config references a deleted sheet</strong> — if a worksheet is removed from the workbook after the export was configured, the export fails silently. Verify workbook-export alignment after any structural change.',
  '<strong>Currency not set</strong> — for multi-region reports, leaving currency at default may produce incorrect values for some recipients.'
]))}
${mlcSection('Setup Checklist', mlcUl([
  '☑ Dataset exists and contains all required fields',
  '☑ Dataset has been ingested and data is current',
  '☑ Dataset is imported into a Workbook',
  '☑ All required worksheets are configured within the workbook',
  '☑ Workbook is published',
  '☑ Export configuration is created from the workbook with correct format, sheets, and filters',
  '☑ Export configuration is saved and tested manually before wiring into a workflow'
]))}
${mlcTakeaway('Think of it as a pipeline of dependencies: the workflow is only as good as its export config, which is only as good as its workbook, which is only as good as its dataset. Build and verify from the bottom up before touching the workflow.')}
`
          }
        ]
      },
      {
        title: 'Export via Email',
        lessons: [
          {
            title: 'The Export via Email Pipeline — Three Stages',
            dur: '10 min',
            html: `<h2>The Export via Email Pipeline — Three Stages</h2>
<p class="mlc-lead">Export via Email combines two core capabilities — Export (generating a structured file from a worksheet) and Email Delivery (attaching and sending that file automatically) — into a single automated three-stage pipeline.</p>
${mlcSection('What Export via Email Eliminates', mlcUl([
  'Manually downloading the report from Bluecopa',
  'Opening an email client and composing a new message',
  'Attaching the file and typing recipient addresses',
  'Hitting send and tracking delivery manually'
]))}
${mlcSection('The Three-Stage Sequence', mlcUl([
  '<strong>Stage 1 — Trigger</strong>: An authorized user triggers the workflow with a single action. All parameters (worksheet source, date range, recipients) are pre-configured — no form input is required at trigger time.',
  '<strong>Stage 2 — Run Export</strong>: The system connects to the designated worksheet, applies date filters (if configured), and generates the output file. Single worksheet → CSV. Multiple worksheets → each exported as CSV, bundled into a ZIP archive. The file is held as a referenced object with a unique <code>file_id</code>.',
  '<strong>Stage 3 — Send Email</strong>: Using the <code>file_id</code> from Stage 2, the email service automatically attaches the correct file and dispatches it to configured recipients. No manual download or re-upload is required.'
]))}
${mlcSection('File Integrity Guarantee', '<p>Because the file reference (<code>file_id</code>) is passed directly between stages within the same workflow run, there is <strong>zero risk of attaching the wrong file</strong>. The attachment always reflects exactly what was generated in the current run — not a cached or prior version.</p>')}
${mlcSection('Embedded vs Standalone Mode', mlcCompare(
  'Standalone Export via Email', [
    'Manually triggered by an authorized user',
    'The export and email are the entire workflow',
    'Used for on-demand report delivery',
    'User initiates when they decide the report is needed'
  ],
  'Embedded in Parent Workflow', [
    'Automatically triggered when the parent workflow reaches this step',
    'The export and email are one step in a larger business process',
    'Used within month-end closing, payroll, or allocation pipelines',
    'Fully hands-off — no user action at the export/email stage'
  ]
))}
${mlcExample('Business Scenario', 'A collections manager needs to send the outstanding invoices report to the credit team every Monday morning. Rather than downloading and emailing it manually each week, Export via Email is configured once: worksheet source, date filter (last 7 days), recipient list, and subject line. Every Monday, the manager clicks Trigger — and the system generates and delivers the report automatically in under 60 seconds.')}
${mlcTakeaway('Export via Email is a three-stage sequential pipeline — Trigger → Export → Email. Each stage feeds automatically into the next. Once configured, the only human action needed is triggering (or it can be embedded to need zero human action).')}
`
          },
          {
            title: 'Manual vs Embedded Triggers & Configuration Options',
            dur: '10 min',
            html: `<h2>Manual vs Embedded Triggers & Configuration Options</h2>
<p class="mlc-lead">Understanding the trigger model and the rich configuration options available in Export via Email determines how flexibly and reliably reports reach their audience.</p>
${mlcSection('Manual Trigger — How It Works', mlcUl([
  'An authorized user initiates the workflow with a single action — no data entry at trigger time',
  'All parameters are pre-configured in the workflow definition: worksheet source, date range, recipient addresses, output settings',
  'Best for: ad-hoc reports, on-demand delivery, or when the report generation moment is determined by a human decision (e.g. after a data review is complete)',
  'The user\'s role is to press trigger — the system handles everything else'
]))}
${mlcSection('Embedded Trigger — How It Works', mlcUl([
  'The Export via Email step is a node within a larger parent workflow',
  'When the parent workflow reaches this node, the export and email fire automatically',
  'Best for: month-end closing workflows, payroll processing pipelines, allocation reports — where delivery is one step in a larger automated sequence',
  'No separate trigger is needed — the parent workflow\'s trigger drives everything'
]))}
${mlcSection('Key Configuration Options', mlcUl([
  '<strong>Date & Time Settings</strong> — custom period selection (start/end dates), preset periods (this week, this month, last quarter, year-to-date), or fiscal year-aligned date ranges',
  '<strong>Output File Type</strong> — CSV (single worksheet) or ZIP archive (multiple worksheets)',
  '<strong>Currency Conversion</strong> — specify output currency for multi-region reports where stakeholders work in different currencies',
  '<strong>Recipients (To/CC)</strong> — primary recipients and secondary informational copies; restrict distribution to those who genuinely need the data',
  '<strong>Subject Line</strong> — include report name and time period for clarity, e.g. "Collections Report June 2026"',
  '<strong>Email Body</strong> — keep brief; the attachment is the primary deliverable, not the email body'
]))}
${mlcSection('Best Practices for Configuration', mlcUl([
  'Define the date range in the Export configuration — not at trigger time — so the report scope is consistent and auditable',
  'Use a standardised subject line format: <code>[Report Name] [Period]</code> — recipients can file and search by pattern',
  'Restrict the recipient list to data owners; avoid broad distribution lists that may expose sensitive data',
  'Use CC sparingly — only for stakeholders who need visibility, not the data itself'
]))}
${mlcTakeaway('Manual trigger gives a human the control point; embedded trigger removes it entirely. Choose based on whether human judgment is needed to decide when the report should be generated. In either case, all parameters are pre-configured — the trigger is never a data-entry moment.')}
`
          },
          {
            title: 'File Attachment Handler & Delivery Integrity',
            dur: '8 min',
            html: `<h2>File Attachment Handler & Delivery Integrity</h2>
<p class="mlc-lead">The File Attachment Handler is the bridge between the export engine and the email service. Understanding how it works explains why Export via Email always delivers the correct file, even in high-concurrency environments.</p>
${mlcSection('How the file_id System Works', mlcOl([
  'Stage 2 (Run Export) generates the output file and stores it internally',
  'The export engine assigns a unique <code>file_id</code> to the generated file for this specific run',
  'Stage 3 (Send Email) references the attachment using a <strong>dynamic variable</strong>: <code>${ExportNodeID.file_id}</code>',
  'At runtime, this variable resolves to the exact <code>file_id</code> generated in Stage 2 of the same execution',
  'The email service retrieves the file using this reference and attaches it — no manual download or upload'
]))}
${mlcSection('Why Dynamic file_id Matters', mlcUl([
  '<strong>Correctness</strong> — the attachment always reflects exactly what was generated in the current run, never a cached or prior version',
  '<strong>Concurrency safety</strong> — if multiple instances of the workflow run simultaneously (e.g. for different clients), each instance\'s <code>file_id</code> is unique. There is no risk of cross-contamination between runs.',
  '<strong>Auditability</strong> — each delivery is logged with its specific <code>file_id</code>, creating a traceable record of exactly which file was sent in each run'
]))}
${mlcSection('Configuring the Email Attachment Reference', mlcUl([
  'In the Send Email node, set <strong>Attachment Type</strong> to <code>Email Attachments</code>',
  'In the File reference field, enter: <code>${ExportNodeID.file_id}</code>',
  'Replace <code>ExportNodeID</code> with the actual node ID of the Run Export Excel step (e.g. <code>MQ4U27JWWFDYAADBITD7</code>)',
  'Example: <code>${MQ4U27JWWFDYAADBITD7.file_id}</code>'
]))}
${mlcSection('Supporting Email Service Capabilities', mlcUl([
  '<strong>CC and BCC</strong> — secondary recipients for visibility or compliance requirements',
  '<strong>Custom subject lines</strong> — dynamic or static; include report name and period',
  '<strong>Branded email templates</strong> — consistent look and feel for all report deliveries',
  '<strong>Delivery confirmation logging</strong> — every dispatch is logged for audit and traceability'
]))}
${mlcExample('High-Concurrency Scenario', 'A Bluecopa implementation serves 15 clients. At month-end, all 15 Export via Email workflows fire within the same 5-minute window. Each workflow generates its own file_id. When the email service attaches the file, it uses the file_id from that specific workflow\'s export node — never mixing files between clients. This is guaranteed by design, not by timing.')}
${mlcTakeaway('The dynamic file_id variable is what makes Export via Email reliable at scale. Never hardcode a file reference — always use ${ExportNodeID.file_id} so the correct, current-run file is always attached.')}
`
          }
        ]
      },
      {
        title: 'Scheduled Report Delivery',
        lessons: [
          {
            title: 'Scheduled Triggers — Standard & Cron Scheduling',
            dur: '10 min',
            html: `<h2>Scheduled Triggers — Standard & Cron Scheduling</h2>
<p class="mlc-lead">Scheduled Report Delivery transforms Bluecopa from a reporting tool into a proactive data distribution platform — generating and distributing reports to recipients automatically at predefined intervals with zero manual intervention after initial configuration.</p>
${mlcSection('How the Scheduled Trigger Works', '<p>The Scheduled Trigger initiates the workflow at configured intervals. Two scheduling methods are available — Standard Schedule for common patterns and Cron Schedule for precise or complex timing requirements.</p>')}
${mlcSection('Option A — Standard Schedule', mlcUl([
  '<strong>Daily</strong> — e.g. every day at 08:00 UTC → morning reports at start of business day',
  '<strong>Weekly</strong> — e.g. every Monday at 07:00 UTC → weekly summaries for managers',
  '<strong>Monthly</strong> — e.g. 1st of every month at 06:00 UTC → billing, finance, and payroll reports',
  '<strong>Hourly</strong> — e.g. every hour at :00 → near real-time operational dashboards',
  '<strong>Yearly</strong> — e.g. January 1 at 00:00 UTC → annual compliance or audit exports',
  'Also configure: <strong>execution time</strong>, <strong>timezone</strong>, and <strong>exclusion dates</strong> (public holidays, non-business days)'
]))}
${mlcSection('Option B — Cron Schedule', '<p>Use a cron expression for advanced scheduling that standard frequencies cannot cover. Enter the expression directly in the Schedule field.</p>' + mlcUl([
  '<code>*/5 * * * *</code> — every 5 minutes',
  '<code>0 8 * * 1-5</code> — Monday to Friday at 08:00',
  '<code>0 9 1 * *</code> — first day of every month at 09:00',
  '<code>0 6 * * 1</code> — every Monday at 06:00'
]))}
${mlcSection('Standard vs Cron — When to Use Each', mlcCompare(
  'Standard Schedule', [
    'Common, predictable patterns (daily, weekly, monthly)',
    'Easy to configure with dropdowns — no cron syntax needed',
    'Covers the vast majority of reporting cadences',
    'Use for: morning reports, weekly summaries, monthly billing packs'
  ],
  'Cron Schedule', [
    'Complex or uncommon timing requirements',
    'Requires familiarity with cron expression syntax',
    'Enables minute-level precision and multi-condition patterns',
    'Use for: workday-only reports, bi-weekly schedules, time-sensitive intraday reporting'
  ]
))}
${mlcSection('Timezone Configuration — Critical', mlcUl([
  'Always configure the timezone explicitly — <strong>never rely on server defaults</strong>',
  'Align delivery time with the recipient\'s start-of-day so reports are ready when work begins',
  'For global teams: schedule for the earliest timezone among recipients, or create separate schedules per region',
  'Use the <strong>Exclude Schedule</strong> field to suppress delivery on public holidays and non-business days'
]))}
${mlcExample('Cron Use Case', 'A client\'s finance team in India needs reports delivered at 09:00 IST on the last working day of each month. Standard schedule cannot handle "last working day" logic. A cron expression combined with an exclusion calendar covering Indian public holidays achieves this precisely.')}
${mlcTakeaway('Use Standard Schedule for common cadences — it is easier to maintain. Only escalate to Cron when you need minute-level precision or patterns that standard frequencies cannot express. Always set timezone explicitly.')}
`
          },
          {
            title: 'Three-Node Workflow — Configure & Activate',
            dur: '12 min',
            html: `<h2>Three-Node Workflow — Configure & Activate</h2>
<p class="mlc-lead">The Scheduled Report Delivery workflow is a three-node automation pipeline. Each node executes sequentially, with outputs passed automatically from one stage to the next. Once activated, it runs indefinitely on the configured schedule.</p>
${mlcSection('The Three-Node Pipeline', mlcUl([
  '<strong>Node 1 — Scheduled Trigger</strong>: Initiates the workflow at configured intervals using a cron expression or standard frequency setting.',
  '<strong>Node 2 — Run Export Excel</strong>: Connects to the workbook, applies filters, and generates the output file (CSV, Excel, or ZIP archive). Outputs a <code>file_id</code> reference.',
  '<strong>Node 3 — Send Email</strong>: Retrieves the generated file via the dynamic <code>file_id</code> variable and dispatches it to all configured recipients.'
]))}
${mlcSection('Step 1 — Configure the Trigger Node', mlcUl([
  'Set <strong>Trigger On</strong>: Schedule',
  'Set <strong>Event</strong>: Scheduled',
  'Choose scheduling method: Standard frequency or Cron expression',
  'Set execution time and timezone',
  'Add exclusion dates for holidays or non-business days'
]))}
${mlcSection('Step 2 — Configure the Run Export Excel Node', mlcUl([
  'Set <strong>Action Type</strong>: Run Export Excel',
  'Set <strong>Source for Export Excel WF ID</strong>: Workspace',
  'Select the required export configuration (e.g. <code>final_collections_usd_amount</code>)',
  'Set <strong>Run Input Type</strong>: Export Worksheet',
  'Set <strong>Source for Inputs</strong>: Input (from trigger or previous node)',
  'This node generates the file and stores it as a <code>file_id</code> reference for the next node'
]))}
${mlcSection('Step 3 — Configure the Send Email Node', mlcUl([
  'Add a <strong>Send Email</strong> node after the export step',
  'Set <strong>Attachment Type</strong>: Email Attachments',
  'Set <strong>File reference</strong>: <code>${ExportNodeID.file_id}</code> — replace ExportNodeID with the actual node ID',
  'Set <strong>To</strong>: primary recipient email address(es)',
  'Set <strong>CC</strong>: secondary recipients requiring informational copies',
  'Set <strong>Subject</strong>: include report name and time period — e.g. "Collections Report June 2026"',
  'Set <strong>Email Body</strong>: keep brief — the attachment is the primary deliverable'
]))}
${mlcSection('Activation & Go-Live', mlcFlow([
  'Verify dataset is ingested and workbook is up to date',
  'Test the export configuration manually in the Export section',
  'Configure the three workflow nodes in sequence',
  'Test with a manual trigger to verify end-to-end delivery',
  'Activate the workflow to enable recurring automated delivery',
  'Monitor the first few scheduled runs to confirm delivery and file correctness'
]))}
${mlcExample('Dynamic file_id in Action', 'The Run Export Excel node has the ID MQ4U27JWWFDYAADBITD7. In the Send Email node, the file reference is set to ${MQ4U27JWWFDYAADBITD7.file_id}. At runtime, this resolves to the exact file generated in the current workflow execution — guaranteeing the correct, fresh report is always attached.')}
${mlcTakeaway('The three-node pipeline is simple by design. Trigger fires → Export generates file → Email attaches and sends. The key is the dynamic file_id reference that chains nodes 2 and 3 together. Get this reference right and the rest is just scheduling.')}
`
          }
        ]
      },
      {
        title: 'Multi-sheet Exports & Real-World Automation',
        lessons: [
          {
            title: 'Multi-sheet Excel Export — Configuration & Options',
            dur: '10 min',
            html: `<h2>Multi-sheet Excel Export — Configuration & Options</h2>
<p class="mlc-lead">Multi-sheet Excel Export allows you to consolidate data from multiple workbooks, statements, and metrics into a single Excel (.xlsx) file with multiple tabs. It is essential for financial reporting and cross-functional data delivery where stakeholders expect one organised workbook rather than a collection of individual files.</p>
${mlcSection('Why Multi-sheet Exports Matter', mlcUl([
  'Finance teams need P&L, Balance Sheet, and Cash Flow in one workbook — not three separate files',
  'Operations teams need daily, weekly, and monthly summaries side-by-side in one download',
  'External stakeholders expect a single, professionally organised deliverable, not a ZIP of separate CSVs',
  'Multi-sheet workbooks enable pivot tables that span data from multiple source views'
]))}
${mlcSection('Method 1 — Merge Excel Files into One XLSX', mlcOl([
  'Navigate to <strong>Apps → Exports</strong> and click New',
  'Select your data source: Workbook, Statement, or Statement Plan',
  'Configure each sheet: specify source, metrics, filters, date ranges, currency',
  'In the <strong>Export Options</strong> section, enable the checkbox: <code>"Merge Excel files into one XLSX"</code>',
  'Toggle <strong>Export Datasheet</strong> if you want a dedicated tab for the raw source data',
  'Save, Publish, and Run'
]))}
${mlcSection('Method 2 — Single XLSX With Multiple Sheets (No Merge)', mlcOl([
  'Navigate to <strong>Apps → Exports</strong>, create or edit an export',
  'In the output/file configuration, choose <strong>EXCEL</strong> as the file type — keep "Merge Excel files into one XLSX" <strong>disabled</strong>',
  'Add the first sheet under the same Excel file configuration, selecting the required source',
  'Configure sheet-specific settings: filters, date range, currency, columns, pivot options',
  'Add each additional sheet within the <strong>same Excel file configuration</strong> — do not create a new output file entry for each sheet',
  'Give each sheet a clear and <strong>unique sheet name</strong>',
  'Arrange tabs in the order they should appear in the final workbook',
  'Save, Publish, and Run'
]))}
${mlcSection('Filebox Sync', mlcUl([
  'Enable <strong>"Automatic upload to Filebox"</strong> to have generated multi-sheet files automatically uploaded to a designated Filebox folder',
  'Once there, files are accessible to downstream workflows and other team members without manual distribution',
  'Filebox sync runs after the export completes — a Filebox upload failure does not indicate export failure'
]))}
${mlcSection('Accessing the Exported File', mlcUl([
  '<strong>Immediate</strong>: Downloads tab on the current Export page',
  '<strong>Centralised</strong>: Operations → Downloads for later retrieval from a unified download history',
  '<strong>Filebox</strong>: Designated folder if automatic upload was enabled'
]))}
${mlcTakeaway('Use "Merge Excel files into one XLSX" when you have multiple separate export file entries that you want combined into one workbook. Use the single-file, multi-sheet approach (Method 2) when you are building a single workbook with multiple tabs from the start — these are different use cases and should not be mixed.')}
`
          },
          {
            title: 'Constraints, Failure Scenarios & Best Practices',
            dur: '10 min',
            html: `<h2>Constraints, Failure Scenarios & Best Practices</h2>
<p class="mlc-lead">Understanding the constraints and failure modes of Bluecopa's export system prevents silent failures in production. Most issues are predictable and avoidable through correct configuration.</p>
${mlcSection('Hard Constraints — Non-Negotiable Rules', mlcUl([
  '<strong>CSV cannot contain multiple sheets</strong> — if you attempt to save a multi-sheet configuration as CSV, you receive a validation error: "CSV file type cannot contain multiple sheets." Multi-sheet exports must use XLSX.',
  '<strong>Merge option incompatible with mixed file types</strong> — you cannot select "Merge Excel files" when the export includes both CSV and Excel outputs. The merge option only works when all outputs are Excel.',
  '<strong>Sheet names must be unique</strong> within the workbook and must follow Excel naming rules — no duplicate names, no unsupported characters (such as <code>: / \\ ? * [ ]</code>).',
  '<strong>User access required</strong> — any user running the workflow must have access to all selected source data; otherwise the affected sheet may fail or return incomplete data.'
]))}
${mlcSection('Failure Scenarios & Root Causes', mlcUl([
  '<strong>CSV selected for multi-sheet</strong> → validation error at save time. Fix: change output format to XLSX.',
  '<strong>Mixed CSV + Excel with Merge enabled</strong> → configuration error. Fix: standardise all outputs to XLSX before enabling Merge.',
  '<strong>Missing or invalid data source</strong> → the export fails if the selected workbook, statement, or statement plan is deleted, inaccessible, or contains no data for the configured filters. Fix: verify source exists and has data before running.',
  '<strong>Permission restrictions</strong> → users without access to the selected source data or destination Filebox folder cannot generate, download, or sync the export. Fix: verify access before scheduling.',
  '<strong>Large export timeout</strong> → very large datasets, many sheets, or complex pivot metrics may cause processing delays or execution failures. Fix: reduce date range scope, simplify pivot logic, or split into multiple smaller exports.',
  '<strong>Filebox upload failure</strong> → the export may complete successfully but fail to sync to Filebox. Fix: check Filebox connectivity and folder configuration. The export file is still available in Downloads.'
]))}
${mlcSection('Production Best Practices — Scheduling', mlcUl([
  'Align delivery time with the recipient\'s start-of-day',
  'Use the Exclude Schedule field to suppress delivery on public holidays',
  'For time-sensitive reports, use Cron scheduling for precise minute-level control',
  'Always configure timezone explicitly — never rely on server defaults'
]))}
${mlcSection('Production Best Practices — Email', mlcUl([
  'Use a clear, consistent subject line: <code>[Report Name] [Period]</code>',
  'Keep the email body brief — the attachment is the deliverable',
  'Restrict recipients to those who require the data; avoid broad distribution lists',
  'Use CC sparingly for secondary stakeholders who need visibility, not the data directly'
]))}
${mlcTakeaway('The most common production failures are: wrong output format for multi-sheet (CSV instead of XLSX), source data going stale between ingestion and export, and Filebox sync failures being mistaken for export failures. Each is preventable with pre-flight checks.')}
`
          },
          {
            title: 'Invoice Discounting Automation — Full Report Pipeline',
            dur: '12 min',
            html: `<h2>Invoice Discounting Automation — Full Report Pipeline</h2>
<p class="mlc-lead">This lesson presents a complete real-world implementation: the Invoice Discounting Automation Platform, where every Exports & Reports capability covered in this course is applied together as part of a production-grade financial automation system.</p>
${mlcSection('The Business Problem', mlcUl([
  '<strong>Manual invoice validations</strong> → slow processing cycles',
  '<strong>Duplicate invoice submissions</strong> → incorrect bank funding',
  '<strong>No centralised visibility</strong> → difficult tracking across banks and invoices',
  '<strong>Manual allocation process</strong> → allocation errors and funding delays',
  '<strong>Delayed report preparation</strong> → slow decision-making for finance leadership'
]))}
${mlcSection('The Automated Platform — Six Capabilities', mlcUl([
  '<strong>1. Dataset Upload</strong> — six distinct dataset types ingested in a single automated pipeline: Transaction, Historical, Mapping, Aging, Payment Tracking, and Utilization datasets.',
  '<strong>2. Validation & Eligibility</strong> — automated checks: duplicate detection, missing invoice numbers, invalid amounts, missing mandatory fields, incorrect date formats, invalid bank mapping, and refund handling.',
  '<strong>3. Allocation Processing</strong> — priority-based distribution across banks. Cascade logic: allocate to Bank A (Priority 1) → if capacity exhausted, move to Bank B (Priority 2) → continue until allocated or capacity runs out.',
  '<strong>4. Utilization Tracking</strong> — real-time monitoring of total limits, utilized amount, and remaining capacity across all banks before each allocation run.',
  '<strong>5. Report Generation</strong> — automated generation of bank-wise allocation reports, utilization summaries, and exception reports post-processing.',
  '<strong>6. Email Delivery</strong> — automated dispatch of reports and repayment alerts to stakeholders via the Send Email workflow node.'
]))}
${mlcSection('Exports & Reports Layer in This Implementation', mlcFlow([
  'Validation + Allocation workflows complete processing',
  'Run Export Excel node generates bank-wise allocation report (XLSX, multi-sheet)',
  'A second export generates exception report (invoices not allocated)',
  'Send Email node attaches both files via dynamic file_id references',
  'Reports delivered to finance leadership and bank relationship managers automatically',
  'Files also synced to Filebox for audit trail and downstream reconciliation'
]))}
${mlcStatGrid([
  {n:'6', l:'Dataset types ingested', note:'Transaction, Historical, Mapping, Aging, Payment, Utilization'},
  {n:'7', l:'Validation checks run', note:'Duplicate, missing fields, amounts, dates, bank mapping, refunds'},
  {n:'0', l:'Manual steps post-config', note:'Fully automated end-to-end'},
  {n:'100%', l:'Audit trail coverage', note:'Every run logged with file_id references'}
])}
${mlcSection('Workflow Engine Capabilities Demonstrated', mlcUl([
  '<strong>Sequential stage execution</strong> — each stage feeds the next automatically',
  '<strong>Dependency handling</strong> — resolves dependencies between workflow nodes',
  '<strong>Retry processing</strong> — automatic retry on transient failures',
  '<strong>Full audit trail</strong> — all activities logged for every run',
  '<strong>Dynamic file references</strong> — file_id passed between export and email nodes guarantees correct file delivery'
]))}
${mlcExample('Allocation Cascade in Action', 'Total eligible invoices: Rs. 20 Cr. Bank A (Priority 1) limit: Rs. 10 Cr — allocated fully. Bank B (Priority 2) limit: Rs. 8 Cr — allocated fully. Remaining Rs. 2 Cr goes unallocated and appears in the exception report. Finance sees the full picture in one scheduled email delivery before the start of the next business day.')}
${mlcTakeaway('The Invoice Discounting platform is the synthesis of everything in this course: multi-sheet export for bank-wise reports, dynamic file_id for reliable email attachment, scheduled delivery for proactive stakeholder communication, and Filebox sync for audit archiving. Every Exports & Reports capability serves a real production purpose here.')}
`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Which export output format is required for multi-sheet workbooks in Bluecopa?', opts: ['CSV (.csv)', 'ZIP Archive (.zip)', 'Excel (.xlsx)', 'PDF (.pdf)'], a: 2, exp: 'Multi-sheet workbooks require Excel (.xlsx) format. CSV files cannot contain multiple sheets — attempting to save a multi-sheet configuration as CSV produces a validation error. ZIP archives bundle multiple separate files, not multiple sheets within a single workbook.' },
      { q: 'What are the three required prerequisites before configuring any export workflow?', opts: ['Trigger, API Key, and Filebox folder', 'Dataset, Workbook, and Export Configuration', 'Cron expression, Email template, and Service Account', 'Workspace ID, API Secret, and Worksheet'], a: 1, exp: 'The three prerequisites are: (1) a Dataset containing the required data, (2) a Workbook with that dataset imported as worksheets, and (3) an Export Configuration created from that workbook defining format, sheets, and filters. Skipping any one causes the workflow to fail at runtime — not at setup time.' },
      { q: 'In the Export via Email three-stage pipeline, how is the generated file passed to the email stage?', opts: ['The file is downloaded locally and re-uploaded to the email stage manually', 'The file is referenced using a dynamic ${ExportNodeID.file_id} variable that resolves at runtime', 'The file path is hardcoded in the Send Email node configuration', 'The file is stored in Filebox and the email stage retrieves it from there'], a: 1, exp: 'The generated file is passed via a dynamic variable ${ExportNodeID.file_id}. At runtime, this resolves to the exact file_id generated in the current workflow execution. This design guarantees the correct, current-run file is always attached — never a cached or prior version, and never a file from a concurrent run.' },
      { q: 'What is the difference between standalone and embedded Export via Email?', opts: ['Standalone uses cron scheduling; embedded uses manual triggering', 'Standalone is triggered manually by a user; embedded fires automatically as part of a larger parent workflow', 'Standalone generates CSV files; embedded generates XLSX files', 'Standalone delivers to one recipient; embedded supports multiple recipients'], a: 1, exp: 'In standalone mode, an authorized user manually triggers the Export via Email workflow. In embedded mode, the export and email delivery are a node within a larger parent workflow — they fire automatically when the parent process reaches that stage, requiring zero user action at the export/email step.' },
      { q: 'When should you use Cron Schedule instead of Standard Schedule for a trigger?', opts: ['Always — cron is more reliable than standard scheduling', 'When you need minute-level precision or scheduling patterns that standard frequencies cannot express, such as workday-only or bi-weekly schedules', 'Only when the report must be delivered across multiple timezones', 'Only when the export output is a ZIP archive'], a: 1, exp: 'Standard Schedule covers common patterns (daily, weekly, monthly, hourly). Cron Schedule is for advanced requirements that standard frequencies cannot handle — for example, Monday-to-Friday only (0 8 * * 1-5), last working day of month, or every 5 minutes. Use Standard for simplicity; escalate to Cron only when needed.' },
      { q: 'What happens when the "Merge Excel files into one XLSX" option is enabled with a mix of CSV and Excel output types?', opts: ['Bluecopa automatically converts all CSV files to XLSX before merging', 'A configuration error occurs — the merge option cannot be used with mixed file types', 'Each CSV file is ignored and only Excel files are merged', 'The ZIP archive option overrides and all files are bundled instead'], a: 1, exp: 'The Merge Excel files option is incompatible with mixed file types. If the export configuration includes both CSV and Excel outputs, enabling Merge produces a configuration error. To use the merge option, all output files in the export must be of type Excel/XLSX.' },
      { q: 'What must you do to ensure changes made to an export workflow take effect in future scheduled runs?', opts: ['Changes auto-apply — no further action needed after saving', 'The workflow must be published — unpublished changes are not executed by scheduled triggers', 'The trigger must be deleted and recreated with the new schedule', 'The dataset must be re-ingested to apply workflow changes'], a: 1, exp: 'Like all Bluecopa workflows, an export workflow must be published after any modification. Unpublished changes are invisible to the scheduler. Only the latest published version is executed when the trigger fires.' },
      { q: 'In the Invoice Discounting Automation Platform, what happens to invoices that fail eligibility processing?', opts: ['They are automatically submitted to a lower-priority bank without human review', 'They are flagged and appear in an exception report; only eligible invoices proceed to allocation', 'They are deleted from the system to prevent duplicate processing', 'They are held in a queue and retried on the next scheduled run'], a: 1, exp: 'After eligibility processing, invoices are categorised: eligible for one bank, eligible for multiple banks, or not eligible for any bank. Invoices that fail eligibility do not proceed to allocation. They appear in an automatically generated exception report, which is delivered to stakeholders via the Send Email node.' },
      { q: 'A Filebox upload failure occurs after an export completes successfully. What is the correct interpretation?', opts: ['The export file was not generated — it must be re-run', 'The export completed successfully; the Filebox sync is a separate downstream step that failed independently', 'The export failed mid-way and only a partial file was uploaded', 'The email delivery also failed because the Filebox sync and email share the same file reference'], a: 1, exp: 'Filebox sync runs after the export completes. A Filebox upload failure is a separate, downstream issue — it does not mean the export failed. The export file is still available in the Downloads tab and Operations → Downloads. Email delivery is also unaffected, as it uses the file_id from the export node, not the Filebox path.' },
      { q: 'What is the purpose of the Exclude Schedule field in the Scheduled Trigger configuration?', opts: ['It limits the schedule to specific users who can trigger the workflow', 'It suppresses workflow execution on specified dates, such as public holidays or non-business days', 'It defines a fallback schedule when the primary cron expression fails', 'It sets the maximum number of concurrent scheduled runs allowed'], a: 1, exp: 'The Exclude Schedule field allows you to specify dates when the scheduled trigger should NOT fire — for example, public holidays or company shutdown periods. This prevents reports from being generated and delivered on days when no one is working to receive them, without requiring the workflow to be manually paused and resumed.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 11 — CONNECTORS & INTEGRATIONS
  // ════════════════════════════════════════════════════
  ci: {
    modules: [
      {
        title: 'GCS Connector Fundamentals',
        lessons: [
          {
            title: 'GCS Connector Types — Normal vs Bulk',
            dur: '10 min',
            html: `<h2>GCS Connector Types — Normal vs Bulk</h2>
<p class="mlc-lead">Bluecopa offers two native connectors for ingesting data from a Google Cloud Storage bucket. Choosing the right one depends on file size, volume, and sync cadence.</p>
${mlcSection('The Two Native GCS Connectors', mlcCompare(
  'Normal GCS Connector', [
    'Best for routine, schema-stable file pickups',
    'Underlying mechanism: streamed read of a specific object path',
    'Ideal for smaller files with predictable cadence',
    'Lower resource overhead, faster setup'
  ],
  'Bulk GCS Connector', [
    'Best for large files (multi-GB) or high-volume initial syncs',
    'Underlying mechanism: BigQuery bulk load operation',
    'Designed for heavy initial data loads',
    'Higher throughput at the cost of more infrastructure'
  ]
))}
${mlcSection('Shared Foundation Rule', '<p>Both connectors share one non-negotiable rule: <strong>One Connector = One Schema = One File.</strong> A connector binds to a specific object path and schema — it does not crawl a folder or auto-discover files.</p>')}
${mlcSection('When to Use Each', mlcUl([
  '<strong>Use Normal</strong> when: files are ≤ a few hundred MB, schema is stable, syncs are regular and predictable',
  '<strong>Use Bulk</strong> when: files are multi-GB, performing an initial historical data load, or throughput is the primary concern',
  '<strong>Never use either</strong> when: the source bucket has date-shifting filenames or multiple files in one folder — this requires the Archive Bucket workaround pattern'
]))}
${mlcExample('Implementation Scenario', 'A vendor drops a daily invoice file at gs://client-bucket/invoices/daily_feed.csv — same path, same schema every day. This is the ideal case for a Normal GCS Connector: one path, one schema, predictable cadence. A connector is configured once and runs automatically on schedule.')}
${mlcTakeaway('Always start with the Normal connector. Only escalate to Bulk when file size or initial load volume demands it. The architecture is identical — only the underlying transport mechanism differs.')}
${mlcFlow(['Identify source GCS bucket and object path', 'Assess file size and sync volume', 'Choose Normal (streamed) or Bulk (BigQuery load)', 'Configure one connector per file schema', 'Test with a sample file before going live'])}`
          },
          {
            title: 'The One-Connector-One-Schema Rule',
            dur: '8 min',
            html: `<h2>The One-Connector-One-Schema Rule</h2>
<p class="mlc-lead">Every architectural decision in GCS connector setup flows from one foundational constraint: a single connector targets a single object path with a single fixed schema.</p>
${mlcSection('The Three Constraints', mlcUl([
  '<strong>One Object Path</strong> — the connector is configured with a fully-qualified GCS URI, e.g. <code>gs://bucket/folder/file.csv</code>. The connector reads exactly that object — nothing else.',
  '<strong>One Schema</strong> — column names, types, and order are locked at configuration time. Schema drift is not tolerated; any change requires reconfiguring or creating a new connector.',
  '<strong>One File at a Time</strong> — each sync run reads exactly the object the connector points to. No folder crawls, no auto-discovery, no wildcard pattern matching.'
]))}
${mlcSection('Why This Design Exists', mlcUl([
  'Keeps data lineage <strong>deterministic</strong> — every sync is traceable to a single known source',
  'Prevents <strong>silent schema drift</strong> — column mismatches surface immediately at config time, not during a production run',
  'Makes debugging trivial — if a sync fails, the cause is isolated to one file at one path'
]))}
${mlcSection('What This Means for Implementation', mlcUl([
  'Multiple source files with different schemas → multiple connectors (one per schema)',
  'Source that rotates filenames over time → use the Archive Bucket workaround (covered in the next lesson)',
  'Source with multiple files in one folder → a connector cannot iterate; redesign the source path or use preprocessing'
]))}
${mlcDiagram('Connector Scope', mlcUl([
  'Connector A → gs://bucket/ar/receivables.csv (Schema: InvoiceID, Amount, DueDate)',
  'Connector B → gs://bucket/ap/payables.csv (Schema: VendorID, InvoiceNo, PaidDate)',
  'Connector C → gs://bucket/mis/summary.csv (Schema: Month, Revenue, EBITDA)',
  'Each connector is independent. Changing one has zero impact on others.'
]))}
${mlcExample('Schema Drift Example', 'If a vendor adds a new column "TaxCode" to their invoice file in February, the existing connector will reject the load because the schema no longer matches. This is intentional — it forces a deliberate review and schema update rather than silently ingesting corrupted data.')}
${mlcTakeaway('The One-Connector-One-Schema rule is a feature, not a limitation. It trades flexibility for determinism, making pipelines auditable and production-safe.')}
`
          },
          {
            title: 'Archive Bucket Pattern & Workarounds',
            dur: '10 min',
            html: `<h2>Archive Bucket Pattern & Workarounds</h2>
<p class="mlc-lead">Large enterprise customers often use archive-style GCS buckets where all files land in one folder with date-shifting filenames. This pattern directly conflicts with the One-Connector-One-Schema rule and requires a specific workaround.</p>
${mlcSection('What Is an Archive Bucket?', mlcUl([
  '<strong>Folder layout</strong> — all files dropped into one folder with no nested path partitions',
  '<strong>Filename pattern</strong> — filenames follow a template but the date component changes every cycle, e.g. <code>MEC_BASE_202605.csv</code>, <code>MEC_BASE_202606.csv</code>',
  '<strong>Cadence</strong> — typically monthly drops; old files remain in place (archive semantics, files accumulate)',
  '<strong>Result</strong> — the folder contains many files, none at a stable path'
]))}
${mlcSection('Why Native GCS Connectors Break Here', mlcCompare(
  'Problem', [
    'Multiple files in one folder — connector can only target one file at a time',
    'Filename changes each cycle — connector URI would need manual reconfiguration monthly',
    'Wildcard patterns like MEC_BASE_*.csv could match prior months, test files, or partially-written files'
  ],
  'Consequence', [
    'Cannot iterate over the folder automatically',
    'Unsustainable operational burden on the implementation team',
    'Risk of duplicate loads or wrong-period data ingestion'
  ]
))}
${mlcSection('Why Wildcards Are NOT the Solution', '<p>Even though GCS URIs and BigQuery load jobs technically support <code>*</code> wildcards, using them for archive buckets creates three serious risks:</p>' + mlcUl([
  '<strong>Month overlap</strong> — a wildcard match may pick up prior months, leading to duplicate records in the target dataset',
  '<strong>Partial file inclusion</strong> — if a file is still being written when the sync runs, a wildcard may include an incomplete file',
  '<strong>Test file pollution</strong> — staging or test files in the same folder are indistinguishable from production files by a wildcard'
]))}
${mlcSection('The Recommended Workaround — Copy-to-Blob Store', mlcFlow([
  'Client drops MEC_BASE_202606.csv into the archive GCS bucket',
  'A pre-processing step (e.g. Cloud Function or Bluecopa workflow) detects the new file',
  'The file is copied to a stable, fixed-path location in Blob Store (Azure) or a controlled GCS path',
  'The Bluecopa GCS connector points to that stable path — path never changes',
  'Each month, the stable path is overwritten with the latest file',
  'Connector runs against the stable path — always ingests the correct current file'
]))}
${mlcTakeaway('Archive buckets are common at large customers. Never try to bend the connector to fit the archive pattern — instead, introduce a copy/landing step that converts the dynamic filename pattern into a stable, connector-compatible path.')}
`
          }
        ]
      },
      {
        title: 'REST API Connector Configuration',
        lessons: [
          {
            title: 'Connection Profile Setup — Phase A',
            dur: '10 min',
            html: `<h2>Connection Profile Setup — Phase A</h2>
<p class="mlc-lead">The REST API Connector in Bluecopa uses a two-phase configuration model. Phase A establishes the root network gateway — the connection profile — which all API actions in Phase B will inherit.</p>
${mlcSection('Navigation Path', mlcFlow(['Main Menu', 'Data', 'External Data', 'New Connection']))}
${mlcSection('Phase A — Connection Profile Fields', mlcUl([
  '<strong>Field 1: Connection Name & Description</strong> — Enter a unique name (e.g. <code>SampleHTTPConnection</code>) and a meaningful description. This name appears in integration logs and downstream pipelines.',
  '<strong>Field 2: Connection Specification</strong> — Select <strong>HTTP</strong> as the primary type. Other supported types are SQL, BigQuery, and BlueDB, but HTTP is standard for REST API integrations.',
  '<strong>Field 3: Base URL</strong> — Enter the root network address for the API, e.g. <code>https://mockapi.randomserver.com</code>. All API Actions defined in Phase B will append their endpoint paths to this URL.',
  '<strong>Field 4: Subpath (optional)</strong> — A static test routing subpath (e.g. <code>/health</code> or <code>/ping</code>) used to validate connectivity. Leave blank if no test endpoint exists.',
  '<strong>Field 5: Authentication Strategy</strong> — Choose <code>NoAuth</code> for public or whitelisted APIs. For secured APIs, options include <code>Basic Auth</code>, <code>API Key</code>, <code>Bearer Token</code>, and <code>OAuth</code>.',
  '<strong>Field 6: Global Headers (optional)</strong> — Declare headers that must apply across ALL nested API Actions, e.g. <code>Accept: application/json</code>.',
  '<strong>Field 7: Timeout</strong> — Maximum seconds Bluecopa waits before terminating the connection. Default is 30 seconds; adjust based on expected API latency.',
  '<strong>Field 8: SSL Validation</strong> — Enforce SSL/HTTPS to encrypt payload data in transit. Enable for all production integrations.',
  '<strong>Field 9: Save & Test</strong> — Click Save to store the profile, then Test to fire a cloud network ping verifying socket accessibility and firewall permissions.'
]))}
${mlcSection('Authentication Strategy Selection Guide', mlcUl([
  '<strong>NoAuth</strong> — public APIs or internally whitelisted endpoints with no auth requirement',
  '<strong>Basic Auth</strong> — username + password encoded in the Authorization header',
  '<strong>API Key</strong> — a static token passed as a header or query parameter',
  '<strong>Bearer Token</strong> — JWT or OAuth access token in the Authorization header',
  '<strong>OAuth</strong> — full OAuth 2.0 flow with token refresh support'
]))}
${mlcExample('Real Configuration', 'Connection Name: ClientAPI_Prod | Base URL: https://api.client.com | Auth: Bearer Token | Timeout: 45 seconds | SSL: Enabled. After clicking Test, Bluecopa pings the /health subpath. On success, the connection is unlocked for Phase B API Action setup.')}
${mlcTakeaway('The connection profile is the gateway — get it right once and all Phase B actions inherit its network and auth configuration. Never hardcode credentials in individual API Actions.')}
`
          },
          {
            title: 'API Action Definition — Phase B',
            dur: '12 min',
            html: `<h2>API Action Definition — Phase B</h2>
<p class="mlc-lead">Once the connection gateway is established in Phase A, individual API endpoints are declared as API Actions. Each action represents one callable endpoint that can be invoked from a Bluecopa workflow.</p>
${mlcSection('Initialising an API Action', mlcOl([
  'Open the verified connection gateway folder',
  'Click <strong>Add</strong> to create a new API Action',
  'Enter an <strong>Action Name</strong> (e.g. <code>Retrieve Order Details</code>) and a description',
  'Select <strong>HTTP</strong> as the Action Specification to match the connection layer'
]))}
${mlcSection('Step 2 — HTTP Verb Assignment', mlcUl([
  '<strong>GET</strong> — retrieve data assets from the remote system (no body required)',
  '<strong>POST</strong> — send data or create new records on the remote system',
  '<strong>PUT</strong> — overwrite existing data structures entirely',
  '<strong>DELETE</strong> — remove data entirely from the remote system',
  '<strong>PATCH</strong> — update partial data fields within an existing record'
]))}
${mlcSection('Step 3 — Endpoint Path with Jinja Templates', '<p>Enter the trailing path relative to the Base URL. Use Jinja template markers for dynamic fields:</p>' + mlcUl([
  'Static path: <code>v1/api/orders</code>',
  'Dynamic path: <code>v1/api/orders/{order_id}</code> — the <code>{order_id}</code> placeholder is resolved at runtime from the workflow\'s variable context',
  'Multiple params: <code>v1/api/invoices/{invoice_id}/lines/{line_id}</code>'
]))}
${mlcSection('Step 4 — Headers, Template Parameters & Request Body', mlcUl([
  '<strong>Action-specific headers</strong> — headers required only by this endpoint (e.g. <code>Content-Type: application/json</code>)',
  '<strong>Template Parameters panel</strong> — declare each dynamic field (e.g. <code>{order_id}</code>) and map it to the workflow variable that will supply the value at runtime',
  '<strong>Request Body</strong> — for POST, PUT, PATCH: provide the body template in raw JSON format. Dynamic values are injected using Jinja markers.'
]))}
${mlcSection('Step 5 — Save & Test the Action', mlcOl([
  'Click Save to store the API Action configuration',
  'Enter mock values for each template parameter (e.g. map <code>{order_id}</code> = <code>12345</code>)',
  'Click <strong>Run Action</strong> to execute the endpoint manually against the live API',
  'Inspect the returned server payload — verify the response schema matches expectations'
]))}
${mlcDiagram('Full Two-Phase Configuration Flow', mlcUl([
  'Phase A: Connection Profile → Base URL + Auth + Global Headers + SSL',
  'Phase B: API Action 1 → GET /v1/api/orders/{order_id}',
  'Phase B: API Action 2 → POST /v1/api/invoices with JSON body',
  'Phase B: API Action 3 → PATCH /v1/api/payments/{payment_id}',
  'Workflow → calls API Action 2 with runtime variables from workflow context'
]))}
${mlcTakeaway('Every distinct API endpoint = one API Action. The two-phase model separates network configuration (Phase A) from business logic endpoints (Phase B), keeping the setup modular and maintainable.')}
`
          },
          {
            title: 'External Data Module — Sending Data to Client APIs',
            dur: '10 min',
            html: `<h2>External Data Module — Sending Data to Client APIs</h2>
<p class="mlc-lead">The External Data module in Bluecopa enables sending data and files from Bluecopa outward to any client API — no custom code required. The experience mirrors configuring and testing APIs in Postman, but fully embedded within Bluecopa workflows.</p>
${mlcSection('Step 1 — Navigate to External Data & Create a Connection', mlcUl([
  'Go to <strong>Integrations → External Data</strong> from the main menu',
  'Click <strong>New Connection</strong>',
  'Fill in: Connection Name, Connection Type (HTTP), Base API URL, and Authentication credentials',
  'Click <strong>Save</strong> to store the connection'
]))}
${mlcSection('Step 2 — Create and Configure an API Action', '<p>Open the saved connection to reveal the <strong>Actions panel</strong> on the left side. Click <strong>Add</strong> to define a new action. Each action corresponds to one API endpoint.</p>' + mlcUl([
  '<strong>HTTP Method</strong> — GET, POST, PUT, DELETE, or PATCH',
  '<strong>Endpoint URL</strong> — the specific endpoint path for this action',
  '<strong>Request Headers</strong> — Content-Type, custom tokens, or any API-required headers',
  '<strong>Query Parameters</strong> — URL query strings passed to the endpoint',
  '<strong>Request Body</strong> — body format and structure for state-changing methods'
]))}
${mlcSection('Working with Query Parameters', '<p>Query parameters let an API action pull dynamic runtime values from the workflow and pass them as URL query strings — e.g. <code>?employee_id=1024&status=active</code>.</p>' + mlcUl([
  '<strong>Key</strong> — the exact parameter name expected by the client API (e.g. <code>employee_id</code>, <code>status</code>, <code>page</code>)',
  '<strong>Static value</strong> — used when the parameter never changes (e.g. a fixed <code>file_type</code> or shared <code>api_key</code>)',
  '<strong>Dynamic value</strong> — uses template syntax (<code>parameter_name</code>) and is substituted at runtime from an earlier workflow node',
  'Multiple query parameters can be added using the <strong>Add Query Param</strong> button'
]))}
${mlcSection('Running the External Action from a Workflow', mlcFlow([
  'Workflow triggers (schedule, HTTP trigger, or event)',
  'Earlier node produces data (query result, transformation output)',
  'External Data action node is configured with the connection and API action',
  'Runtime variables from the workflow are mapped to template parameters',
  'Bluecopa executes the API call — sends data or file to the client endpoint',
  'Response is captured and can be used by downstream workflow nodes'
]))}
${mlcExample('Use Case — Sending a Report File', 'After generating a monthly finance report, a workflow uses the External Data module to POST the file to a client\'s SFTP-backed API endpoint. The endpoint URL includes a dynamic {client_id} and {month} pulled from workflow variables. No code is written — the entire integration is configured through the UI.')}
${mlcTakeaway('The External Data module is Bluecopa\'s outbound integration layer. It turns any client API into a workflow-callable action with dynamic parameters — eliminating the need for custom scripts or middleware.')}
`
          }
        ]
      },
      {
        title: 'HTTP Triggers & Workflow Automation',
        lessons: [
          {
            title: 'Creating HTTP Triggers & API Credentials',
            dur: '10 min',
            html: `<h2>Creating HTTP Triggers & API Credentials</h2>
<p class="mlc-lead">The HTTP Trigger mechanism makes Bluecopa workflows externally callable. Any system capable of sending an HTTP request — a client application, a cron job, or a CI/CD pipeline — can trigger a Bluecopa workflow and pass structured data.</p>
${mlcSection('Step 1 — Create the HTTP Trigger', mlcUl([
  'Navigate to <strong>Integrations → HTTP Triggers</strong>',
  'Click <strong>New</strong>',
  'Enter a <strong>Name</strong> (e.g. <code>report_trigger</code>) and a <strong>Description</strong>',
  'Click <strong>Add</strong>',
  'Bluecopa generates a unique HTTP Trigger URL in the format: <code>https://[domain]/api/v1/http-trigger/[trigger-id]</code>'
]))}
${mlcSection('Step 2 — Generate API Credentials', '<p>Each HTTP Trigger must be called with secure credentials. These are generated separately and linked to the trigger.</p>' + mlcOl([
  'Navigate to <strong>Access Credentials</strong>',
  'Click <strong>New</strong>',
  'Enter a meaningful <strong>Name</strong> (e.g. <code>staging_creds_for_document</code>) and optional description',
  'Click <strong>Create</strong>',
  'Bluecopa generates an <strong>API Key</strong> (Username) and <strong>API Secret</strong> (Password)',
  '<strong>Copy and save both immediately</strong> — the API Secret cannot be viewed again once the popup is closed'
]))}
${mlcSection('Step 3 — Obtain the Workspace ID', mlcUl([
  'Navigate to <strong>Settings → Project</strong>',
  'The selected Project name IS the Workspace ID — e.g. <code>Prod</code>',
  'Include it in every API request as the header: <code>x-bluecopa-workspace-id: Prod</code>',
  'The value is <strong>case-sensitive</strong> — use exactly as it appears in Settings'
]))}
${mlcStatGrid([
  {n:'1', l:'Trigger URL per trigger', note:'Unique, immutable after creation'},
  {n:'2', l:'Credentials: Key + Secret', note:'Secret shown once — save immediately'},
  {n:'3', l:'Items needed by client', note:'URL + API Key + API Secret + Workspace ID'},
  {n:'1', l:'Header for Workspace ID', note:'x-bluecopa-workspace-id'}
])}
${mlcExample('Security Note', 'API credentials are scoped to specific integrations. Create separate credentials for each client or system connecting to Bluecopa — never share credentials across clients. This allows individual credential revocation without impacting other integrations.')}
${mlcTakeaway('The HTTP Trigger URL + API Key + API Secret + Workspace ID are the four pieces a client needs to call Bluecopa externally. Always generate fresh credentials per integration and store the API Secret the moment it is displayed.')}
`
          },
          {
            title: 'Publishing Workflows & Client Integration',
            dur: '10 min',
            html: `<h2>Publishing Workflows & Client Integration</h2>
<p class="mlc-lead">An HTTP Trigger does nothing until it is wired to a published workflow. This lesson covers connecting the trigger, publishing the workflow, sharing integration details with clients, and verifying successful execution.</p>
${mlcSection('Step 4 — Configure and Publish the Workflow', mlcOl([
  'Navigate to <strong>Workflows</strong> and create a new or open an existing workflow',
  'Click <strong>Add Trigger</strong> and select <strong>Trigger Type = HTTP Trigger</strong>',
  'Set <strong>Event = Submitted</strong>',
  'Select the HTTP Trigger created earlier (e.g. <code>report_trigger</code>)',
  'Add the required workflow steps (e.g. update input table → run pipeline → send email)',
  'Click <strong>Publish</strong> when all steps are configured',
  '<strong>Important:</strong> Any changes made after publishing will NOT take effect until the workflow is published again. Always publish after every modification.'
]))}
${mlcSection('Step 5 — Share API Details with the Client', '<p>Provide these four items to the client for integration:</p>' + mlcUl([
  '<strong>HTTP Trigger URL</strong>: <code>https://[domain]/api/v1/http-trigger/[trigger-id]</code>',
  '<strong>API Key</strong> — used as the Username in Basic Auth',
  '<strong>API Secret</strong> — used as the Password in Basic Auth',
  '<strong>Workspace ID Header</strong>: <code>x-bluecopa-workspace-id: Prod</code>'
]))}
${mlcSection('Step 6 — Sample cURL Request', '<p>A client can trigger the workflow with a standard cURL command:</p>' + mlcUl([
  '<code>curl --location "https://domain/api/v1/http-trigger/trigger-id"</code>',
  '<code>--user "API_KEY:API_SECRET"</code>',
  '<code>--header "Content-Type: application/json"</code>',
  '<code>--header "x-bluecopa-workspace-id: Prod"</code>',
  '<code>--data \'{"month": "2026-05"}\'</code>'
]))}
${mlcSection('Step 7 — Test and Verify with Postman', mlcOl([
  'Open Postman and set the request URL to the HTTP Trigger URL',
  'Set Authorization to <strong>Basic Auth</strong> — API Key as Username, API Secret as Password',
  'Add header: <code>x-bluecopa-workspace-id: Prod</code>',
  'Set request body to raw JSON with required fields',
  'Click Send — a successful response returns a <code>triggeredWorkflows</code> JSON object with <code>workflowId</code>, <code>triggerId</code>, and <code>instanceId</code>',
  'Copy the <code>instanceId</code> and look up the execution in Workflows → Instances to verify the trigger fired correctly'
]))}
${mlcExample('Business Use Case', 'A client runs a monthly finance close process. At month-end, their ERP automatically POSTs {"month": "2026-06"} to Bluecopa\'s HTTP Trigger. Bluecopa receives the call, updates the input table with the month value, executes the pipeline, and emails the reports to stakeholders — all without any manual intervention from the Bluecopa team.')}
${mlcTakeaway('Publishing is mandatory — unpublished changes are invisible to incoming triggers. Always verify with Postman before handing off to the client, and save the instanceId from the test response to confirm end-to-end workflow execution.')}
`
          }
        ]
      },
      {
        title: 'External Datasets & Real-World Use Cases',
        lessons: [
          {
            title: 'BigQuery & GCS External Dataset Integration',
            dur: '12 min',
            html: `<h2>BigQuery & GCS External Dataset Integration</h2>
<p class="mlc-lead">External Dataset is a data ingestion integration inside Bluecopa that connects to a BigQuery table or view backed by Google Cloud Storage and pulls the data into Bluecopa's internal dataset layer — ready for analytics and reporting.</p>
${mlcSection('How It Works', mlcUl([
  '<strong>Source</strong> — a BigQuery table or view backed by GCS',
  '<strong>Authentication</strong> — GCP Service Account',
  '<strong>Output</strong> — data appears in two places: the <strong>Library</strong> (for reuse across the platform) and <strong>Data → Clean section</strong> (for analytics and reporting)',
  '<strong>Trigger</strong> — Auto (on GCS refresh), Manual (Run Now button), or Scheduled'
]))}
${mlcSection('Navigation Path', mlcFlow(['Bluecopa UI', 'Menu tab', 'Search: "External Dataset"', 'Integration section', 'New button']))}
${mlcSection('Step 1 — Prerequisites: Who Owns the Source Table?', mlcCompare(
  'Bluecopa-Owned Table', [
    'Contact the SRE team to get the fully qualified table name (project_id.dataset_name.table_name)',
    'No access setup required — Bluecopa already has permissions',
    'Proceed directly to the configuration form'
  ],
  'Client-Owned Table', [
    'Get the full table name from the client',
    'Ask the SRE team for the Bluecopa service account key',
    'Share the service account key with the client and request read access',
    'Wait for client confirmation before creating the integration'
  ]
))}
${mlcSection('Step 2 — Configuration Fields', mlcUl([
  '<strong>Name</strong> — must be unique, lowercase, alphanumeric + underscores only, no spaces or hyphens. Example: <code>retail_full_qoh_b2b_may_26</code>',
  '<strong>Source Type</strong> — <code>Table</code> (connect to a BigQuery external table backed by GCS) or <code>View</code> (connect to a BigQuery view over GCS data)',
  '<strong>Table Identifier</strong> — fully qualified BigQuery name in the format: <code>project_id.dataset_name.table_name</code>',
  '<strong>Service Account</strong> — the GCP service account key (JSON) that Bluecopa will use to authenticate with BigQuery',
  '<strong>Dataset Name</strong> — the label this dataset will carry inside Bluecopa Library and Data → Clean section'
]))}
${mlcSection('Step 3 — Publish and Trigger', mlcOl([
  'Review all configuration fields for accuracy',
  'Click <strong>Publish</strong> to activate the integration',
  'For first run: click <strong>Run Now</strong> to trigger an immediate ingest',
  'Verify data appears in <strong>Library</strong> and <strong>Data → Clean</strong> after the run completes',
  'For subsequent runs: data auto-ingests whenever the source GCS table or view is refreshed'
]))}
${mlcExample('Real Configuration', 'A retail client stores their inventory data in BigQuery (backed by a GCS export). The table is client-owned: retail_project.inventory_ds.qoh_b2b. After the client grants Bluecopa service account read access and confirms, the External Dataset integration is named "retail_full_qoh_b2b_may_26". After publishing, the dataset auto-ingests daily when the GCS source refreshes, and becomes available in Bluecopa\'s Clean section for MIS reporting.')}
${mlcTakeaway('Never create the integration before the client confirms service account access. A failed first run due to missing permissions often requires full re-configuration, not just a retry.')}
`
          },
          {
            title: 'Invoice Discounting Automation — End-to-End',
            dur: '12 min',
            html: `<h2>Invoice Discounting Automation — End-to-End</h2>
<p class="mlc-lead">This lesson walks through a complete real-world implementation: automating the invoice discounting lifecycle using Bluecopa's integration and workflow capabilities — from dataset upload to bank allocation, utilization tracking, and automated report delivery.</p>
${mlcSection('What Is Invoice Discounting?', '<p>Invoice discounting is a financial process where a company receives funds against unpaid invoices <em>before</em> the customer completes payment.</p>' + mlcUl([
  'Normally, businesses wait 30–60 days for customer payments',
  'Instead, eligible invoices are submitted to banks and advance funds are received immediately',
  'A company with Rs. 20 Cr in unpaid invoices can unlock working capital immediately rather than waiting 45 days'
]))}
${mlcSection('Why Automation Was Needed', mlcUl([
  '<strong>Manual invoice validations</strong> → slow processing',
  '<strong>Duplicate invoice submissions</strong> → incorrect funding',
  '<strong>Multiple spreadsheet handling</strong> → high operational effort',
  '<strong>No centralized visibility</strong> → difficult tracking across banks',
  '<strong>Manual allocation process</strong> → allocation errors',
  '<strong>Delayed report preparation</strong> → slow decision-making'
]))}
${mlcSection('Platform Capabilities Built', mlcUl([
  '<strong>Dataset Upload</strong> — accepts and processes multiple dataset types in a single automated pipeline',
  '<strong>Validation & Eligibility</strong> — automatically validates invoices and evaluates eligibility against predefined funding rules before allocation',
  '<strong>Allocation Processing</strong> — distributes invoices to banks based on priority order and available limits, fully automated',
  '<strong>Utilization Tracking</strong> — continuously monitors total limits, utilized amount, and remaining capacity across all banks in real time',
  '<strong>Report Generation</strong> — automatically generates bank-wise reports, allocation summaries, and exception reports post-processing',
  '<strong>Email Delivery</strong> — sends automated reports and repayment alerts to stakeholders without manual intervention'
]))}
${mlcSection('How Bluecopa Connectors Enable This', mlcFlow([
  'Client uploads invoice dataset via portal or GCS connector',
  'Bluecopa ingests dataset through Data Ingestion pipeline',
  'Validation workflow runs eligibility checks (rules-based)',
  'Allocation workflow distributes to banks (priority order)',
  'External Data module updates bank portals via REST API',
  'Utilization tracking queries are run and summarized',
  'Report generation workflow builds bank-wise summaries',
  'Email workflow (HTTP Trigger or schedule) delivers reports to stakeholders'
]))}
${mlcStatGrid([
  {n:'6', l:'Platform capabilities automated', note:'Upload → Validate → Allocate → Track → Report → Email'},
  {n:'0', l:'Manual steps for finance users', note:'Fully self-service after setup'},
  {n:'30–60', l:'Days of cash cycle compressed', note:'Advance funds received same day'},
  {n:'100%', l:'Centralized visibility', note:'All banks in one dashboard'}
])}
${mlcExample('Key Architecture Insight', 'This implementation combines all four integration layers covered in this course: GCS connectors for dataset upload, REST API connector to push allocation data to bank portals, HTTP Triggers for client-initiated report generation, and External Dataset integration for pulling back bank confirmation data into Bluecopa for reconciliation.')}
${mlcTakeaway('Real enterprise implementations are not single-connector problems. The Invoice Discounting platform is a composite of GCS ingestion, REST API outbound calls, HTTP Triggers for client initiation, and workflow orchestration — all working together as an integrated system.')}
`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Which GCS connector type uses BigQuery bulk load as its underlying mechanism?', opts: ['Normal GCS Connector', 'Bulk GCS Connector', 'External Dataset Connector', 'Blob Store Connector'], a: 1, exp: 'The Bulk GCS Connector uses BigQuery bulk load under the hood, making it suited for large files (multi-GB) and high-volume initial syncs. The Normal connector uses streamed reads, which is lighter-weight and appropriate for routine, smaller file pickups.' },
      { q: 'According to the One-Connector-One-Schema rule, what happens when a vendor adds a new column to their invoice file?', opts: ['Bluecopa auto-detects the new column and updates the schema', 'The connector rejects the load because the schema no longer matches the configured schema', 'The new column is silently ignored and the load proceeds', 'The connector switches to wildcard mode to accommodate the change'], a: 1, exp: 'Schema drift is not tolerated by Bluecopa GCS connectors. When a vendor adds a new column, the load is rejected because the file schema no longer matches the schema locked at configuration time. This is intentional — it forces a deliberate review rather than silently ingesting corrupted data.' },
      { q: 'Why are wildcard patterns (e.g. MEC_BASE_*.csv) NOT recommended for archive buckets?', opts: ['Wildcards are not supported by GCS or BigQuery', 'Wildcards could match prior months, partially-written files, or test files — causing duplicate or wrong-period loads', 'Wildcards reduce ingestion speed significantly', 'Wildcards require additional service account permissions'], a: 1, exp: 'Wildcards create three serious risks in archive buckets: month overlap (prior months matched), partial file inclusion (in-progress files picked up), and test file pollution (staging files indistinguishable from production). The recommended approach is the Copy-to-Blob Store workaround that normalises to a stable fixed path.' },
      { q: 'In the REST API Connector two-phase model, what does Phase A establish?', opts: ['Individual API endpoints and their HTTP verbs', 'The root network gateway — connection profile — including Base URL, authentication, and global headers', 'Jinja template parameters for dynamic endpoint paths', 'The Bluecopa workflow that will invoke the connector'], a: 1, exp: 'Phase A establishes the connection profile — the root network gateway. This includes the Base URL, authentication strategy, global headers, timeout, and SSL settings. All API Actions defined in Phase B inherit this gateway configuration, keeping individual actions free of redundant network setup.' },
      { q: 'What is the purpose of Jinja template markers (e.g. {order_id}) in API Action endpoint paths?', opts: ['They define the HTTP method for the request', 'They are placeholders resolved at runtime from the workflow\'s variable context, enabling dynamic endpoint URLs', 'They specify the authentication token for the request', 'They control the request timeout duration'], a: 1, exp: 'Jinja template markers like {order_id} in a path such as v1/api/orders/{order_id} are placeholders. At runtime, the workflow resolves them using variables from the workflow context — for example, substituting the actual order ID from a preceding workflow step. This makes a single API Action reusable for any order.' },
      { q: 'After creating API credentials for an HTTP Trigger, when can you view the API Secret again?', opts: ['Anytime by navigating to Access Credentials → View Secret', 'Only within 24 hours of creation', 'Never — the API Secret cannot be viewed again once the creation popup is closed', 'By resetting the credentials from the admin panel'], a: 2, exp: 'Bluecopa only displays the API Secret once — at the moment of creation. Once the popup is closed, it is never shown again. If the secret is lost, new credentials must be generated. This is standard security practice for API keys.' },
      { q: 'What must happen before changes to a published workflow take effect when called via HTTP Trigger?', opts: ['Changes auto-apply — no action needed after saving', 'The workflow must be re-published — only the latest published version is executed', 'The HTTP Trigger URL must be regenerated', 'Existing in-flight workflow instances must complete first'], a: 1, exp: 'Any changes made to a workflow — adding steps, modifying logic, changing triggers — do NOT take effect until the workflow is published again. Only the latest published version is executed when the HTTP Trigger fires. This is a critical point that trips up many implementations.' },
      { q: 'For a client-owned BigQuery table, what must happen before creating an External Dataset integration?', opts: ['The SRE team creates the integration directly without client involvement', 'The client must explicitly grant read access to the Bluecopa service account, and you must wait for their confirmation before proceeding', 'Bluecopa auto-requests access from the client\'s GCP project', 'The integration can be created immediately and access is granted retroactively'], a: 1, exp: 'For client-owned tables, the process is: (1) get the full table name from the client, (2) ask SRE for the Bluecopa service account key, (3) share the key with the client and request access, (4) wait for confirmation. Creating the integration before access is granted typically results in a failed first run that may require full reconfiguration.' },
      { q: 'What is the naming convention for External Dataset names in Bluecopa?', opts: ['Any format is accepted — spaces and special characters are allowed', 'Unique, lowercase, alphanumeric and underscores only — no spaces, hyphens, or special characters', 'Must match the source BigQuery table name exactly', 'CamelCase format with a numeric suffix'], a: 1, exp: 'External Dataset names must be: unique across all External Datasets, lowercase only, alphanumeric characters and underscores only — no spaces, hyphens, or special characters. A valid example is retail_full_qoh_b2b_may_26. This constraint ensures compatibility with Bluecopa\'s internal referencing system.' },
      { q: 'In the Invoice Discounting Automation platform, which Bluecopa integration layer handles pushing allocation data to bank portals?', opts: ['GCS Connector — reads the allocation data from cloud storage', 'REST API Connector (External Data module) — sends outbound calls to bank portal APIs', 'HTTP Trigger — receives incoming requests from the banks', 'External Dataset — pulls bank confirmation data from BigQuery'], a: 1, exp: 'The REST API Connector (via the External Data module) is the outbound integration layer. It sends allocation data to bank portals by calling their REST APIs. The GCS connector handles inbound dataset upload, HTTP Triggers handle client-initiated report generation, and External Dataset pulls back bank confirmation data for reconciliation.' }
    ]
  },

  // ════════════════════════════════════════════════════
  //  COURSE 10 — ABOUT BLUECOPA
  // ════════════════════════════════════════════════════
  bc: {
    modules: [
      {
        title: 'What is Bluecopa?',
        lessons: [
          {
            title: 'Platform Overview & Positioning',
            dur: '8 min',
            html: `<h2>Platform Overview & Positioning</h2>
<p class="mlc-lead">Bluecopa is a <strong>composable finance automation platform</strong> designed to sit on top of your existing ERP and data stack — enhancing it rather than replacing it. It brings together data ingestion, reconciliation, journal entry management, and finance reporting into a single unified layer.</p>
${mlcSection('Why Bluecopa Exists', mlcUl([
  '<strong>The ERP Gap</strong> — ERP systems like SAP and Oracle are excellent transaction engines, but they were not built for the complexity of modern finance automation, multi-source reconciliation, or configurable AI-driven workflows',
  '<strong>Composable Architecture</strong> — Bluecopa is designed to be assembled around your specific finance operations, not forced to fit a generic template',
  '<strong>Finance-Specific AI</strong> — Built-in intelligence (Samyx) trained on financial data patterns — not a generic AI layer bolted on',
  '<strong>Single Source of Truth</strong> — Aggregates data from ERPs, banks, vendors, and internal systems into one reconciled data model'
]))}
${mlcSection('Where Bluecopa Lives on the Customer Stack', mlcOl([
  'Data sources (ERP, banks, vendor portals, spreadsheets) feed raw data into Bluecopa',
  'Bluecopa processes, matches, and validates that data against your rules',
  'Finance teams work in Bluecopa for reconciliation, JE management, and period close',
  'Output feeds back to the ERP as journals, or to BI tools as reporting datasets'
]))}
${mlcExample('Positioning Example', 'A company already using SAP S/4HANA for core accounting uses Bluecopa to automate bank reconciliation, AP three-way matching, and intercompany reconciliation — three areas where SAP requires heavy manual intervention. Bluecopa does not replace SAP; it fills the automation gaps SAP leaves open.')}
${mlcTakeaway('Bluecopa is not an ERP. It is a finance automation layer that works with your existing stack to eliminate manual work, reduce close cycles, and give finance teams real-time visibility.')}
${mlcCompare('Bluecopa Replaces', ['Manual spreadsheet reconciliation', 'Email-based approval workflows', 'Fragmented point solutions per process', 'Monthly batch reconciliation', 'Siloed data across ERP and bank systems'], 'Bluecopa Works Alongside', ['Your existing ERP (SAP, Oracle, Tally)', 'Your BI and reporting tools', 'Your bank and vendor connections', 'Your chart of accounts structure', 'Your existing finance team and processes'])}`
          },
          {
            title: 'The Big Picture — Data Flow & Mental Model',
            dur: '10 min',
            html: `<h2>The Big Picture — Data Flow & Mental Model</h2>
<p class="mlc-lead">Understanding how data moves through Bluecopa is the foundation for working with the platform. There are two ways to think about it: the <strong>Big Picture flow</strong> (what happens end to end) and the <strong>Mental Model</strong> (the three conceptual layers).</p>
${mlcSection('The Big Picture Data Flow', mlcOl([
  '<strong>Data Sources</strong> — ERP systems, bank files, vendor portals, spreadsheets, external APIs',
  '<strong>Integrations</strong> — Connectors pull raw data into Bluecopa in structured form',
  '<strong>Tables</strong> — Data is stored in Input Tables, View Tables, Blob storage, or External references',
  '<strong>Engines</strong> — Processing engines (Reconciliation, JE, Reporting, Task & Period) act on the data',
  '<strong>Results</strong> — Matched records, journal entries, reconciled reports, alerts, and exceptions',
  '<strong>Exports</strong> — Outputs pushed back to ERP, shared via reports, or surfaced in Solutions'
]))}
${mlcSection('The Mental Model — Three Layers', mlcUl([
  '<strong>Data</strong> — Everything in Bluecopa starts with data. Raw inputs from external systems land here as structured tables',
  '<strong>Pipes</strong> — The transformation layer. Pipes reshape, filter, calculate, and enrich data using Methods (logic scripts) and Templated Data (reusable data shapes)',
  '<strong>Flows</strong> — The workflow and automation layer. Flows trigger actions, route exceptions, and orchestrate multi-step processes across teams and systems'
]))}
${mlcSection('FxJS — The Formula Engine', mlcUl([
  'Bluecopa includes <strong>FxJS</strong>, a built-in formula and expression engine for writing data transformation logic',
  'Works like spreadsheet formulas but operates at scale across millions of rows',
  'Used in Methods, Views, Matching rules, and conditional routing logic',
  'Finance teams can write rules in FxJS without needing engineering support'
]))}
${mlcExample('Real-World Flow', 'A bank statement arrives as a CSV (Data Source). The Connector parses it into an Input Table (Integrations → Tables). A reconciliation rule written in FxJS runs to match bank lines against GL entries (Engines). Unmatched items surface as exceptions in the AR or AP Solution (Results). The finance team reviews and resolves them, and a summary report is published to the BI tool (Exports).')}
${mlcTakeaway('Every action in Bluecopa follows the same path: Data in → Pipes transform → Engines process → Flows orchestrate → Results out. Once you internalise this flow, any feature in the platform makes intuitive sense.')}
${mlcFlow(['Data Sources (ERP, banks, vendors, files)', 'Connectors pull data on schedule', 'Data lands in Input Tables (immutable)', 'Methods (FxJS) transform & clean data', 'Engines process (reconcile, post JEs, report)', 'Results surface in Solutions & dashboards', 'Exports push back to ERP or BI tools'])}`
          }
        ]
      },
      {
        title: 'The Foundation Layer',
        lessons: [
          {
            title: 'Connectors, Extraction & Data Management',
            dur: '9 min',
            html: `<h2>Connectors, Extraction & Data Management</h2>
<p class="mlc-lead">The Foundation layer is the domain-neutral substrate of the Bluecopa platform. It handles everything needed to bring data in, store it correctly, and make it available for processing — regardless of the finance use case on top.</p>
${mlcSection('Connectors — How Data Enters Bluecopa', mlcUl([
  '<strong>Files</strong> — CSV, Excel, XLSX, XML, fixed-width text files uploaded manually or via automation',
  '<strong>SFTP</strong> — Scheduled file pickup from secure FTP servers (common for bank statement delivery)',
  '<strong>Email</strong> — Attachments and inline data extracted directly from configured email inboxes',
  '<strong>Databases</strong> — Direct query connections to SQL databases, data warehouses, and cloud storage',
  '<strong>Apps</strong> — Pre-built connectors for ERPs (SAP, Oracle, Tally), HRMS, CRM, and finance tools',
  '<strong>HTTP / API</strong> — REST API connections for any system that exposes a web endpoint',
  '<strong>External</strong> — Custom connectors for non-standard sources or proprietary protocols'
]))}
${mlcSection('Sync Modes — How Data Is Refreshed', mlcUl([
  '<strong>Full Refresh</strong> — Drops all existing data in the table and reloads completely from the source on every sync. Best for reference data (e.g., chart of accounts, vendor master)',
  '<strong>Incremental</strong> — Fetches only new or changed records since the last run. Best for large transaction tables where historical data does not change',
  '<strong>Incremental Dedup</strong> — Same as Incremental but also removes duplicate rows, keeping only the latest version of each record. Best for sources where records can be updated (e.g., invoice status changes)'
]))}
${mlcSection('Table Types — How Data Is Stored', mlcUl([
  '<strong>Input Tables</strong> — Raw, as-received data from connectors. Never modified after landing',
  '<strong>View Tables</strong> — Computed from Input Tables using transformations. Always derived, never stored manually',
  '<strong>Blob Storage</strong> — Unstructured file storage (PDFs, images, attachments) linked to records',
  '<strong>External Tables</strong> — Pointers to data that lives outside Bluecopa, queried in real time'
]))}
${mlcTakeaway('The Foundation layer is invisible when it works well — data flows in reliably, lands in the right shape, and is always fresh. Getting connectors and sync modes right upfront prevents data quality issues downstream in every engine and solution.')}`
          },
          {
            title: 'Match, Evidence, Policy & Orchestration',
            dur: '10 min',
            html: `<h2>Match, Evidence, Policy & Orchestration</h2>
<p class="mlc-lead">Once data is in Bluecopa, the Foundation layer provides four more critical capabilities: <strong>Match</strong> (pair records intelligently), <strong>Evidence</strong> (capture proof), <strong>Policy</strong> (govern behaviour), and <strong>Orchestration</strong> (automate end-to-end workflows).</p>
${mlcSection('Match — Pairing Records Intelligently', mlcUl([
  'The Match capability is the core of Bluecopa\'s reconciliation power',
  '<strong>Rules-Based Matching</strong> — Exact-match rules using field comparisons (e.g., document number = reference number AND amount = amount)',
  '<strong>Fuzzy Matching</strong> — Handles real-world variance: minor amount differences (within tolerance), partial reference numbers, date range windows',
  '<strong>AI Matching (Samyx)</strong> — Machine learning trained on historical match patterns; suggests matches for items that rule-based matching cannot resolve',
  'Match rules are written in plain configuration — no code required for standard scenarios'
]))}
${mlcSection('Evidence — Capturing Proof', mlcUl([
  'Every match, exception, and action in Bluecopa generates <strong>Evidence</strong>',
  'Evidence is the audit trail: who matched what, when, using which rule, with what confidence',
  'Supporting documents (bank statements, invoices, contracts) are attached as evidence to records',
  'Evidence ensures every reconciliation decision is defensible in an audit without manual spreadsheet notes'
]))}
${mlcSection('Policy — Governing Platform Behaviour', mlcUl([
  'Policies define the rules that govern what users can do and how the system behaves',
  '<strong>Tenant Policies</strong> — Global settings for the entire Bluecopa instance (data retention, user access, currency handling)',
  '<strong>Engine Policies</strong> — Specific rules for each engine (match tolerance, period lock rules, JE posting controls)',
  '<strong>Solution Policies</strong> — Business rules for each Solution (AP payment terms, AR credit limits, R2R close calendar)'
]))}
${mlcSection('Orchestration — Automating Workflows', mlcUl([
  'Orchestration connects data processing to human action in a structured, auditable workflow',
  '<strong>Triggers</strong> — Rules that fire when data conditions are met (e.g., unmatched item > ₹1,00,000 → escalate)',
  '<strong>Routing</strong> — Directs exceptions and tasks to the right person or team based on configurable rules',
  '<strong>Robots/Automation</strong> — Bots that execute repetitive steps (file pickup, posting, notification dispatch) without human intervention',
  '<strong>Notifications</strong> — Alerts via email, in-app, or webhook when key events occur'
]))}
${mlcTakeaway('Match + Evidence + Policy + Orchestration is what separates Bluecopa from a simple data tool. Together, they deliver end-to-end automation with a complete, auditable record of every decision.')}`
          }
        ]
      },
      {
        title: 'Engines & Processing',
        lessons: [
          {
            title: 'The Four Processing Engines',
            dur: '11 min',
            html: `<h2>The Four Processing Engines</h2>
<p class="mlc-lead">Engines are the finance-specific processing layer in Bluecopa. They sit above the Foundation and apply domain logic to data — reconciling, posting journals, generating reports, and managing period close. There are four engines, each purpose-built for a distinct finance function.</p>
${mlcSection('1 — Reconciliation Engine', mlcUl([
  'The most-used engine in Bluecopa',
  'Compares two or more datasets and matches records based on configurable rules',
  '<strong>Use cases</strong>: Bank reconciliation, AR/AP reconciliation, intercompany reconciliation, GL-to-subledger reconciliation',
  'Supports multi-source matching (e.g., match GL line against bank statement line against vendor statement line simultaneously)',
  'Exception management built in — unmatched items are surfaced for review, not silently dropped',
  'Full audit trail of every match decision with evidence attached'
]))}
${mlcSection('2 — JE Management Engine', mlcUl([
  'Manages the full lifecycle of journal entries — from creation to review to posting',
  '<strong>Use cases</strong>: Accruals, reversals, provisions, intercompany postings, period-end adjustments',
  'Supports template-based journals (recurring entries posted automatically each period)',
  'Approval workflow built in — journals above a threshold route for senior finance review before posting',
  'Direct integration with ERP — approved journals are posted back to SAP, Oracle, or Tally via the connector layer',
  'Stores all supporting documentation (contracts, invoices, calculations) attached to each journal'
]))}
${mlcSection('3 — Reporting Engine', mlcUl([
  'Generates financial and operational reports from reconciled, processed data',
  '<strong>Use cases</strong>: P&L, Balance Sheet, Cash Flow, AR Aging, AP Aging, period-close packs, management dashboards',
  'Reports are built on Views — computed from Input Tables so they always reflect current data',
  'Scheduled distribution — reports auto-email to stakeholders on configured schedules',
  'No manual data assembly; reports pull live from the reconciled data model'
]))}
${mlcSection('4 — Task & Period Engine', mlcUl([
  'Manages the period-close process as a structured, trackable workflow',
  '<strong>Use cases</strong>: Month-end close checklist, period lock management, close calendar, task assignment and sign-off',
  'Each close task is assigned to an owner with a due date, status, and dependencies',
  'Period lock prevents any further postings once the close is certified — maintaining data integrity',
  'Reporting on close cycle time (Days to Close) is built in for benchmarking and improvement'
]))}
${mlcTakeaway('Each engine is independently configurable but works together seamlessly. A bank reconciliation exception flows from the Reconciliation Engine into a JE Management Engine journal, which updates a Reporting Engine dashboard, and is tracked in the Task & Period Engine close checklist — all without leaving Bluecopa.')}
${mlcDiagram('The Four Engines at a Glance', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="padding:14px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:6px">🔄 Reconciliation Engine</div><div style="font-size:11px;color:rgba(255,255,255,.52);line-height:1.6">Matches records across datasets. Bank recon, AR/AP, intercompany. Rules-based + AI matching.</div></div><div style="padding:14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#22c55e;margin-bottom:6px">📝 JE Management Engine</div><div style="font-size:11px;color:rgba(255,255,255,.52);line-height:1.6">Full journal entry lifecycle: creation, approval, posting back to ERP. Template-based recurring JEs.</div></div><div style="padding:14px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#c9a227;margin-bottom:6px">📊 Reporting Engine</div><div style="font-size:11px;color:rgba(255,255,255,.52);line-height:1.6">P&L, Balance Sheet, AR/AP Aging, management packs. Always live — no manual data assembly.</div></div><div style="padding:14px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.3);border-radius:8px"><div style="font-size:12px;font-weight:700;color:#a855f7;margin-bottom:6px">📅 Task & Period Engine</div><div style="font-size:11px;color:rgba(255,255,255,.52);line-height:1.6">Month-end close checklist, task assignment, period lock, Days-to-Close tracking.</div></div></div>')}`
          },
          {
            title: 'The Pipes Layer — Methods & Templated Data',
            dur: '9 min',
            html: `<h2>The Pipes Layer — Methods & Templated Data</h2>
<p class="mlc-lead">Between the Foundation (data in) and the Engines (processing), sits the <strong>Pipes layer</strong> — a transformation and configuration layer that shapes raw data into the clean, structured form the Engines need. It has two main components: <strong>Methods</strong> and <strong>Templated Data</strong>.</p>
${mlcSection('Methods — Logic Scripts', mlcUl([
  'Methods are named transformation scripts written in <strong>FxJS</strong> (Bluecopa\'s formula engine)',
  'They take raw input data and produce a transformed output — filtering, calculating, joining, splitting, or enriching records',
  'Methods are reusable: write once, apply across multiple tables, views, or matching rules',
  '<strong>Examples of Method logic</strong>: Extract the document number from a free-text reference field; calculate a running balance from transaction lines; flag rows where amount difference exceeds 1% tolerance',
  'Finance teams can write and manage Methods — engineering is not required for standard transformations'
]))}
${mlcSection('Templated Data — Reusable Data Shapes', mlcUl([
  'Templated Data defines the <strong>shape and structure</strong> of data that is used repeatedly across the platform',
  'Think of it as a schema template — a defined format that data must conform to before entering an engine',
  'Ensures consistency: every team feeding data into the Reconciliation Engine uses the same column names, types, and conventions',
  'Reduces configuration drift: change the template once, all consumers of that template update automatically',
  '<strong>Examples</strong>: Standard bank statement template, standard GL journal template, standard vendor invoice template'
]))}
${mlcSection('How Pipes Fits in the Stack', mlcUl([
  '<strong>Foundation</strong> brings raw data in (CSV from bank, GL export from SAP)',
  '<strong>Pipes (Methods)</strong> transform it into a standard shape (parse dates, normalise reference numbers, filter header rows)',
  '<strong>Pipes (Templated Data)</strong> validate it conforms to the expected template',
  '<strong>Engines</strong> process it — reconcile, post, report, close'
]))}
${mlcExample('Real-World Example', 'A bank statement arrives with the reference field containing "INV-2024-001 / GIVA / MUMBAI". A Method extracts just "INV-2024-001" as the document number. The Templated Data schema validates the date is in DD/MM/YYYY format. The cleaned data enters the Reconciliation Engine, where it matches against the AR subledger using the extracted document number.')}
${mlcTakeaway('Pipes is where most of the configuration work happens when onboarding a new data source. Getting Methods and Templates right means the Engines always work with clean, consistent data — the single biggest factor in reconciliation accuracy.')}`
          }
        ]
      },
      {
        title: 'Solutions & Samyx AI',
        lessons: [
          {
            title: 'The Three Financial Solutions — P2P, O2C, R2R',
            dur: '10 min',
            html: `<h2>The Three Financial Solutions — P2P, O2C, R2R</h2>
<p class="mlc-lead">Solutions are pre-built, opinionated implementations of specific financial processes built on top of the Bluecopa platform. Rather than configuring the Foundation and Engines from scratch, Solutions provide a ready-to-use starting point for the three most common enterprise finance cycles.</p>
${mlcSection('Procure-to-Pay (P2P)', mlcUl([
  '<strong>Covers</strong>: Purchase Requisition → Purchase Order → Goods Receipt → Vendor Invoice → Three-Way Match → Payment',
  '<strong>Core problem solved</strong>: AP teams spend hours manually matching POs, GRNs, and vendor invoices. P2P automates three-way matching with configurable tolerance rules',
  '<strong>Key automation</strong>: Auto-match PO lines to GRN to invoice; route mismatches to the right approver; track payment terms and flag upcoming due dates; manage vendor statements',
  '<strong>Key output</strong>: Matched payables ready for payment run; exception list with reason codes for unmatched items; vendor reconciliation report'
]))}
${mlcSection('Order-to-Cash (O2C)', mlcUl([
  '<strong>Covers</strong>: Customer Order → Fulfilment → Customer Invoice → Collections → Cash Application → AR Reconciliation',
  '<strong>Core problem solved</strong>: AR teams manually match customer payments to outstanding invoices, often across multiple remittance formats and bank statements',
  '<strong>Key automation</strong>: Auto-apply cash receipts to open invoices; manage deductions and short payments; AR aging with collection workflow; credit management alerts',
  '<strong>Key output</strong>: Real-time AR aging dashboard; cash application rate; collection performance by customer; Days Sales Outstanding (DSO) tracking'
]))}
${mlcSection('Record-to-Report (R2R)', mlcUl([
  '<strong>Covers</strong>: Journal Entry → Subledger Reconciliation → GL Reconciliation → Adjustments → Period Close → Financial Reporting',
  '<strong>Core problem solved</strong>: Period close is a manual, spreadsheet-driven process with no visibility into who has done what and what is still outstanding',
  '<strong>Key automation</strong>: Close task management with owner assignment and due dates; automated reconciliation checks; journal posting with approval workflow; financial statement generation',
  '<strong>Key output</strong>: Certified close checklist; Days to Close metric; signed-off reconciliation packs; published financial statements'
]))}
${mlcExample('Choosing the Right Solution', 'A company suffering from slow AP payment processing and vendor disputes starts with P2P. A company with poor cash flow visibility due to slow cash application starts with O2C. A company whose month-end close takes 15+ days starts with R2R. Most enterprise customers implement all three over time.')}
${mlcTakeaway('Solutions are the fastest path to value in Bluecopa. They encode best-practice process design, matching rules, and workflows — configured to your business rather than built from scratch.')}
${mlcDiagram('Which Solution Solves Your Problem?', '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;"><div style="padding:14px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:8px;text-align:center"><div style="font-size:20px;margin-bottom:8px">🛒</div><div style="font-size:12px;font-weight:700;color:#eab308;margin-bottom:8px">P2P Solution</div><div style="font-size:11px;color:rgba(255,255,255,.5);line-height:1.6;text-align:left">Use when: AP team manually matching POs, GRNs, invoices. Slow payments. Frequent vendor disputes.</div></div><div style="padding:14px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:8px;text-align:center"><div style="font-size:20px;margin-bottom:8px">📦</div><div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px">O2C Solution</div><div style="font-size:11px;color:rgba(255,255,255,.5);line-height:1.6;text-align:left">Use when: AR team manually applying cash. High DSO. Poor collection visibility and slow dispute resolution.</div></div><div style="padding:14px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.3);border-radius:8px;text-align:center"><div style="font-size:20px;margin-bottom:8px">📋</div><div style="font-size:12px;font-weight:700;color:#a855f7;margin-bottom:8px">R2R Solution</div><div style="font-size:11px;color:rgba(255,255,255,.5);line-height:1.6;text-align:left">Use when: Month-end close takes 15+ days. No close task visibility. Spreadsheet-driven process.</div></div></div>')}`
          },
          {
            title: 'Studio & Samyx AI',
            dur: '8 min',
            html: `<h2>Studio & Samyx AI</h2>
<p class="mlc-lead"><strong>Studio</strong> is Bluecopa's extension surface — where finance teams and configuration owners build and customise beyond the standard Solutions. <strong>Samyx</strong> is Bluecopa's embedded AI layer, applying machine learning and language intelligence to the finance automation context.</p>
${mlcSection('Studio — The Extension Surface', mlcUl([
  'Studio is where advanced users configure, extend, and customise the platform without writing code',
  '<strong>Pipeline Studio</strong> — Build and manage data pipelines: connectors, sync schedules, transformation methods, templated data schemas',
  '<strong>Data Studio</strong> — Explore and manage tables, views, and data quality checks',
  '<strong>Accounting Studio</strong> — Configure reconciliation rules, matching logic, journal templates, and period-close workflows',
  '<strong>Portal Builder</strong> — Create custom dashboards and operational views for business stakeholders (non-finance users)',
  'Studio is primarily used by <strong>Finance Ops</strong>, <strong>Configuration Owners</strong>, and <strong>IT Finance</strong> — not typically by end-users performing day-to-day tasks'
]))}
${mlcSection('Samyx — The AI Layer', mlcUl([
  'Samyx is Bluecopa\'s embedded AI, trained on financial data patterns and purpose-built for finance automation',
  '<strong>Extract</strong> — Reads unstructured documents (PDFs, scanned invoices, bank statements) and extracts structured data without manual data entry',
  '<strong>Recon</strong> — AI-assisted matching that learns from historical human match decisions; suggests matches for items rules cannot resolve',
  '<strong>Narrate</strong> — Generates natural-language explanations of reconciliation results, exception summaries, and period-close status — readable by non-finance stakeholders',
  '<strong>Build</strong> — AI-assisted configuration: suggests matching rules, transformation logic, and workflow designs based on your data patterns',
  '<strong>Evidence</strong> — AI validation of supporting documents: confirms an invoice image matches the posted transaction amount and vendor details'
]))}
${mlcSection('Tenancy Model', mlcUl([
  'Bluecopa is <strong>single-tenant</strong> — each customer runs on their own isolated instance',
  'No shared infrastructure between customers; data never co-mingles',
  'Configuration is isolated: your matching rules, policies, and data models are invisible to any other customer',
  'This is intentional for financial data — the risk of shared-tenant data leakage in a finance context is unacceptable'
]))}
${mlcTakeaway('Studio is where the platform becomes yours — configured to your exact process, not a generic template. Samyx is what makes Bluecopa intelligent — moving beyond rules-based automation to adaptive, learning-based processing that improves over time.')}`
          }
        ]
      },
      {
        title: 'Navigating the Platform',
        lessons: [
          {
            title: 'Core Navigation — Home, Inbox, Workspace & Library',
            dur: '7 min',
            html: `<h2>Core Navigation — Home, Inbox, Workspace & Library</h2>
<p class="mlc-lead">Bluecopa's navigation is organised around how finance teams actually work — with a clear separation between personal work (Inbox, Workspace), shared resources (Library), and operational configuration (Operations). The top navigation bar is your starting point for everything.</p>
${mlcSection('Top-Level Navigation Items', mlcUl([
  '<strong>Home</strong> — Your personalised dashboard. Key metrics, recent activity, and assigned tasks visible at a glance. The first screen you see after login',
  '<strong>Inbox</strong> — Tasks and exceptions routed to you for action. AP mismatches needing approval, reconciliation exceptions assigned to your review, journal entries awaiting your sign-off — all land here',
  '<strong>Workspace</strong> — Your personal working area. In-progress reconciliations, draft journal entries, and saved views you are actively working on',
  '<strong>Solutions</strong> — Access to the P2P, O2C, and R2R solution modules configured for your organisation',
  '<strong>Operations</strong> — Configuration and management of the platform (connectors, pipelines, engines, matching rules). Primarily for Finance Ops and configuration owners',
  '<strong>Library</strong> — Shared resources: report templates, document templates, reference data, and published reports accessible to the whole team'
]))}
${mlcSection('Inbox — Your Action Centre', mlcUl([
  'Inbox is the most important screen for day-to-day finance work',
  'Items appear here when a matching rule creates an exception, a workflow routes a task, or an approval is required',
  'Each inbox item shows: what it is, why it was routed to you, the due date, and the relevant data',
  'You can action, reassign, comment, or escalate directly from the inbox without navigating elsewhere',
  'Inbox is cleared as items are resolved — a clean inbox means no outstanding actions'
]))}
${mlcSection('Library — Shared Knowledge', mlcUl([
  'Library stores assets that are used across the team — not personal to any individual user',
  '<strong>Report Templates</strong> — Pre-built report layouts that anyone can run against current data',
  '<strong>Document Templates</strong> — Standard formats for JEs, reconciliation packs, and management reports',
  '<strong>Reference Data</strong> — Shared lookup tables (cost centres, entity codes, currency rates) used in matching rules and transformations'
]))}
${mlcTakeaway('Home, Inbox, and Workspace are the daily work surfaces for finance teams. Operations and Library are the configuration and shared resource layer. Solutions is where the pre-built process automation lives. Understanding this separation makes it easy to navigate to the right place for any task.')}`
          },
          {
            title: 'Accounting Studio, Operations & Settings',
            dur: '9 min',
            html: `<h2>Accounting Studio, Operations & Settings</h2>
<p class="mlc-lead">The operational and configuration areas of Bluecopa — Operations and Settings — are where Finance Ops and IT Finance teams manage the platform. Accounting Studio within Operations is the heart of reconciliation and journal configuration.</p>
${mlcSection('Operations — Platform Configuration', mlcUl([
  'Operations is the configuration hub for running the platform',
  '<strong>Pipeline Studio</strong> — Manage data connectors, sync schedules, and data pipelines. Add new sources, monitor sync health, debug data quality issues',
  '<strong>Data Studio</strong> — Browse Input Tables and View Tables. Run queries, inspect data, build and test transformation methods',
  '<strong>Accounting Studio</strong> — Configure the Reconciliation Engine (matching rules, tolerance bands) and Allocation Engine (allocation Methods and Templated Data). The primary workspace for Finance Ops',
  '<strong>Reporting & Analytics</strong> — Build, schedule, and distribute reports. Configure dashboards for business stakeholders',
  '<strong>Portal Builder</strong> — Design custom operational views and self-service dashboards for non-finance users (operations teams, business unit heads)'
]))}
${mlcSection('Accounting Studio — Reconciliation Engine', mlcUl([
  'Set up reconciliation scenarios: define which two (or more) datasets to reconcile',
  'Configure matching rules in priority order: exact match rules first, then tolerance-band rules, then AI-suggested matches',
  'Define match keys: the fields used to pair records (document number, amount, date, cost centre)',
  'Set tolerance rules: match if amount difference < 1% or < ₹500 (whichever is lower)',
  'Configure exception routing: unmatched items above ₹X route to senior reviewer; items below route to analyst'
]))}
${mlcSection('Accounting Studio — Allocation Engine', mlcUl([
  'The Allocation Engine distributes costs or revenue across multiple cost centres, entities, or periods',
  '<strong>Methods</strong> — The allocation logic written in FxJS (e.g., allocate IT costs proportional to headcount per department)',
  '<strong>Templated Data</strong> — The allocation keys and driver data (headcount table, revenue table, square footage table) that the Methods reference',
  'Allocation runs produce a journal entry per allocation rule — posted via the JE Management Engine'
]))}
${mlcSection('Settings & Administration', mlcUl([
  '<strong>Tenant Settings</strong> — Organisation-wide configuration: base currency, fiscal year, period calendar, data retention policy',
  '<strong>User Management</strong> — Create, edit, and deactivate users. Assign roles and permissions',
  '<strong>Engine Settings</strong> — Engine-specific configuration: matching defaults, JE numbering, period lock rules, close calendar',
  '<strong>Solution Settings</strong> — Solution-specific parameters: AP payment terms, AR dunning schedules, R2R close checklist template'
]))}
${mlcTakeaway('Operations is where the platform is maintained and evolved. Finance Ops teams spend the most time in Accounting Studio configuring matching rules and allocation logic. Administrators manage the broader platform through Settings. End-users (AR analysts, AP clerks, accountants) rarely need to enter Operations — their work lives in Home, Inbox, and the Solutions.')}`
          }
        ]
      }
    ],
    quiz: [
      { q: 'Which of the following best describes Bluecopa\'s positioning?', opts: ['An ERP system replacing SAP and Oracle', 'A composable finance automation platform that sits on top of the existing ERP stack', 'A standalone accounting software for small businesses', 'A data warehousing and BI reporting tool'], a: 1, exp: 'Bluecopa is a composable finance automation platform designed to complement and extend existing ERP systems like SAP and Oracle — not replace them. It fills automation gaps the ERP leaves open.' },
      { q: 'How many layers make up the Bluecopa platform architecture?', opts: ['Two — Foundation and Engines', 'Three — Data, Pipes, and Flows', 'Four — Foundation, Engines, Solutions, and Studio', 'Five — Connectors, Data, Processing, Solutions, and UI'], a: 2, exp: 'Bluecopa\'s platform has four distinct layers: Foundation (domain-neutral substrate), Engines (finance-specific processing), Solutions (pre-built process implementations), and Studio (extension and configuration surface).' },
      { q: 'Which Foundation capability is responsible for pairing records from two or more datasets?', opts: ['Extraction', 'Orchestration', 'Match', 'Policy'], a: 2, exp: 'Match is the Foundation capability that pairs records intelligently — using rules-based matching, fuzzy tolerance matching, and AI-assisted matching (Samyx) to reconcile data across sources.' },
      { q: 'Which sync mode removes all existing data and reloads completely from the source on every run?', opts: ['Incremental', 'Incremental Dedup', 'Full Refresh', 'Snapshot Merge'], a: 2, exp: 'Full Refresh drops all existing data in the table and reloads it completely each time. It is best suited for small reference datasets like chart of accounts or vendor master that need to stay fully current.' },
      { q: 'FxJS in Bluecopa is best described as:', opts: ['A third-party JavaScript library for financial reporting', 'Bluecopa\'s built-in formula and expression engine for data transformation', 'An integration connector for foreign exchange data sources', 'The frontend rendering engine for the Bluecopa UI'], a: 1, exp: 'FxJS is Bluecopa\'s built-in formula engine — similar to spreadsheet formulas but operating at scale across large datasets. Finance teams use it to write matching rules, transformation methods, and allocation logic.' },
      { q: 'Which Bluecopa Engine specifically manages journal entry lifecycle from creation through approval to posting?', opts: ['Reconciliation Engine', 'JE Management Engine', 'Task & Period Engine', 'Reporting Engine'], a: 1, exp: 'The JE Management Engine handles the full journal entry lifecycle: template-based creation, approval routing for journals above thresholds, and direct posting back to the ERP via the connector layer.' },
      { q: 'The three pre-built financial Solutions in Bluecopa cover which process cycles?', opts: ['AP, AR, and Payroll', 'Forecasting, Budgeting, and Reporting', 'Procure-to-Pay, Order-to-Cash, and Record-to-Report', 'Invoicing, Collections, and Period Close'], a: 2, exp: 'Bluecopa\'s three Solutions — P2P (Procure-to-Pay), O2C (Order-to-Cash), and R2R (Record-to-Report) — cover the three core enterprise finance cycles and are the fastest path to automation value.' },
      { q: 'Samyx is Bluecopa\'s AI layer. Which of the following is NOT one of Samyx\'s listed capabilities?', opts: ['Extract', 'Narrate', 'Predict', 'Build'], a: 2, exp: 'Samyx\'s five capabilities are: Extract (unstructured document reading), Recon (AI-assisted matching), Narrate (natural-language summaries), Build (AI-assisted configuration), and Evidence (document validation). "Predict" is not a Samyx capability.' },
      { q: 'In Bluecopa\'s navigation, where would a finance user go to configure a new reconciliation matching rule?', opts: ['Library → Reconciliation', 'Operations → Accounting Studio → Reconciliation Engine', 'Inbox → Configuration', 'Solutions → Match Engine'], a: 1, exp: 'Matching rules are configured in Operations → Accounting Studio → Reconciliation Engine. This is the configuration area for Finance Ops — end users working day-to-day do not need to go here.' },
      { q: 'Bluecopa\'s tenancy model is best described as:', opts: ['Multi-tenant SaaS shared by all customers on shared infrastructure', 'Single-tenant, with each customer on their own isolated instance', 'Hybrid — shared compute with isolated storage', 'On-premises only with no cloud deployment option'], a: 1, exp: 'Bluecopa is single-tenant: each customer has their own isolated instance. No data or configuration is shared between customers. This is a deliberate design choice for financial data security and compliance.' }
    ]
  }
};

// ─── Progress Storage ────────────────────────────────────────────
function mlLoadProg() {
  try { return JSON.parse(localStorage.getItem('ml_prog') || '{}'); } catch(e) { return {}; }
}
function mlSaveProg(data) { localStorage.setItem('ml_prog', JSON.stringify(data)); }

function mlGetCourseProgress(courseId) {
  const prog = mlLoadProg()[courseId] || {};
  const course = MLC[courseId];
  if (!course) return {done:0, total:0, passed:false, score:0};
  let total = 0;
  course.modules.forEach(m => total += m.lessons.length);
  const done = (prog.lessons || []).filter(Boolean).length;
  return {done, total, passed: prog.passed || false, score: prog.score || 0};
}

function mlFlatLessonIdx(courseId, modIdx, lesIdx) {
  const course = MLC[courseId];
  let idx = 0;
  for (let m = 0; m < modIdx; m++) idx += course.modules[m].lessons.length;
  return idx + lesIdx;
}

function mlMarkLessonDone(courseId, modIdx, lesIdx) {
  const prog = mlLoadProg();
  if (!prog[courseId]) prog[courseId] = {lessons:[], passed:false, score:0};
  prog[courseId].lessons[mlFlatLessonIdx(courseId, modIdx, lesIdx)] = true;
  mlSaveProg(prog);
}

// ─── Viewer State ────────────────────────────────────────────────
let mlVS = {
  courseId: null,
  modIdx: 0, lesIdx: 0,
  quiz: false,
  qIdx: 0,
  qAnswers: [],    // selected option index per question (-1 = not answered)
  qReview: false,  // showing answer state
};

// ─── Open / Close ────────────────────────────────────────────────
function mlOpenCourse(id) {
  const course = MLC[id];
  if (!course) return;
  mlVS.courseId = id;
  mlVS.quiz = false;
  mlVS.qIdx = 0;
  mlVS.qAnswers = [];
  mlVS.qReview = false;

  document.getElementById('mlListView').style.display = 'none';
  document.getElementById('mlCourseViewer').style.display = 'flex';
  document.getElementById('mlBackBtn').classList.add('visible');
  document.getElementById('mlTopbarTitle').textContent = course.modules[0].lessons[0].title;

  // Find first incomplete lesson
  const prog = mlLoadProg()[id] || {};
  const doneLessons = prog.lessons || [];
  let sm = 0, sl = 0;
  outer: for (let m = 0; m < course.modules.length; m++) {
    for (let l = 0; l < course.modules[m].lessons.length; l++) {
      if (!doneLessons[mlFlatLessonIdx(id, m, l)]) { sm = m; sl = l; break outer; }
    }
  }
  if ((prog.lessons || []).filter(Boolean).length === mlGetCourseProgress(id).total) { sm = 0; sl = 0; }

  mlVS.modIdx = sm; mlVS.lesIdx = sl;
  mlRenderSidebar();
  mlShowLesson(sm, sl);
}

function mlCloseCourse() {
  document.getElementById('mlCourseViewer').style.display = 'none';
  document.getElementById('mlListView').style.display = '';
  document.getElementById('mlBackBtn').classList.remove('visible');
  document.getElementById('mlTopbarTitle').textContent = 'MY LEARNING';
  document.getElementById('mlTopProgress').style.display = 'none';
  mlVS.courseId = null;
  // Re-render cards and update hero stats to reflect latest progress
  mlUpdateHeroStats();
  mlRender(ML_COURSES);
}

// ─── Sidebar ─────────────────────────────────────────────────────
function mlRenderSidebar() {
  const id = mlVS.courseId;
  const course = MLC[id];
  const card = ML_COURSES.find(c => c.id === id);
  const prog = mlLoadProg()[id] || {};
  const doneLessons = prog.lessons || [];

  let html = `<div class="mlcv-course-title">${card ? card.title : id.toUpperCase()}</div>`;

  course.modules.forEach((mod, mi) => {
    html += `<div class="mlcv-module"><div class="mlcv-module-hd"><div class="mlcv-module-num">${mi+1}</div>${mod.title}</div>`;
    mod.lessons.forEach((les, li) => {
      const flatIdx = mlFlatLessonIdx(id, mi, li);
      const done = doneLessons[flatIdx];
      const active = !mlVS.quiz && mlVS.modIdx === mi && mlVS.lesIdx === li;
      html += `<button class="mlcv-lesson-btn${active?' active':''}${done?' done':''}" onclick="mlShowLesson(${mi},${li})">
        <div class="mlcv-lesson-check">${done ? '✓' : ''}</div>
        <span class="mlcv-lesson-text">${les.title}</span>
        <span class="mlcv-lesson-dur">${les.dur}</span>
      </button>`;
    });
    html += '</div>';
  });

  const p = mlGetCourseProgress(id);
  const allDone = p.done >= p.total;
  const passed = prog.passed;
  html += `<button class="mlcv-quiz-btn${mlVS.quiz?' active':''}${!allDone?' locked':''}${passed?' passed':''}" onclick="${allDone ? 'mlStartQuiz()' : 'mlQuizLocked()'}">
    ${passed ? '✓ Assessment Passed' : (allDone ? '🎯 Take Assessment' : '🔒 Complete lessons first')}
    ${!passed && allDone ? `<span style="margin-left:auto;font-size:10px;opacity:.6">Pass: 65%</span>` : ''}
  </button>`;

  document.getElementById('mlcvSidebar').innerHTML = html;
  mlUpdateTopProgress();
}

function mlUpdateTopProgress() {
  const id = mlVS.courseId;
  if (!id) return;
  const p = mlGetCourseProgress(id);
  const pct = p.total > 0 ? Math.round(p.done / p.total * 100) : 0;
  document.getElementById('mlTopProgress').style.display = 'flex';
  document.getElementById('mlTopProgFill').style.width = pct + '%';
  document.getElementById('mlTopProgLabel').textContent = `${p.done} / ${p.total} lessons`;
}

// ─── Show Lesson ──────────────────────────────────────────────────
function mlShowLesson(mi, li) {
  mlVS.modIdx = mi; mlVS.lesIdx = li; mlVS.quiz = false;
  const course = MLC[mlVS.courseId];
  const mod = course.modules[mi];
  const les = mod.lessons[li];
  document.getElementById('mlTopbarTitle').textContent = les.title;

  const flatIdx = mlFlatLessonIdx(mlVS.courseId, mi, li);
  const prog = mlLoadProg()[mlVS.courseId] || {};
  const doneLessons = prog.lessons || [];
  const isDone = doneLessons[flatIdx];

  // Figure out next lesson
  const nextInfo = mlNextLessonInfo();
  let nextBtnLabel = nextInfo ? `Next: ${nextInfo.title} →` : (mlGetCourseProgress(mlVS.courseId).done >= mlGetCourseProgress(mlVS.courseId).total ? '🎯 Take Assessment →' : 'Mark Complete');

  const html = `<div class="mlc-lesson-wrap">
    <div class="mlc-breadcrumb">Module ${mi+1} · Lesson ${li+1}</div>
    ${les.html}
    <div class="mlc-footer">
      <span class="mlc-lesson-num">${isDone ? '✓ Completed' : `Lesson ${flatIdx+1} of ${mlGetCourseProgress(mlVS.courseId).total}`}</span>
      <button class="mlc-next-btn" onclick="mlCompleteLesson()">${isDone && !nextInfo ? '🎯 Go to Assessment' : (isDone ? `Next →` : nextBtnLabel)}</button>
    </div>
  </div>`;

  document.getElementById('mlcvMain').innerHTML = html;
  document.getElementById('mlcvMain').scrollTop = 0;
  mlRenderSidebar();
}

function mlNextLessonInfo() {
  const course = MLC[mlVS.courseId];
  let mi = mlVS.modIdx, li = mlVS.lesIdx + 1;
  if (li >= course.modules[mi].lessons.length) { mi++; li = 0; }
  if (mi >= course.modules.length) return null;
  return { mi, li, title: course.modules[mi].lessons[li].title };
}

function mlCompleteLesson() {
  mlMarkLessonDone(mlVS.courseId, mlVS.modIdx, mlVS.lesIdx);
  const next = mlNextLessonInfo();
  if (next) {
    mlShowLesson(next.mi, next.li);
  } else {
    const p = mlGetCourseProgress(mlVS.courseId);
    if (p.done >= p.total) { mlRenderSidebar(); mlStartQuiz(); }
    else mlRenderSidebar();
  }
}

function mlQuizLocked() {
  const main = document.getElementById('mlcvMain');
  main.innerHTML = `<div class="mlc-lesson-wrap"><div class="mlcv-quiz-locked-msg">
    <div style="font-size:40px;margin-bottom:16px;">🔒</div>
    <div style="font-size:18px;font-weight:700;color:#f0f0f6;margin-bottom:8px;">Complete All Lessons First</div>
    <div style="font-size:13px;color:rgba(255,255,255,.4);line-height:1.6;">Please complete all course lessons before taking the assessment. Check the left sidebar — lessons with a ✓ are done.</div>
  </div></div>`;
}

// ─── Quiz Engine ──────────────────────────────────────────────────
function mlStartQuiz() {
  mlVS.quiz = true;
  mlVS.qIdx = 0;
  mlVS.qAnswers = new Array(MLC[mlVS.courseId].quiz.length).fill(-1);
  mlVS.qReview = false;
  mlRenderSidebar();
  mlShowQuestion(0);
}

function mlShowQuestion(idx) {
  mlVS.qIdx = idx;
  mlVS.qReview = false;
  const quiz = MLC[mlVS.courseId].quiz;
  const q = quiz[idx];
  const total = quiz.length;
  const pct = Math.round(idx / total * 100);

  const optsHtml = q.opts.map((opt, oi) => {
    const letter = ['A','B','C','D'][oi];
    return `<button class="mlq-option" onclick="mlSelectAnswer(${oi})">
      <span class="mlq-opt-letter">${letter}</span>${opt}
    </button>`;
  }).join('');

  const html = `<div class="mlq-wrap">
    <div class="mlq-header">
      <div class="mlq-title">Assessment</div>
      <div class="mlq-sub">${mlVS.courseId.toUpperCase()} · Pass mark: 65% (${Math.ceil(total * 0.65)}/${total} correct)</div>
    </div>
    <div class="mlq-progress-row">
      <div class="mlq-progress-track"><div class="mlq-progress-fill" style="width:${pct}%"></div></div>
      <span class="mlq-progress-label">Question ${idx+1} of ${total}</span>
    </div>
    <div class="mlq-card">
      <div class="mlq-q-num">Q${idx+1}</div>
      <div class="mlq-q-text">${q.q}</div>
      <div class="mlq-options" id="mlqOpts">${optsHtml}</div>
      <div class="mlq-explanation" id="mlqExp">${q.exp}</div>
    </div>
    <div class="mlq-action-row">
      ${idx > 0 ? '<button class="mlq-btn mlq-btn-secondary" onclick="mlShowQuestion(' + (idx-1) + ')">← Back</button>' : ''}
      <button class="mlq-btn mlq-btn-primary" id="mlqNextBtn" onclick="mlSubmitAnswer()" style="margin-left:auto">
        ${mlVS.qAnswers[idx] >= 0 ? (idx < total-1 ? 'Next →' : 'Submit Assessment') : 'Select an answer'}
      </button>
    </div>
  </div>`;

  document.getElementById('mlcvMain').innerHTML = html;
  document.getElementById('mlcvMain').scrollTop = 0;

  // Restore previously selected answer if navigating back
  if (mlVS.qAnswers[idx] >= 0) mlRestoreAnswer(idx);
}

function mlRestoreAnswer(idx) {
  const sel = mlVS.qAnswers[idx];
  const opts = document.querySelectorAll('.mlq-option');
  if (opts[sel]) opts[sel].classList.add('selected');
  const nextBtn = document.getElementById('mlqNextBtn');
  if (nextBtn) nextBtn.textContent = idx < MLC[mlVS.courseId].quiz.length - 1 ? 'Next →' : 'Submit Assessment';
}

function mlSelectAnswer(optIdx) {
  mlVS.qAnswers[mlVS.qIdx] = optIdx;
  document.querySelectorAll('.mlq-option').forEach((btn, i) => {
    btn.classList.toggle('selected', i === optIdx);
  });
  const total = MLC[mlVS.courseId].quiz.length;
  const nextBtn = document.getElementById('mlqNextBtn');
  if (nextBtn) nextBtn.textContent = mlVS.qIdx < total - 1 ? 'Next →' : 'Submit Assessment';
}

function mlSubmitAnswer() {
  const sel = mlVS.qAnswers[mlVS.qIdx];
  if (sel < 0) return; // nothing selected
  const quiz = MLC[mlVS.courseId].quiz;
  const total = quiz.length;

  if (mlVS.qIdx < total - 1) {
    mlShowQuestion(mlVS.qIdx + 1);
  } else {
    // All questions answered — show result
    mlShowResult();
  }
}

function mlShowResult() {
  const id = mlVS.courseId;
  const quiz = MLC[id].quiz;
  let correct = 0;
  quiz.forEach((q, i) => { if (mlVS.qAnswers[i] === q.a) correct++; });
  const score = Math.round(correct / quiz.length * 100);
  const passed = score >= 65;

  if (passed) {
    const prog = mlLoadProg();
    if (!prog[id]) prog[id] = {lessons:[], passed:false, score:0};
    if (!prog[id].passed || score > (prog[id].score||0)) {
      prog[id].passed = true;
      prog[id].score = score;
      if (!prog[id].passedAt) prog[id].passedAt = new Date().toISOString();
      mlSaveProg(prog);
    }
  }

  const card = ML_COURSES.find(c => c.id === id);

  const wrongItems = quiz.map((q, i) => {
    if (mlVS.qAnswers[i] === q.a) return '';
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
      <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.7);margin-bottom:4px;">Q${i+1}: ${q.q}</div>
      <div style="font-size:11px;color:#f87171;">Your answer: ${q.opts[mlVS.qAnswers[i]] || 'Not answered'}</div>
      <div style="font-size:11px;color:#4ade80;margin-top:2px;">Correct: ${q.opts[q.a]}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:4px;">${q.exp}</div>
    </div>`;
  }).join('');

  const html = `<div class="mlq-wrap">
    <div class="mlq-result">
      <div class="mlq-result-badge ${passed?'pass':'fail'}">${passed ? '🏆' : '📖'}</div>
      <div class="mlq-result-score ${passed?'pass':'fail'}">${score}%</div>
      <div class="mlq-result-label">${passed ? 'Assessment Passed!' : 'Not Quite There Yet'}</div>
      <div class="mlq-result-sub">${passed
        ? `Excellent work! You scored ${correct}/${quiz.length} and passed the ${card ? card.title : id.toUpperCase()} assessment.`
        : `You scored ${correct}/${quiz.length}. You need 65% (${Math.ceil(quiz.length*0.65)}/${quiz.length}) to pass. Review the course material and try again.`
      }</div>
      <div class="${passed?'mlq-pass-strip':'mlq-fail-strip'}">
        ${passed
          ? `✓ You have successfully completed this course. Your score of ${score}% has been recorded.`
          : `You need ${Math.ceil(quiz.length*0.65) - correct} more correct answer${Math.ceil(quiz.length*0.65) - correct !== 1 ? 's' : ''} to pass. You must retake until you achieve 65% or above.`
        }
      </div>
      <div class="mlq-result-bars">
        <div class="mlq-result-bar-card"><div class="mlq-result-bar-label">Score</div><div class="mlq-result-bar-val">${score}%</div></div>
        <div class="mlq-result-bar-card"><div class="mlq-result-bar-label">Correct</div><div class="mlq-result-bar-val">${correct} / ${quiz.length}</div></div>
        <div class="mlq-result-bar-card"><div class="mlq-result-bar-label">Pass Mark</div><div class="mlq-result-bar-val">65%</div></div>
        <div class="mlq-result-bar-card"><div class="mlq-result-bar-label">Status</div><div class="mlq-result-bar-val" style="color:${passed?'#22c55e':'#ef4444'}">${passed ? 'PASSED' : 'FAILED'}</div></div>
      </div>
      ${!passed && wrongItems ? `<div style="text-align:left;margin-bottom:24px;"><div style="font-size:13px;font-weight:700;color:#f0f0f6;margin-bottom:12px;">Review these questions:</div>${wrongItems}</div>` : ''}
      <div class="mlq-result-actions">
        ${passed
          ? `<button class="mlq-btn mlq-btn-secondary" onclick="mlCloseCourse()">← Back to Courses</button>
             <button class="mlq-btn mlq-btn-primary" onclick="mlStartQuiz()">Retake for Better Score</button>`
          : `<button class="mlq-btn mlq-btn-secondary" onclick="mlShowLesson(0,0)">Review Course</button>
             <button class="mlq-btn mlq-btn-primary" onclick="mlStartQuiz()">🔄 Retake Assessment</button>`
        }
      </div>
    </div>
  </div>`;

  document.getElementById('mlcvMain').innerHTML = html;
  document.getElementById('mlcvMain').scrollTop = 0;
  mlRenderSidebar();
}
