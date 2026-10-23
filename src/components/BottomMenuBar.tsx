/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, User, Building2 } from 'lucide-react';
import { UserProfile } from '../types';

interface BottomMenuBarProps {
  activeTab: 'activation' | 'tenant' | null;
  onSelectTab: (tab: 'activation' | 'tenant') => void;
  isActivated?: boolean;
  userProfile?: UserProfile | null;
}

export const BottomMenuBar: React.FC<BottomMenuBarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
}) => {
  const isTenantUser = userProfile?.subscriptionPlan === 'tenant';

  return (
    <div
      className="bottom-menu-bar-container fixed bottom-0 left-0 right-0 w-full bg-white/70 backdrop-blur-md border-t border-neutral-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pointer-events-auto"
      style={{ zIndex: 9999 }}
    >
      <nav
        aria-label="Bottom Navigation"
        className="max-w-md mx-auto h-16 sm:h-18 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Activation Feature Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('activation')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all group ${
            activeTab === 'activation'
              ? 'text-sky-600'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
          title="Activation"
          aria-label="Activation"
        >
          <div className="relative flex items-center justify-center">
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === 'activation' ? 'bg-sky-50' : 'group-hover:bg-neutral-100'
              }`}
            >
              <ShieldCheck
                className={`w-5 h-5 stroke-[2.2] transition-colors ${
                  activeTab === 'activation'
                    ? 'text-sky-600'
                    : 'text-neutral-600 group-hover:text-neutral-900'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[11px] sm:text-xs mt-0.5 tracking-tight transition-colors ${
              activeTab === 'activation'
                ? 'font-bold text-sky-700'
                : 'font-medium text-neutral-600 group-hover:text-neutral-900'
            }`}
          >
            Activation
          </span>
        </button>

        <div className="h-8 w-px bg-neutral-200/80 my-auto" />

        {/* Tenant Dashboard Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('tenant')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all group ${
            activeTab === 'tenant'
              ? 'text-emerald-600'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
          title="Tenant Dashboard"
          aria-label="Tenant"
        >
          <div className="relative flex items-center justify-center">
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === 'tenant' ? 'bg-emerald-50' : 'group-hover:bg-neutral-100'
              }`}
            >
              <Building2
                className={`w-5 h-5 stroke-[2.2] transition-colors ${
                  activeTab === 'tenant'
                    ? 'text-emerald-600'
                    : 'text-neutral-600 group-hover:text-neutral-900'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[11px] sm:text-xs mt-0.5 tracking-tight transition-colors ${
              activeTab === 'tenant'
                ? 'font-bold text-emerald-700'
                : 'font-medium text-neutral-600 group-hover:text-neutral-900'
            }`}
          >
            Tenant Dashboard
          </span>
        </button>
      </nav>
    </div>
  );
};


