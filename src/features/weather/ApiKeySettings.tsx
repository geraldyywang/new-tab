import type {SettingsSectionProps} from '../../settings/sections';
import {sliceBackendKind, useSlice} from '../../settings/slices';
import {ApiKeySection} from './ApiKeySection';
import {weatherApiKeySlice} from './settings';

/** The WeatherAPI key section of the settings dialog, bound to its slice. */
export function ApiKeySettings({title, onDirtyChange}: SettingsSectionProps) {
  const {value} = useSlice(weatherApiKeySlice);
  return (
    <ApiKeySection
      title={title}
      savedKey={value}
      backend={sliceBackendKind(weatherApiKeySlice)}
      onDirtyChange={onDirtyChange}
    />
  );
}
