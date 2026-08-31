import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'docs'
  | 'bench'
  | 'settings'
  | 'send'
  | 'receive'
  | 'file'
  | 'camera'
  | 'mic'
  | 'qr'
  | 'done'
  | 'check'
  | 'alert'
  | 'chevron'
  | 'chevronLeft'
  | 'sun'
  | 'moon'
  | 'stats'
  | 'pause'
  | 'play'
  | 'trash'
  | 'lock'
  | 'shield'
  | 'external';

export function Icon({
  name,
  size = 20,
  color = '#141414',
}: {
  name: IconName;
  size?: number;
  color?: string;
  weight?: any;
}) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="9 22 9 12 15 12 15 22"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'docs':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="14 2 14 8 20 8"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="16"
            y1="13"
            x2="8"
            y2="13"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="16"
            y1="17"
            x2="8"
            y2="17"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'bench':
    case 'stats':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line
            x1="18"
            y1="20"
            x2="18"
            y2="10"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="12"
            y1="20"
            x2="12"
            y2="4"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="6"
            y1="20"
            x2="6"
            y2="14"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="2"
            y1="20"
            x2="22"
            y2="20"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12"
            cy="12"
            r="3"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12"
            cy="12"
            r="5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'chevronLeft':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="15 18 9 12 15 6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'chevron':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="9 18 15 12 9 6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'mic':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'qr':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.75} />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.75} />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.75} />
          <Rect x="14" y="14" width="3" height="3" fill={color} />
          <Rect x="18" y="14" width="3" height="3" fill={color} />
          <Rect x="14" y="18" width="3" height="3" fill={color} />
          <Rect x="18" y="18" width="3" height="3" fill={color} />
        </Svg>
      );

    case 'check':
    case 'done':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="20 6 9 17 4 12"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'external':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="15 3 21 3 21 9"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="10"
            y1="14"
            x2="21"
            y2="3"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={1.75} />
          <Path
            d="M7 11V7a5 5 0 0110 0v4"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} />
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} />
        </Svg>
      );

    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polygon points="5 3 19 12 5 21 5 3" fill={color} />
        </Svg>
      );

    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="3 6 5 6 21 6"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'send':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <Polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case 'receive':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 14V6a2 2 0 012-2h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M20 14V6a2 2 0 00-2-2h-8" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M4 18v2a2 2 0 002 2h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M20 18v2a2 2 0 01-2 2h-8" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );

    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.75} />
        </Svg>
      );

    case 'file':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case 'alert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );

    default:
      return null;
  }
}
