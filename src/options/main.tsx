import React from 'react'
import ReactDOM from 'react-dom/client'
import { Options } from './Options'
import './Options.css'

// Mock chrome.storage for local browser testing outside the Chrome Extension environment
if (typeof chrome === 'undefined' || !chrome.storage) {
  (window as any).chrome = {
    storage: {
      local: {
        get: (key: string, callback: (result: any) => void) => {
          const val = localStorage.getItem(key);
          callback(val ? { [key]: JSON.parse(val) } : {});
        },
        set: (items: any, callback: () => void) => {
          Object.keys(items).forEach((key) => {
            localStorage.setItem(key, JSON.stringify(items[key]));
          });
          if (callback) callback();
        },
      },
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
)
