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
  //  COURSE 8 — ABOUT BLUECOPA
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
