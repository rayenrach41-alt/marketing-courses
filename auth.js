import { firebaseConfig } from "./firebase-config.js";

const EMAIL_KEY = "midad-pending-email";
const NAME_KEY = "midad-pending-name";
const PREVIEW_KEY = "midad-local-preview";
const messages = {
    ar: {
        sending: "جارٍ إرسال رابط التأكيد...",
        sent: "بعثنالك رابط التأكيد. افتحه من نفس الجهاز باش تدخل للدروس.",
        verifying: "جارٍ التحقق من الرابط...",
        verified: "تم تأكيد بريدك وفتح الدروس.",
        enterEmail: "افتح الرابط من جهاز آخر؟ اكتب نفس البريد اللي سجّلت به:",
        emailRequired: "اكتب البريد الذي استقبل رابط التأكيد لإكمال الدخول.",
        invalidName: "اكتب اسمك ولقبك الحقيقيين، ثم أدخل بريدًا صحيحًا.",
        failed: "الرابط غير صالح أو انتهت صلاحيته. ابعث رابط تأكيد جديد.",
        setup: "يلزم إعداد Firebase أولاً. راجع خطوات الإعداد في README.",
        unavailable: "تعذّر الاتصال بخدمة التحقق. تأكد من إعداد Firebase واتصال الإنترنت.",
        noticeFailed: "تم تأكيد بريدك وفتح الدروس، لكن تعذّر إرسال إشعار التسجيل إلى المنصة.",
        contentUnavailable: "تم تأكيد البريد، لكن محتوى الدروس غير مهيأ في Firestore بعد.",
        demoAccess: "تم فتح الدروس في وضع المعاينة المحلي. البريد غير متحقق من ملكيته.",
        signOut: "تسجيل الخروج",
        signedOut: "تم تسجيل الخروج."
    },
    en: {
        sending: "Sending your verification link...",
        sent: "We sent a verification link. Open it on this device to access the lessons.",
        verifying: "Verifying your link...",
        verified: "Your email is verified and the lessons are unlocked.",
        enterEmail: "Opened the link on another device? Enter the same email you registered with:",
        emailRequired: "Enter the email address that received the link to finish signing in.",
        invalidName: "Enter your first and last name, then use a valid email address.",
        failed: "That link is invalid or expired. Request a new verification link.",
        setup: "Firebase must be configured first. See the setup steps in README.",
        unavailable: "Verification is unavailable. Check Firebase setup and your internet connection.",
        noticeFailed: "Your email is verified and lessons are unlocked, but the platform could not be notified.",
        contentUnavailable: "Your email is verified, but the lesson content is not set up in Firestore yet.",
        demoAccess: "Lessons opened in local preview mode. Email ownership has not been verified.",
        signOut: "Sign out",
        signedOut: "You are signed out."
    },
    fr: {
        sending: "Envoi du lien de vérification...",
        sent: "Le lien est envoyé. Ouvrez-le sur cet appareil pour accéder aux cours.",
        verifying: "Vérification du lien...",
        verified: "Votre adresse est confirmée et les cours sont débloqués.",
        enterEmail: "Lien ouvert sur un autre appareil ? Saisissez la même adresse e-mail :",
        emailRequired: "Saisissez l'adresse qui a reçu le lien pour terminer la connexion.",
        invalidName: "Saisissez votre prénom et nom, puis une adresse e-mail valide.",
        failed: "Ce lien est invalide ou expiré. Demandez un nouveau lien de vérification.",
        setup: "Firebase doit d'abord être configuré. Consultez les étapes dans README.",
        unavailable: "Vérification indisponible. Vérifiez Firebase et votre connexion Internet.",
        noticeFailed: "Votre adresse est confirmée et les cours sont débloqués, mais la plateforme n'a pas pu être avertie.",
        contentUnavailable: "Votre adresse est confirmée, mais les cours ne sont pas encore configurés dans Firestore.",
        demoAccess: "Cours ouverts en aperçu local. La propriété de l’adresse e-mail n’a pas été vérifiée.",
        signOut: "Se déconnecter",
        signedOut: "Vous êtes déconnecté."
    }
};

const form = document.querySelector("#signup-form");
const signupSection = document.querySelector("#register");
const status = document.querySelector("#signup-status");
const submitButton = document.querySelector("#signup-submit");
const signOutButton = document.querySelector("#auth-signout");

function currentMessages() {
    return messages[document.documentElement.lang] || messages.en;
}

function setStatus(key, isError = false) {
    status.textContent = currentMessages()[key];
    status.classList.toggle("is-error", isError);
}

window.addEventListener("midad-language-change", () => {
    signOutButton.textContent = currentMessages().signOut;
});

function isValidEmail(value) {
    const email = (value || "").trim();
    return email.length <= 254 && /^[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email);
}

function isValidFullName(value) {
    const trimmed = (value || "").trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const validPart = /^[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*$/u;
    return parts.length >= 2 && parts.every(part => validPart.test(part) && [...part.matchAll(/\p{L}/gu)].length >= 2);
}

function showSignupAfterSignOut() {
    form.reset();
    signupSection.hidden = false;
    window.location.hash = "#register";
}

function getSelectedLanguage() {
    const value = (localStorage.getItem("midad-language") || document.documentElement.lang || "ar").trim().toLowerCase();
    return ["ar", "en", "fr"].includes(value) ? value : "ar";
}

function notifyAuthState(user, curriculum = null) {
    window.dispatchEvent(new CustomEvent("midad-auth-state", {
        detail: { verified: Boolean(user?.emailVerified && curriculum), email: user?.email || "", curriculum }
    }));
}

async function loadCourseCurriculum(db, firestoreSdk) {
    const snapshot = await firestoreSdk.getDocs(firestoreSdk.collection(db, "curriculum"));
    const curriculum = Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]));
    if (!Object.keys(curriculum).length) throw new Error("No curriculum documents are available.");
    return curriculum;
}

function isConfigured() {
    return ["apiKey", "authDomain", "projectId", "appId"].every(key => {
        const value = firebaseConfig[key];
        return typeof value === "string" && value && !value.startsWith("YOUR_");
    });
}

function isLocalPreviewHost() {
    return ["localhost", "127.0.0.1"].includes(location.hostname);
}

function grantLocalPreviewAccess(email, curriculum) {
    if (!curriculum || !Object.keys(curriculum).length) {
        setStatus("contentUnavailable", true);
        return false;
    }

    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(PREVIEW_KEY, "true");
    window.dispatchEvent(new CustomEvent("midad-auth-state", {
        detail: { verified: true, email: "", curriculum }
    }));
    signupSection.hidden = true;
    signOutButton.hidden = false;
    signOutButton.textContent = currentMessages().signOut;
    history.replaceState(null, "", `${location.pathname}#courses`);
    setStatus("demoAccess");
    return true;
}

async function sendOwnerNotice(name, email, endpoint) {
    const payload = new FormData();
    payload.append("name", name);
    payload.append("email", email);
    payload.append("_subject", "تسجيل مؤكد في منصة مِداد");
    payload.append("_template", "table");
    const response = await fetch(endpoint, {
        method: "POST",
        body: payload,
        headers: { Accept: "application/json" }
    });
    const result = await response.json();
    if (!response.ok || result.success !== "true") throw new Error("Registration notice failed.");
}

async function initializeAuth() {
    const localPreviewCurriculum = window.marketingCurriculum;
    if (!isConfigured()) {
        const savedEmail = localStorage.getItem(EMAIL_KEY);
        const savedName = localStorage.getItem(NAME_KEY);
        if (isLocalPreviewHost() && localStorage.getItem(PREVIEW_KEY) === "true" && savedEmail && savedName) {
            if (typeof window.applyLanguage === "function") window.applyLanguage();
            grantLocalPreviewAccess(savedEmail, localPreviewCurriculum);
        } else {
            localStorage.removeItem(EMAIL_KEY);
            localStorage.removeItem(NAME_KEY);
            localStorage.removeItem(PREVIEW_KEY);
            notifyAuthState(null);
            signOutButton.hidden = true;
        }

        form.addEventListener("submit", event => {
            event.preventDefault();
            const name = form.elements.name.value.trim();
            const email = (form.elements.email.value || "").trim();
            const chosenLanguage = getSelectedLanguage();
            if (!isValidFullName(name) || !isValidEmail(email)) {
                setStatus("invalidName", true);
                return;
            }
            localStorage.setItem("midad-language", chosenLanguage);
            if (!isLocalPreviewHost()) {
                setStatus("setup", true);
                return;
            }
            localStorage.setItem(NAME_KEY, name);
            grantLocalPreviewAccess(email.toLowerCase(), localPreviewCurriculum);
        });

        signOutButton.addEventListener("click", () => {
            localStorage.removeItem(EMAIL_KEY);
            localStorage.removeItem(NAME_KEY);
            localStorage.removeItem(PREVIEW_KEY);
            notifyAuthState(null);
            signOutButton.hidden = true;
            setStatus("signedOut");
            showSignupAfterSignOut();
        });
        return;
    }

    if (localStorage.getItem(PREVIEW_KEY) === "true") {
        localStorage.removeItem(EMAIL_KEY);
        localStorage.removeItem(NAME_KEY);
        localStorage.removeItem(PREVIEW_KEY);
    }

    try {
        const appSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js");
        const authSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js");
        const firestoreSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js");
        const app = appSdk.initializeApp(firebaseConfig);
        const auth = authSdk.getAuth(app);
        const db = firestoreSdk.getFirestore(app);
        await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
        const endpoint = form.action;
        signOutButton.textContent = currentMessages().signOut;
        signOutButton.addEventListener("click", async () => {
            signOutButton.disabled = true;
            try {
                await authSdk.signOut(auth);
                notifyAuthState(null);
                setStatus("signedOut");
                showSignupAfterSignOut();
            } catch (error) {
                console.error("Could not sign out.", error);
                setStatus("unavailable", true);
            } finally {
                signOutButton.disabled = false;
            }
        });

        authSdk.onAuthStateChanged(auth, async user => {
            signOutButton.hidden = !user;
            signOutButton.textContent = currentMessages().signOut;
            if (!user?.emailVerified) {
                notifyAuthState(null);
                return;
            }
            try {
                const curriculum = await loadCourseCurriculum(db, firestoreSdk);
                notifyAuthState(user, curriculum);
                signupSection.hidden = true;
                history.replaceState(null, "", `${location.pathname}#courses`);
            } catch (error) {
                console.error("Could not load protected course content.", error);
                notifyAuthState(null);
                setStatus("contentUnavailable", true);
            }
        });

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const name = form.elements.name.value.trim();
            const email = form.elements.email.value.trim();
            if (!isValidFullName(name) || !isValidEmail(email)) {
                setStatus("invalidName", true);
                return;
            }
            submitButton.disabled = true;
            setStatus("sending");
            try {
                await authSdk.signOut(auth);
                notifyAuthState(null);
                await authSdk.sendSignInLinkToEmail(auth, email, {
                    url: `${location.origin}${location.pathname}`,
                    handleCodeInApp: true
                });
                localStorage.setItem(EMAIL_KEY, email.toLowerCase());
                localStorage.setItem(NAME_KEY, name);
                setStatus("sent");
            } catch (error) {
                console.error("Could not send Firebase sign-in link.", error);
                setStatus("unavailable", true);
            } finally {
                submitButton.disabled = false;
            }
        });

        if (authSdk.isSignInWithEmailLink(auth, location.href)) {
            let email = localStorage.getItem(EMAIL_KEY);
            if (!email) email = window.prompt(currentMessages().enterEmail)?.trim();
            if (!email) {
                setStatus("emailRequired", true);
                return;
            }

            setStatus("verifying");
            try {
                const credential = await authSdk.signInWithEmailLink(auth, email, location.href);
                if (!credential.user.emailVerified) throw new Error("Email was not verified.");
                const name = localStorage.getItem(NAME_KEY) || "";
                localStorage.removeItem(EMAIL_KEY);
                localStorage.removeItem(NAME_KEY);
                history.replaceState(null, "", `${location.pathname}#courses`);
                let curriculum;
                try {
                    curriculum = await loadCourseCurriculum(db, firestoreSdk);
                    notifyAuthState(credential.user, curriculum);
                } catch (error) {
                    console.error("Could not load protected course content.", error);
                    notifyAuthState(null);
                    setStatus("contentUnavailable", true);
                }
                try {
                    await sendOwnerNotice(name, credential.user.email, endpoint);
                    if (curriculum) setStatus("verified");
                } catch (error) {
                    console.error("Could not notify the platform email.", error);
                    if (curriculum) setStatus("noticeFailed", true);
                }
            } catch (error) {
                console.error("Could not complete Firebase email-link sign-in.", error);
                setStatus("failed", true);
            }
        }
    } catch (error) {
        console.error("Firebase Authentication could not start.", error);
        form.addEventListener("submit", event => {
            event.preventDefault();
            setStatus("unavailable", true);
        });
    }
}

initializeAuth();