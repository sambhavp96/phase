/** The app's palette. Text on rose and mint on oxblood both pass WCAG AA. */
export const colors = {
  rose: '#CEB0B2', // background
  oxblood: '#4F2426', // text, lines, primary surfaces
  mint: '#B0CFC2', // text on oxblood, fertile window
  forest: '#244F3D', // text on mint, ovulation ring
} as const;

export const fonts = {
  light: 'Jost_300Light',
  regular: 'Jost_400Regular',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
} as const;

/** Side margin of the 12-column grid. */
export const GUTTER = 20;
