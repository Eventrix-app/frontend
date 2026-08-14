import { useCallback, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from '@jamsch/expo-speech-recognition';
import { showAlert } from '../utils/crossPlatformAlert';

interface Options {
  // Called once the recogniser settles on a final transcript.
  onResult: (transcript: string) => void;
  // Called on every interim transcript, which the recogniser emits as each word lands. A
  // caller writes these straight into its input so dictation appears word by word.
  onPartial?: (transcript: string) => void;
}

interface VoiceSearch {
  isListening: boolean;
  // Partial transcript while speaking — shown so the user can see it is hearing them.
  partial: string;
  start: () => Promise<void>;
  stop: () => void;
}

// en-IN rather than en-US: event names, venues and organizer names here are largely Indian
// proper nouns, which the India model transcribes far better.
const LOCALE = 'en-IN';

export function useVoiceSearch({ onResult, onPartial }: Options): VoiceSearch {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');

  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setPartial('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript?.trim() ?? '';
    if (!transcript) return;
    if (event.isFinal) {
      onResult(transcript);
    } else {
      setPartial(transcript);
      onPartial?.(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setPartial('');
    // Saying nothing is the most common outcome and is not worth an alert; every other code
    // means something the user can act on.
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    showAlert(
      "Couldn't hear that",
      event.error === 'not-allowed'
        ? 'Microphone access is off. Enable it in Settings to search by voice.'
        : 'Voice search is unavailable right now. Type your search instead.',
    );
  });

  const start = useCallback(async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        showAlert('Microphone needed', 'Allow microphone access to search events by voice.');
        return;
      }

      setPartial('');
      ExpoSpeechRecognitionModule.start({
        lang: LOCALE,
        // Partial results drive the live preview; without them the button looks frozen while
        // the user is still speaking.
        interimResults: true,
        continuous: false,
      });
    } catch {
      showAlert('Voice search unavailable', 'Type your search instead.');
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, partial, start, stop };
}
