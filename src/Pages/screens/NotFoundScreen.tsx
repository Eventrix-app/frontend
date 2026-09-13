import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import ErrorScreen from '../../components/common/ErrorScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'NotFound'>;

// The app's 404. Reached by a deep link to something that no longer exists — a cancelled
// event's push notification, a shared link to a deleted reel — where the request itself was
// well-formed, so "something went wrong" would be misleading.
//
// Deliberately built on ErrorScreen rather than duplicating it: same illustration, same
// dark-mode handling, same Back / Go to Home pairing, different words.
const NotFoundScreen: React.FC<Props> = ({ navigation, route }) => (
  <ErrorScreen
    title="We couldn't find that"
    subtitle={
      route.params?.message ??
      "This page may have been removed, or the link might be out of date."
    }
    onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main' as never))}
    onGoHome={() => navigation.navigate('Main' as never)}
  />
);

export default NotFoundScreen;
