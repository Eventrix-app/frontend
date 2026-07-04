/**
 * Barrel entry for theme. Re-exports the full theme package so both work:
 *   import theme from '../theme'
 *   import { colors, spacing } from '../theme'
 */
export {
  colors,
  typography,
  spacing,
  borderRadius,
  radius,
  shadows,
  theme,
  type Colors,
  type Typography,
  type Spacing,
  type BorderRadius,
  type Shadows,
  type Theme,
} from './theme/index';

export { default } from './theme/index';
