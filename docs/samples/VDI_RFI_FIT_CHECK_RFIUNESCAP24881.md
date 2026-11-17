
# SAMPLE — VDI RFI Fit Check
## RFIUNESCAP24881 — Participant Check-In System at ESCAP Premises, Bangkok

**Assessment date:** 18 November 2026  
**RFI closing date in response form:** 25 November 2026 (time not stated in PDF text)  
**UNGM displayed deadline:** 25 November 2026, 23:59 (GMT-4.00)  
**UNSPSC:** 93111605 — Conference & Office Support Services  
**Deployment:** Initially 10 conference / meeting rooms at UNCC, Bangkok  
**Decision:** GO TO SUPPLIER DISCOVERY / HOLD ON COMPLIANCE CLAIMS

> This is a public-source assessment only. The RFI is an information-gathering exercise, not a solicitation, bid, purchase order or contract.

## 1. Opportunity summary

The United Nations Economic and Social Commission for Asia and the Pacific (ESCAP) seeks information from qualified companies for a participant check-in and counting system at the United Nations Conference Centre (UNCC) in Bangkok. Initial deployment is planned for ten conference and meeting rooms, potentially hosting concurrent meetings and events.

The system should monitor entries and, where applicable, exits from individual rooms; calculate current occupancy; and generate customizable statistics and reports.

ESCAP invites one or both commercial models:

- **Option A — rental / event-based / pay-per-use:** equipment, transport, installation and dismantling, software access, event support and related charges. The questionnaire asks for indicative pilot pricing for 5–6 rooms.
- **Option B — purchase and installation:** equipment, software, configuration, commissioning, training, warranty, maintenance, licensing and recurring support. The response must clarify ownership of components and ongoing vendor dependencies.

The official response form names ngamcharoensukthavorn@un.org as the submission email and gives 25 November 2026 as the closing date. The PDF text does not specify a time. UNGM displays 25 November 2026 at 23:59 GMT-4. Suppliers should check the current UNGM record and submit during Bangkok business hours on 25 November at the latest, retaining proof of submission.

## 2. Official-source facts

| Field | Finding |
|---|---|
| Issuer | United Nations Economic and Social Commission for Asia and the Pacific (ESCAP) |
| Title | Participant Check-In System at ESCAP Premises, Bangkok |
| Reference | RFIUNESCAP24881 |
| UNGM notice | 321639 |
| RFI date | 4 November 2026 |
| Closing date on form | 25 November 2026 |
| UNGM timestamp | 25 November 2026, 23:59 GMT-4 |
| Beneficiary | Thailand |
| Service category | Conference & Office Support Services |
| UNSPSC | 93111605 |
| Initial coverage | 10 meeting rooms at UNCC Bangkok |
| Submission | Vendor Response Form to ngamcharoensukthavorn@un.org |
| UNGM | Completed registration with UN Secretariat under the full legal name is required before closing; Basic permits participation after completion; Level 1 strongly recommended |
| Contract status | RFI only; no commitment to purchase or contract |

Official sources:
- [ESCAP UNGM RFI 321639](https://www.ungm.org/Public/Notice/321639)
- [Official ESCAP RFI Response Form PDF](https://www.unescap.org/sites/default/d8files/eoi/RFI%20%20Response%20Form.pdf)

## 3. Requirement-to-evidence matrix

| Requirement | Supplier evidence needed | Criticality |
|---|---|---|
| Proposed system and technology | Architecture diagram, technology description, device list and workflow | High |
| Entry and exit detection | Directional entry/exit capture at every door | Critical |
| Current occupancy | Calculation method, reset/reconciliation and real-time display | Critical |
| 10-room configuration | Bill of materials and simultaneous multi-room design | Critical |
| Multiple doors per room | Consolidated count from all entrances/exits | Critical |
| Simultaneous events | Separate room/session data and centralized dashboard | Critical |
| Minimum/maximum room capacity | Tested supported range | High |
| Accuracy | Test evidence, method, sample size and measured count error | Critical |
| Privacy | Numeric-only option vs QR/badge identifiers/images/video; access, hosting, retention and deletion | Critical |
| Access controls | Admin, operations and read-only roles; audit logs | High |
| Scalability | Add rooms without replacing installed system | High |
| Reports | Room and multi-room filters by event/date/time; automatic Excel/CSV/PDF exports | High |
| Rental | Period, per-event/day rates, transport, installation/dismantling, software, event support | High |
| Purchase/install | Hardware, software, setup, commissioning, training, warranty, maintenance, recurring fees | High |
| Delivery period | Off-the-shelf vs lead time; deployment time from confirmed order | High |
| UNGM eligibility | Full legal name and completed UN Secretariat registration | Mandatory |

## 4. Technical solution patterns to assess

These are solution patterns, not a compliance determination.

### A. QR / barcode scanning
Unique participant QR or badge, with separate entry and exit scan points at every room door. Central event/session data updates occupancy.

Advantages: explicit participant check-in and per-session reporting. Risks: missed scans, tailgating, duplicate scans, exit-without-entry, badge sharing and queues. Require offline scan queues, deduplication, manual reconciliation and audit logs.

### B. Anonymous people-counting sensors
Directional sensors count entries and exits without necessarily identifying attendees.

Advantages: numerical-only counting can reduce personal-data collection. Risks: groups entering together, cross-flow, door layout, sensor obstruction, queueing and accuracy under real conference conditions. Require calibrated accuracy tests.

### C. Hybrid QR + sensor
QR confirms participant/session status; sensors provide an occupancy cross-check. A dashboard flags mismatches for manual reconciliation. This may improve auditability but increases hardware and implementation costs.

### Mandatory technical questions
1. Maximum rooms, doors per room and concurrent sessions supported?
2. Does the solution distinguish direction of movement?
3. How are tailgating, group entry and exit-without-prior-entry handled?
4. How is count drift corrected after missed scans or network outages?
5. Can an operator correct occupancy with reason codes and an audit log?
6. Can the dashboard show current, peak and historical occupancy by room/session/time?
7. Can ESCAP choose numerical-only mode without participant identities?
8. Where is data hosted, who can access it, and how are retention and deletion managed?
9. What is the measured accuracy, sample size and test environment?
10. Does the system operate offline and reconcile when connectivity returns?

## 5. Publicly identified supplier prospects — not qualified

| Prospect | Publicly described overlap | Unresolved proof gap | Status |
|---|---|---|---|
| MeetingThai / D One Solution (Thailand) | Public website describes QR scanners at every room entrance/exit, two scan points per room, 5+ rooms simultaneously, peak occupancy per session and central live dashboard with Excel/PDF export | Website states 5+ rooms while ESCAP intends 10; confirm scale, tested accuracy, security/retention, UNGM legal entity and pricing | Strongest functional prospect; unverified |
| Klobbi Thailand | Public profile describes Bangkok event registration, QR tickets, check-in kiosks, badge printing, multi-session management, attendance reports and local support | Does not explicitly prove directional room entry/exit counting; confirm native capability or partner integration and accuracy | Registration/check-in prospect; unverified |
| Alta Media (Vietnam) | Public 2026 case describes registration, QR check-in, attendee management, real-time tracking/reporting, 20 check-in stations and RFID readers | Case does not prove room-level entry/exit occupancy across 10 rooms or Bangkok local support | Integration prospect; unverified |

### Public supplier sources
- [MeetingThai room counting and services](https://www.meetingthai.com/) — sales@donesolution.com; +66 65 991 9442.
- [Klobbi Thailand event technology](https://www.klobbi.com/thailand/) — sales@klobbi.com.
- [Klobbi contact](https://www.klobbi.com/contact-us/).
- [Alta Media 2026 event technology case](https://altamedia.vn/alta-media-helps-create-a-seamless-experience-journey-at-the-world-of-heineken-2026-through-technology/?lang=en) — support@alta.com.vn.

### Supplier inquiries sent — 18 November 2026

| Candidate | Gmail message ID | Scope |
|---|---|---|
| MeetingThai / D One Solution | 1a1ea97a4e15778b | 10-room scaling, directional scan, accuracy tests, privacy, dashboard, rental and purchase costs |
| Klobbi | 1a1ea97b84f8bc7d | Native room counting or partner integration, reporting, privacy, UNGM and price models |
| Alta Media | 1a1ea97c90775e7a | Room-level directional counting, integration, 10-room system, Thailand partner/support and pricing |

These are non-binding inquiries. No price, volume, partnership, commission, exclusivity or award was promised.

## 6. Supplier-owned RFI response pack

The interested eligible supplier must complete the official questionnaire itself. The response should include:

1. Full legal company name and authorized contact matching UNGM.
2. Completed UN Secretariat vendor registration before closing; Level 1 recommended.
3. System summary and architecture for 10 rooms.
4. Entry/exit detection and occupancy calculation.
5. Room capacity range and simultaneous session support.
6. Measured accuracy test, method, sample size and failure conditions.
7. Privacy/security design, data categories, hosting, retention, deletion and user roles.
8. Room and multi-room report examples, dashboard screenshots and export samples.
9. Rental/pay-per-use pilot pricing for 5–6 rooms with itemized equipment, transport, setup/dismantling, software and support.
10. Purchase/install cost breakdown for 10 rooms, including commissioning, training, warranty, maintenance and recurring fees.
11. Delivery and deployment lead time.
12. Thai on-site support, service levels and spares.
13. Assumptions, exclusions, dependencies and risks.
14. Comparable conference deployments and verifiable references.

The supplier should submit the Vendor Response Form to **ngamcharoensukthavorn@un.org** according to the current instructions and retain proof. VDI does not submit on the supplier's behalf.

## 7. VDI commercial opportunity and boundary

Potential paid work for a qualified supplier:
- RFI Fit Check: requirement mapping, evidence gap review and GO/HOLD/NO-GO memo.
- Response Readiness Pack: quality-check response consistency against the official questionnaire.
- Solution comparison: QR, sensors, hybrid architecture, local support and total cost.
- Deployment feasibility: 10-room device topology, network, privacy, commissioning and lifecycle support.

VDI is not currently an incorporated standalone legal entity. This report does not authorize VDI to issue an invoice, collect a fee, submit the RFI or make a commitment. Paid work remains on HOLD until a legally eligible contracting entity and written scope are established.

## 8. Decision

**GO:** Continue supplier discovery with MeetingThai as the strongest functional prospect, Klobbi as a local registration/check-in alternative, and Alta Media as an event-tech integration prospect.

**HOLD:** No supplier is yet confirmed compliant, UNGM-registered, accurate, or able to deliver the complete 10-room requirement.

Do not assume 10-room scalability from a 5+ room public claim; do not infer UNGM eligibility; do not invent accuracy, price, contract value or an award.
