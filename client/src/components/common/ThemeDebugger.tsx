import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeDebugger: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      background: 'var(--bg-secondary)', 
      border: '1px solid var(--border-color)',
      padding: '10px', 
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 1000,
      color: 'var(--text-primary)'
    }}>
      <div>Theme: {isDarkMode ? 'Dark' : 'Light'}</div>
      <div>Data-theme: {document.documentElement.getAttribute('data-theme')}</div>
      <button 
        onClick={toggleTheme}
        style={{
          marginTop: '5px',
          padding: '5px 10px',
          background: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Toggle Theme
      </button>
    </div>
  );
};

export default ThemeDebugger;