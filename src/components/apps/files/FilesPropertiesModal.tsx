import React from 'react';
import { FSNode } from './filesystemData';
import { X, HardDrive, Folder, FileText, Lock, ShieldAlert, Calendar, HardDriveUpload, Monitor, Smartphone, Terminal, FileArchive, Disc, HelpCircle } from 'lucide-react';
import { DemoPackageService } from '../../../system/demo/DemoPackageService';
import { DemoMediaService } from '../../../system/demo/DemoMediaService';

interface PropertiesModalProps {
  node: FSNode | null;
  pathString?: string;
  onClose: () => void;
}

export const FilesPropertiesModal: React.FC<PropertiesModalProps> = ({ node, pathString = '', onClose }) => {
  if (!node) return null;

  const demoMeta = node.demoMetadata || DemoPackageService.getInstance().getMetadataByName(node.name);
  const demoMediaMeta = DemoMediaService.getInstance().getMetadataByName(node.name);

  const isDrive = node.type === 'drive';
  const isFolder = node.type === 'folder';
  const usedGB = isDrive && node.totalSizeGB && node.freeSizeGB 
    ? (node.totalSizeGB - node.freeSizeGB).toFixed(1) 
    : '0';
  const usedPercent = isDrive && node.totalSizeGB && node.freeSizeGB
    ? Math.round(((node.totalSizeGB - node.freeSizeGB) / node.totalSizeGB) * 100)
    : 0;

  const renderIcon = () => {
    if (isDrive) return <HardDrive className="w-8 h-8 text-blue-600 dark:text-blue-400" />;
    if (isFolder) return <Folder className="w-8 h-8 text-amber-500 fill-amber-500/20" />;
    if (demoMeta) {
      if (demoMeta.runtime === 'Windows') return <Monitor className="w-8 h-8 text-blue-500" />;
      if (demoMeta.runtime === 'Android') return <Smartphone className="w-8 h-8 text-emerald-500" />;
      if (demoMeta.runtime === 'Native Linux') return <Terminal className="w-8 h-8 text-cyan-500" />;
      if (demoMeta.packageType === 'ISO') return <Disc className="w-8 h-8 text-purple-500" />;
      if (demoMeta.packageType === 'Unknown') return <HelpCircle className="w-8 h-8 text-amber-500" />;
      return <FileArchive className="w-8 h-8 text-amber-600" />;
    }
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {isDrive ? (
              <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : isFolder ? (
              <Folder className="w-5 h-5 text-amber-500" />
            ) : (
              <FileText className="w-5 h-5 text-blue-500" />
            )}
            <h3 className="font-bold text-sm truncate max-w-[260px]">{node.name} Properties</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Main Icon & Title Display */}
          <div className="flex items-center gap-4 p-3">
            <div className="p-3 shrink-0">
              {renderIcon()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{node.name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isDrive ? 'Local Fixed Storage Device' : isFolder ? 'File Folder' : demoMeta ? `Virtual Package (${demoMeta.packageType})` : `${node.extension?.toUpperCase() || 'File'} Document`}
              </div>
            </div>
          </div>

          {/* Package Details Section if Demo Package */}
          {demoMeta && (
            <div className="p-3.5 space-y-2">
              <div className="font-bold text-[11px] text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                <span>Package Metadata</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  demoMeta.runtime === 'Windows' ? 'text-blue-600' :
                  demoMeta.runtime === 'Android' ? 'text-emerald-600' :
                  demoMeta.runtime === 'Native Linux' ? 'text-cyan-600' : 'text-slate-500'
                }`}>
                  {demoMeta.runtime}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Package Type:</span>
                  <span className="font-semibold">{demoMeta.packageType}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Publisher:</span>
                  <span className="font-semibold truncate block" title={demoMeta.publisher}>{demoMeta.publisher}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Version:</span>
                  <span className="font-mono font-medium">{demoMeta.version}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Architecture:</span>
                  <span className="font-mono font-medium">{demoMeta.architecture}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Compatibility:</span>
                  <span className={`font-semibold ${
                    demoMeta.compatibilityRating === 'Excellent' ? 'text-emerald-600' :
                    demoMeta.compatibilityRating === 'Good' ? 'text-blue-600' : 'text-slate-500'
                  }`}>{demoMeta.compatibilityRating}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Estimated Size:</span>
                  <span className="font-mono font-medium">{demoMeta.estimatedSize}</span>
                </div>
              </div>

              {demoMeta.description && (
                <div className="pt-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Description:</span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-tight pt-0.5">{demoMeta.description}</p>
                </div>
              )}

              {demoMeta.packageHash && (
                <div className="pt-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Package Hash:</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all select-all">{demoMeta.packageHash}</span>
                </div>
              )}
            </div>
          )}

          {/* Demo Media Details Section */}
          {demoMediaMeta && (
            <div className="p-3.5 space-y-2">
              <div className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Media Asset Metadata</span>
                <span className="text-[10px] font-semibold text-emerald-600">
                  {demoMediaMeta.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {demoMediaMeta.resolution && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Resolution:</span>
                    <span className="font-mono font-medium">{demoMediaMeta.resolution}</span>
                  </div>
                )}
                {demoMediaMeta.camera && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Camera:</span>
                    <span className="font-medium truncate block" title={demoMediaMeta.camera}>{demoMediaMeta.camera}</span>
                  </div>
                )}
                {demoMediaMeta.duration && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Duration:</span>
                    <span className="font-mono font-medium">{demoMediaMeta.duration}</span>
                  </div>
                )}
                {demoMediaMeta.fps && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Framerate:</span>
                    <span className="font-mono font-medium">{demoMediaMeta.fps} FPS</span>
                  </div>
                )}
                {demoMediaMeta.codec && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Codec:</span>
                    <span className="font-medium truncate block">{demoMediaMeta.codec}</span>
                  </div>
                )}
                {demoMediaMeta.artist && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Artist:</span>
                    <span className="font-medium truncate block">{demoMediaMeta.artist}</span>
                  </div>
                )}
                {demoMediaMeta.album && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Album:</span>
                    <span className="font-medium truncate block">{demoMediaMeta.album}</span>
                  </div>
                )}
                {demoMediaMeta.bitrate && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Bitrate:</span>
                    <span className="font-mono font-medium">{demoMediaMeta.bitrate}</span>
                  </div>
                )}
                {demoMediaMeta.pages && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Pages:</span>
                    <span className="font-mono font-medium">{demoMediaMeta.pages} Pages</span>
                  </div>
                )}
                {demoMediaMeta.encoding && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Encoding:</span>
                    <span className="font-medium truncate block">{demoMediaMeta.encoding}</span>
                  </div>
                )}
                {demoMediaMeta.language && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Language:</span>
                    <span className="font-medium truncate block">{demoMediaMeta.language}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drive Usage Bar if Drive */}
          {isDrive && node.totalSizeGB && (
            <div className="space-y-2 p-3.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Used Capacity ({usedPercent}%)</span>
                <span>{usedGB} GB / {node.totalSizeGB} GB</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    usedPercent > 85 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Free Space: {node.freeSizeGB} GB</span>
                <span>Total Capacity: {node.totalSizeGB} GB</span>
              </div>
            </div>
          )}

          {/* Key Properties List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Location:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[240px]" title={pathString}>
                {pathString || 'This PC'}
              </span>
            </div>

            {!isDrive && (
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Size:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {node.size || (node.children ? `${node.children.length} items` : '0 KB')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Created:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{node.createdAt}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Modified:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{node.modifiedAt}</span>
            </div>

            {node.isProtected && (
              <div className="flex items-center gap-2 p-2 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>System Protected Binary Folder</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
