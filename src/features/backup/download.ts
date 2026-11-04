/** Offers `data` as a JSON file download named `fileName`. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoke after the click has started the download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
