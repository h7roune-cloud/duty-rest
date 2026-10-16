// Saves a file: on Android (Capacitor) writes to Documents and opens the share sheet;
// in a browser triggers a normal download. Returns where the file was saved.
export async function saveFile(blob: Blob, filename: string): Promise<string> {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    const res = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: filename, url: res.uri, dialogTitle: "Enregistrer / partager" });
    } catch {
      /* user cancelled share — file is still saved */
    }
    return `Documents/${filename}`;
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
