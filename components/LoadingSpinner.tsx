
import React from 'react';

const LoadingSpinner = ({ size = '8', color = 'white' }: { size?: string, color?: string }) => {
  return (
    <div className={`w-${size} h-${size} border-4 border-${color} border-t-transparent border-solid rounded-full animate-spin`}></div>
  );
};

export default LoadingSpinner;
