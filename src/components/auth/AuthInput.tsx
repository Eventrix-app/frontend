import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import GlassSurface from '../common/GlassSurface';

type AuthInputProps = TextInputProps & {
  icon?: string | ImageSourcePropType;
  error?: string;
};

const EyeIcon = ({ color = colors.brandPink, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const EyeOffIcon = ({ color = colors.brandPink, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <Path d="M1 1l22 22" />
  </Svg>
);

export const AuthInput: React.FC<AuthInputProps> = ({
  icon,
  secureTextEntry,
  error,
  style,
  ...props
}) => {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.wrap}>
      <GlassSurface style={[styles.fieldGlass, error && styles.fieldError]} contentStyle={styles.field}>
        {icon
          ? typeof icon === 'string'
            ? <Text style={styles.icon}>{icon}</Text>
            : <Image source={icon} style={styles.iconImage} resizeMode="contain" />
          : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="rgba(26,26,46,0.45)"
          secureTextEntry={hidden}
          {...props}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setHidden((v) => !v)} hitSlop={8}>
            {hidden ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
          </TouchableOpacity>
        ) : null}
      </GlassSurface>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  fieldGlass: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: spacing.sm,
  },
  fieldError: {
    borderColor: colors.error,
  },
  icon: {
    fontSize: 18,
    color: colors.brandPink,
    width: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  iconImage: {
    width: 22,
    height: 22,
    tintColor: colors.brandPink,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0D0D0D',
    padding: 0,
    backgroundColor: 'transparent',
    height: '100%',
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.error,
  },
});
