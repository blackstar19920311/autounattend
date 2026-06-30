import { Monitor, HardDrive, ShieldAlert, Wifi, User, Palette, EyeOff, Zap, Trash2, Code, Package } from 'lucide-react';

export const SECTIONS = [
  { id: 'presets', labelKey: 'section.presets', icon: <Package size={18} /> },
  { id: 'system-info', labelKey: 'section.systemInfo', icon: <Monitor size={18} /> },
  { id: 'partitioning', labelKey: 'section.partitioning', icon: <HardDrive size={18} /> },
  { id: 'bypasses', labelKey: 'section.bypasses', icon: <ShieldAlert size={18} /> },
  { id: 'wifi', labelKey: 'section.wifi', icon: <Wifi size={18} /> },
  { id: 'user-account', labelKey: 'section.userAccount', icon: <User size={18} /> },
  { id: 'personalization', labelKey: 'section.personalization', icon: <Palette size={18} /> },
  { id: 'privacy', labelKey: 'section.privacy', icon: <EyeOff size={18} /> },
  { id: 'performance', labelKey: 'section.performance', icon: <Zap size={18} /> },
  { id: 'bloatware', labelKey: 'section.bloatware', icon: <Trash2 size={18} /> },
  { id: 'custom-scripts', labelKey: 'section.customScripts', icon: <Code size={18} /> },
]
