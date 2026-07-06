# 📱 Guide : Générer l'APK Android de l'application

Ce guide vous explique **étape par étape** comment transformer cette application web en fichier APK installable sur Android, via **Android Studio** et **Capacitor**.

> Développeur : **Ayoub Sadkouni** — 📧 sadkouni1@gmail.com

---

## ✅ Prérequis (à installer une seule fois)

1. **Node.js** (version 20 ou +) → https://nodejs.org
2. **Android Studio** (dernière version) → https://developer.android.com/studio
   - Pendant l'installation, cochez : *Android SDK*, *Android SDK Platform*, *Android Virtual Device*.
3. **Java JDK 17** (souvent installé automatiquement par Android Studio).
4. **Git** (facultatif) → https://git-scm.com

---

## 🚀 Méthode recommandée (la plus simple) — Wrapper l'app publiée

Puisque l'application est déjà publiée sur Lovable, on va simplement créer une "coquille" Android qui affiche votre site publié.

### Étape 1 — Créer un nouveau dossier de projet

Ouvrez un terminal (PowerShell / cmd / Terminal Mac) :

```bash
mkdir conges-apk
cd conges-apk
npm init -y
```

### Étape 2 — Installer Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Étape 3 — Initialiser Capacitor

```bash
npx cap init "Gestion Congés" "com.ayoub.conges" --web-dir=www
```

### Étape 4 — Créer un dossier `www` avec une page qui charge votre site

Créez un fichier `www/index.html` avec ce contenu :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Gestion des Congés</title>
  <style>
    html,body,iframe{margin:0;padding:0;height:100%;width:100%;border:0;background:#0f172a;}
  </style>
</head>
<body>
  <iframe src="https://duty-rest.lovable.app" allow="clipboard-read; clipboard-write; notifications"></iframe>
</body>
</html>
```

> Remplacez l'URL par votre URL publiée si elle change.

### Étape 5 — Ajouter la plateforme Android

```bash
npx cap add android
```

### Étape 6 — Ouvrir dans Android Studio

```bash
npx cap open android
```

Android Studio s'ouvre avec votre projet.

### Étape 7 — Générer l'APK

Dans Android Studio :

1. Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
2. Attendez la fin de la compilation (2 à 5 minutes la première fois).
3. Cliquez sur **locate** dans la notification qui apparaît.
4. Votre APK se trouve dans :
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Étape 8 — Installer sur votre téléphone

1. Copiez l'APK sur votre téléphone (câble USB, e-mail, Google Drive…).
2. Sur le téléphone, ouvrez le fichier → autorisez "Sources inconnues" si demandé.
3. Installez et lancez ✅

---

## 🎨 Personnaliser l'icône de l'app

1. Préparez une icône carrée **512×512 px** (PNG).
2. Dans Android Studio : clic droit sur `app/res` → **New** → **Image Asset**.
3. Choisissez **Launcher Icons**, sélectionnez votre PNG, cliquez **Next** → **Finish**.
4. Reconstruisez l'APK (Étape 7).

## 🏷️ Changer le nom affiché

Fichier : `android/app/src/main/res/values/strings.xml`

```xml
<string name="app_name">Gestion Congés</string>
```

---

## 🔐 Générer un APK signé (pour distribution / Play Store)

Dans Android Studio :

1. **Build** → **Generate Signed Bundle / APK**.
2. Choisissez **APK** → **Next**.
3. Cliquez **Create new…** pour créer une clé (keystore) — **gardez ce fichier et le mot de passe précieusement**.
4. Choisissez **release** → **Finish**.

L'APK signé se trouve dans `android/app/release/`.

---

## 🔄 Mettre à jour l'app plus tard

Comme l'APK charge le site publié, **toute mise à jour sur Lovable est automatique** — pas besoin de recompiler l'APK ✨.

Si vous voulez changer le nom, l'icône ou l'URL : refaites l'étape 7.

---

## ❓ Problèmes fréquents

| Problème | Solution |
|---|---|
| "SDK not found" | Ouvrez Android Studio → **SDK Manager** → installez **Android SDK 34** |
| Écran blanc dans l'app | Vérifiez que l'URL dans `www/index.html` est correcte et accessible |
| Build échoue avec erreur Java | Installez **JDK 17** et redémarrez Android Studio |
| APK trop gros | Utilisez **Build → Generate Signed Bundle** (format AAB, plus léger) |

---

## 📞 Support

Développeur : **Ayoub Sadkouni**
📧 sadkouni1@gmail.com
