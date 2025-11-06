export interface Theme {
  name: string
  displayName: string
  colors: {
    // Primary accent color
    primary: string
    primaryLight: string
    primaryDark: string

    // Background colors
    bgDark: string
    bgSemiTransparent: string
    bgTransparent: string

    // Text colors
    textPrimary: string
    textSecondary: string
    textMuted: string

    // Border colors
    borderPrimary: string
    borderLight: string

    // Message colors
    messageOther: string
    messageOwn: string
    messageBorder: string
    messageOwnBorder: string

    // Button colors
    buttonBg: string
    buttonHoverBg: string
    buttonBorder: string

    // Leave button (danger)
    leaveBg: string
    leaveHoverBg: string
    leaveBorder: string
    leaveHoverBorder: string
    leaveText: string
    leaveHoverText: string
  }
  aurora: {
    colorStops: [string, string, string]
    amplitude: number
    blend: number
    speed: number
    intensity: number
  }
}

export const themes: Record<string, Theme> = {
  purple: {
    name: 'purple',
    displayName: 'Purple Dream',
    colors: {
      primary: '#676cff',
      primaryLight: 'rgba(103, 108, 255, 0.2)',
      primaryDark: 'rgba(29, 3, 129, 0.2)',

      bgDark: '#171D22',
      bgSemiTransparent: 'rgba(23, 29, 34, 0.85)',
      bgTransparent: 'rgba(23, 29, 34, 0.8)',

      textPrimary: '#ffffff',
      textSecondary: '#676cff',
      textMuted: 'rgba(255, 255, 255, 0.5)',

      borderPrimary: 'rgba(118, 37, 231, 0.55)',
      borderLight: 'rgba(104, 22, 211, 0.58)',

      messageOther: 'rgba(255, 255, 255, 0.1)',
      messageOwn: 'rgba(103, 108, 255, 0.2)',
      messageBorder: 'rgba(255, 255, 255, 0.3)',
      messageOwnBorder: '#676cff',

      buttonBg: 'rgba(133, 103, 255, 0.11)',
      buttonHoverBg: 'rgba(29, 3, 129, 0.2)',
      buttonBorder: '#676cff',

      leaveBg: 'rgba(255, 103, 103, 0.1)',
      leaveHoverBg: 'rgba(255, 103, 103, 0.2)',
      leaveBorder: 'rgba(255, 103, 103, 0.5)',
      leaveHoverBorder: 'rgba(255, 103, 103, 0.8)',
      leaveText: 'rgba(255, 103, 103, 0.9)',
      leaveHoverText: 'rgba(255, 103, 103, 1)',
    },
    aurora: {
      colorStops: ['#676cff', '#171D22', '#676cff'],
      amplitude: 1.5,
      blend: 0.8,
      speed: 0.4,
      intensity: 0.6,
    },
  },

  slateGreen: {
    name: 'slateGreen',
    displayName: 'Slate Green',
    colors: {
      primary: '#4ade80',
      primaryLight: 'rgba(74, 222, 128, 0.2)',
      primaryDark: 'rgba(21, 128, 61, 0.3)',

      bgDark: '#0f172a',
      bgSemiTransparent: 'rgba(15, 23, 42, 0.85)',
      bgTransparent: 'rgba(15, 23, 42, 0.8)',

      textPrimary: '#f1f5f9',
      textSecondary: '#4ade80',
      textMuted: 'rgba(241, 245, 249, 0.5)',

      borderPrimary: 'rgba(74, 222, 128, 0.3)',
      borderLight: 'rgba(134, 239, 172, 0.3)',

      messageOther: 'rgba(148, 163, 184, 0.15)',
      messageOwn: 'rgba(74, 222, 128, 0.2)',
      messageBorder: 'rgba(148, 163, 184, 0.4)',
      messageOwnBorder: '#4ade80',

      buttonBg: 'rgba(74, 222, 128, 0.15)',
      buttonHoverBg: 'rgba(21, 128, 61, 0.3)',
      buttonBorder: '#4ade80',

      leaveBg: 'rgba(239, 68, 68, 0.1)',
      leaveHoverBg: 'rgba(239, 68, 68, 0.2)',
      leaveBorder: 'rgba(239, 68, 68, 0.5)',
      leaveHoverBorder: 'rgba(239, 68, 68, 0.8)',
      leaveText: 'rgba(239, 68, 68, 0.9)',
      leaveHoverText: 'rgba(239, 68, 68, 1)',
    },
    aurora: {
      colorStops: ['#4ade80', '#0f172a', '#34d399'],
      amplitude: 1.5,
      blend: 0.8,
      speed: 0.4,
      intensity: 0.6,
    },
  },
}

export const defaultTheme = 'purple'

export function getTheme(themeName: string): Theme {
  return themes[themeName] || themes[defaultTheme]
}
