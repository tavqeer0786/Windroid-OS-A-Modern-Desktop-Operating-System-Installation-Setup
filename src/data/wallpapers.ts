import type { CSSProperties } from 'react';
import wp1 from '../assets/wallpapers/aether-wallpaper-01.svg';
import wp2 from '../assets/wallpapers/aether-wallpaper-02.svg';
import wp3 from '../assets/wallpapers/aether-wallpaper-03.svg';
import wp4 from '../assets/wallpapers/aether-wallpaper-04.svg';
import wp5 from '../assets/wallpapers/aether-wallpaper-05.svg';

export interface Wallpaper {
  id: string;
  name: string;
  url?: string;
  style: CSSProperties;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'aether-wallpaper-01',
    name: 'Blue Geometric Peaks',
    url: wp1,
    style: {
      backgroundImage: `url("${wp1}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  },
  {
    id: 'aether-wallpaper-02',
    name: 'Cosmic Purple Bloom',
    url: wp2,
    style: {
      backgroundImage: `url("${wp2}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  },
  {
    id: 'aether-wallpaper-03',
    name: 'Amber Solstice Bloom',
    url: wp3,
    style: {
      backgroundImage: `url("${wp3}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  },
  {
    id: 'aether-wallpaper-04',
    name: 'Azure Fluid Ribbon',
    url: wp4,
    style: {
      backgroundImage: `url("${wp4}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  },
  {
    id: 'aether-wallpaper-05',
    name: 'Crimson Silk Waves',
    url: wp5,
    style: {
      backgroundImage: `url("${wp5}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  },
  {
    id: 'aurora',
    name: 'Sequoia Glow',
    style: {
      background: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.75) 0%, transparent 40%), radial-gradient(circle at 80% 25%, rgba(139, 92, 246, 0.6) 0%, transparent 45%), radial-gradient(circle at 50% 80%, rgba(14, 165, 233, 0.5) 0%, transparent 50%), radial-gradient(circle at 75% 85%, rgba(236, 72, 153, 0.35) 0%, transparent 40%), linear-gradient(145deg, #070913 0%, #0d1527 45%, #050b18 100%)'
    }
  },
  {
    id: 'calm_light',
    name: 'Alabaster Bloom (Light)',
    style: {
      background: 'radial-gradient(circle at 85% 15%, rgba(219, 234, 254, 0.9) 0%, transparent 45%), radial-gradient(circle at 15% 75%, rgba(238, 242, 255, 0.95) 0%, transparent 50%), radial-gradient(circle at 50% 30%, rgba(224, 242, 254, 0.8) 0%, transparent 60%), linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
    }
  },
  {
    id: 'obsidian_void',
    name: 'Obsidian Velvet',
    style: {
      background: 'radial-gradient(ellipse at 50% 10%, rgba(30, 41, 59, 0.9) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(15, 23, 42, 0.9) 0%, transparent 60%), radial-gradient(circle at 15% 85%, rgba(51, 65, 85, 0.3) 0%, transparent 50%), linear-gradient(180deg, #0b0f19 0%, #020617 100%)'
    }
  },
  {
    id: 'sunset_flow',
    name: 'Windroid Solstice',
    style: {
      background: 'radial-gradient(ellipse at 25% 20%, rgba(244, 63, 94, 0.45) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(99, 102, 241, 0.5) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #2e1065 70%, #0369a1 100%)'
    }
  }
];

export const DEFAULT_WALLPAPER_ID = 'aether-wallpaper-01';
export const WALLPAPER_STORAGE_KEY = 'windroid.os.wallpaper.selected';
export const LEGACY_WALLPAPER_STORAGE_KEY = 'aether.os.wallpaper.selected';

export function getSavedWallpaperId(): string {
  try {
    const raw = localStorage.getItem(WALLPAPER_STORAGE_KEY) || localStorage.getItem(LEGACY_WALLPAPER_STORAGE_KEY);
    if (!raw) return DEFAULT_WALLPAPER_ID;
    const parsed = JSON.parse(raw);
    const id = parsed?.wallpaperId;
    if (typeof id === 'string' && WALLPAPERS.some((w) => w.id === id)) {
      return id;
    }
  } catch (err) {
    console.warn('Failed to parse saved wallpaper from localStorage:', err);
  }
  return DEFAULT_WALLPAPER_ID;
}

export function saveWallpaperId(id: string): void {
  try {
    if (WALLPAPERS.some((w) => w.id === id)) {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({ wallpaperId: id }));
    }
  } catch (err) {
    console.warn('Failed to save wallpaper to localStorage:', err);
  }
}

export function getWallpaperById(id: string): Wallpaper {
  const found = WALLPAPERS.find((w) => w.id === id);
  if (found) return found;
  return WALLPAPERS.find((w) => w.id === DEFAULT_WALLPAPER_ID) || WALLPAPERS[0];
}
