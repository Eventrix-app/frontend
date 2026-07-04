export { colors, type Colors } from './colors';
export { typography, type Typography } from './typography';
export { spacing, type Spacing } from './spacing';
export { borderRadius, radius, type BorderRadius } from './borderRadius';
export { shadows, type Shadows } from './shadows';

import { colors, type Colors } from './colors';
import { typography, type Typography } from './typography';
import { spacing, type Spacing } from './spacing';
import { borderRadius, radius, type BorderRadius } from './borderRadius';
import { shadows, type Shadows } from './shadows';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}

export const theme: Theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export default theme;