import React, { useState, useEffect } from 'react';
import { 
  FilesIcon, SettingsIcon, PhotosIcon, MusicIcon, TerminalIcon, 
  CalendarIcon, BrowserIcon, ComputerIcon, DocumentsIcon, DocumentIcon, PdfIcon, RecycleBinIcon,
  HomeIcon
} from './CustomAppIcons';
import { Sparkles, Grid, HelpCircle, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { TrashService } from '../apps/files/services/TrashService';

interface AppIconRendererProps {
  iconName?: string;
  className?: string;
  isBroken?: boolean;
}

export const AppIconRenderer: React.FC<AppIconRendererProps> = ({ 
  iconName, 
  className = "w-11 h-11", 
  isBroken = false 
}) => {
  const [isTrashEmpty, setIsTrashEmpty] = useState<boolean>(() => TrashService.getInstance().isEmpty());

  useEffect(() => {
    if (iconName === 'recycle_bin' || iconName === 'Trash2') {
      const unsubscribe = TrashService.getInstance().subscribe(() => {
        setIsTrashEmpty(TrashService.getInstance().isEmpty());
      });
      return unsubscribe;
    }
  }, [iconName]);

  if (isBroken) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <HelpCircle className="w-full h-full text-slate-400/80" />
        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full">
          <AlertTriangle className="w-3.5 h-3.5 fill-amber-100 text-amber-950" />
        </span>
      </div>
    );
  }

  switch (iconName) {
    case 'Folder':
    case 'files':
      return <FilesIcon className={className} />;
    case 'Globe':
    case 'browser':
      return <BrowserIcon className={className} />;
    case 'Settings':
    case 'settings':
      return <SettingsIcon className={className} />;
    case 'Terminal':
    case 'terminal':
      return <TerminalIcon className={className} />;
    case 'Sparkles':
    case 'agent':
      return <Sparkles className={`${className} text-blue-600 dark:text-blue-400`} />;
    case 'Image':
    case 'photos':
      return <PhotosIcon className={className} />;
    case 'Music':
    case 'music':
      return <MusicIcon className={className} />;
    case 'Calendar':
    case 'calendar':
      return <CalendarIcon className={className} />;
    case 'Grid':
      return <Grid className={`${className} text-blue-600`} />;
    case 'HardDrive':
    case 'computer':
      return <ComputerIcon className={className} />;
    case 'Home':
    case 'home':
      return <HomeIcon className={className} />;
    case 'documents':
    case 'Document':
    case 'FileText':
      return <DocumentIcon className={className} />;
    case 'pdf':
    case 'Pdf':
      return <PdfIcon className={className} />;
    case 'recycle_bin':
    case 'Trash2':
      return <RecycleBinIcon className={className} isEmpty={isTrashEmpty} />;
    default: {
      if (iconName && (LucideIcons as any)[iconName]) {
        const DynamicLucide = (LucideIcons as any)[iconName];
        return <DynamicLucide className={className} />;
      }
      return <HelpCircle className={className} />;
    }
  }
};
