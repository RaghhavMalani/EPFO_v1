import { evaluateAdvancePolicy } from "@/domain/advance-policy";
import { expectedContributionFromWage } from "@/domain/contribution-health";
import { deriveEcrValidationState } from "@/domain/ecr-machine";
import { calculateEcrTotal, validateEcrRows, type RawSyntheticPayrollRow } from "@/domain/ecr-engine";
import type { Contribution, ExperienceV2State } from "@/domain/experience-v2";
import type { Member } from "@/domain/schemas";

const CREATED_AT = "2026-08-26T05:01:00.000Z";
const EMPLOYER_ID = "employer-demo-systems";
const EMPLOYMENT_ID = "employment-demo-systems";
const TRANSFER_SOURCE_EMPLOYMENT_ID = "employment-demo-logistics";
export const WAGE_BASIS_PAISE = 1_800_000;

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

/** Row indices in `PEOPLE` that carry a deliberately seeded ECR defect. */
export const SEEDED_ECR_DEFECTS = {
  contributionMismatch: 2,
  employmentMismatch: 4,
  duplicateEmployee: 6,
  missingUan: 8,
  missingWage: 10,
} as const;

const MISMATCHED_MEMBER_ID = "member-aarav-unlinked";

function contribution(
  month: string,
  postingStatus: Contribution["postingStatus"] = "POSTED",
): Contribution {
  const expected = expectedContributionFromWage(WAGE_BASIS_PAISE);
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
    wageBasisPaise: WAGE_BASIS_PAISE,
    postingStatus,
    // The delayed month was posted well after the expected posting date.
    postedAt: postingStatus === "DELAYED" ? "2026-07-19T09:15:00.000Z" : `${month}-28T06:30:00.000Z`,
    sourceEcrId: null,
    explanation: isMarch
      ? "The employee share and EPS are present, but the expected employer EPF contribution is missing."
      : postingStatus === "RECONCILED"
        ? "This contribution was corrected and reconciled with the synthetic employer record."
        : postingStatus === "DELAYED"
          ? "The employer posted this month after the expected posting date."
          : "The contribution is posted and matches the deterministic wage rule.",
  };
}

function createRawPayrollRows(): RawSyntheticPayrollRow[] {
  return PEOPLE.map((employee, index) => {
    const wageRupees = 18_000 + (index % 9) * 2_500;
    const wagePaise = wageRupees * 100;
    const expected = expectedContributionFromWage(wagePaise);
    const row: RawSyntheticPayrollRow = {
      id: `ecr-row-${String(index + 1).padStart(2, "0")}`,
      employee,
      memberId: `member-payroll-${index + 1}`,
      uanMasked: `DEMO-••••-${String(1800 + index * 37).slice(-4)}`,
      wagePaise,
      employeeContributionPaise: expected.employeePaise,
      employerContributionPaise: expected.employerPaise,
      epsContributionPaise: expected.epsPaise,
    };

    // Contributions fall short of the deterministic 12% rule.
    if (index === SEEDED_ECR_DEFECTS.contributionMismatch) {
      row.employeeContributionPaise -= 30_000;
      row.employerContributionPaise -= 30_000;
    }
    // The shared member is present under a member id that is not linked to an
    // employment record, but carries the masked UAN that identifies them.
    if (index === SEEDED_ECR_DEFECTS.employmentMismatch) {
      row.memberId = MISMATCHED_MEMBER_ID;
      row.uanMasked = "DEMO-XXXX-4821";
    }
    // A genuine repeat of the preceding row's masked UAN.
    if (index === SEEDED_ECR_DEFECTS.duplicateEmployee) {
      row.uanMasked = `DEMO-••••-${String(1800 + (index - 1) * 37).slice(-4)}`;
    }
    if (index === SEEDED_ECR_DEFECTS.missingUan) {
      row.uanMasked = "";
    }
    // No wage basis, so no contribution can be derived for this row.
    if (index === SEEDED_ECR_DEFECTS.missingWage) {
      row.wagePaise = 0;
      row.employeeContributionPaise = 0;
      row.employerContributionPaise = 0;
      row.epsContributionPaise = 0;
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
    contribution("2026-06", "DELAYED"),
    contribution("2026-07"),
  ];

  const isLinkedMember = (memberId: string) =>
    memberId === member.id || /^member-payroll-\d+$/.test(memberId);
  const ecrRows = validateEcrRows(createRawPayrollRows(), isLinkedMember);

  const transferSource = member.employments.find((record) => record.id === TRANSFER_SOURCE_EMPLOYMENT_ID);
  if (!transferSource) {
    throw new Error(`The synthetic transfer source ${TRANSFER_SOURCE_EMPLOYMENT_ID} is missing from the member record.`);
  }

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
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      requestedAmountPaise: 4_000_000,
      now: CREATED_AT,
    }),
    transfer: {
      id: "transfer-demo-001",
      memberId: member.id,
      previousEmploymentId: TRANSFER_SOURCE_EMPLOYMENT_ID,
      currentEmploymentId: EMPLOYMENT_ID,
      amountPaise: transferSource.pfBalancePaise,
      state: "DRAFT",
      checks: [
        { id: "SAME_UAN", label: "Same UAN", status: "PASS", explanation: "Both synthetic member records use the same masked UAN." },
        { id: "PREVIOUS_EXIT", label: "Previous Date of Exit", status: "PASS", explanation: "The previous employment exit is recorded in the synthetic PF record." },
        { id: "TARGET_EMPLOYMENT", label: "Receiving record linked", status: "PASS", explanation: "Demo Systems Pvt Ltd is linked to the same synthetic UAN." },
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
      state: deriveEcrValidationState(ecrRows),
      rows: ecrRows,
      totalContributionPaise: calculateEcrTotal(ecrRows),
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
