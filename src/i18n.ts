import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Define translations directly as objects to avoid relative path errors
const enTranslations = {
  translation: {
    "store_details": "Store Details",
    "store_name": "Store Name",
    "tagline": "Tagline",
    "save_profile": "Save Profile",
    "account_verified": "Account Verified"
  }
};

const mrTranslations = {
  translation: {
    "store_details": "दुकान तपशील",
    "store_name": "दुकानाचे नाव",
    "tagline": "घोषवाक्य / टॅगलाइन",
    "save_profile": "प्रोफाइल जतन करा",
    "account_verified": "खाते सत्यापित झाले"
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
      mr: mrTranslations,
    },
    lng: "en", // Default system language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already safe-guards against XSS holes
    },
  });

export default i18n;