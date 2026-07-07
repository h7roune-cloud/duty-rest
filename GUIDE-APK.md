# 📱 Guide APK Android — Application 100% hors-ligne

Application compilable en APK **entièrement local** grâce à Capacitor, avec icône et écran de démarrage personnalisés.

> Développeur : **Ayoub Sadkouni** — 📧 sadkouni1@gmail.com

---

## ✅ Prérequis (une seule fois)

1. **Node.js 20+** → https://nodejs.org
2. **Android Studio** → https://developer.android.com/studio
3. **Java JDK 17**

---

## 🚀 Étapes complètes

### 1. Installer Capacitor + plugin Splash + générateur d'icônes

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen
npm install -D @capacitor/assets
```

### 2. Générer le build statique (app hors-ligne)

```bash
npm run build:spa
```

→ crée `dist-spa/index.html` avec tous les assets.

### 3. Ajouter la plateforme Android (première fois)

```bash
npx cap add android
```

> `capacitor.config.ts` est déjà configuré :
> - `appId: com.ayoub.conges`
> - `appName: Gestion Congés`
> - `webDir: dist-spa`
> - Splash screen bleu `#0EA5E9`, 1.5 s, plein écran

### 4. Générer icônes + splash screen pour toutes les tailles

Les images sources sont déjà fournies :
- `assets/icon.png` (1024×1024) — icône de l'app
- `assets/splash.png` (1920×1920) — écran de démarrage
- `assets/assets.config.json` — configuration des couleurs

Lancez la génération :

```bash
npx capacitor-assets generate --android
```

Cela crée automatiquement toutes les tailles requises par Android (mdpi → xxxhdpi, adaptive icons, splashscreens portrait/paysage) dans `android/app/src/main/res/`.

### 5. Synchroniser dans le projet Android

```bash
npx cap sync android
```

### 6. Ouvrir dans Android Studio

```bash
npx cap open android
```

### 7. Générer l'APK

Dans Android Studio :
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Notification → **locate** → `android/app/build/outputs/apk/debug/app-debug.apk`

### 8. Installer sur le téléphone

Copiez l'APK, ouvrez-le, autorisez "Sources inconnues", installez ✅
L'app démarre avec l'icône calendrier + splash bleu, puis fonctionne **sans Internet**.

---

## 🎨 Personnaliser icône ou splash

1. Remplacez `assets/icon.png` (1024×1024 PNG) et/ou `assets/splash.png` (2732×2732 PNG recommandé, minimum 1920×1920).
2. Ajustez les couleurs dans `assets/assets.config.json` et `capacitor.config.ts` (`backgroundColor`).
3. Relancez :

```bash
npx capacitor-assets generate --android
npx cap sync android
```

Puis rebuild dans Android Studio.

---

## 🔄 Mettre à jour le code de l'app

```bash
npm run build:spa
npx cap sync android
```

Puis rebuild APK dans Android Studio.

---

## 🏷️ Changer le nom affiché

Modifiez `appName` dans `capacitor.config.ts`, puis :

```bash
npx cap sync android
```

Ou éditez directement `android/app/src/main/res/values/strings.xml` :

```xml
<string name="app_name">Gestion Congés</string>
```

---

## 🔐 APK signé (Play Store)

Dans Android Studio : **Build → Generate Signed Bundle / APK** → APK → créez un keystore (à conserver précieusement !) → **release** → Finish.
APK signé dans `android/app/release/`.

---

## ❓ Problèmes fréquents

| Problème | Solution |
|---|---|
| `capacitor-assets: command not found` | `npm install -D @capacitor/assets` puis relancer avec `npx` |
| Icône par défaut Android affichée | Vérifier que `npx capacitor-assets generate --android` a bien été exécuté APRÈS `npx cap add android` |
| Splash blanc au lieu de bleu | Relancer `npx cap sync android` après modification de `capacitor.config.ts` |
| "SDK not found" | Android Studio → SDK Manager → installer Android SDK 34 |
| Écran blanc dans l'app | Vérifier `dist-spa/index.html`, relancer `npx cap sync android` |
| Erreur Java | Installer JDK 17, redémarrer Android Studio |

---

## 📞 Support

**Ayoub Sadkouni** — 📧 sadkouni1@gmail.com
