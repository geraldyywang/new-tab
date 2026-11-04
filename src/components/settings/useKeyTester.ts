import {useEffect, useRef, useState} from 'react';
import {
  describeWeatherApiProblem,
  testWeatherApiKey,
  type KeyTestResult,
} from '../../lib/weatherApi';
import type {StatusMessage} from '../ui/styles';

/** The status message to show for a key test result. */
export function keyTestStatus(result: KeyTestResult): StatusMessage {
  if (result.kind === 'ok') return {tone: 'ok', text: 'OK — the key works.'};
  if (result.kind === 'network') {
    return {
      tone: 'error',
      text: "Network error — couldn't reach WeatherAPI.",
    };
  }
  const {problem} = result;
  const text =
    problem.kind === 'key'
      ? `Invalid key${problem.detail ? `: ${problem.detail}` : '.'}`
      : describeWeatherApiProblem(problem);
  return {tone: 'error', text};
}

/** Runs one key test at a time; aborts it on unmount. */
export function useKeyTester() {
  const [testing, setTesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Resolves to a status message, or null if the test was aborted. */
  async function run(apiKey: string): Promise<StatusMessage | null> {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTesting(true);
    try {
      return keyTestStatus(await testWeatherApiKey(apiKey, controller.signal));
    } catch {
      return null;
    } finally {
      if (!controller.signal.aborted) setTesting(false);
    }
  }

  return {testing, run};
}
