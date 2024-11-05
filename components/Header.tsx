// components/Header.tsx
import React from 'react';
import Button from '@/components/ui/Button';
import { Menu, ExternalLink } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 bg-white border-b p-4 flex justify-between items-center shadow-md">
      <h1 className="text-blue-500 text-2xl font-bold">Endurance Training</h1>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className="bg-white border rounded-md shadow-lg p-2">
          <DropdownMenu.Item className="flex items-center p-2 rounded-md hover:bg-gray-100">
            Training Dashboard
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex items-center p-2 rounded-md hover:bg-gray-100">
            <ExternalLink className="h-4 w-4 mr-2" />
            Training Data Sheet
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </header>
  );
};

export default Header;