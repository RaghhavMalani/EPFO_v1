/**
 * Headline and label strings for the member journey, in English and Hindi.
 * An entry with no `hi` value — or a key not listed here at all — silently
 * falls back to English rather than shipping an unsure or garbled translation.
 */
export const dictionary: Record<string, { en: string; hi?: string }> = {
  // Navigation
  "nav.home": { en: "Home", hi: "होम" },
  "nav.passbook": { en: "Passbook", hi: "पासबुक" },
  "nav.employment": { en: "Employment", hi: "रोज़गार" },
  "nav.jobs": { en: "Jobs", hi: "रोज़गार" },
  "nav.services": { en: "Services", hi: "सेवाएं" },
  "nav.manage": { en: "Manage", hi: "प्रबंधन" },
  "nav.signOut": { en: "Sign out", hi: "साइन आउट" },
  "nav.demoControls": { en: "Demo controls", hi: "डेमो नियंत्रण" },

  // Login
  "login.brand": { en: "EPFO ONE", hi: "EPFO वन" },
  "login.subtitle": {
    en: "An independent, hackathon-built reimagining of member and employer PF services.",
    hi: "सदस्य और नियोक्ता पीएफ सेवाओं की एक स्वतंत्र, हैकाथॉन-निर्मित पुनर्कल्पना।",
  },
  "login.memberBadge": { en: "Member", hi: "सदस्य" },
  "login.employerBadge": { en: "Employer", hi: "नियोक्ता" },
  "login.passwordLabel": { en: "Password", hi: "पासवर्ड" },
  "login.useDemoCredentials": { en: "Use demo credentials", hi: "डेमो क्रेडेंशियल भरें" },
  "login.notice": {
    en: "Independent hackathon prototype · Synthetic data only — never enter real credentials.",
    hi: "स्वतंत्र हैकाथॉन प्रोटोटाइप · केवल सिंथेटिक डेटा — असली क्रेडेंशियल कभी न भरें।",
  },

  // Home
  "home.subtitle": {
    en: "Your PF position, what changed recently, and anything that needs you.",
    hi: "आपकी पीएफ स्थिति, हाल के बदलाव, और आपके ध्यान देने योग्य बातें।",
  },
  "home.openServices": { en: "Open PF services", hi: "पीएफ सेवाएं खोलें" },
  "home.contributionsHeading": { en: "Recent contributions", hi: "हाल के अंशदान" },
  "home.servicesHeading": { en: "PF services", hi: "पीएफ सेवाएं" },
  "home.activityHeading": { en: "Recent activity", hi: "हाल की गतिविधि" },
  "home.readinessHeading": { en: "Final settlement readiness", hi: "अंतिम निपटान तैयारी" },

  // Online Services
  "onlineServices.title": { en: "Online Services", hi: "ऑनलाइन सेवाएं" },
  "onlineServices.description": {
    en: "Choose a service by outcome. Each available journey explains the form, readiness, and responsible party before you act.",
    hi: "परिणाम के अनुसार सेवा चुनें। हर उपलब्ध सेवा में फॉर्म, तैयारी और जिम्मेदार पक्ष पहले से स्पष्ट है।",
  },

  // Withdraw (Form 19)
  "withdraw.title": { en: "Final PF settlement", hi: "अंतिम पीएफ निपटान" },
  "withdraw.preflightTitle": { en: "Final settlement readiness", hi: "अंतिम निपटान तैयारी" },
  "withdraw.reviewTitle": { en: "Review your synthetic claim", hi: "अपना सिंथेटिक दावा जांचें" },

  // Passbook
  "passbook.title": { en: "Passbook", hi: "पासबुक" },
  "passbook.subtitle": {
    en: "Every month filed against your UAN, and what the contribution health check found.",
    hi: "आपके UAN के विरुद्ध दर्ज हर महीना, और अंशदान स्वास्थ्य जांच का परिणाम।",
  },
  "passbook.whereMoneyGoes": { en: "Where does my money go?", hi: "मेरा पैसा कहाँ जाता है?" },

  // Pension
  "pension.title": { en: "Pension and retirement projection", hi: "पेंशन और सेवानिवृत्ति अनुमान" },
  "pension.corpusAtRetirement": { en: "Projected corpus at age", hi: "इस आयु पर अनुमानित निधि" },

  // Manage
  "manage.title": { en: "Profile and PF records", hi: "प्रोफ़ाइल और पीएफ रिकॉर्ड" },
  "manage.completeness": { en: "Profile completeness", hi: "प्रोफ़ाइल पूर्णता" },
};

export type DictionaryKey = keyof typeof dictionary;
