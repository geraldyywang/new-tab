import type {SettingsSectionProps} from '../../settings/sections';
import {useSlice} from '../../settings/slices';
import {LinksEditor} from './LinksEditor';
import {
  saveLinkList,
  sidebarLinksSlice,
  socialLinksSlice,
  type LinkListSlice,
} from './settings';

function LinkListSettings({
  slice,
  description,
  title,
  onDirtyChange,
}: SettingsSectionProps & {slice: LinkListSlice; description: string}) {
  const {value} = useSlice(slice);
  return (
    <LinksEditor
      title={title}
      description={description}
      links={value}
      defaults={slice.default}
      onSave={links => saveLinkList(slice, links)}
      onDirtyChange={onDirtyChange}
    />
  );
}

/** The sidebar links section of the settings dialog. */
export function SidebarLinksSettings(props: SettingsSectionProps) {
  return (
    <LinkListSettings
      {...props}
      slice={sidebarLinksSlice}
      description="Shown in the bar on the right."
    />
  );
}

/** The social links section of the settings dialog. */
export function SocialLinksSettings(props: SettingsSectionProps) {
  return (
    <LinkListSettings
      {...props}
      slice={socialLinksSlice}
      description="Shown in the bar at the bottom left."
    />
  );
}
