// Saves a file.
// - Android (Capacitor): writes the file to the app cache (always allowed, no
//   permission needed), tries a best-effort copy to Documents, then opens the
//   share sheet so the user can save it to Files / Drive / WhatsApp / e-mail.
// - Browser: triggers a normal download.
// Returns a human-readable location.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error ?? new Error("Lecture du fichier impossible"));
    r.readAsDataURL(blob);
  });
}

export async function saveFile(blob: Blob, filename: string): Promise<string> {
  const { Capacitor } = await import("@capacitor/core");

  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error(
        "Plugin Filesystem absent de l'APK : lancez « npm install » puis « npx cap sync android » et reconstruisez l'APK.",
      );
    }
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const data = await blobToBase64(blob);

    // 1) Cache: always writable, used for sharing.
    const cached = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    // 2) Best-effort permanent copy in Documents (may be refused on some Android versions).
    let location = "";
    try {
      await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
      location = `Documents/${filename}`;
    } catch {
      /* ignore — the share sheet below lets the user choose where to save */
    }

    // 3) Share sheet: "Enregistrer dans Fichiers", Drive, WhatsApp, e-mail…
    if (Capacitor.isPluginAvailable("Share")) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: filename,
          files: [cached.uri],
          dialogTitle: "Enregistrer / partager",
        });
      } catch {
        /* user cancelled the share sheet */
      }
    } else if (!location) {
      throw new Error(
        "Plugin Share absent de l'APK : lancez « npx cap sync android » et reconstruisez l'APK.",
      );
    }
    return location || "Partage";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "Téléchargements";
}

export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return String(e ?? "");
}
