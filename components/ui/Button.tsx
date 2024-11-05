// components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  size?: 'icon' | 'default';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'default', children, ...props }) => {
  const baseStyle = 'rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantStyle =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
      : 'bg-transparent text-gray-700 hover:text-gray-900 focus:ring-gray-400';
  const sizeStyle = size === 'icon' ? 'p-2' : 'px-4 py-2';

  return (
    <button className={`${baseStyle} ${variantStyle} ${sizeStyle}`} {...props}>
      {children}
    </button>
  );
};

export default Button;