import React from 'react';

export const App: React.FC = () => {
  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  };

    return (
    <div className="w-[300px] p-6 bg-gradient-dark flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      
      <h1 className="text-lg font-bold text-white mb-1">Page Reader</h1>
      <p className="text-xs text-dark-400 mb-6">Extract & analyze page content with AI</p>
      
      <button
            onClick={openSidePanel}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-medium rounded-xl hover:from-primary-600 hover:to-indigo-600 transition-all shadow-lg"
          >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
        Open Page Reader
      </button>
      
      <p className="text-xs text-dark-500 mt-4">
        Or press <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">Ctrl+Shift+Y</kbd>
        </p>
    </div>
  );
};
