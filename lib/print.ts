const waitForPrintAssets = async (printWindow: Window) => {
  const images = Array.from(printWindow.document.images);
  if (images.length === 0) return;

  await Promise.race([
    Promise.all(images.map((image) => (
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    ))),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ]);
};

const writePrintDocument = (printWindow: Window, documentHtml: string) => {
  printWindow.document.open();
  printWindow.document.write(documentHtml);
  printWindow.document.close();
};

const createHiddenPrintFrame = () => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  frame.style.right = '0';
  frame.style.bottom = '0';
  document.body.appendChild(frame);
  return frame;
};

export const printDocumentInHiddenFrame = async (documentHtml: string) => {
  const frame = createHiddenPrintFrame();
  const printWindow = frame.contentWindow;

  if (!printWindow) {
    frame.remove();
    throw new Error('Unable to start print. Please try again.');
  }

  const cleanup = () => {
    if (!frame.isConnected) return;
    frame.remove();
  };

  let cleaned = false;
  const cleanupOnce = () => {
    if (cleaned) return;
    cleaned = true;
    cleanup();
  };

  const cleanupTimeoutId = window.setTimeout(cleanupOnce, 12_000);
  printWindow.addEventListener('afterprint', cleanupOnce, { once: true });

  try {
    writePrintDocument(printWindow, documentHtml);
    await waitForPrintAssets(printWindow);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    cleanupOnce();
    throw error;
  } finally {
    window.setTimeout(() => {
      window.clearTimeout(cleanupTimeoutId);
      cleanupOnce();
    }, 1_000);
  }
};
