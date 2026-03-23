// בדיקת זמינות שרת OTP
const CHECK_INTERVAL_MS = 2000;

/**
 * בודק אם שרת OTP זמין - שולח שאילתת GraphQL מינימלית
 */
export async function checkOtpReady(otpUrl) {
  try {
    const res = await fetch(otpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
    });
    // כל תגובה (כולל 400) אומרת ש-OTP רץ
    return res.status > 0;
  } catch {
    return false;
  }
}

/**
 * ממתין עד ש-OTP זמין, עם polling
 * מחזיר Promise שמתקיים כאשר OTP מוכן
 */
export function waitForOtp(otpUrl) {
  return new Promise((resolve) => {
    const tryConnect = async () => {
      if (await checkOtpReady(otpUrl)) {
        resolve(true);
        return;
      }
      setTimeout(tryConnect, CHECK_INTERVAL_MS);
    };
    tryConnect();
  });
}
