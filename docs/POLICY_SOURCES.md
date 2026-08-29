# Policy sources and prototype interpretation

Checked on 26 August 2026, with the contribution split, pension, and e-Nomination sources added on 29 August 2026. These sources inform synthetic routing and interface copy only. EPFO One does not provide legal eligibility advice, reproduce the live portals, or connect to any public system.

## Member self-service Date of Exit

EPFO public guidance describes `Manage > Mark Exit`, member entry after the applicable period, and Aadhaar-linked OTP confirmation. The prototype represents the waiting period, Aadhaar status, and mobile status as synthetic deterministic inputs. It never requests a real OTP.

- [EPFO FAQ](https://www.epfindia.gov.in/site_en/FAQ.php)
- [EPFO Transfer Claim FAQ PDF](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2020-2021/faq_transfer_claim.pdf)

## Bank account seeding

The April 2025 public announcement states that employer approval for seeding bank account details with UAN was removed after bank verification. The prototype therefore never routes a bank-verification issue to employer approval.

- [Press Information Bureau: Simplification of UAN bank account seeding](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2118168&lang=2&reg=48)

## Profile correction routing

The January 2025 public announcement says most members with Aadhaar-validated UANs can update profile details themselves and reports that 97.18% of correction applications can be self-approved, with only about 1% requiring employer approval. The prototype models these policy conditions explicitly and keeps a deterministic employer fallback.

- [Press Information Bureau: Simplification of member profile correction](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2100310&lang=2&reg=48)

## Claim validation

EPFO public material describes upfront validations intended to identify eligibility and data issues before a claim proceeds. Claim Preflight is a hackathon interpretation built from seven synthetic pass or block checks, not an official EPFO score.

- [Press Information Bureau: Online claim process simplification](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2111756&lang=2&reg=48)

## Employer request review

EPFO standard operating procedure material shows employer review workflows with present and proposed values, approval or rejection, and remarks. The synthetic employer workspace uses that structure while adding required reasons for information requests and rejections.

- [EPFO Joint Declaration SOP PDF](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2023-2024/SOP_WSU_26032024.pdf)

## One UAN and multiple member IDs

EPFO material describes UAN as the umbrella for multiple Member IDs allotted across establishments. The persona therefore has one masked synthetic UAN and three employer-specific member records.

- [EPFO UAN Employer User Manual PDF](https://www.epfindia.gov.in/site_docs/PDFs/UAN_PDFs/UAN_ForEmployers/UserManual_Ver1.4_Employers_new.pdf)

## Contribution split explainer

EPFO's public material describes the statutory contribution shape as employee 12% (fully to EPF) and employer 12% split into 3.67% EPF and 8.33% EPS (subject to a pensionable-salary ceiling). The "Where does my money go?" panel on the passbook illustrates this exact 12% / 3.67% / 8.33% shape from a month's wage basis. This is a deliberately separate synthetic assumption from the passbook's own posting model in `src/domain/contribution-health.ts` (which uses a 12% / 12% / 8.33% shape for the recorded ledger, documented there) — the two are not reconciled and are not meant to sum to the same total.

- [EPFO: Employees' Pension Scheme, 1995 handbook](https://www.epfindia.gov.in/site_docs/PDFs/EPFO_Rules-Regulations_PDFs/Handbook_EPS1995.pdf)

## Pension and retirement projection

Two independent, synthetic illustrations at `/pension`:

- **EPS pension estimate** uses the public formula shape (pensionable salary × pensionable service ÷ 70), the current ₹15,000 monthly pensionable-salary ceiling, and the standard two-year service bonus at 20+ years of service (capped at 35 years). It uses this record's average posted wage basis as a stand-in for EPFO's 60-month averaging window, and is clearly labelled as a synthetic illustration, not an official estimate.
- **Retirement corpus projection** compounds the current PF balance and an assumed flat monthly contribution at a fixed synthetic annual rate to the statutory retirement age of 58. The rate used, 8.25%, is the EPF interest rate declared for FY 2024-25 — a fixed synthetic constant, not a forecast or guarantee of future rates. The synthetic persona's current age (34, used only for this illustration) is not modelled on the member record.

- [EPFO: Employees' Pension Scheme, 1995 handbook](https://www.epfindia.gov.in/site_docs/PDFs/EPFO_Rules-Regulations_PDFs/Handbook_EPS1995.pdf)
- [Press Information Bureau: Centre approves 8.25% EPF interest rate for 2024-25](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2234502&reg=48&lang=2)

## e-Nomination

EPFO's UAN portal offers e-Nomination (Form 2) and runs recurring public campaigns urging members to complete it, since an incomplete nomination delays a family's claim to PF, EPS, and EDLI insurance benefits after a member's death. The prototype models a synthetic nominee list with a deterministic rule (at least one nominee, each with a name and relationship, and shares summing to exactly 100%) through a new member self-service application method and audit event. It intentionally stays outside Claim Preflight's seven checks — a profile completeness meter on `/manage` counts it alongside the existing verifications instead.

- [EPFO: Process flow for filing the online nomination form](https://www.epfindia.gov.in/site_docs/PDFs/UAN_PDFs/UAN_ForMembers/ProcessFlow_FilingOnlineNominationForm.pdf)

## Broader reform context

- [Press Information Bureau: EPFO reforms and service improvements](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2136592&lang=2&reg=48)
