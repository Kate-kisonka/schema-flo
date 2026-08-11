import React from "react";

const PATHS = {
  close: (<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>),
  check: (<path d="M5 12.5l4.5 4.5L19 7" />),
  checkCircle: (<><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.6 2.6L16 9.3" /></>),
  arrowLeft: (<><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>),
  arrowRight: (<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>),
  arrowUp: (<><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>),
  undo: (<><path d="M7 7 3 11l4 4" /><path d="M3 11h11a6 6 0 0 1 0 12h-3" /></>),
  download: (<><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></>),
  upload: (<><path d="M5 4h14" /><path d="M12 20V9" /><path d="M7 13l5-5 5 5" /></>),
  chevronDown: (<path d="M6 9l6 6 6-6" />),
  chevronUp: (<path d="M6 15l6-6 6 6" />),
  clock: (<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>),
  barChart: (<><path d="M5 20V12" /><path d="M11 20V6" /><path d="M17 20v-6" /></>),
  trendUp: (<><path d="M4 17l5.5-5.5 3.5 3.5 6-6.5" /><path d="M15.5 8h3.5v3.5" /></>),
  trendDown: (<><path d="M4 7l5.5 5.5 3.5-3.5 6 6.5" /><path d="M15.5 16h3.5v-3.5" /></>),

  wave: (<><path d="M2 14.5c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 6 0" /><path d="M2 9.5c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 6 0" /></>),
  lock: (<><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>),
  jar: (<><path d="M9 2h6" /><path d="M9 2v3.5L7 8v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-2-2.5V2" /></>),
  heartCrack: (<><path d="M12 20s-7-4.35-9.5-9C.8 7.5 3 4 6 4c2 0 4 1.5 6 4 2-2.5 4-4 6-4 3 0 5.2 3.5 3.5 7-2.5 4.65-9.5 9-9.5 9Z" /><path d="M12 8l-1.6 3.4 2.4 1.8-1.6 3.4" /></>),
  island: (<><path d="M2 17c2.5-2 5 2 7.5 0s5-2 7.5 0 5-2 7 0" /><path d="M12 13V6" /><path d="M12 7c-2 0-3 1-3 2M12 6c2 0 3 1 3 2" /></>),
  thread: (<><path d="M4 20 14 10" /><path d="M14 10a2 2 0 1 0 2.8-2.8A2 2 0 0 0 14 10Z" /><path d="M2 22c1-1 2-1 3 0" /></>),
  bolt: (<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />),
  spiral: (<path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 0-7 7 5 5 0 1 0 5-5 3 3 0 1 0-3 3" />),
  crown: (<path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4L4 18Z" />),
  tornado: (<><path d="M4 6h16" /><path d="M6 10h12" /><path d="M8 14h8" /><path d="M10 18h4" /></>),
  masks: (<><path d="M9 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /><path d="M7.3 7.3h.01M10.7 7.3h.01" /><path d="M15 8a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" /><path d="M13.3 15.3h.01M16.7 15.3h.01" /></>),
  candle: (<><path d="M12 2c1 1.4 1 2.6 0 4" /><rect x="9" y="7" width="6" height="13" rx="1" /></>),
  mirror: (<><rect x="6" y="3" width="12" height="16" rx="6" /><path d="M12 19v3" /><path d="M9 22h6" /></>),
  rainCloud: (<><path d="M7 14a4 4 0 0 1 .3-8 5 5 0 0 1 9.4 2A3.5 3.5 0 0 1 16.5 15H7Z" /><path d="M8 18v2M12 18v2M16 18v2" /></>),
  iceCube: (<><path d="M4 8l8-4 8 4-8 4-8-4Z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></>),
  scales: (<><path d="M12 3v18" /><path d="M6 7h12" /><path d="M6 7l-3 6a3 3 0 0 0 6 0L6 7Z" /><path d="M18 7l-3 6a3 3 0 0 0 6 0L18 7Z" /></>),
  hammer: (<><path d="M15 3l6 6-2 2-6-6 2-2Z" /><path d="M13 5l-9 9v3h3l9-9" /></>),

  faceJoy: (<><circle cx="12" cy="12" r="9" /><path d="M8 10h.01M16 10h.01" /><path d="M8 14c1.5 2 6.5 2 8 0" /></>),
  handshake: (<><path d="M2 12c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2" /><path d="M9 10v5M15 10v5" /></>),
  faceFear: (<><circle cx="12" cy="12" r="9" /><path d="M8 9l-1-1M16 9l1-1" /><circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none" /><circle cx="15" cy="11" r="0.6" fill="currentColor" stroke="none" /><path d="M9.5 15.3a3 2 0 0 0 5 0" /></>),
  faceSurprise: (<><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /><circle cx="12" cy="15.3" r="1.8" /></>),
  faceSad: (<><circle cx="12" cy="12" r="9" /><path d="M8 10h.01M16 10h.01" /><path d="M8 16.2c1.5-2 6.5-2 8 0" /></>),
  faceNeutral: (<><circle cx="12" cy="12" r="9" /><path d="M8 10h.01M16 9.2l-2 .8" /><path d="M8 15h8" /></>),
  faceAngry: (<><circle cx="12" cy="12" r="9" /><path d="M8 9.3l2 .9M16 9.3l-2 .9" /><path d="M8 16.2c1.5-2 6.5-2 8 0" /></>),
  sunrise: (<><path d="M3 16h18" /><path d="M6 16a6 6 0 0 1 12 0" /><path d="M12 6v2M7 8l1.4 1.4M17 8l-1.4 1.4" /></>),

  star: (<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3Z" />),
  heart: (<path d="M12 20s-7-4.35-9.5-9C.8 7.5 3 4 6 4c2 0 4 1.5 6 4 2-2.5 4-4 6-4 3 0 5.2 3.5 3.5 7-2.5 4.65-9.5 9-9.5 9Z" />),
  sprout: (<><path d="M12 20V10" /><path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5ZM12 10c0-3 2-5 5-5 0 3-2 5-5 5Z" /></>),
  search: (<><circle cx="10" cy="10" r="6" /><path d="M21 21l-5.2-5.2" /></>),
  sparkle: (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></>),
  flower: (<><circle cx="12" cy="12" r="1.8" /><path d="M12 10c-1-2-1-4 0-5s2 1 0 5ZM12 14c1 2 1 4 0 5s-2-1 0-5ZM10 12c-2-1-4-1-5 0s1 2 5 0ZM14 12c2-1 4-1 5 0s-1 2-5 0Z" /></>),
  comet: (<><path d="M12 6l1.4 3 3 .3-2.3 2 .7 3-2.8-1.6L9.2 14.3l.7-3-2.3-2 3-.3L12 6Z" /><path d="M4 18l4-1M3 14l3 .4" /></>),
  tenderHeart: (<><path d="M6.5 12.8c-1.4-1.2-2.3-2.2-2.3-3.5A1.9 1.9 0 0 1 8 8c.4 0 .8.2 1 .5.2-.3.6-.5 1-.5a1.9 1.9 0 0 1 1.4 3.3c-1 1-2.3 1.7-2.9 1.9-.6-.2-1.6-.9-2-1.4Z" /><path d="M13.5 17.3c-1-.8-1.7-1.6-1.7-2.5a1.4 1.4 0 0 1 2.7-.6c.2-.4.6-.6 1-.6a1.4 1.4 0 0 1 1 2.3c-.7.7-1.7 1.2-2.2 1.4-.3-.1-.6-.3-.8-0Z" /></>),
  butterfly: (<><path d="M12 4v16" /><path d="M12 8c-2-4-8-4-8 0s4 4 6 2" /><path d="M12 8c2-4 8-4 8 0s-4 4-6 2" /><path d="M12 14c-2 3-7 3-7 0s3-3 5-1" /><path d="M12 14c2 3 7 3 7 0s-3-3-5-1" /></>),
  faceAnxious: (<><circle cx="12" cy="12" r="9" /><path d="M7.5 9l1 1M16.5 9l-1 1" /><path d="M9 16c.7-1 1.6-1.5 3-1.5s2.3.5 3 1.5" /></>),
  faceTerror: (<><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1.3" /><circle cx="15" cy="10" r="1.3" /><path d="M9 16.5a3 2.3 0 0 1 6 0" /></>),
  flame: (<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-1-1.5-1-2 2 1 4 3.5 4 6.5a6 6 0 0 1-12 0C5 10 9 8 12 3Z" />),
  burst: (<><path d="M12 5v4M12 15v4M5 12h4M15 12h4" /><path d="M7.5 7.5l2.5 2.5M14 14l2.5 2.5M7.5 16.5l2.5-2.5M14 10l2.5-2.5" /></>),
  faceContempt: (<><circle cx="12" cy="12" r="9" /><path d="M8.5 10.2h2M14 9.7l2 .8" /><path d="M9 15.5h5" /></>),
  faceDisappointed: (<><circle cx="12" cy="12" r="9" /><path d="M8 10h.01M16 10h.01" /><path d="M9 16.3c1-1.3 5-1.3 6 0" /></>),
  photo: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7l1.5-3h5L16 7" /><circle cx="12" cy="14" r="3.5" /></>),
  moon: (<path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a7 7 0 0 0 9.5 9.5Z" />),
  faceEmbarrassed: (<><circle cx="12" cy="12" r="9" /><path d="M8.5 10.3h1.3M14.2 10.3h1.3" /><path d="M9 15.5c1-.8 5-.8 6 0" /><path d="M6.5 13.5h1.2M16.3 13.5h1.2" /></>),
  rose: (<><path d="M12 20V12" /><path d="M9 15l-2 1" /><path d="M12 12a3 3 0 1 0-3-3c0 1.7 1.3 3 3 3Z" /></>),
  mist: (<><path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /></>),

  headache: (<><circle cx="12" cy="13" r="7" /><path d="M13.5 8.5l-3 5h3l-2 4" /><path d="M9 5.5c1-.8 2-1.2 3-1.2" /></>),
  bone: (<><circle cx="6.3" cy="7.8" r="1.9" /><circle cx="6.3" cy="10.6" r="1.9" /><circle cx="17.7" cy="13.4" r="1.9" /><circle cx="17.7" cy="16.2" r="1.9" /><path d="M7.7 9.3l8.6 5.4" /></>),
  sleep: (<><path d="M4 14c2 2 5 2 7 0" /><path d="M15 6h4l-4 4h4" /></>),
  droplet: (<path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" />),

  circleEmpty: (<circle cx="12" cy="12" r="8" />),
  dry: (<><path d="M4 12.5c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" /><path d="M6 17h2.5M11 17h2M15 17h2.5" /></>),
  gem: (<><path d="M6 9l3-5h6l3 5-7 11L6 9Z" /><path d="M6 9h12" /><path d="M9 4l1.5 5L9 9m6-5l-1.5 5L15 9" /></>),
  bloodDrop: (<><path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" /><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" /></>),
  bubbles: (<><circle cx="8" cy="14" r="3" /><circle cx="15.5" cy="10" r="2" /><circle cx="17.5" cy="16" r="1.4" /></>),
  rock: (<path d="M4 16l2-6 5-3 6 1 3 5-2 5-8 2-6-4Z" />),
  windGust: (<><path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 14h15a2.5 2.5 0 1 1-2.5 2.5" /><path d="M3 19h9" /></>),

  snowflake: (<><path d="M12 3v18" /><path d="M4.5 7.5l15 9" /><path d="M19.5 7.5l-15 9" /><path d="M12 3l-1.5 2M12 3l1.5 2M12 21l-1.5-2M12 21l1.5-2" /></>),
  cloudSun: (<><circle cx="8" cy="7.5" r="2.5" /><path d="M8 3.2v1M4.2 7.5h-1M5.5 4.5l.7.7" /><path d="M9 18a4 4 0 0 1 .5-8 5 5 0 0 1 9 2 3 3 0 0 1-.5 6H9Z" /></>),

  plate: (<><circle cx="12" cy="13" r="8" /><circle cx="12" cy="13" r="3.5" /></>),
  walk: (<><circle cx="14" cy="4.3" r="1.6" /><path d="M14 7l-2.5 4.5 3 2 1 5.5" /><path d="M11.5 11.5l-3.5 2 .8 4M14 9.5l3 .5 2 3.5" /></>),
  shield: (<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />),
  anchor: (<><circle cx="12" cy="5" r="2" /><path d="M12 7v12" /><path d="M8 10h8" /><path d="M5 14a7 7 0 0 0 7 6 7 7 0 0 0 7-6" /></>),
  flex: (<><path d="M5 19c3 0 5-2 5-5 0-2-1-4 0-6 1 3 3 4 3 4s2-1 3-4c1 2 0 4 0 6 0 3 2 5 5 5" /><path d="M9 14a3 3 0 0 0 6 0" /></>),
  chat: (<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4V6Z" />),
  medal: (<><circle cx="12" cy="14.5" r="5" /><path d="M9 10L7 3M15 10l2-7" /><path d="M10.2 14.7l1.3 1.3 2.3-2.6" /></>),
  link: (<><path d="M9 15l6-6" /><path d="M8 12l-2 2a3 3 0 0 0 4 4l2-2" /><path d="M16 12l2-2a3 3 0 0 0-4-4l-2 2" /></>),
  palette: (<><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-1 2-2 0-.6-.3-1-.7-1.4-.4-.4-.3-1.2.4-1.5.6-.2 1.3-.1 2 .1a2 2 0 0 0 2.5-2A9 9 0 0 0 12 3Z" /><circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2V5Z" /></>),
  plane: (<><path d="M21 3 3 11l7 3 3 7 8-18Z" /><path d="M10 14l4-4" /></>),
  openHands: (<><path d="M4 14c0-3 2-5 4-5M4 14c0 3 2 5 4 5M20 14c0-3-2-5-4-5M20 14c0 3-2 5-4 5" /><path d="M8 9c2-2 6-2 8 0" /></>),

  breath: (<><path d="M4 12a8 8 0 0 1 16 0" /><path d="M7 12a5 5 0 0 1 10 0" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>),
  tap: (<><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="8.5" /></>),
  home: (<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />),
  teddyBear: (<><circle cx="8" cy="6.2" r="2.2" /><circle cx="16" cy="6.2" r="2.2" /><circle cx="12" cy="13.5" r="7" /><circle cx="9.5" cy="12.5" r="0.7" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12.5" r="0.7" fill="currentColor" stroke="none" /><path d="M9.5 16.3c1 1 4 1 5 0" /></>),
  chair: (<><path d="M6 4v9" /><path d="M18 4v16" /><path d="M6 13h12" /><path d="M6 13v7" /></>),
  notebook: (<><path d="M6 3h10l3 3v15H6V3Z" /><path d="M16 3v3h3" /><path d="M9 11h7M9 15h7" /></>),
  wrench: (<path d="M14.5 3a4.5 4.5 0 0 0-5.6 5.9L4 14l3 3 5.1-4.9A4.5 4.5 0 0 0 19 7.5l-3.2 3.2-2-2L17 5.5A4.5 4.5 0 0 0 14.5 3Z" />),
  mute: (<><path d="M5 9.5v5h3l4 3.5v-12L8 9.5H5Z" /><path d="M16 9l5 6M21 9l-5 6" /></>),
  faceDisgust: (<><circle cx="12" cy="12" r="9" /><path d="M7.5 10l1.5-.8M15 9.2l1.5.8" /><path d="M8 15.5c1-1.2 2-1.2 2 0s1 1.2 2 0 1-1.2 2 0 2 1.2 2 0" /></>),
  faceSick: (<><circle cx="12" cy="12" r="9" /><path d="M7.5 9l1.5 1.5M9 9l-1.5 1.5M15 9l1.5 1.5M16.5 9l-1.5 1.5" /><path d="M8 15.5c1-1 1.7-1 2.5 0s1.7 1 2.5 0 1.5-1 2-1" /></>),
};

export function Icon({ name, size = 18, strokeWidth = 1.8, style, ...rest }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {content}
    </svg>
  );
}

export default Icon;
