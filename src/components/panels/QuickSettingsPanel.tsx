import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOS } from '../../context/OSContext';
import { 
  Wifi, 
  Bluetooth, 
  Moon, 
  Sun, 
  Plane, 
  BatteryCharging, 
  Eye, 
  Volume,
  Volume1,
  Volume2, 
  VolumeX,
  ChevronRight,
  Pencil,
  Settings,
  Battery,
  Share2,
  Shield,
  Radio,
  SlidersHorizontal,
  Zap,
  Plug
} from 'lucide-react';

interface Win11TileProps {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  hasChevron?: boolean;
  tooltip?: string;
  onToggle: () => void;
  onChevronClick?: () => void;
}

function Win11Tile({ 
  label, 
  sublabel, 
  icon, 
  checked, 
  disabled, 
  hasChevron, 
  tooltip, 
  onToggle, 
  onChevronClick 
}: Win11TileProps) {
  return (
    <div className="flex flex-col items-center text-center group select-none" title={tooltip}>
      {/* Button Box */}
      <div 
        className={`w-full h-12 rounded-xl flex items-center transition-all duration-150 overflow-hidden border ${
          disabled 
            ? 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent cursor-not-allowed' 
            : checked 
              ? 'bg-[#0067c0] text-white border-[#0067c0] shadow-xs hover:bg-[#005fb8]' 
              : 'bg-white/90 dark:bg-[#2c2c2c] text-slate-800 dark:text-slate-100 border-black/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#383838] shadow-2xs'
        }`}
      >
        {hasChevron ? (
          <div className="flex items-center w-full h-full">
            <button
              type="button"
              disabled={disabled}
              onClick={onToggle}
              className="flex-1 h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {icon}
            </button>
            <span className="w-px h-5 bg-current opacity-20" />
            <button
              type="button"
              disabled={disabled}
              onClick={onChevronClick || onToggle}
              className="w-8 h-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="More options"
            >
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className="w-full h-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {icon}
          </button>
        )}
      </div>

      {/* Label Underneath */}
      <div className="mt-1.5 flex flex-col items-center w-full px-0.5">
        <span 
          className={`text-[11px] font-normal leading-[1.25] line-clamp-2 text-slate-800 dark:text-slate-200 ${
            disabled ? 'opacity-40' : ''
          }`}
        >
          {sublabel || label}
        </span>
      </div>
    </div>
  );
}

interface Win11SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  onIconClick?: () => void;
  iconTitle?: string;
  rightElement?: React.ReactNode;
  ariaLabel: string;
}

function Win11Slider({
  value,
  min = 0,
  max = 100,
  onChange,
  icon,
  onIconClick,
  iconTitle,
  rightElement,
  ariaLabel
}: Win11SliderProps) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="flex items-center gap-3 w-full">
      {onIconClick ? (
        <button
          type="button"
          onClick={onIconClick}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer focus:outline-none"
          title={iconTitle}
          aria-label={iconTitle || ariaLabel}
        >
          {icon}
        </button>
      ) : (
        <div className="p-1 text-slate-700 dark:text-slate-300 shrink-0" title={iconTitle}>
          {icon}
        </div>
      )}
      <div className="relative flex-1 flex items-center h-6">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={ariaLabel}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #0067c0 0%, #0067c0 ${percentage}%, #8a8a8a ${percentage}%, #8a8a8a 100%)`
          }}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer focus:outline-none 
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-[#0067c0] 
            [&::-webkit-slider-thumb]:ring-2 
            [&::-webkit-slider-thumb]:ring-white 
            [&::-webkit-slider-thumb]:dark:ring-[#1c1c1c] 
            [&::-webkit-slider-thumb]:shadow-md 
            [&::-webkit-slider-thumb]:cursor-pointer 
            [&::-webkit-slider-thumb]:transition-transform 
            [&::-webkit-slider-thumb]:hover:scale-110 
            [&::-moz-range-thumb]:w-4 
            [&::-moz-range-thumb]:h-4 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-[#0067c0] 
            [&::-moz-range-thumb]:border-0 
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
      {rightElement}
    </div>
  );
}

export const QuickSettingsPanel: React.FC = () => {
  const { 
    quickSettings, 
    radioCapabilities,
    powerStatus,
    updateQuickSettings, 
    setDisplayBrightness,
    setAudioVolume,
    toggleAudioMute,
    toggleWifi,
    toggleBluetooth,
    toggleHotspot,
    toggleAirplaneMode,
    isQuickSettingsOpen,
    openApp,
    closeAllPanels
  } = useOS();

  const wifiDisabled = radioCapabilities.loading || !radioCapabilities.wifiAdapterPresent || radioCapabilities.wifiHardwareBlocked;
  const bluetoothDisabled = radioCapabilities.loading || !radioCapabilities.bluetoothAdapterPresent || radioCapabilities.bluetoothHardwareBlocked || !radioCapabilities.bluezAvailable;
  const hotspotDisabled = radioCapabilities.loading || !radioCapabilities.hotspotAvailable;

  const isMuted = quickSettings.volumeMuted || quickSettings.volume === 0;

  const getVolumeIcon = () => {
    if (isMuted) {
      return <VolumeX className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
    if (quickSettings.volume <= 33) {
      return <Volume className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
    }
    if (quickSettings.volume <= 66) {
      return <Volume1 className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
    }
    return <Volume2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
  };

  return (
    <AnimatePresence>
      {isQuickSettingsOpen && (
        <>
          {/* Invisible Overlay for Outside Clicks */}
          <motion.div 
            key="quick-settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={closeAllPanels}
            className="fixed inset-0 z-[9970] bg-transparent cursor-default"
          />

          <motion.div 
            key="quick-settings-panel"
            initial={{ opacity: 0, y: -28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: -28, 
              scale: 0.97,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } 
            }}
            transition={{ 
              duration: 0.21,
              ease: [0, 0, 0.2, 1]
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-12 right-3 z-[9980] w-[370px] min-h-[470px] p-5 rounded-2xl bg-[#f3f3f3]/95 dark:bg-[#1c1c1c]/95 backdrop-blur-3xl backdrop-saturate-150 border border-slate-200/80 dark:border-white/10 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col justify-between gap-6 select-none overflow-hidden"
          >
            {/* 3-Column Quick Settings Grid */}
      <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 pt-1">
        <Win11Tile
          label="Wi-Fi"
          sublabel={quickSettings.wifi ? "Wi-Fi" : "Not connected"}
          icon={<Wifi className="w-4 h-4" />}
          checked={!wifiDisabled && quickSettings.wifi}
          disabled={wifiDisabled}
          hasChevron={true}
          onToggle={() => toggleWifi(!quickSettings.wifi)}
          onChevronClick={() => {
            openApp('settings');
            closeAllPanels();
          }}
        />

        <Win11Tile
          label="Bluetooth"
          sublabel={quickSettings.bluetooth ? "Bluetooth" : "Off"}
          icon={<Bluetooth className="w-4 h-4" />}
          checked={!bluetoothDisabled && quickSettings.bluetooth}
          disabled={bluetoothDisabled}
          hasChevron={true}
          onToggle={() => toggleBluetooth(!quickSettings.bluetooth)}
          onChevronClick={() => {
            openApp('settings');
            closeAllPanels();
          }}
        />

        <Win11Tile
          label="Flight mode"
          icon={<Plane className="w-4 h-4" />}
          checked={quickSettings.airplaneMode}
          onToggle={() => toggleAirplaneMode(!quickSettings.airplaneMode)}
        />

        <Win11Tile
          label="Battery saver"
          icon={<BatteryCharging className="w-4 h-4" />}
          checked={quickSettings.batterySaver}
          onToggle={() => updateQuickSettings({ batterySaver: !quickSettings.batterySaver })}
        />

        <Win11Tile
          label="Night light"
          icon={<Eye className="w-4 h-4" />}
          checked={quickSettings.nightLight}
          onToggle={() => updateQuickSettings({ nightLight: !quickSettings.nightLight })}
        />

        <Win11Tile
          label="Accessibility"
          icon={<Shield className="w-4 h-4" />}
          checked={quickSettings.focusMode}
          hasChevron={true}
          onToggle={() => updateQuickSettings({ focusMode: !quickSettings.focusMode })}
        />

        <Win11Tile
          label="Mobile hotspot"
          icon={<Radio className="w-4 h-4" />}
          checked={!hotspotDisabled && quickSettings.hotspot}
          disabled={hotspotDisabled}
          onToggle={() => toggleHotspot(!quickSettings.hotspot)}
        />

        <Win11Tile
          label="Dark Mode"
          icon={<Moon className="w-4 h-4" />}
          checked={quickSettings.darkMode}
          onToggle={() => updateQuickSettings({ darkMode: !quickSettings.darkMode })}
        />

        <Win11Tile
          label="Nearby sharing"
          icon={<Share2 className="w-4 h-4" />}
          checked={false}
          onToggle={() => {}}
        />
      </div>

      {/* Sliders Area (Brightness & Volume) */}
      <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-white/5">
        {/* Brightness Slider */}
        <Win11Slider
          value={quickSettings.brightness}
          min={0}
          max={100}
          ariaLabel="Brightness"
          onChange={(val) => setDisplayBrightness(val)}
          icon={<Sun className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
          iconTitle={`Brightness: ${quickSettings.brightness}%`}
        />

        {/* Volume Slider */}
        <Win11Slider
          value={quickSettings.volumeMuted ? 0 : quickSettings.volume}
          min={0}
          max={100}
          ariaLabel="Volume"
          onChange={(val) => setAudioVolume(val, false)}
          icon={getVolumeIcon()}
          onIconClick={toggleAudioMute}
          iconTitle={isMuted ? 'Unmute volume' : `Mute volume (${quickSettings.volume}%)`}
          rightElement={
            <button 
              type="button"
              onClick={() => {
                openApp('settings');
                closeAllPanels();
              }}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
              title="Select sound output"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          }
        />
      </div>

      {/* Footer Bar: Real Device Battery % and Charging Status + Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-300">
        <div 
          className="flex items-center gap-2 text-xs font-normal" 
          title={powerStatus?.acConnected || powerStatus?.chargingState === 'charging' ? "Plugged in / Charging" : "Discharging on battery"}
        >
          <div className="relative flex items-center justify-center">
            <Battery className={`w-4.5 h-4.5 ${
              (powerStatus?.batteryPercent ?? 100) <= 20 
                ? 'text-red-500' 
                : powerStatus?.acConnected || powerStatus?.chargingState === 'charging'
                  ? 'text-emerald-500' 
                  : 'text-slate-700 dark:text-slate-200'
            }`} />
            {(powerStatus?.acConnected || powerStatus?.chargingState === 'charging') && (
              <Zap className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 absolute fill-emerald-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-xs leading-none">
              {powerStatus?.batteryPercent ?? 100}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
              {powerStatus?.acConnected || powerStatus?.chargingState === 'charging' ? "Plugged in" : "Discharging"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Edit quick settings"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => {
              openApp('settings');
              closeAllPanels();
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            title="All settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
    </>
      )}
    </AnimatePresence>
  );
};

