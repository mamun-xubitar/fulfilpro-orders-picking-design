'use client';

import { useState, useEffect } from 'react';

type ConnectStep = 1 | 2 | 3 | 4;

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: ConnectStep;
  storeDomain: string;
  onStoreDomainChange: (value: string) => void;
  partnerStoreId: string;
  onPartnerStoreIdChange: (value: string) => void;
  partnerStores: Array<{ id: string; name: string | null; storeDomain: string }>;
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
  partnerUrl: string;
  onOpenPartnerUrl: () => void;
  onInstall: () => void;
  onCopyInstallUrl: () => void;
  onStartOver: () => void;
  appManagementTokenExpiresAt: string;
}

function formatTimeLeft(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTokenTimeLeft(seconds: number) {
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
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
  partnerStoreId,
  onPartnerStoreIdChange,
  partnerStores,
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
  partnerUrl,
  onOpenPartnerUrl,
  onInstall,
  onCopyInstallUrl,
  onStartOver,
  appManagementTokenExpiresAt,
}: AddStoreModalProps) {
  const [tokenTimeLeft, setTokenTimeLeft] = useState(0);
  const [imagePopup, setImagePopup] = useState<string | null>(null);
  const [isOpeningShopifyApp, setIsOpeningShopifyApp] = useState(false);

  useEffect(() => {
    if (!appManagementTokenExpiresAt || currentStep !== 3) return;
    
    const calculateTimeLeft = () => {
      const expiresAt = new Date(appManagementTokenExpiresAt).getTime();
      const now = Date.now();
      const diff = Math.floor((expiresAt - now) / 1000);
      return Math.max(0, diff);
    };

    setTokenTimeLeft(calculateTimeLeft());

    const timer = window.setInterval(() => {
      setTokenTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [appManagementTokenExpiresAt, currentStep]);

  useEffect(() => {
    if (currentStep !== 3) {
      setIsOpeningShopifyApp(false);
    }
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const isBusy = isAuthorizing || isCreatingApp || isListingOrgs;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 md:px-6">
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

        <div className="px-4 pt-4 pb-2 md:px-6">
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

        <div className="px-4 py-5 space-y-4 md:px-6">
          {currentStep === 1 && (
            <>
              <p className="text-sm text-gray-600">
                Select the partner account where the app will be created and enter the store to connect.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Store with Partner Account (where app will be created) <span className="text-red-500">*</span>
                </label>
                <select
                  value={partnerStoreId}
                  onChange={(e) => onPartnerStoreIdChange(e.target.value)}
                  disabled={isCheckingDomain}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a partner store...</option>
                  {partnerStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.storeDomain}
                    </option>
                  ))}
                </select>
                {partnerStores.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No partner stores available. Add one from the stores page first.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store to Connect</label>
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
                <p className="break-all font-mono text-xl tracking-[0.18em] sm:text-2xl sm:tracking-[0.25em]">{authorizationCode}</p>
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
              <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-900">Token Expires In</p>
                  <p className={`text-lg font-bold tabular-nums ${
                    tokenTimeLeft <= 60 ? 'text-red-600' : tokenTimeLeft <= 300 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {formatTokenTimeLeft(tokenTimeLeft)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Shopify app is ready for <span className="font-medium">{storeDomain}</span>.
              </p>


              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Installation Instructions</h4>
                <div className="space-y-3 text-xs text-blue-800">
                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">1.</span>
                    <div>
                      <p className="mb-1">
                        <button
                          onClick={() => {
                            setIsOpeningShopifyApp(true);
                            onOpenPartnerUrl();
                            onInstall();
                          }}
                          disabled={!partnerUrl || isOpeningShopifyApp}
                          className="text-blue-600 hover:text-blue-800 underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Click here
                        </button> to go to Shopify App. When the page loads, choose <span className="font-semibold">Distribution</span> from app navigation (step 1), then choose <span className="font-semibold">Custom distribution</span> (step 2) and click on <span className="font-semibold">Select</span> (step 3).
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-1.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">2.</span>
                    <div>
                      <p className="mb-1">
                        You will be shown a popup. Click on <span className="font-semibold">"Select custom distribution"</span> (step 5).
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-2.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">3.</span>
                    <div>
                      <p className="mb-1">
                        Add <span className="font-semibold bg-white px-1.5 py-0.5 rounded border border-blue-300">{storeDomain}</span> to the store domain field (step 6) and click on <span className="font-semibold">Generate link</span> (step 7).
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-3.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">4.</span>
                    <div>
                      <p className="mb-1">
                        Now copy the install link (step 8).
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-4.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">5.</span>
                    <div>
                      <p className="mb-1">
                        Now navigate to <span className="font-semibold">"API access requests"</span> (step 9) and click on <span className="font-semibold">Request access</span> button (step 10).
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-5.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">6.</span>
                    <div>
                      <p className="mb-1">
                        In the description field, input anything you want (step 11) and click on <span className="font-semibold">"Request access"</span> button.
                      </p>
                      <button
                        onClick={() => setImagePopup('/install-step/step-img-6.png')}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Screenshot →
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">7.</span>
                    <p>
                      Now open a new tab in the browser and paste the copied install link (copied in 7 - step 8) and hit enter.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-bold text-blue-600 shrink-0">8.</span>
                    <p>
                      Once finished, come back to this app and check whether the store is connected or not.
                    </p>
                  </div>
                </div>
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

        <div className="flex flex-col-reverse gap-3 px-4 py-4 border-t border-gray-200 sm:flex-row sm:justify-end md:px-6">
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
                disabled={!partnerUrl}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Copy Link
              </button>
              <button
                onClick={() => {
                  setIsOpeningShopifyApp(true);
                  onOpenPartnerUrl();
                  onInstall();
                }}
                disabled={!partnerUrl || isOpeningShopifyApp}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOpeningShopifyApp && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isOpeningShopifyApp ? 'Checking Installation...' : 'Go to Shopify App'}
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

      {imagePopup && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setImagePopup(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={() => setImagePopup(null)}
              className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-auto max-h-[90vh] p-4">
              <img 
                src={imagePopup} 
                alt="Installation step" 
                className="w-full h-auto"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
