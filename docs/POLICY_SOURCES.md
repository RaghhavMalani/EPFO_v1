# Policy sources and prototype interpretation

Checked on 26 August 2026. These sources inform synthetic routing and interface copy only. EPFO One does not provide legal eligibility advice, reproduce the live portals, or connect to any public system.

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

## Broader reform context

- [Press Information Bureau: EPFO reforms and service improvements](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2136592&lang=2&reg=48)
