import { firebaseConfig } from "./firebase-config.js";

const ownerEmail = "rayenrach41@gmail.com";
const button = document.querySelector("#import-curriculum");
const status = document.querySelector("#import-status");
let currentUser = null;

function isConfigured() {
    return ["apiKey", "authDomain", "projectId", "appId"].every(key => {
        const value = firebaseConfig[key];
        return typeof value === "string" && value && !value.startsWith("YOUR_");
    });
}

if (!isConfigured()) {
    status.textContent = "Add your Firebase Web app values to firebase-config.js first.";
} else {
    try {
        const appSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js");
        const authSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js");
        const firestoreSdk = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js");
        const app = appSdk.initializeApp(firebaseConfig);
        const auth = authSdk.getAuth(app);
        const db = firestoreSdk.getFirestore(app);

        authSdk.onAuthStateChanged(auth, user => {
            currentUser = user;
            const isOwner = user?.emailVerified && user.email.toLowerCase() === ownerEmail;
            button.disabled = !isOwner;
            status.textContent = isOwner
                ? "Owner verified. Ready to import lesson documents."
                : "Sign in on the main site with the verified platform owner email first.";
        });

        button.addEventListener("click", async () => {
            const curriculum = window.marketingCurriculum;
            if (!currentUser?.emailVerified || currentUser.email.toLowerCase() !== ownerEmail || !curriculum) return;
            button.disabled = true;
            status.textContent = "Importing curriculum...";
            try {
                const batch = firestoreSdk.writeBatch(db);
                for (const [courseId, translations] of Object.entries(curriculum)) {
                    batch.set(firestoreSdk.doc(db, "curriculum", courseId), translations);
                }
                await batch.commit();
                status.textContent = `Imported ${Object.keys(curriculum).length} course documents.`;
            } catch (error) {
                console.error("Curriculum import failed.", error);
                status.textContent = "Import failed. Check Firestore setup and security rules.";
                button.disabled = false;
            }
        });
    } catch (error) {
        console.error("Could not initialize the Firestore importer.", error);
        status.textContent = "Could not connect to Firebase. Check the Web app configuration.";
    }
}
