'use client';

type ConnectStep = 1 | 2 | 3 | 4;

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: ConnectStep;
  storeDomain: string;
  onStoreDomainChange: (value: string) => void;
  onStartConnect: () => void;
  domainError: string;
  isCheckingDomain: boolean;
  authorizationCode: string;
  authorizationUrl: string;
  copyCodeText: string;
  timeLeft: number;
  isAuthorizing: boolean;
  isCreatingApp: boolean;
  isListingOrgs: boolean;
  authorizationError: string;
  onCopyCode: () => void;
  onCopyAuthorizationUrl: () => void;
  onAuthorize: () => void;
  onBackToStepOne: () => void;
  isInstalling: boolean;
  installUrl: string;
  onInstall: () => void;
  onCopyInstallUrl: () => void;
  onStartOver: () => void;
}

function formatTimeLeft(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function StepPill({ step, active, done }: { step: number; active: boolean; done: boolean }) {
  return (
    <div
      className={[
        'h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center',
        done ? 'bg-green-100 text-green-700' : active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500',
      ].join(' ')}
    >
      {step}
    </div>
  );
}

export default function AddStoreModal({
  isOpen,
  onClose,
  currentStep,
  storeDomain,
  onStoreDomainChange,
  onStartConnect,
  domainError,
  isCheckingDomain,
  authorizationCode,
  authorizationUrl,
  copyCodeText,
  timeLeft,
  isAuthorizing,
  isCreatingApp,
  isListingOrgs,
  authorizationError,
  onCopyCode,
  onCopyAuthorizationUrl,
  onAuthorize,
  onBackToStepOne,
  isInstalling,
  installUrl,
  onInstall,
  onCopyInstallUrl,
  onStartOver,
}: AddStoreModalProps) {
  if (!isOpen) return null;

  const isBusy = isAuthorizing || isCreatingApp || isListingOrgs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Connect Shopify Store</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <StepPill step={1} active={currentStep === 1} done={currentStep > 1} />
            <div className="h-px flex-1 bg-gray-200" />
            <StepPill step={2} active={currentStep === 2} done={currentStep > 2} />
            <div className="h-px flex-1 bg-gray-200" />
            <StepPill step={3} active={currentStep === 3} done={currentStep > 3} />
            <div className="h-px flex-1 bg-gray-200" />
            <StepPill step={4} active={currentStep === 4} done={false} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {currentStep === 1 && (
            <>
              <p className="text-sm text-gray-600">
                Enter your store URL or `*.myshopify.com` domain.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shopify Store Domain</label>
                <input
                  type="text"
                  placeholder="yourstore.myshopify.com or https://yourstore.com"
                  value={storeDomain}
                  onChange={(e) => onStoreDomainChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onStartConnect();
                  }}
                  disabled={isCheckingDomain}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {domainError && <p className="text-xs text-red-500 mt-1">{domainError}</p>}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <p className="text-sm text-gray-600">
                Authorize partner access to continue app creation for <span className="font-medium">{storeDomain}</span>.
              </p>
              <div className="rounded-lg bg-gray-900 text-white p-4 text-center">
                <p className="text-xs text-gray-300 mb-2">Authorization Code</p>
                <p className="font-mono text-2xl tracking-[0.25em]">{authorizationCode}</p>
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
              {authorizationError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authorizationError}
                </p>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <p className="text-sm text-gray-600">
                Shopify app is ready. Install it on <span className="font-medium">{storeDomain}</span>.
              </p>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 break-all">
                {installUrl}
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-3">
              <p className="text-sm text-green-800 font-medium">Store connected successfully.</p>
              <p className="text-xs text-green-700 mt-1">{storeDomain}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          {currentStep === 1 && (
            <>
              <button
                onClick={onClose}
                disabled={isCheckingDomain}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onStartConnect}
                disabled={isCheckingDomain}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCheckingDomain ? 'Checking...' : 'Continue'}
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                onClick={onBackToStepOne}
                disabled={isBusy}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Back
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
                disabled={isBusy || !authorizationUrl || !!authorizationError}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isBusy ? 'Authorizing...' : 'Authorize'}
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                onClick={onCopyInstallUrl}
                disabled={!installUrl}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Copy Link
              </button>
              <button
                onClick={onInstall}
                disabled={isInstalling || !installUrl}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isInstalling ? 'Waiting...' : 'Install App'}
              </button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <button
                onClick={onStartOver}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Connect Another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
