import React from 'react';

export const FilesIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="files_gr1" x1="-7.018" x2="39.387" y1="9.308" y2="33.533" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fac017" />
        <stop offset="0.909" stopColor="#e1ab2d" />
      </linearGradient>
      <linearGradient id="files_gr2" x1="5.851" x2="18.601" y1="9.254" y2="27.39" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fbfef3" />
        <stop offset="0.909" stopColor="#e2e4e3" />
      </linearGradient>
      <linearGradient id="files_gr3" x1="2" x2="22" y1="19" y2="19" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fbfef3" />
        <stop offset="0.909" stopColor="#e2e4e3" />
      </linearGradient>
      <linearGradient id="files_gr4" x1="16.865" x2="44.965" y1="39.287" y2="39.792" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#e3a917" />
        <stop offset="0.464" stopColor="#d79c1e" />
      </linearGradient>
      <linearGradient id="files_gr5" x1="-4.879" x2="35.968" y1="12.764" y2="30.778" gradientUnits="userSpaceOnUse">
        <stop offset="0.34" stopColor="#ffefb2" />
        <stop offset="0.485" stopColor="#ffedad" />
        <stop offset="0.652" stopColor="#ffe99f" />
        <stop offset="0.828" stopColor="#fee289" />
        <stop offset="1" stopColor="#fed86b" />
      </linearGradient>
      <radialGradient id="files_gr6" cx="37.836" cy="49.317" r="53.875" gradientUnits="userSpaceOnUse">
        <stop offset="0.199" stopColor="#fec832" />
        <stop offset="0.601" stopColor="#fcd667" />
        <stop offset="0.68" stopColor="#fdda75" />
        <stop offset="0.886" stopColor="#fee496" />
        <stop offset="1" stopColor="#ffe8a2" />
      </radialGradient>
    </defs>
    <path fill="url(#files_gr1)" d="M44.5,41h-41C2.119,41,1,39.881,1,38.5v-31C1,6.119,2.119,5,3.5,5h11.597c1.519,0,2.955,0.69,3.904,1.877L21.5,10h23c1.381,0,2.5,1.119,2.5,2.5v26C47,39.881,45.881,41,44.5,41z" />
    <path fill="url(#files_gr2)" d="M2,25h20V11H4c-1.105,0-2,0.895-2,2V25z" />
    <path fill="url(#files_gr3)" d="M2,26h20V12H4c-1.105,0-2,0.895-2,2V26z" />
    <path fill="url(#files_gr4)" d="M1,37.875V38.5C1,39.881,2.119,41,3.5,41h41c1.381,0,2.5-1.119,2.5-2.5v-0.625H1z" />
    <path fill="url(#files_gr5)" d="M44.5,11h-23l-1.237,0.824C19.114,12.591,17.763,13,16.381,13H3.5C2.119,13,1,14.119,1,15.5v22C1,38.881,2.119,40,3.5,40h41c1.381,0,2.5-1.119,2.5-2.5v-24C47,12.119,45.881,11,44.5,11z" />
    <path fill="url(#files_gr6)" d="M44.5,40h-41C2.119,40,1,38.881,1,37.5v-21C1,15.119,2.119,14,3.5,14h13.256c1.382,0,2.733-0.409,3.883-1.176L21.875,12H44.5c1.381,0,2.5,1.119,2.5,2.5v23C47,38.881,45.881,40,44.5,40z" />
  </svg>
);

export const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="settings_gr1" x1="32.012" x2="15.881" y1="32.012" y2="15.881" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.242" stopColor="#f2f2f2" />
        <stop offset="1" stopColor="#ccc" />
      </linearGradient>
      <linearGradient id="settings_gr2" x1="17.45" x2="28.94" y1="17.45" y2="28.94" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0d61a9" />
        <stop offset="0.363" stopColor="#0e5fa4" />
        <stop offset="0.78" stopColor="#135796" />
        <stop offset="1" stopColor="#16528c" />
      </linearGradient>
      <linearGradient id="settings_gr3" x1="5.326" x2="38.082" y1="5.344" y2="38.099" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#889097" />
        <stop offset="0.331" stopColor="#848c94" />
        <stop offset="0.669" stopColor="#78828b" />
        <stop offset="1" stopColor="#64717c" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="11.5" fill="url(#settings_gr1)" />
    <circle cx="24" cy="24" r="7" fill="url(#settings_gr2)" />
    <path fill="url(#settings_gr3)" d="M43.407,19.243c-2.389-0.029-4.702-1.274-5.983-3.493c-1.233-2.136-1.208-4.649-0.162-6.693 c-2.125-1.887-4.642-3.339-7.43-4.188C28.577,6.756,26.435,8,24,8s-4.577-1.244-5.831-3.131c-2.788,0.849-5.305,2.301-7.43,4.188 c1.046,2.044,1.071,4.557-0.162,6.693c-1.281,2.219-3.594,3.464-5.983,3.493C4.22,20.77,4,22.358,4,24 c0,1.284,0.133,2.535,0.364,3.752c2.469-0.051,4.891,1.208,6.213,3.498c1.368,2.37,1.187,5.204-0.22,7.345 c2.082,1.947,4.573,3.456,7.34,4.375C18.827,40.624,21.221,39,24,39s5.173,1.624,6.303,3.971c2.767-0.919,5.258-2.428,7.34-4.375 c-1.407-2.141-1.588-4.975-0.22-7.345c1.322-2.29,3.743-3.549,6.213-3.498C43.867,26.535,44,25.284,44,24 C44,22.358,43.78,20.77,43.407,19.243z M24,34.5c-5.799,0-10.5-4.701-10.5-10.5c0-5.799,4.701-10.5,10.5-10.5S34.5,18.201,34.5,24 C34.5,29.799,29.799,34.5,24,34.5z" />
  </svg>
);

export const MusicIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="music_gr1" x1="30" x2="41" y1="8" y2="8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#bd1949" />
        <stop offset="0.108" stopColor="#c31a4b" />
        <stop offset="0.38" stopColor="#ca1b4d" />
        <stop offset="1" stopColor="#cc1b4e" />
      </linearGradient>
    </defs>
    <path fill="#ed3675" d="M20,24c-5.523,0-10,4.477-10,10s4.477,10,10,10s10-4.477,10-10S25.523,24,20,24z" />
    <path fill="url(#music_gr1)" d="M39,12h-9V4h9c1.105,0,2,0.895,2,2v4C41,11.105,40.105,12,39,12z" />
    <path fill="#ed3675" d="M30,4h-2c-2.209,0-4,1.791-4,4v26h6V4z" />
  </svg>
);

export const FolderIcon = FilesIcon;

export const PhotosIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient
          id={`photoBackground_${id}`}
          x1="39"
          y1="20"
          x2="219"
          y2="231"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#168FD2"/>
          <stop offset="0.48" stopColor="#1667BA"/>
          <stop offset="1" stopColor="#7650B8"/>
        </linearGradient>

        <linearGradient
          id={`frontMountain_${id}`}
          x1="27"
          y1="125"
          x2="155"
          y2="232"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#47E3EC"/>
          <stop offset="0.55" stopColor="#25C7E8"/>
          <stop offset="1" stopColor="#1596D2"/>
        </linearGradient>

        <linearGradient
          id={`rearMountain_${id}`}
          x1="129"
          y1="144"
          x2="221"
          y2="231"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0F8FD0"/>
          <stop offset="0.55" stopColor="#0879C3"/>
          <stop offset="1" stopColor="#0567B3"/>
        </linearGradient>

        <linearGradient
          id={`moon_${id}`}
          x1="160"
          y1="42"
          x2="197"
          y2="82"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset="1" stopColor="#DCE5EA"/>
        </linearGradient>

        <filter
          id={`softShadow_${id}`}
          x="8"
          y="10"
          width="240"
          height="234"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.5"
            floodColor="#000000"
            floodOpacity="0.18"
          />
        </filter>

        <clipPath id={`iconClip_${id}`}>
          <rect x="16" y="16" width="220" height="220" rx="33"/>
        </clipPath>
      </defs>

      <g>
        <g clipPath={`url(#iconClip_${id})`}>
          <rect
            x="16"
            y="16"
            width="220"
            height="220"
            rx="33"
            fill={`url(#photoBackground_${id})`}
          />

          <circle
            cx="178"
            cy="61"
            r="21"
            fill={`url(#moon_${id})`}
          />

          <path
            d="M95 236 L147 154 C157 138 178 134 192 146 L236 186 V236 H95Z"
            fill={`url(#rearMountain_${id})`}
          />

          <path
            d="M16 187 L105 103 C118 90 137 90 150 102 L177 128 C161 126 149 134 139 146 L70 224 C61 234 50 237 37 234 C24 231 16 219 16 205 V187Z"
            fill={`url(#frontMountain_${id})`}
          />

          <path
            d="M139 146 C151 132 162 127 177 128"
            stroke="#0877BD"
            strokeOpacity={0.38}
            strokeWidth={2}
            strokeLinecap="round"
          />

          <path
            d="M47 18H196"
            stroke="#FFFFFF"
            strokeOpacity={0.14}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>

        <rect
          x="16.5"
          y="16.5"
          width="219"
          height="219"
          rx="32.5"
          stroke="#FFFFFF"
          strokeOpacity={0.14}
        />
      </g>
    </svg>
  );
};

export const VideoIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient
          id={`videoSurface_${id}`}
          x1="42"
          y1="32"
          x2="214"
          y2="224"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3F7EDB"/>
          <stop offset="1" stopColor="#1459B8"/>
        </linearGradient>

        <filter
          id={`playShadow_${id}`}
          x="89"
          y="72"
          width="91"
          height="122"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#0C4A9B"
            floodOpacity="0.28"
          />
        </filter>

        <filter
          id={`iconShadow_${id}`}
          x="20"
          y="18"
          width="216"
          height="224"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="3"
            floodColor="#0A3470"
            floodOpacity="0.18"
          />
        </filter>
      </defs>

      <g>
        <rect
          x="32"
          y="24"
          width="192"
          height="208"
          rx="25"
          fill={`url(#videoSurface_${id})`}
        />

        <rect x="48" y="45" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="48" y="82" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="48" y="119" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="48" y="156" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="48" y="193" width="22" height="22" rx="6" fill="#FFFFFF"/>

        <rect x="186" y="45" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="186" y="82" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="186" y="119" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="186" y="156" width="22" height="22" rx="6" fill="#FFFFFF"/>
        <rect x="186" y="193" width="22" height="22" rx="6" fill="#FFFFFF"/>

        <g>
          <path
            d="M100 87.5 C100 81.7 106.5 78.3 111.2 81.7 L166.5 121.2 C170.7 124.2 170.7 130.4 166.5 133.4 L111.2 172.9 C106.5 176.3 100 172.9 100 167.1 V87.5Z"
            fill="#FFFFFF"
          />
        </g>

        <path
          d="M56 27H195"
          stroke="#FFFFFF"
          strokeOpacity={0.14}
          strokeWidth={2}
          strokeLinecap="round"
        />

        <rect
          x="32.5"
          y="24.5"
          width="191"
          height="207"
          rx="24.5"
          stroke="#FFFFFF"
          strokeOpacity={0.12}
        />
      </g>
    </svg>
  );
};

export const TerminalIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Monitor Frame */}
    <rect x="32" y="80" width="448" height="352" rx="28" fill="#E6E8EA" />
    
    {/* Inner Screen */}
    <rect x="64" y="112" width="384" height="288" rx="4" fill="#373B3E" />
    
    {/* Terminal Prompt Symbol ($) */}
    <text
      x="115"
      y="305"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontSize="175"
      fontWeight="500"
      fill="#FFFFFF"
    >$</text>
    
    {/* Cursor (_) */}
    <rect x="215" y="290" width="72" height="15" fill="#FFFFFF" />
  </svg>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="cal_body" x1="12" y1="10" x2="52" y2="55" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF"/>
        <stop offset="0.55" stopColor="#F5F7FA"/>
        <stop offset="1" stopColor="#DCE2E9"/>
      </linearGradient>

      <linearGradient id="cal_header" x1="12" y1="11" x2="52" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4CC2FF"/>
        <stop offset="0.48" stopColor="#168BEB"/>
        <stop offset="1" stopColor="#075BB5"/>
      </linearGradient>

      <linearGradient id="cal_selected" x1="35" y1="36" x2="45" y2="47" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#42C5FF"/>
        <stop offset="1" stopColor="#0878E8"/>
      </linearGradient>

      <linearGradient id="cal_border" x1="13" y1="11" x2="51" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8"/>
        <stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0.25"/>
        <stop offset="1" stopColor="#647384" stopOpacity="0.35"/>
      </linearGradient>

      <filter id="cal_shadow" x="6" y="6" width="52" height="54" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#071421" floodOpacity="0.3"/>
      </filter>

      <clipPath id="cal_clip">
        <rect x="12" y="11" width="40" height="43" rx="6"/>
      </clipPath>
    </defs>

    <g>
      <rect x="12" y="11" width="40" height="43" rx="6" fill="url(#cal_body)"/>

      <g clipPath="url(#cal_clip)">
        <path d="M12 17C12 13.6863 14.6863 11 18 11H46C49.3137 11 52 13.6863 52 17V26H12V17Z" fill="url(#cal_header)"/>
        <path d="M12 26H52" stroke="#07539E" strokeOpacity="0.35"/>
        <path d="M16 15C16 13.8954 16.8954 13 18 13H43" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round"/>

        <circle cx="19" cy="31" r="1.15" fill="#A7B0BA"/>
        <circle cx="25.5" cy="31" r="1.15" fill="#A7B0BA"/>
        <circle cx="32" cy="31" r="1.15" fill="#A7B0BA"/>
        <circle cx="38.5" cy="31" r="1.15" fill="#A7B0BA"/>
        <circle cx="45" cy="31" r="1.15" fill="#A7B0BA"/>

        <rect x="17.5" y="36" width="3" height="3" rx="1" fill="#647384"/>
        <rect x="24" y="36" width="3" height="3" rx="1" fill="#647384"/>
        <rect x="30.5" y="36" width="3" height="3" rx="1" fill="#647384"/>

        <rect x="36" y="34.5" width="8" height="8" rx="2.5" fill="url(#cal_selected)"/>
        <circle cx="40" cy="38.5" r="1.2" fill="#FFFFFF"/>

        <rect x="17.5" y="43.5" width="3" height="3" rx="1" fill="#647384"/>
        <rect x="24" y="43.5" width="3" height="3" rx="1" fill="#647384"/>
        <rect x="30.5" y="43.5" width="3" height="3" rx="1" fill="#647384"/>
        <rect x="38.5" y="45" width="3" height="3" rx="1" fill="#9CA6B1"/>
        <rect x="45" y="43.5" width="3" height="3" rx="1" fill="#9CA6B1"/>

        <ellipse cx="32" cy="52" rx="14" ry="2" fill="#FFFFFF" fillOpacity="0.35"/>
      </g>

      <rect x="12.5" y="11.5" width="39" height="42" rx="5.5" stroke="url(#cal_border)"/>

      <rect x="19" y="7" width="5" height="11" rx="2.5" fill="#344150"/>
      <rect x="40" y="7" width="5" height="11" rx="2.5" fill="#344150"/>

      <path d="M21 9V15" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round"/>
      <path d="M42 9V15" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round"/>
    </g>
  </svg>
);

export const BrowserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="chromeRed" x1="15" y1="12" x2="35" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FF6258"/>
        <stop offset="1" stopColor="#D93025"/>
      </linearGradient>

      <linearGradient id="chromeYellow" x1="48" y1="16" x2="35" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFD95A"/>
        <stop offset="1" stopColor="#F6B900"/>
      </linearGradient>

      <linearGradient id="chromeGreen" x1="18" y1="51" x2="36" y2="31" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#27C96F"/>
        <stop offset="1" stopColor="#159447"/>
      </linearGradient>

      <radialGradient id="chromeBlue" cx="0" cy="0" r="1" gradientTransform="translate(29 27) rotate(48) scale(18)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#6DD8FF"/>
        <stop offset="0.45" stopColor="#26A9F4"/>
        <stop offset="1" stopColor="#0969C7"/>
      </radialGradient>

      <linearGradient id="innerRing" x1="24" y1="22" x2="41" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF"/>
        <stop offset="1" stopColor="#D9E1E8"/>
      </linearGradient>

      <filter id="chromeShadow" x="5" y="5" width="54" height="55" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#071421" floodOpacity="0.28"/>
      </filter>

      <clipPath id="chromeClip">
        <circle cx="32" cy="32" r="24"/>
      </clipPath>
    </defs>

    <g>
      <g clipPath="url(#chromeClip)">
        <path d="M32 8C40.7 8 48.3 12.6 52.5 19.5H31.5C27.1 19.5 23.2 21.7 20.9 25.1L12.7 11.8C17.6 9.3 23.4 8 32 8Z" fill="url(#chromeRed)"/>
        <path d="M52.5 19.5C54.7 23.1 56 27.4 56 32C56 42.4 49.4 51.3 40.1 54.6L29.8 37.1C32.4 38.3 35.5 38.5 38.4 37.3C44.3 34.9 47.1 28.1 44.7 22.2C44.3 21.2 43.7 20.3 43.1 19.5H52.5Z" fill="url(#chromeYellow)"/>
        <path d="M40.1 54.6C37.6 55.5 34.9 56 32 56C18.7 56 8 45.3 8 32C8 23.3 12.6 15.7 19.5 11.5L29.8 29.1C27.8 31.6 27.2 35.1 28.5 38.2C30.8 44 37.2 46.9 43.1 44.8L40.1 54.6Z" fill="url(#chromeGreen)"/>

        <path d="M19.5 11.5L29.8 29.1" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1"/>
        <path d="M52.5 19.5H31.5" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1"/>
        <path d="M40.1 54.6L29.8 37.1" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1"/>
      </g>

      <circle cx="32" cy="32" r="13" fill="url(#innerRing)"/>
      <circle cx="32" cy="32" r="10.5" fill="url(#chromeBlue)"/>
      <ellipse cx="29" cy="28" rx="6.5" ry="5" fill="#FFFFFF" fillOpacity="0.16"/>
      <circle cx="32" cy="32" r="10" stroke="#075DAE" strokeOpacity="0.45"/>
      <circle cx="32" cy="32" r="23.5" stroke="#FFFFFF" strokeOpacity="0.2"/>
    </g>
  </svg>
);

export const AppLauncherIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");

  return (
    <svg className={className} viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient
          id={`tl_${id}`}
          x1="280" y1="230"
          x2="585" y2="548"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#73C4FA"/>
          <stop offset="0.28" stopColor="#62B8F9"/>
          <stop offset="0.62" stopColor="#4EA5F3"/>
          <stop offset="1" stopColor="#368DE9"/>
        </linearGradient>

        <linearGradient
          id={`tr_${id}`}
          x1="615" y1="230"
          x2="930" y2="548"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#E0F4FD"/>
          <stop offset="0.25" stopColor="#CDEBFC"/>
          <stop offset="0.62" stopColor="#AFDCF8"/>
          <stop offset="1" stopColor="#8BC6F2"/>
        </linearGradient>

        <linearGradient
          id={`bl_${id}`}
          x1="280" y1="570"
          x2="590" y2="890"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#48A7F6"/>
          <stop offset="0.35" stopColor="#3598F1"/>
          <stop offset="0.70" stopColor="#2385E8"/>
          <stop offset="1" stopColor="#146DD9"/>
        </linearGradient>

        <linearGradient
          id={`br_${id}`}
          x1="615" y1="570"
          x2="930" y2="890"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#C4E3FA"/>
          <stop offset="0.30" stopColor="#A9D6F8"/>
          <stop offset="0.68" stopColor="#80BDF3"/>
          <stop offset="1" stopColor="#58A4EC"/>
        </linearGradient>

        <linearGradient
          id={`head_${id}`}
          x1="385" y1="700"
          x2="835" y2="900"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1F7FE2"/>
          <stop offset="0.45" stopColor="#479DED"/>
          <stop offset="0.72" stopColor="#66B1F3"/>
          <stop offset="1" stopColor="#91CBF6"/>
        </linearGradient>

        <linearGradient
          id={`headSoft_${id}`}
          x1="435" y1="700"
          x2="810" y2="895"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" stopOpacity="0.16"/>
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.02"/>
          <stop offset="1" stopColor="#1465C6" stopOpacity="0.10"/>
        </linearGradient>

        <linearGradient
          id={`edge_${id}`}
          x1="0" y1="0"
          x2="0" y2="1"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.78"/>
          <stop offset="0.18" stopColor="#E8F7FF" stopOpacity="0.45"/>
          <stop offset="0.68" stopColor="#58A9EE" stopOpacity="0.20"/>
          <stop offset="1" stopColor="#1772D1" stopOpacity="0.53"/>
        </linearGradient>

        <linearGradient
          id={`surfaceLight_${id}`}
          x1="0" y1="0"
          x2="0" y2="1"
        >
          <stop stopColor="#FFFFFF" stopOpacity="0.22"/>
          <stop offset="0.28" stopColor="#FFFFFF" stopOpacity="0.07"/>
          <stop offset="0.70" stopColor="#FFFFFF" stopOpacity="0"/>
        </linearGradient>

        <filter
          id={`shadow_${id}`}
          x="-25%"
          y="-25%"
          width="150%"
          height="165%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="17"
            stdDeviation="19"
            floodColor="#4D759D"
            floodOpacity="0.17"
          />
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#1A67AC"
            floodOpacity="0.15"
          />
        </filter>

        <filter
          id={`microDepth_${id}`}
          x="-10%"
          y="-10%"
          width="120%"
          height="130%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.5"
            floodColor="#0E5BA8"
            floodOpacity="0.18"
          />
        </filter>

        <filter
          id={`headDepth_${id}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation="5"
            result="blur"
          />
          <feOffset
            dx="0"
            dy="5"
            result="off"
          />
          <feComposite
            in="off"
            in2="SourceAlpha"
            operator="out"
            result="inner"
          />
          <feColorMatrix
            in="inner"
            type="matrix"
            values="
              0 0 0 0 0.02
              0 0 0 0 0.24
              0 0 0 0 0.55
              0 0 0 .28 0"
          />
          <feComposite
            in2="SourceGraphic"
            operator="over"
          />
        </filter>

        <clipPath id={`bottomClip_${id}`}>
          <rect
            x="275"
            y="573"
            width="320"
            height="320"
            rx="20"
          />
          <rect
            x="615"
            y="573"
            width="320"
            height="320"
            rx="20"
          />
        </clipPath>
      </defs>

      <ellipse
        cx="605"
        cy="890"
        rx="285"
        ry="34"
        fill="#417AB0"
        opacity="0.055"
      />

      <g>
        {/* TOP LEFT */}
        <rect
          x="275"
          y="233"
          width="320"
          height="320"
          rx="20"
          fill={`url(#tl_${id})`}
        />
        <rect
          x="276.5"
          y="234.5"
          width="317"
          height="317"
          rx="18.5"
          stroke={`url(#edge_${id})`}
          strokeWidth="2.3"
        />

        {/* TOP RIGHT */}
        <rect
          x="615"
          y="233"
          width="320"
          height="320"
          rx="20"
          fill={`url(#tr_${id})`}
        />
        <rect
          x="616.5"
          y="234.5"
          width="317"
          height="317"
          rx="18.5"
          stroke={`url(#edge_${id})`}
          strokeWidth="2.3"
        />

        {/* BOTTOM LEFT */}
        <rect
          x="275"
          y="573"
          width="320"
          height="320"
          rx="20"
          fill={`url(#bl_${id})`}
        />
        <rect
          x="276.5"
          y="574.5"
          width="317"
          height="317"
          rx="18.5"
          stroke={`url(#edge_${id})`}
          strokeWidth="2.3"
        />

        {/* BOTTOM RIGHT */}
        <rect
          x="615"
          y="573"
          width="320"
          height="320"
          rx="20"
          fill={`url(#br_${id})`}
        />
        <rect
          x="616.5"
          y="574.5"
          width="317"
          height="317"
          rx="18.5"
          stroke={`url(#edge_${id})`}
          strokeWidth="2.3"
        />

        {/* SOFT REALISTIC LIGHT */}
        <path
          d="M296 252 H575 V362 C499 328 400 325 296 366 Z"
          fill={`url(#surfaceLight_${id})`}
          opacity="0.24"
        />
        <path
          d="M637 252 H915 V362 C838 330 744 327 637 365 Z"
          fill={`url(#surfaceLight_${id})`}
          opacity="0.19"
        />

        {/* HIDDEN ANDROID GEOMETRY */}
        <g clipPath={`url(#bottomClip_${id})`}>
          {/* Left antenna */}
          <path
            d="M448 726 L421 674"
            stroke="#1168C8"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.36"
          />
          <path
            d="M448 723 L422 675"
            stroke="#4BA1EC"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M447 718 L425 678"
            stroke="#BFE7FD"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Right antenna */}
          <path
            d="M760 726 L786 674"
            stroke="#176FCB"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path
            d="M760 723 L785 675"
            stroke="#72B6F1"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M762 718 L783 678"
            stroke="#DCF3FF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.68"
          />

          {/* Android head */}
          <path
            d="
              M382 894
              C393 774 485 695 605 695
              C725 695 817 774 828 894
              Z"
            fill={`url(#head_${id})`}
            opacity="0.66"
          />
          <path
            d="
              M391 894
              C406 783 491 704 605 704
              C718 704 805 783 819 894
              Z"
            fill={`url(#headSoft_${id})`}
            opacity="0.64"
          />

          {/* Dark arc */}
          <path
            d="
              M382 894
              C393 774 485 695 605 695
              C725 695 817 774 828 894"
            stroke="#146FCB"
            strokeWidth="7.5"
            strokeLinecap="round"
            opacity="0.68"
          />

          {/* Highlight arc */}
          <path
            d="
              M389 892
              C404 781 491 704 605 704
              C719 704 805 781 821 892"
            stroke="#B1E0FB"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.78"
          />
        </g>
      </g>
    </svg>
  );
};

export const TrashDeleteIcon: React.FC<{ size?: number; className?: string }> = ({ size, className = "w-4 h-4" }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      width={size || 50}
      height={size || 50}
      style={style}
      viewBox="0 0 50 50"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 21 0 C 19.355469 0 18 1.355469 18 3 L 18 5 L 10.1875 5 C 10.0625 4.976563 9.9375 4.976563 9.8125 5 L 8 5 C 7.96875 5 7.9375 5 7.90625 5 C 7.355469 5.027344 6.925781 5.496094 6.953125 6.046875 C 6.980469 6.597656 7.449219 7.027344 8 7 L 9.09375 7 L 12.6875 47.5 C 12.8125 48.898438 14.003906 50 15.40625 50 L 34.59375 50 C 35.996094 50 37.1875 48.898438 37.3125 47.5 L 40.90625 7 L 42 7 C 42.359375 7.003906 42.695313 6.816406 42.878906 6.503906 C 43.058594 6.191406 43.058594 5.808594 42.878906 5.496094 C 42.695313 5.183594 42.359375 4.996094 42 5 L 32 5 L 32 3 C 32 1.355469 30.644531 0 29 0 Z M 21 2 L 29 2 C 29.5625 2 30 2.4375 30 3 L 30 5 L 20 5 L 20 3 C 20 2.4375 20.4375 2 21 2 Z M 11.09375 7 L 38.90625 7 L 35.3125 47.34375 C 35.28125 47.691406 34.910156 48 34.59375 48 L 15.40625 48 C 15.089844 48 14.71875 47.691406 14.6875 47.34375 Z M 18.90625 9.96875 C 18.863281 9.976563 18.820313 9.988281 18.78125 10 C 18.316406 10.105469 17.988281 10.523438 18 11 L 18 44 C 17.996094 44.359375 18.183594 44.695313 18.496094 44.878906 C 18.808594 45.058594 19.191406 45.058594 19.503906 44.878906 C 19.816406 44.695313 20.003906 44.359375 20 44 L 20 11 C 20.011719 10.710938 19.894531 10.433594 19.6875 10.238281 C 19.476563 10.039063 19.191406 9.941406 18.90625 9.96875 Z M 24.90625 9.96875 C 24.863281 9.976563 24.820313 9.988281 24.78125 10 C 24.316406 10.105469 23.988281 10.523438 24 11 L 24 44 C 23.996094 44.359375 24.183594 44.695313 24.496094 44.878906 C 24.808594 45.058594 25.191406 45.058594 25.503906 44.878906 C 25.816406 44.695313 26.003906 44.359375 26 44 L 26 11 C 26.011719 10.710938 25.894531 10.433594 25.6875 10.238281 C 25.476563 10.039063 25.191406 9.941406 24.90625 9.96875 Z M 30.90625 9.96875 C 30.863281 9.976563 30.820313 9.988281 30.78125 10 C 30.316406 10.105469 29.988281 10.523438 30 11 L 30 44 C 29.996094 44.359375 30.183594 44.695313 30.496094 44.878906 C 30.808594 45.058594 31.191406 45.058594 31.503906 44.878906 C 31.816406 44.695313 32.003906 44.359375 32 44 L 32 11 C 32.011719 10.710938 31.894531 10.433594 31.6875 10.238281 C 31.476563 10.039063 31.191406 9.941406 30.90625 9.96875 Z" />
    </svg>
  );
};

export const DeleteIcon = TrashDeleteIcon;

export const RecycleBinIcon: React.FC<{ className?: string; isEmpty?: boolean }> = ({ className = "w-6 h-6", isEmpty = true }) => {
  if (isEmpty) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className={className}
      >
        <path fill="#bdbdbd" d="M27,43.95v1.93c-0.33,0.01-0.66-0.04-0.98-0.15l-15.33-5.05C10.28,40.54,10,40.16,10,39.73v-1.38	L27,43.95z"></path>
        <polygon fill="#eee" points="27,16 27,35.77 22.18,34.22 10,38.35 6,9"></polygon>
        <polygon fill="#e0e0e0" points="22.18,3.4 22.18,14.39 6.2,9"></polygon>
        <polygon fill="#e0e0e0" points="27,35.77 27,43.95 10,38.35 22.18,34.22"></polygon>
        <path fill="#0277bd" d="M21.666,25.711l-2.557,0.73l2.018,4.169l1.106,0.402c0.367,0.126,0.596-0.027,0.876-0.397	c0.25-0.415,0.358-1.082,0.013-1.921l-0.025-0.077L21.666,25.711"></path>
        <path fill="#0277bd" d="M14.88,19.089c-0.571-0.208-1.234-0.217-1.602,0.271l-0.031,0.049l-1.123,1.976l2.771,2.669	l1.68-2.721l-0.709-1.447c-0.238-0.453-0.523-0.62-0.705-0.694l-0.228-0.083C14.916,19.103,14.898,19.096,14.88,19.089"></path>
        <path fill="#0277bd" d="M16.752,29.054l-3.911-1.423l-0.465,0.814L12.3,28.614c-0.077,0.262,0.004,0.587,0.216,1.065	l-0.147-0.303c0.242,0.679,0.855,1.606,1.771,2.041l0.064,0.031l2.559,0.931L16.752,29.054"></path>
        <path fill="#0091ea" d="M18.708,28.559l-1.338,2.366l1.689,3.437l-0.061-1.192l1.795,0.653	c0.025,0.012,0.05,0.022,0.075,0.031c0.182,0.066,0.344,0.042,0.454-0.224l1.796-3.029c-0.003,0.004-0.007,0.008-0.01,0.013	c-0.28,0.37-0.509,0.523-0.876,0.397l-1.106-0.402l-2.344-0.853L18.708,28.559"></path>
        <path fill="#0091ea" d="M15.11,19.172c-0.038-0.014-0.069-0.023-0.091-0.032l0.144,0.052	C15.143,19.185,15.126,19.178,15.11,19.172 M18.86,20.533c-0.033-0.012-0.067-0.023-0.104-0.032l-3.593-1.308	c0.182,0.075,0.467,0.242,0.705,0.694l0.709,1.447l1.217,2.484l-0.895,0.263l3.049,1.095l1.332-2.345l-0.909,0.25l-0.998-2.031	C19.279,20.826,19.143,20.636,18.86,20.533"></path>
        <path fill="#0091ea" d="M13.135,23.285l-3.029-1.102l0.978,0.952l-0.797,1.386c-0.1,0.152-0.136,0.343,0.081,0.739	l2.001,4.117l0.147,0.303c-0.212-0.478-0.293-0.803-0.216-1.065c0.013-0.044,0.03-0.086,0.052-0.127l0.024-0.042l0.465-0.814	l1.035-1.812l0.984,0.939L13.135,23.285"></path>
        <path fill="#757575" d="M39,39.64v1.42c0,0.42-0.27,0.79-0.66,0.94l-10.37,3.7c-0.31,0.11-0.64,0.17-0.97,0.18v-1.93	L39,39.64z"></path>
        <polygon fill="#bdbdbd" points="39,39.64 27,43.95 27,35.77"></polygon>
        <polygon fill="#e0e0e0" points="43.7,10.4 39,39.64 27,35.77 27,16"></polygon>
        <polygon fill="#eee" points="43.5,10.4 27,16 22.18,14.39 22.18,3.5"></polygon>
        <path fill="#f5f5f5" d="M22.185,3.818l19.932,6.585L27,15.473L7.541,8.987L22.185,3.818 M22.18,3.29L6,9l21,7l16.7-5.6	L22.18,3.29L22.18,3.29z"></path>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
    >
      <path fill="#bdbdbd" d="M27,43.95v1.93c-0.33,0.01-0.66-0.04-0.98-0.15l-15.33-5.05C10.28,40.54,10,40.16,10,39.73v-1.38	L27,43.95z"></path>
      <polygon fill="#e0e0e0" points="22.18,3.4 22.18,14.39 6.2,9"></polygon>
      <polygon fill="#eee" points="6,9 10,38.35 27,43.95 27,16"></polygon>
      <path fill="#0277bd" d="M21.666,25.711l-2.557,0.73l2.018,4.169l1.106,0.402c0.367,0.126,0.596-0.027,0.876-0.397	c0.25-0.415,0.358-1.082,0.013-1.921l-0.025-0.077L21.666,25.711"></path>
      <path fill="#0277bd" d="M14.88,19.089c-0.571-0.208-1.234-0.217-1.602,0.271l-0.031,0.049l-1.123,1.976l2.771,2.669	l1.68-2.721l-0.709-1.447c-0.238-0.453-0.523-0.62-0.705-0.694l-0.228-0.083C14.916,19.103,14.898,19.096,14.88,19.089"></path>
      <path fill="#0277bd" d="M16.752,29.054l-3.911-1.423l-0.465,0.814L12.3,28.614c-0.077,0.262,0.004,0.587,0.216,1.065	l-0.147-0.303c0.242,0.679,0.855,1.606,1.771,2.041l0.064,0.031l2.559,0.931L16.752,29.054"></path>
      <path fill="#0091ea" d="M18.708,28.559l-1.338,2.366l1.689,3.437l-0.061-1.192l1.795,0.653	c0.025,0.012,0.05,0.022,0.075,0.031c0.182,0.066,0.344,0.042,0.454-0.224l1.796-3.029c-0.003,0.004-0.007,0.008-0.01,0.013	c-0.28,0.37-0.509,0.523-0.876,0.397l-1.106-0.402l-2.344-0.853L18.708,28.559"></path>
      <path fill="#0091ea" d="M15.11,19.172c-0.038-0.014-0.069-0.023-0.091-0.032l0.144,0.052	C15.143,19.185,15.126,19.178,15.11,19.172 M18.86,20.533c-0.033-0.012-0.067-0.023-0.104-0.032l-3.593-1.308	c0.182,0.075,0.467,0.242,0.705,0.694l0.709,1.447l1.217,2.484l-0.895,0.263l3.049,1.095l1.332-2.345l-0.909,0.25l-0.998-2.031	C19.279,20.826,19.143,20.636,18.86,20.533"></path>
      <path fill="#0091ea" d="M13.135,23.285l-3.029-1.102l0.978,0.952l-0.797,1.386c-0.1,0.152-0.136,0.343,0.081,0.739	l2.001,4.117l0.147,0.303c-0.212-0.478-0.293-0.803-0.216-1.065c0.013-0.044,0.03-0.086,0.052-0.127l0.024-0.042l0.465-0.814	l1.035-1.812l0.984,0.939L13.135,23.285"></path>
      <path fill="#757575" d="M39,39.64v1.42c0,0.42-0.27,0.79-0.66,0.94l-10.37,3.7c-0.31,0.11-0.64,0.17-0.97,0.18v-1.93	L39,39.64z"></path>
      <polygon fill="#e0e0e0" points="27,16 27,43.95 39,39.64 43.7,10.4"></polygon>
      <polygon fill="#eee" points="43.5,10.4 27,16 22.18,14.39 22.18,3.5"></polygon>
      <path fill="#f5f5f5" d="M22.185,3.818l19.932,6.585L27,15.473L7.541,8.987L22.185,3.818 M22.18,3.29L6,9l21,7l16.7-5.6	L22.18,3.29L22.18,3.29z"></path>
      <polygon fill="#919191" points="7.55,8.994 22,3 27.481,8.481 27,15.473"></polygon>
      <polygon fill="#c4c4c4" points="7.55,8.994 16,3 27,15.473"></polygon>
      <polygon fill="#919191" points="31,3 25,6 27.028,15.5"></polygon>
      <polygon fill="#e0e0e0" points="16,3 22,3 19.012,6.417"></polygon>
      <polygon fill="#c4c4c4" points="27,15.473 31,3 42.117,10.403"></polygon>
      <polygon fill="#919191" points="26.929,15.415 10.585,6.882 7.55,8.994"></polygon>
      <polygon fill="#919191" points="39.531,8.675 27,15.473 42.117,10.403"></polygon>
    </svg>
  );
};

export const ComputerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg className={className} viewBox="0 0 256 256" fill="none">
      <defs>
        <linearGradient id={`screenGradient_${id}`} x1="28" y1="43" x2="220" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#39D2D4"/>
          <stop offset="0.45" stopColor="#25B6D5"/>
          <stop offset="1" stopColor="#147CC5"/>
        </linearGradient>

        <radialGradient id={`screenLight_${id}`} cx="0" cy="0" r="1" gradientTransform="translate(75 67) rotate(44) scale(138 108)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18"/>
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.03"/>
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
        </radialGradient>

        <linearGradient id={`bezelGradient_${id}`} x1="16" y1="30" x2="240" y2="193" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D4DCE1"/>
          <stop offset="0.32" stopColor="#A7B3BA"/>
          <stop offset="0.72" stopColor="#75838B"/>
          <stop offset="1" stopColor="#4C5B63"/>
        </linearGradient>

        <linearGradient id={`innerBezel_${id}`} x1="20" y1="34" x2="236" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#58666D"/>
          <stop offset="1" stopColor="#34434A"/>
        </linearGradient>

        <linearGradient id={`standNeck_${id}`} x1="112" y1="188" x2="144" y2="218" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C9D1D6"/>
          <stop offset="0.52" stopColor="#A4AFB5"/>
          <stop offset="1" stopColor="#7F8C93"/>
        </linearGradient>

        <linearGradient id={`standBase_${id}`} x1="76" y1="212" x2="181" y2="229" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#CED7DC"/>
          <stop offset="0.5" stopColor="#AAB5BC"/>
          <stop offset="1" stopColor="#77858D"/>
        </linearGradient>

        <linearGradient id={`baseFront_${id}`} x1="74" y1="220" x2="183" y2="229" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5F6E76"/>
          <stop offset="1" stopColor="#35444B"/>
        </linearGradient>

        <filter id={`monitorShadow_${id}`} x="5" y="20" width="246" height="217" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.35"/>
        </filter>

        <clipPath id={`screenClip_${id}`}>
          <rect x="20" y="36" width="216" height="152" rx="4"/>
        </clipPath>
      </defs>

      <g>
        <rect x="15" y="30" width="226" height="163" rx="9" fill={`url(#bezelGradient_${id})`}/>
        <rect x="18" y="33" width="220" height="158" rx="6" fill={`url(#innerBezel_${id})`}/>

        <g clipPath={`url(#screenClip_${id})`}>
          <rect x="20" y="36" width="216" height="152" fill={`url(#screenGradient_${id})`}/>
          <rect x="20" y="36" width="216" height="152" fill={`url(#screenLight_${id})`}/>

          <path d="M20 146C65 130 110 151 154 143C188 137 214 122 236 113V188H20V146Z" fill="#006BC0" fillOpacity="0.08"/>
          <path d="M26 41H220" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="2" strokeLinecap="round"/>
        </g>

        <rect x="19.5" y="35.5" width="217" height="153" rx="4.5" stroke="#26383F" strokeOpacity="0.65"/>
        <path d="M23 34C20.2 34 18 36.2 18 39V177" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round"/>

        <path d="M112 192H144V215H112V192Z" fill={`url(#standNeck_${id})`}/>
        <path d="M114 194H128" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"/>

        <path d="M82 212H174L182 219H74L82 212Z" fill={`url(#standBase_${id})`}/>
        <path d="M74 219H182V226C182 227.7 180.7 229 179 229H77C75.3 229 74 227.7 74 226V219Z" fill={`url(#baseFront_${id})`}/>
        <path d="M80 216H174" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    </svg>
  );
};

export const HomeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <defs>
        <linearGradient id={`hm_ga_${id}`} x1="6" x2="42" y1="41" y2="41" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c8d3de"/>
          <stop offset="1" stopColor="#c8d3de"/>
        </linearGradient>
        <linearGradient id={`hm_gb_${id}`} x1="14.095" x2="31.385" y1="10.338" y2="43.787" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fcfcfc"/>
          <stop offset="0.495" stopColor="#f4f4f4"/>
          <stop offset="0.946" stopColor="#e8e8e8"/>
          <stop offset="1" stopColor="#e8e8e8"/>
        </linearGradient>
        <linearGradient id={`hm_gc_${id}`} x1="24" x2="24" y1="1.684" y2="23.696" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d43a02"/>
          <stop offset="1" stopColor="#b9360c"/>
        </linearGradient>
        <linearGradient id={`hm_gd_${id}`} x1="28.05" x2="35.614" y1="25.05" y2="32.614" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#33bef0"/>
          <stop offset="1" stopColor="#0a85d9"/>
        </linearGradient>
      </defs>
      <path fill={`url(#hm_ga_${id})`} d="M42,39H6v2c0,1.105,0.895,2,2,2h32c1.105,0,2-0.895,2-2V39z"/>
      <path fill={`url(#hm_gb_${id})`} d="M42,39H6V20L24,3l18,17V39z"/>
      <path fill="#de490d" d="M13,25h10c0.552,0,1,0.448,1,1v17H12V26C12,25.448,12.448,25,13,25z"/>
      <path d="M24,4c-0.474,0-0.948,0.168-1.326,0.503l-5.359,4.811L6,20v5.39L24,9.428L42,25.39V20L30.685,9.314	l-5.359-4.811C24.948,4.168,24.474,4,24,4z" opacity="0.05"/>
      <path d="M24,3c-0.474,0-0.948,0.167-1.326,0.5l-5.359,4.784L6,18.909v5.359L24,8.397l18,15.871v-5.359	L30.685,8.284L25.326,3.5C24.948,3.167,24.474,3,24,3z" opacity="0.07"/>
      <path fill={`url(#hm_gc_${id})`} d="M44.495,19.507L25.326,2.503C24.948,2.168,24.474,2,24,2s-0.948,0.168-1.326,0.503	L3.505,19.507c-0.42,0.374-0.449,1.02-0.064,1.43l1.636,1.745c0.369,0.394,0.984,0.424,1.39,0.067L24,7.428L41.533,22.75	c0.405,0.356,1.021,0.327,1.39-0.067l1.636-1.745C44.944,20.527,44.915,19.881,44.495,19.507z"/>
      <path fill={`url(#hm_gd_${id})`} d="M29,25h6c0.552,0,1,0.448,1,1v6c0,0.552-0.448,1-1,1h-6c-0.552,0-1-0.448-1-1v-6	C28,25.448,28.448,25,29,25z"/>
    </svg>
  );
};

export const DocumentIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <defs>
        <linearGradient id={`dc_ka_${id}`} x1="28.529" x2="33.6" y1="2761.471" y2="2756.4" gradientTransform="translate(0 -2746)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3079d6"/>
          <stop offset="1" stopColor="#297cd2"/>
        </linearGradient>
      </defs>
      <path fill="#50e6ff" d="M39,16v25c0,1.105-0.895,2-2,2H11c-1.105,0-2-0.895-2-2V7c0-1.105,0.895-2,2-2h17l3,8L39,16z"/>
      <path fill={`url(#dc_ka_${id})`} d="M28,5v9c0,1.105,0.895,2,2,2h9L28,5z"/>
      <path fill="#057093" d="M32.5,24h-17c-0.276,0-0.5-0.224-0.5-0.5v-1c0-0.276,0.224-0.5,0.5-0.5h17c0.276,0,0.5,0.224,0.5,0.5	v1C33,23.776,32.776,32,32.5,24z"/>
      <path fill="#057093" d="M30.5,28h-15c-0.276,0-0.5-0.224-0.5-0.5v-1c0-0.276,0.224-0.5,0.5-0.5h15c0.276,0,0.5,0.224,0.5,0.5	v1C31,27.776,30.776,28,30.5,28z"/>
      <path fill="#057093" d="M32.5,32h-17c-0.276,0-0.5-0.224-0.5-0.5v-1c0-0.276,0.224-0.5,0.5-0.5h17c0.276,0,0.5,0.224,0.5,0.5	v1C33,31.776,32.776,32,32.5,32z"/>
      <path fill="#057093" d="M30.5,36h-15c-0.276,0-0.5-0.224-0.5-0.5v-1c0-0.276,0.224-0.5,0.5-0.5h15c0.276,0,0.5,0.224,0.5,0.5	v1C31,35.776,30.776,36,30.5,36z"/>
    </svg>
  );
};

export const DocumentsIcon = DocumentIcon;

export const PdfIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg className={className} viewBox="0 0 256 256" fill="none">
      <defs>
        <linearGradient id={`pdfPaperGradient_${id}`} x1="58" y1="28" x2="192" y2="226" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset="0.55" stopColor="#F5F7FA"/>
          <stop offset="1" stopColor="#D5DEE5"/>
        </linearGradient>

        <linearGradient id={`pdfFoldGradient_${id}`} x1="158" y1="34" x2="198" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E0E7ED"/>
          <stop offset="1" stopColor="#B0BEC7"/>
        </linearGradient>

        <linearGradient id={`pdfHeaderGradient_${id}`} x1="68" y1="75" x2="188" y2="125" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF4B4B"/>
          <stop offset="0.5" stopColor="#E52525"/>
          <stop offset="1" stopColor="#B31212"/>
        </linearGradient>

        <filter id={`pdfBadgeShadow_${id}`} x="60" y="70" width="136" height="60" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#800000" floodOpacity="0.35"/>
        </filter>

        <linearGradient id={`pdfBorderGradient_${id}`} x1="52" y1="24" x2="197" y2="227" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95"/>
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.25"/>
          <stop offset="1" stopColor="#64717C" stopOpacity="0.45"/>
        </linearGradient>

        <filter id={`pdfDocumentShadow_${id}`} x="35" y="12" width="187" height="230" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#071421" floodOpacity="0.3"/>
        </filter>

        <clipPath id={`pdfDocumentClip_${id}`}>
          <path d="M53 25H158L199 66V222C199 228.627 193.627 234 187 234H53C46.373 234 41 228.627 41 222V37C41 30.373 46.373 25 53 25Z"/>
        </clipPath>
      </defs>

      <g>
        <path d="M53 25H158L199 66V222C199 228.627 193.627 234 187 234H53C46.373 234 41 228.627 41 222V37C41 30.373 46.373 25 53 25Z" fill={`url(#pdfPaperGradient_${id})`}/>

        <g clipPath={`url(#pdfDocumentClip_${id})`}>
          <ellipse cx="97" cy="47" rx="82" ry="40" fill="#FFFFFF" fillOpacity="0.36"/>

          <path d="M158 25V58C158 62.418 161.582 66 166 66H199L158 25Z" fill={`url(#pdfFoldGradient_${id})`}/>
          <path d="M160 28L195 63" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round"/>

          <g>
            <rect x="68" y="76" width="120" height="46" rx="8" fill={`url(#pdfHeaderGradient_${id})`}/>
            <rect x="69" y="77" width="118" height="44" rx="7" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1"/>
            
            <text x="128" y="108" fill="#FFFFFF" fontSize="24" fontWeight="800" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1.5">PDF</text>
          </g>

          <rect x="68" y="138" width="99" height="7" rx="3.5" fill="#8A99A6"/>
          <rect x="68" y="155" width="113" height="7" rx="3.5" fill="#A4B2BE"/>
          <rect x="68" y="172" width="92" height="7" rx="3.5" fill="#A4B2BE"/>
          <rect x="68" y="189" width="108" height="7" rx="3.5" fill="#A4B2BE"/>

          <ellipse cx="120" cy="225" rx="60" ry="8" fill="#FFFFFF" fillOpacity="0.28"/>
        </g>

        <path d="M53 25.5H157.793L198.5 66.207V222C198.5 228.351 193.351 233.5 187 233.5H53C46.649 233.5 41.5 228.351 41.5 222V37C41.5 30.649 46.649 25.5 53 25.5Z" stroke={`url(#pdfBorderGradient_${id})`}/>
        <path d="M158 25V58C158 62.418 161.582 66 166 66H199" stroke="#87949E" strokeOpacity="0.4" strokeWidth="1.5"/>
        <path d="M48 42C48 35.925 52.925 31 59 31H122" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
};

export const CustomDriveIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  const rawId = React.useId();
  const id = rawId.replace(/:/g, "_");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient
          id={`topSurface_${id}`}
          x1="48"
          y1="74"
          x2="205"
          y2="127"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F1F2F4"/>
          <stop offset="1" stopColor="#D4D7DC"/>
        </linearGradient>

        <linearGradient
          id={`frontPanel_${id}`}
          x1="20"
          y1="122"
          x2="232"
          y2="183"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#262626"/>
          <stop offset="1" stopColor="#505050"/>
        </linearGradient>

        <linearGradient
          id={`outerShell_${id}`}
          x1="17"
          y1="116"
          x2="235"
          y2="190"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#B7B9BC"/>
          <stop offset="1" stopColor="#8B8F92"/>
        </linearGradient>

        <radialGradient
          id={`statusLight_${id}`}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(58 151) rotate(90) scale(10)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#B8FFBD"/>
          <stop offset="0.45" stopColor="#33F143"/>
          <stop offset="1" stopColor="#00B414"/>
        </radialGradient>

        <filter
          id={`driveShadow_${id}`}
          x="8"
          y="63"
          width="240"
          height="137"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.22"
          />
        </filter>

        <filter
          id={`ledGlow_${id}`}
          x="43"
          y="136"
          width="30"
          height="30"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g>
        <path
          d="M18 120 L52 79 C55 75.5 59 74 64 74 H188 C193 74 197 75.5 200 79 L234 120 V180 C234 185.5 230 189 225 189 H27 C22 189 18 185.5 18 180 V120Z"
          fill={`url(#outerShell_${id})`}
        />

        <path
          d="M21 119 L53.5 81 C56.2 77.8 60 76 64.5 76 H187.5 C192 76 195.8 77.8 198.5 81 L231 119 H21Z"
          fill={`url(#topSurface_${id})`}
        />

        <path
          d="M31 112L58 81.5C59.8 79.5 62 79 66 79H183"
          stroke="#FFFFFF"
          strokeOpacity="0.38"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M22 121H230V178 C230 182.5 227 185 222 185 H30 C25 185 22 182.5 22 178 V121Z"
          fill={`url(#frontPanel_${id})`}
        />

        <path
          d="M23 122H229"
          stroke="#686868"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />

        <g>
          <circle
            cx="58"
            cy="151"
            r="9"
            fill={`url(#statusLight_${id})`}
          />
        </g>

        <circle
          cx="55.5"
          cy="148.5"
          r="2.2"
          fill="#FFFFFF"
          fillOpacity="0.65"
        />

        <path
          d="M28 183H222"
          stroke="#FFFFFF"
          strokeOpacity="0.1"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <path
          d="M18.5 120.2 L52.4 79.4 C55.3 75.9 59.2 74.5 64 74.5 H188 C192.8 74.5 196.7 75.9 199.6 79.4 L233.5 120.2 V180 C233.5 185.1 229.8 188.5 225 188.5 H27 C22.2 188.5 18.5 185.1 18.5 180 V120.2Z"
          stroke="#6E7275"
          strokeOpacity="0.32"
        />
      </g>
    </svg>
  );
};
