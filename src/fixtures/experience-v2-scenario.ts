import { evaluateAdvancePolicy } from "@/domain/advance-policy";
import { expectedContributionFromWage } from "@/domain/contribution-health";
import type { EcrRow, ExperienceV2State } from "@/domain/experience-v2";
import type { Member } from "@/domain/schemas";

const CREATED_AT = "2026-08-26T05:01:00.000Z";
const EMPLOYER_ID = "employer-demo-systems";
const EMPLOYMENT_ID = "employment-demo-systems";

const PEOPLE = [
  "Riya Mehta", "Arjun Verma", "Meera Shah", "Vikram Nair", "Aarav Sharma",
  "Neha Singh", "Kabir Rao", "Pooja Iyer", "Dev Patel", "Anjali Desai",
  "Nikhil Bose", "Sara Khan", "Ishaan Reddy", "Tanvi Joshi", "Rahul Das",
  "Kavya Menon", "Rohan Gupta", "Diya Kapoor", "Aditya Sen", "Mira Thomas",
  "Varun Shah", "Aisha Rao", "Yash Kulkarni", "Naina Bhat", "Karan Sethi",
  "Ira Malhotra", "Om Prakash", "Sana Ali", "Neil Dutta", "Tara Pillai",
  "Aryan Jain", "Leena George", "Manav Arora", "Isha Banerjee", "Harsh Vora",
  "Zoya Mirza", "Aman Roy", "Gauri Naik", "Jay Shah", "Kiara Lal",
  "Rishi Sood", "Myra Paul", "Dhruv Gill", "Aanya Bose", "Veer Shetty",
  "Sia Anand", "Reyansh Rao", "Navya Mistry", "Aarohi Nair", "Krish Balan",
];

function contribution(
  month: string,
  postingStatus: ExperienceV2State["contributions"][number]["postingStatus"] = "POSTED",
) {
  const wageBasisPaise = 1_800_000;
  const expected = expectedContributionFromWage(wageBasisPaise);
  const isMarch = month === "2026-03";
  return {
    id: `contribution-${month}`,
    memberId: "member-aarav",
    employmentId: EMPLOYMENT_ID,
    employerId: EMPLOYER_ID,
    employerName: "Demo Systems Pvt Ltd",
    month,
    employeeContributionPaise: expected.employeePaise,
    employerEpfContributionPaise: isMarch ? 0 : expected.employerPaise,
    epsContributionPaise: expected.epsPaise,
    wageBasisPaise,
    postingStatus,
    postedAt: `${month}-28T06:30:00.000Z`,
    sourceEcrId: null,
    explanation: isMarch
      ? "The employee share and EPS are present, but the expected employer EPF contribution is missing."
      : postingStatus === "RECONCILED"
        ? "This contribution was corrected and reconciled with the synthetic employer record."
        : "The contribution is posted and matches the deterministic wage rule.",
  };
}

function createEcrRows(): EcrRow[] {
  return PEOPLE.map((employee, index) => {
    const wageRupees = 18_000 + (index % 9) * 2_500;
    const wagePaise = wageRupees * 100;
    const expected = expectedContributionFromWage(wagePaise);
    const row: EcrRow = {
      id: `ecr-row-${String(index + 1).padStart(2, "0")}`,
      employee,
      memberId: index === 4 ? "member-aarav-mismatch" : `member-payroll-${index + 1}`,
      uanMasked: `DEMO-••••-${String(1800 + index * 37).slice(-4)}`,
      wagePaise,
      employeeContributionPaise: expected.employeePaise,
      employerContributionPaise: expected.employerPaise,
      epsContributionPaise: expected.epsPaise,
      status: "READY",
      issues: [],
    };

    if (index === 2) {
      row.employeeContributionPaise -= 30_000;
      row.employerContributionPaise -= 30_000;
      row.status = "ISSUE";
      row.issues = [{
        code: "UNEXPECTED_CONTRIBUTION",
        field: "employeeContributionPaise",
        message: "Employee and employer contributions are below the deterministic 12% wage rule.",
        expectedPaise: expected.employeePaise,
      }];
    }
    if (index === 4) {
      row.status = "ISSUE";
      row.issues = [{
        code: "EMPLOYMENT_RECORD_MISMATCH",
        field: "memberId",
        message: "The synthetic member is not linked to an active employer record.",
        expectedPaise: null,
      }];
    }
    if (index === 6) {
      row.status = "ISSUE";
      row.issues = [{
        code: "DUPLICATE_EMPLOYEE",
        field: "uanMasked",
        message: "A duplicate synthetic payroll row was detected.",
        expectedPaise: null,
      }];
    }
    return row;
  });
}

export function createExperienceV2Scenario(member: Member): ExperienceV2State {
  const contributions = [
    contribution("2026-01"),
    contribution("2026-02"),
    contribution("2026-03", "MISMATCH"),
    contribution("2026-04"),
    contribution("2026-05", "RECONCILED"),
    contribution("2026-06"),
    contribution("2026-07"),
  ];
  const ecrRows = createEcrRows();

  return {
    contributions,
    memberActivities: [
      {
        id: "activity-march-attention",
        type: "ACCOUNT_ATTENTION",
        title: "March employer contribution needs review",
        detail: "The employer EPF amount is lower than the deterministic expectation.",
        timestamp: "2026-04-02T06:30:00.000Z",
        amountPaise: null,
        href: "/passbook?month=2026-03",
      },
      {
        id: "activity-july-posted",
        type: "CONTRIBUTION_POSTED",
        title: "July contribution posted",
        detail: "Demo Systems Pvt Ltd posted the monthly contribution.",
        timestamp: "2026-07-28T06:30:00.000Z",
        amountPaise: 432_000,
        href: "/passbook",
      },
    ],
    advance: evaluateAdvancePolicy({
      member,
      goal: "MEDICAL",
      latestWageBasisPaise: 2_400_000,
      requestedAmountPaise: 6_500_000,
      now: CREATED_AT,
    }),
    transfer: {
      id: "transfer-demo-001",
      memberId: member.id,
      previousEmploymentId: EMPLOYMENT_ID,
      currentEmploymentId: "employment-nextgen-labs",
      amountPaise: 16_440_000,
      state: "DRAFT",
      checks: [
        { id: "SAME_UAN", label: "Same UAN", status: "PASS", explanation: "Both synthetic member records use the same masked UAN." },
        { id: "PREVIOUS_EXIT", label: "Previous Date of Exit", status: "PASS", explanation: "The previous employment exit is available in this transfer scenario." },
        { id: "NEW_EMPLOYMENT", label: "New employment linked", status: "PASS", explanation: "NextGen Labs is linked to the same synthetic UAN." },
        { id: "IDENTITY", label: "Identity verified", status: "PASS", explanation: "Identity is verified." },
        { id: "BANK", label: "Bank verified", status: "PASS", explanation: "The masked bank account is verified." },
        { id: "PREVIOUS_RECORD", label: "Previous service record correction", status: "BLOCK", explanation: "The previous employer must align the service record before submission." },
      ],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      submittedAt: null,
    },
    ecrs: [{
      id: "ecr-2026-08",
      employerId: EMPLOYER_ID,
      month: "2026-08",
      filename: "august_payroll_demo.csv",
      state: "NEEDS_CORRECTION",
      rows: ecrRows,
      totalContributionPaise: ecrRows.reduce((sum, row) => sum + row.employeeContributionPaise + row.employerContributionPaise + row.epsContributionPaise, 0),
      challanId: null,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }],
    pastClaims: [
      { id: "claim-past-019", type: "FORM_19", label: "Final PF settlement", amountPaise: 11_000_000, submittedAt: "2024-02-04T05:00:00.000Z", completedAt: "2024-02-10T05:00:00.000Z", state: "CREDITED" },
      { id: "claim-past-031", type: "FORM_31", label: "Education advance", amountPaise: 2_400_000, submittedAt: "2022-07-27T05:00:00.000Z", completedAt: "2022-08-02T05:00:00.000Z", state: "CREDITED" },
    ],
  };
}
