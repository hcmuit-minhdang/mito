import React from 'react';
import Icon from './Icon';

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`tabs-container ${className}`.trim()} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} size={18} className="tab-icon" />}
            <span className="tab-label">{tab.label}</span>
            {tab.count != null && <span className="tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
