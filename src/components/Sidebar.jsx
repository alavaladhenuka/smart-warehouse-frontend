import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  GitFork, 
  CheckSquare, 
  Box, 
  ShieldCheck, 
  Truck, 
  AlertTriangle, 
  Cpu, 
  BarChart3, 
  Settings 
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Allocation Engine', path: '/allocation', icon: GitFork },
  { name: 'Picking Tasks', path: '/picking', icon: CheckSquare },
  { name: 'Packing Station', path: '/packing', icon: Box },
  { name: 'Quality Check', path: '/quality', icon: ShieldCheck },
  { name: 'Dispatch Queue', path: '/dispatch', icon: Truck },
  { name: 'Exception Center', path: '/exceptions', icon: AlertTriangle },
  { name: 'Decision Center', path: '/decisions', icon: Cpu },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col min-h-screen border-r border-slate-800">
      <div className="p-5 border-b border-slate-800 flex flex-col">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white font-bold">WS</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">WareSmart AI</h1>
            <span className="text-xs text-indigo-400 font-medium">Smart Fulfillment System</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400">
            OP
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Demo Operator</p>
            <p className="text-xs text-slate-400">Warehouse Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}