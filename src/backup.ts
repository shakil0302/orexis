/**
 * Backup file helpers, native side. The web app is the primary target; on
 * Android these report that the feature is unavailable rather than pulling in
 * a document picker.
 */
export async function downloadBackup(_json: string, _filename: string): Promise<boolean> {
  return false;
}

export async function pickBackup(): Promise<string | null> {
  return null;
}
