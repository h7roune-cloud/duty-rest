# 📱 Guide APK Android — Application 100% hors-ligne

Cette application peut maintenant être compilée en APK **entièrement local** (aucune connexion Internet requise) grâce à Capacitor.

> Développeur : **Ayoub Sadkouni** — 📧 sadkouni1@gmail.com

---

## ✅ Prérequis (une seule fois)

1. **Node.js 20+** → https://nodejs.org
2. **Android Studio** → https://developer.android.com/studio
3. **Java JDK 17** (souvent installé avec Android Studio)

---

## 🚀 Étapes (depuis la racine du projet)

### 1. Installer Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Générer le build statique SPA

```bash
npm run build:spa
```

Cela crée un dossier `dist-spa/` contenant `index.html` + assets — l'app complète, hors-ligne.

### 3. Ajouter la plateforme Android (première fois seulement)

```bash
npx cap add android
```

> `capacitor.config.ts` est déjà configuré (`webDir: "dist-spa"`, `appId: com.ayoub.conges`).

### 4. Synchroniser les fichiers dans le projet Android

```bash
npx cap sync android
```

### 5. Ouvrir dans Android Studio

```bash
npx cap open android
```

### 6. Générer l'APK

Dans Android Studio :
1. Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Attendez la compilation (2–5 min la première fois)
3. Cliquez sur **locate** dans la notification
4. Fichier : `android/app/build/outputs/apk/debug/app-debug.apk`

### 7. Installer sur téléphone

Copiez l'APK sur votre Android → ouvrez → autorisez "Sources inconnues" → installez ✅

L'application fonctionne **sans Internet**.

---

## 🔄 Mettre à jour l'app plus tard

Après chaque modification :

```bash
npm run build:spa
npx cap sync android
```

Puis rebuild dans Android Studio (étape 6).

---

## 🎨 Personnalisation

- **Icône** : clic droit sur `android/app/src/main/res` → **New → Image Asset** → Launcher Icons
- **Nom affiché** : `android/app/src/main/res/values/strings.xml` → `<string name="app_name">…</string>`
- **ID de l'app** : modifier `appId` dans `capacitor.config.ts` avant `npx cap add android`

---

## 🔐 APK signé (Play Store)

Dans Android Studio : **Build → Generate Signed Bundle / APK** → APK → créez un keystore → **release** → Finish.
APK : `android/app/release/`

---

## ❓ Problèmes fréquents

| Problème | Solution |
|---|---|
| "SDK not found" | Android Studio → SDK Manager → installer Android SDK 34 |
| Écran blanc | Vérifiez que `npm run build:spa` a bien produit `dist-spa/index.html`, puis relancez `npx cap sync android` |
| Erreur Java | Installez JDK 17, redémarrez Android Studio |
| Données perdues | L'app utilise le `localStorage` du WebView — sauvegardez via l'export Excel avant réinstallation |

---

## 📞 Support

**Ayoub Sadkouni** — 📧 sadkouni1@gmail.com
