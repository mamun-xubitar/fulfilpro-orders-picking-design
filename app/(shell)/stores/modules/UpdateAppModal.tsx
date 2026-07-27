'use client';

interface UpdateAppModalProps {
  isOpen: boolean;
  storeName: string;
  userCode: string;
  authorizationUrl: string;
  copyCodeText: string;
  timeLeft: number;
  isStarting: boolean;
  isAuthorizing: boolean;
  isUpdating: boolean;
  error: string;
  done: boolean;
  onCopyCode: () => void;
  onCopyAuthorizationUrl: () => void;
  onAuthorize: () => void;
  onClose: () => void;
}

function formatTimeLeft(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function UpdateAppModal({
  isOpen,
  storeName,
  userCode,
  authorizationUrl,
  copyCodeText,
  timeLeft,
  isStarting,
  isAuthorizing,
  isUpdating,
  error,
  done,
  onCopyCode,
  onCopyAuthorizationUrl,
  onAuthorize,
  onClose,
}: UpdateAppModalProps) {
  if (!isOpen) return null;

  const isBusy = isStarting || isAuthorizing || isUpdating;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 md:px-6">
          <h2 className="text-base font-semibold text-gray-900">Update App</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-5 space-y-4 md:px-6">
          {!done && !isUpdating && (
            <>
              <p className="text-sm text-gray-600">
                Authorize partner access to publish an updated app version for{' '}
                <span className="font-medium">{storeName}</span>.
              </p>
              <div className="rounded-lg bg-gray-900 text-white p-4 text-center">
                <p className="text-xs text-gray-300 mb-2">Authorization Code</p>
                <p className="break-all font-mono text-xl tracking-[0.18em] sm:text-2xl sm:tracking-[0.25em]">{userCode}</p>
                <button
                  onClick={onCopyCode}
                  className="mt-3 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/20 text-xs"
                >
                  {copyCodeText}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Code expires in {formatTimeLeft(timeLeft)}
              </p>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}

          {isUpdating && !done && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-sm text-blue-800 font-medium">Updating app scopes and URLs…</p>
            </div>
          )}

          {done && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-3">
              <p className="text-sm text-green-800 font-medium">App updated successfully.</p>
              <p className="text-xs text-green-700 mt-1">{storeName}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 px-4 py-4 border-t border-gray-200 sm:flex-row sm:justify-end md:px-6">
          {done ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isBusy && isUpdating}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onCopyAuthorizationUrl}
                disabled={!authorizationUrl}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Copy URL
              </button>
              <button
                onClick={onAuthorize}
                disabled={isBusy || !authorizationUrl || !!error}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Updating…' : isAuthorizing ? 'Authorizing…' : 'Authorize'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
