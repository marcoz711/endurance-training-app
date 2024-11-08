// components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => {
  const baseStyle = 'rounded px-4 py-2 font-medium focus:outline-none focus:ring';
  const variantStyle = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    ghost: 'bg-transparent text-blue-500 hover:bg-blue-100',
    outline: 'border border-blue-500 text-blue-500 hover:bg-blue-50', // Outline style
  };
  const sizeStyle = {
    sm: 'text-sm py-1 px-2',
    md: 'text-md py-2 px-4',
    lg: 'text-lg py-3 px-5',
  };

  return (
    <button
      className={`${baseStyle} ${variantStyle[variant]} ${sizeStyle[size]} ${className} flex items-center`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;