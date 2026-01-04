/**
 * Preview Action Utilities
 * Copy, download, and other actions for preview panels
 */

/**
 * Copy code to clipboard
 */
export function copyToClipboard(code: string): Promise<void> {
  return navigator.clipboard.writeText(code).then(() => {
    showToast('✓ Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`✓ Downloaded ${filename}`, 'success');
}

/**
 * Download multiple files as ZIP
 */
export async function downloadZip(files: Array<{ path: string; content: string }>, projectName: string): Promise<void> {
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.path, file.content);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Downloaded project files', 'success');
  } catch (error) {
    console.error('Failed to create ZIP:', error);
    showToast('Failed to download ZIP', 'error');
  }
}

/**
 * Show toast notification
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `preview-toast preview-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('preview-toast-show');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('preview-toast-show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * Open external link
 */
export function openLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

